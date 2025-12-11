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
    if (!address || !walletType) {
      throw new Error('Wallet not connected');
    }

    // Check for Privy embedded wallet
    const hasPrivyWallet = wallets.some(w => w.walletClientType === 'privy');

    // WALLET ISOLATION: Verify correct wallet is available and connected
    switch (walletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet not available. Please reconnect your Arweave wallet.');
        }
        break;
      case 'ethereum':
        // For Ethereum, check multiple sources: Privy, RainbowKit/Wagmi, or direct window.ethereum
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
    // Validate wallet state first
    validateWalletState();

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
    const config = getCurrentConfig();
    const turboConfig = {
      paymentServiceConfig: { url: config.paymentServiceUrl },
      uploadServiceConfig: { url: config.uploadServiceUrl },
      processId: config.processId,
      ...(effectiveTokenType && config.tokenMap[effectiveTokenType as keyof typeof config.tokenMap]
        ? { gatewayUrl: config.tokenMap[effectiveTokenType as keyof typeof config.tokenMap] }
        : {})
    };

    switch (walletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet extension not found. Please install from https://wander.app');
        }
        const signer = new ArconnectSigner(window.arweaveWallet);
        const arweaveClient = TurboFactory.authenticated({
          ...turboConfig,
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
          ...turboConfig,
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
      const turbo = await createTurboClient(tokenTypeForClient);

      // Upload file using the proper uploadFile method for browsers
      const uploadResult = await turbo.uploadFile({
        file: file,  // Pass the File object directly
        fundingMode, // Pass JIT funding mode (TypeScript types don't include this yet, but runtime supports it)
        dataItemOpts: {
          tags: options?.customTags
            ? mergeTags(
                [
                  { name: 'App-Name', value: APP_NAME },
                  { name: 'App-Feature', value: 'File Upload' },
                  { name: 'App-Version', value: APP_VERSION },
                  { name: 'Content-Type', value: getContentType(file) },
                  { name: 'File-Name', value: file.name }
                ],
                options.customTags
              )
            : [
                { name: 'App-Name', value: APP_NAME },
                { name: 'App-Feature', value: 'File Upload' },
                { name: 'App-Version', value: APP_VERSION },
                { name: 'Content-Type', value: getContentType(file) },
                { name: 'File-Name', value: file.name }
              ]
        },
        events: {
          onProgress: (progressData: { totalBytes: number; processedBytes: number; step?: string }) => {
            const { totalBytes, processedBytes } = progressData;
            const percentage = Math.round((processedBytes / totalBytes) * 100);
            setUploadProgress(prev => ({ ...prev, [fileName]: percentage }));
            // Update active uploads array with progress
            setActiveUploads(prev => prev.map(upload =>
              upload.name === fileName
                ? { ...upload, progress: percentage }
                : upload
            ));
          },
          onError: (error: any) => {
            const errorMessage = formatUploadError(error?.message || 'Upload failed');
            setErrors(prev => ({ ...prev, [fileName]: errorMessage }));
          },
          onSuccess: () => {
            setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
          }
        }
      } as any); // Type assertion needed until SDK types are updated
      
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
        const userFriendlyError = formatUploadError(error instanceof Error ? error : 'Unknown error');

        setRecentFiles(prev => [
          {
            name: file.name,
            size: file.size,
            status: 'error' as const,
            error: userFriendlyError,
            timestamp: Date.now()
          },
          ...prev
        ].slice(0, 20));

        setUploadErrors(prev => [
          ...prev,
          {
            fileName: file.name,
            error: userFriendlyError,
            retryable: true
          }
        ]);

        setErrors(prev => ({ ...prev, [file.name]: userFriendlyError }));
        failedFileNames.push(file.name);
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