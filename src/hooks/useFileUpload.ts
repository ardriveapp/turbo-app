import { useState, useCallback, useRef } from 'react';
import {
  TurboFactory,
  TurboAuthenticatedClient,
  ArconnectSigner,
  OnDemandFunding,
} from '@ardrive/turbo-sdk/web';
import { useStore } from '../store/useStore';
import { useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { supportsJitPayment } from '../utils/jitPayment';
import { formatUploadError } from '../utils/errorMessages';
import { APP_NAME, APP_VERSION, SupportedTokenType } from '../constants';
import { useEthereumTurboClient } from './useEthereumTurboClient';
import { useFreeUploadLimit } from './useFreeUploadLimit';
import { getContentType } from '../utils/mimeTypes';

interface UploadResult {
  id: string;
  owner: string;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  winc: string;
  timestamp?: number;
  receipt?: any; // Store the full receipt response
}

export interface ActiveUpload {
  name: string;
  progress: number;
  size: number;
}

export interface RecentFile {
  name: string;
  size: number;
  status: 'success' | 'error';
  error?: string;
  timestamp: number;
}

export interface UploadError {
  fileName: string;
  error: string;
  retryable: boolean;
}

/**
 * Merges custom tags with default tags.
 * Custom tags override defaults with the same name.
 * Returns: [...customTags, ...non-overridden defaults]
 */
const mergeTags = (
  defaultTags: Array<{ name: string; value: string }>,
  customTags: Array<{ name: string; value: string }>
): Array<{ name: string; value: string }> => {
  // Create set of custom tag names for quick lookup
  const customTagNames = new Set(customTags.map(t => t.name));

  // Filter out default tags that are overridden by custom tags
  const nonOverriddenDefaults = defaultTags.filter(
    dt => !customTagNames.has(dt.name)
  );

  // Custom tags first, then non-overridden defaults
  return [...customTags, ...nonOverriddenDefaults];
};

export function useFileUpload() {
  const { address, walletType } = useStore();
  const { wallets } = useWallets(); // Get Privy wallets
  const ethAccount = useAccount(); // RainbowKit/Wagmi account state
  const { createEthereumTurboClient } = useEthereumTurboClient(); // Shared Ethereum client with custom connect message
  const freeUploadLimitBytes = useFreeUploadLimit(); // Get free upload limit
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [totalFilesCount, setTotalFilesCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);

  // Cache Turbo client to avoid re-authentication on every upload
  const turboClientCache = useRef<{
    client: TurboAuthenticatedClient;
    address: string;
    tokenType: string;
  } | null>(null);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);

  // Validate wallet state to prevent cross-wallet conflicts
  const validateWalletState = useCallback((): void => {
    console.log('[useFileUpload] validateWalletState:', { address, walletType });

    if (!address || !walletType) {
      throw new Error('Wallet not connected');
    }

    // Check for Privy embedded wallet
    const hasPrivyWallet = wallets.some(w => w.walletClientType === 'privy');

    // WALLET ISOLATION: Verify correct wallet is available and connected
    switch (walletType) {
      case 'arweave':
        console.log('[useFileUpload] Checking window.arweaveWallet:', {
          exists: !!window.arweaveWallet,
          type: typeof window.arweaveWallet,
          keys: window.arweaveWallet ? Object.keys(window.arweaveWallet) : []
        });
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet not available. Please reconnect your Arweave wallet.');
        }
        break;
      case 'ethereum':
        // For Ethereum, check multiple sources: Privy, RainbowKit/Wagmi, direct window.ethereum
        // WalletConnect and other remote wallets won't have window.ethereum
        if (!hasPrivyWallet && !ethAccount.isConnected && !window.ethereum) {
          throw new Error('Ethereum wallet not connected. Please reconnect your wallet.');
        }
        break;
      case 'solana':
        if (!window.solana || !window.solana.isConnected) {
          throw new Error('Solana wallet not connected. Please reconnect your Solana wallet.');
        }
        break;
    }
  }, [address, walletType, wallets, ethAccount.isConnected]);

  // Get config function from store
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);

  // Create Turbo client with proper walletAdapter based on wallet type
  const createTurboClient = useCallback(async (tokenTypeOverride?: string): Promise<TurboAuthenticatedClient> => {
    console.log('[useFileUpload] Creating Turbo client...', { walletType, tokenTypeOverride });
    // Validate wallet state first
    validateWalletState();

    const config = getCurrentConfig();
    const turboConfig = {
      paymentServiceConfig: { url: config.paymentServiceUrl },
      uploadServiceConfig: { url: config.uploadServiceUrl },
      processId: config.processId,
    };

    // Get turbo config based on the token type (use override if provided, otherwise use wallet type)
    const effectiveTokenType = tokenTypeOverride || walletType;

    // Check if we can reuse cached client (same address and token type)
    if (
      turboClientCache.current &&
      turboClientCache.current.address === address &&
      turboClientCache.current.tokenType === effectiveTokenType
    ) {
      return turboClientCache.current.client;
    }

    // Add gateway URL
    const fullTurboConfig = {
      ...turboConfig,
      ...(effectiveTokenType && config.tokenMap[effectiveTokenType as keyof typeof config.tokenMap]
        ? { gatewayUrl: config.tokenMap[effectiveTokenType as keyof typeof config.tokenMap] }
        : {})
    };

    switch (walletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet extension not found. Please install from https://wander.app');
        }
        console.log('[useFileUpload] Verifying Wander wallet connection...');
        // Pre-flight check: verify the wallet is actually connected and accessible
        // The arweaveWallet object may exist but return "No wallets added" when methods are called
        // This commonly happens on mobile when the wallet session has expired
        try {
          const activeAddr = await window.arweaveWallet.getActiveAddress();
          console.log('[useFileUpload] Wander wallet verified, active address:', activeAddr);
          if (!activeAddr) {
            throw new Error('No active wallet address returned');
          }
        } catch (wanderError: any) {
          const errorMsg = wanderError?.message || String(wanderError);
          console.error('[useFileUpload] Wander wallet verification failed:', errorMsg);
          // Provide user-friendly error message for common mobile issues
          if (errorMsg.toLowerCase().includes('no wallets added') ||
              errorMsg.toLowerCase().includes('no wallet') ||
              errorMsg.toLowerCase().includes('not connected')) {
            throw new Error(
              'Wander wallet session expired. Please tap "Connect" in the Wander app to reconnect, ' +
              'then try uploading again.'
            );
          }
          throw new Error(`Wander wallet error: ${errorMsg}`);
        }
        console.log('[useFileUpload] Creating ArconnectSigner...');
        const signer = new ArconnectSigner(window.arweaveWallet);
        console.log('[useFileUpload] ArconnectSigner created, creating TurboFactory.authenticated...');
        const arweaveClient = TurboFactory.authenticated({
          ...fullTurboConfig,
          signer,
          // Use token type override if provided (for JIT with ARIO)
          ...(tokenTypeOverride && tokenTypeOverride !== 'arweave' ? { token: tokenTypeOverride as any } : {})
        });

        // Cache the client
        if (address && effectiveTokenType) {
          turboClientCache.current = {
            client: arweaveClient,
            address: address,
            tokenType: effectiveTokenType,
          };
        }

        return arweaveClient;

      case 'ethereum':
        // Ethereum wallet (Privy, RainbowKit, etc.)
        const ethereumClient = await createEthereumTurboClient(tokenTypeOverride || 'ethereum');

        // Also cache in local ref for consistency with other wallet types
        if (address && effectiveTokenType) {
          turboClientCache.current = {
            client: ethereumClient,
            address: address,
            tokenType: effectiveTokenType,
          };
        }

        return ethereumClient;

      case 'solana':
        if (!window.solana) {
          throw new Error('Solana wallet extension not found. Please install Phantom or Solflare');
        }

        const solanaClient = TurboFactory.authenticated({
          token: "solana",
          walletAdapter: window.solana,
          ...fullTurboConfig,
        });

        // Cache the client
        if (address && effectiveTokenType) {
          turboClientCache.current = {
            client: solanaClient,
            address: address,
            tokenType: effectiveTokenType,
          };
        }

        return solanaClient;
        
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [walletType, getCurrentConfig, validateWalletState, address, createEthereumTurboClient]);

  const uploadFile = useCallback(async (
    file: File,
    options?: {
      jitEnabled?: boolean;
      jitMaxTokenAmount?: number; // In smallest unit
      jitBufferMultiplier?: number;
      customTags?: Array<{ name: string; value: string }>;
      selectedJitToken?: SupportedTokenType; // Selected JIT payment token
    }
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const fileName = file.name;
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));

    // Determine the token type for JIT payment and uploads
    // Priority: user-selected JIT token > wallet-specific defaults
    let jitTokenType: SupportedTokenType | null = null;

    // If user explicitly selected a JIT token, use that
    if (options?.selectedJitToken && supportsJitPayment(options.selectedJitToken)) {
      jitTokenType = options.selectedJitToken;
    } else if (walletType === 'arweave') {
      jitTokenType = 'ario';
    } else if (walletType === 'ethereum') {
      // Detect token type from current network chainId
      // Priority: wagmi account chainId > Privy > window.ethereum
      try {
        const { getTokenTypeFromChainId } = await import('../utils');

        // First try wagmi's chainId (works for RainbowKit, WalletConnect, etc.)
        if (ethAccount.chainId) {
          jitTokenType = getTokenTypeFromChainId(ethAccount.chainId);
        } else {
          // Fallback to Privy or window.ethereum for legacy support
          const { ethers } = await import('ethers');
          const privyWallet = wallets.find(w => w.walletClientType === 'privy');

          if (privyWallet) {
            const provider = await privyWallet.getEthereumProvider();
            const ethersProvider = new ethers.BrowserProvider(provider);
            const network = await ethersProvider.getNetwork();
            jitTokenType = getTokenTypeFromChainId(Number(network.chainId));
          } else if (window.ethereum) {
            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            const network = await ethersProvider.getNetwork();
            jitTokenType = getTokenTypeFromChainId(Number(network.chainId));
          }
        }
      } catch (error) {
        console.warn('Failed to detect network, defaulting to ethereum:', error);
        jitTokenType = 'ethereum';
      }
    } else if (walletType === 'solana') {
      jitTokenType = 'solana';
    }

    // Create funding mode if JIT enabled and supported
    let fundingMode: OnDemandFunding | undefined = undefined;
    if (options?.jitEnabled && jitTokenType && supportsJitPayment(jitTokenType)) {
      fundingMode = new OnDemandFunding({
        maxTokenAmount: options.jitMaxTokenAmount || 0,
        topUpBufferMultiplier: options.jitBufferMultiplier || 1.1,
      });
    }

    try {
      // Only pass jitTokenType if JIT is actually enabled, otherwise use default
      // This prevents triggering walletAdapter path for regular credit-based uploads
      const tokenTypeForClient = (options?.jitEnabled && jitTokenType) ? jitTokenType : undefined;
      console.log('[useFileUpload] Getting Turbo client for upload...');
      const turbo = await createTurboClient(tokenTypeForClient);
      console.log('[useFileUpload] Turbo client ready, starting upload for:', fileName, 'size:', file.size);

      // Build tags for the upload
      const uploadTags = options?.customTags
        ? mergeTags(
            [
              { name: 'Deployed-By', value: APP_NAME },
              { name: 'Deployed-By-Version', value: APP_VERSION },
              { name: 'App-Feature', value: 'File Upload' },
              { name: 'Content-Type', value: getContentType(file) },
              { name: 'File-Name', value: file.name }
            ],
            options.customTags
          )
        : [
            { name: 'Deployed-By', value: APP_NAME },
            { name: 'Deployed-By-Version', value: APP_VERSION },
            { name: 'App-Feature', value: 'File Upload' },
            { name: 'Content-Type', value: getContentType(file) },
            { name: 'File-Name', value: file.name }
          ];

      // Check if ReadableStream uploading is supported (fails on some mobile browsers)
      // Mobile in-app browsers (MetaMask, Wander, etc.) often have ReadableStream
      // but don't support it for fetch uploads
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileInAppBrowser =
        userAgent.includes('metamaskmobile') ||
        userAgent.includes('wander') ||
        userAgent.includes('arconnect') ||
        // Generic mobile WebView detection
        (userAgent.includes('mobile') && (
          userAgent.includes('wv') || // Android WebView
          userAgent.includes('webview') ||
          // iOS in-app browsers often don't identify themselves clearly
          (userAgent.includes('iphone') && !userAgent.includes('safari'))
        ));

      const supportsStreamUpload = typeof ReadableStream !== 'undefined' &&
        typeof file.stream === 'function' &&
        !isMobileInAppBrowser;

      console.log('[useFileUpload] Stream support check:', {
        hasReadableStream: typeof ReadableStream !== 'undefined',
        hasFileStream: typeof file.stream === 'function',
        isMobileInAppBrowser,
        supportsStreamUpload
      });

      let uploadResult;

      if (supportsStreamUpload) {
        // Use streaming upload for desktop browsers (better for large files)
        console.log('[useFileUpload] Using streaming upload');
        uploadResult = await turbo.uploadFile({
          file: file,
          fundingMode,
          dataItemOpts: { tags: uploadTags },
          events: {
            onProgress: (progressData: { totalBytes: number; processedBytes: number; step?: string }) => {
              const { totalBytes, processedBytes } = progressData;
              const percentage = Math.round((processedBytes / totalBytes) * 100);
              setUploadProgress(prev => ({ ...prev, [fileName]: percentage }));
              setActiveUploads(prev => prev.map(upload =>
                upload.name === fileName ? { ...upload, progress: percentage } : upload
              ));
            },
            onError: (error: any) => {
              console.error('[useFileUpload] onError callback:', error);
              const errorMessage = formatUploadError(error?.message || 'Upload failed');
              setErrors(prev => ({ ...prev, [fileName]: errorMessage }));
            },
            onSuccess: () => {
              setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
            }
          }
        } as any);
      } else {
        // Fallback for mobile browsers that don't support ReadableStream uploads
        // The Turbo SDK internally creates ReadableStream which fails on mobile WebViews
        // Workaround: Read file as Blob and use chunked upload mode which may handle it differently
        console.log('[useFileUpload] Using mobile browser fallback (Blob + chunked mode)');
        setUploadProgress(prev => ({ ...prev, [fileName]: 10 }));

        // Read file as ArrayBuffer, then create a Blob with proper content type
        const arrayBuffer = await file.arrayBuffer();
        new Blob([arrayBuffer], { type: getContentType(file) }); // Create blob for content type validation
        setUploadProgress(prev => ({ ...prev, [fileName]: 20 }));

        // Try using uploadFile with explicit stream factories that return the blob/buffer directly
        // This may work better on some mobile browsers
        try {
          uploadResult = await turbo.uploadFile({
            fileStreamFactory: () => new Uint8Array(arrayBuffer),
            fileSizeFactory: () => file.size,
            dataItemOpts: { tags: uploadTags },
            // Force chunked upload mode which may bypass streaming issues
            chunkingMode: 'force',
            ...(fundingMode ? { fundingMode } : {}),
            events: {
              onProgress: (progressData: { totalBytes: number; processedBytes: number }) => {
                const percentage = Math.round((progressData.processedBytes / progressData.totalBytes) * 100);
                setUploadProgress(prev => ({ ...prev, [fileName]: 20 + percentage * 0.8 }));
              },
              onError: (error: any) => {
                console.error('[useFileUpload] Mobile upload error:', error);
              }
            }
          } as any);
        } catch (mobileError: any) {
          // If chunked mode also fails, provide clear error message
          console.error('[useFileUpload] Mobile browser upload failed:', mobileError);
          throw new Error(
            `Mobile browser upload not supported: ${mobileError?.message || 'ReadableStream uploads not available'}. ` +
            `Please try using a desktop browser or the native wallet app.`
          );
        }
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
      }
      
      // Add timestamp, file metadata, and capture full receipt for display
      const result = {
        ...uploadResult,
        timestamp: Date.now(),
        fileName: file.name,
        fileSize: file.size,
        contentType: getContentType(file),
        receipt: uploadResult // Store the entire upload response as receipt
      };
      
      setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
      return result;
    } catch (error) {
      // Log raw error for debugging (especially on mobile where console is hard to access)
      console.error(`[useFileUpload] Upload failed for ${fileName}:`, error);
      const errorMessage = formatUploadError(error instanceof Error ? error : 'Upload failed');
      setErrors(prev => ({ ...prev, [fileName]: errorMessage }));
      throw error;
    }
  }, [address, walletType, wallets, ethAccount.chainId, createTurboClient, freeUploadLimitBytes]);

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options?: {
      cryptoPayment?: boolean; // If true, top up with crypto first (one payment for all files)
      tokenAmount?: number; // Amount to top up in smallest unit (e.g., mARIO)
      selectedToken?: SupportedTokenType; // Token to use for crypto payment
      customTags?: Array<{ name: string; value: string }>;
      // Legacy JIT options (deprecated - use cryptoPayment instead)
      jitEnabled?: boolean;
      jitMaxTokenAmount?: number;
      jitBufferMultiplier?: number;
      selectedJitToken?: SupportedTokenType;
    }
  ) => {
    console.log('[useFileUpload] uploadMultipleFiles called with', files.length, 'file(s)');
    // Validate wallet state before any operations
    validateWalletState();

    setUploading(true);
    setErrors({});
    setUploadResults([]);
    setUploadedCount(0);
    setTotalFilesCount(files.length);
    setFailedCount(0);
    setActiveUploads([]);
    setRecentFiles([]);
    setUploadErrors([]);
    setFailedFiles([]);
    setIsCancelled(false);

    // Calculate total size
    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
    setTotalSize(totalSizeBytes);
    setUploadedSize(0);

    const results: UploadResult[] = [];
    const failedFileNames: string[] = [];

    // Handle crypto payment: top up once for all files before uploading
    const selectedToken = options?.selectedToken || options?.selectedJitToken;
    if (options?.cryptoPayment && selectedToken && options?.tokenAmount) {
      try {
        const turbo = await createTurboClient(selectedToken);
        await turbo.topUpWithTokens({
          tokenAmount: BigInt(options.tokenAmount),
        });
        window.dispatchEvent(new CustomEvent('refresh-balance'));
      } catch (topUpError) {
        const errorMessage = topUpError instanceof Error ? topUpError.message : 'Unknown error';

        // Check if this is a polling timeout with a valid tx ID
        // The SDK embeds the tx ID in the error message when polling times out
        // Transaction hashes are: 0x + 64 hex chars (Ethereum) or 43-44 base64url chars (Arweave/AO)
        // We specifically match these patterns and exclude ERC20 calldata (which starts with 0xa9059cbb)
        const txIdMatch = errorMessage.match(/submitFundTransaction\([^)]*\)['":]?\s*(0x[a-fA-F0-9]{64})/i) ||
                          errorMessage.match(/submitFundTransaction\([^)]*\)['":]?\s*([a-zA-Z0-9_-]{43,44})/i) ||
                          errorMessage.match(/transaction\s+(?:id|hash)[^:]*:\s*(0x[a-fA-F0-9]{64})/i) ||
                          errorMessage.match(/transaction\s+(?:id|hash)[^:]*:\s*([a-zA-Z0-9_-]{43,44})/i);

        if (txIdMatch && txIdMatch[1]) {
          const txId = txIdMatch[1].replace(/['"]/g, '');
          console.log('Detected failed tx ID from polling timeout, attempting retry:', txId);

          // Try to resubmit the transaction to Turbo
          try {
            const { TurboFactory } = await import('@ardrive/turbo-sdk/web');
            const config = getCurrentConfig();
            const unauthenticatedTurbo = TurboFactory.unauthenticated({
              paymentServiceConfig: { url: config.paymentServiceUrl },
              uploadServiceConfig: { url: config.uploadServiceUrl },
              token: selectedToken as any,
            });

            // Wait a moment for blockchain confirmation
            await new Promise(resolve => setTimeout(resolve, 3000));

            const retryResult = await unauthenticatedTurbo.submitFundTransaction({ txId });
            console.log('Retry submitFundTransaction succeeded:', retryResult);

            if (retryResult.status !== 'failed') {
              window.dispatchEvent(new CustomEvent('refresh-balance'));
              // Success - continue with uploads
            } else {
              throw new Error('Transaction confirmation failed after retry');
            }
          } catch (retryError) {
            setUploading(false);
            const retryMsg = retryError instanceof Error ? retryError.message : 'Unknown error';
            throw new Error(`Crypto payment polling timed out. Your transaction (${txId}) may have succeeded - check your balance or try "Buy Credits" to resubmit. Error: ${retryMsg}`);
          }
        } else {
          setUploading(false);
          throw new Error(`Crypto payment failed: ${errorMessage}`);
        }
      }
    }

    for (const file of files) {
      // Check if cancelled
      if (isCancelled) {
        setUploading(false);
        setActiveUploads([]);
        return { results, failedFiles: failedFileNames };
      }

      try {
        setActiveUploads(prev => [
          ...prev.filter(u => u.name !== file.name),
          { name: file.name, progress: 0, size: file.size }
        ]);

        // If we did a crypto pre-topup, don't pass JIT options to avoid per-file JIT
        const uploadOptions = (options?.cryptoPayment && selectedToken)
          ? { customTags: options?.customTags }
          : options;
        const result = await uploadFile(file, uploadOptions);

        setActiveUploads(prev => prev.filter(u => u.name !== file.name));
        setRecentFiles(prev => [
          {
            name: file.name,
            size: file.size,
            status: 'success' as const,
            timestamp: Date.now()
          },
          ...prev
        ].slice(0, 20));

        results.push(result);
        setUploadResults(prev => [...prev, result]);
        setUploadedCount(prev => prev + 1);
        setUploadedSize(prev => prev + file.size);

      } catch (error) {
        setActiveUploads(prev => prev.filter(u => u.name !== file.name));
        // Preserve raw error for debugging, especially on mobile
        const rawError = error instanceof Error ? error.message : String(error);
        console.error(`[uploadMultipleFiles] Failed for ${file.name}:`, rawError, error);
        // Use raw error for now to help debug mobile issues
        const errorToShow = rawError.length < 200 ? rawError : formatUploadError(error instanceof Error ? error : 'Unknown error');

        setRecentFiles(prev => [
          {
            name: file.name,
            size: file.size,
            status: 'error' as const,
            error: errorToShow,
            timestamp: Date.now()
          },
          ...prev
        ].slice(0, 20));

        setUploadErrors(prev => [
          ...prev,
          {
            fileName: file.name,
            error: errorToShow,
            retryable: true
          }
        ]);

        setErrors(prev => ({ ...prev, [file.name]: errorToShow }));
        failedFileNames.push(`${file.name}: ${errorToShow}`); // Include error in filename for display
        setFailedFiles(prev => [...prev, file]);
        setFailedCount(prev => prev + 1);
        setUploadedCount(prev => prev + 1);
      }
    }

    setUploading(false);
    return { results, failedFiles: failedFileNames };
  }, [uploadFile, validateWalletState, isCancelled, createTurboClient]);

  const reset = useCallback(() => {
    setUploadProgress({});
    setUploadResults([]);
    setErrors({});
    setUploading(false);
    setUploadedCount(0);
    setTotalFilesCount(0);
    setFailedCount(0);
    setActiveUploads([]);
    setRecentFiles([]);
    setUploadErrors([]);
    setTotalSize(0);
    setUploadedSize(0);
    setFailedFiles([]);
    setIsCancelled(false);
  }, []);

  // Retry failed files
  const retryFailedFiles = useCallback(async () => {
    if (failedFiles.length === 0) return;

    // Reset failed state and retry the failed files
    const filesToRetry = [...failedFiles];
    setFailedFiles([]);
    setUploadErrors([]);
    setFailedCount(0);

    return await uploadMultipleFiles(filesToRetry);
  }, [failedFiles, uploadMultipleFiles]);

  // Cancel ongoing uploads
  const cancelUploads = useCallback(() => {
    setIsCancelled(true);
    setUploading(false);
    setActiveUploads([]);
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    uploading,
    uploadProgress,
    uploadResults,
    errors,
    reset,
    uploadedCount,
    totalFilesCount,
    failedCount,
    activeUploads,
    recentFiles,
    uploadErrors,
    totalSize,
    uploadedSize,
    retryFailedFiles,
    cancelUploads,
  };
}