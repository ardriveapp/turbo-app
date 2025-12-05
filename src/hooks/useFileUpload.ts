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
import { useX402Upload } from './useX402Upload';
import { useEthereumTurboClient } from './useEthereumTurboClient';
import { useFreeUploadLimit, isFileFree } from './useFreeUploadLimit';
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
  const { uploadFileWithX402 } = useX402Upload(); // x402 upload hook
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
      console.log('✅ Reusing cached Turbo client (no re-authentication needed)');
      return turboClientCache.current.client;
    }

    console.log('Creating new Turbo client (will request signature for authentication)');
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
        // Creating ArconnectSigner for Wander wallet
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
        // Use the shared Ethereum Turbo client with custom connect message
        // This caches the client globally and only prompts for signature once per session
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
    // Arweave wallets must use ARIO for JIT (not AR)
    // Ethereum wallets: detect from current network (ETH L1, Base, or Polygon)
    let jitTokenType: SupportedTokenType | null = null;

    if (walletType === 'arweave') {
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

    // Use x402 for ALL BASE-USDC uploads from Ethereum wallets
    // x402 endpoint now handles free tier detection (same as regular upload service)
    console.log(`[X402] selectedJitToken: ${options?.selectedJitToken}, walletType: ${walletType}`);

    const isFileInFreeUploadTier = isFileFree(file.size, freeUploadLimitBytes);
    console.log(`[Upload] ${fileName}: size=${file.size} bytes, freeLimit=${freeUploadLimitBytes}, isFree=${isFileInFreeUploadTier}`);

    if (
      walletType === 'ethereum' &&
      options?.selectedJitToken === 'base-usdc'
    ) {
      try {
        console.log(`[X402] Using x402 flow for BASE-USDC upload (${isFileInFreeUploadTier ? 'FREE' : 'PAID'}):`, fileName);

        // Convert maxTokenAmount from smallest unit (6 decimals) to USDC
        const maxUsdc = options.jitMaxTokenAmount ? options.jitMaxTokenAmount / 1_000_000 : 10; // Default 10 USDC

        const result = await uploadFileWithX402(file, {
          maxUsdcAmount: maxUsdc,
          onProgress: (progress) => {
            setUploadProgress((prev) => ({ ...prev, [fileName]: progress }));
          },
          tags: options?.customTags,
        });

        // Add metadata and return
        setUploadProgress((prev) => ({ ...prev, [fileName]: 100 }));
        return {
          ...result,
          timestamp: Date.now(),
          fileName: file.name,
          fileSize: file.size,
          contentType: getContentType(file),
        };
      } catch (x402Error) {
        console.error('x402 upload failed:', x402Error);

        // Show user-friendly error with fallback suggestion
        const errorMsg = `x402 payment failed: ${
          x402Error instanceof Error ? x402Error.message : 'Unknown error'
        }.

Try selecting BASE-ETH as your payment method, or use regular BASE-USDC payment through the Turbo SDK.`;

        setErrors((prev) => ({ ...prev, [fileName]: errorMsg }));

        // Throw error to stop upload - user must choose different approach
        throw new Error(errorMsg);
      }
    }

    if (options?.jitEnabled && jitTokenType) {
      // Regular JIT path (not x402)
      console.log(`[JIT] Using regular JIT flow with ${jitTokenType} for ${fileName}`);
    }

    try {
      // Creating Turbo client for upload
      const turbo = await createTurboClient(jitTokenType || undefined);

      // Starting upload for file
      console.log(`Starting upload for ${fileName} (${file.size} bytes)`);

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
          // Overall progress (includes both signing and upload)
          onProgress: (progressData: { totalBytes: number; processedBytes: number; step?: string }) => {
            const { totalBytes, processedBytes, step } = progressData;
            const percentage = Math.round((processedBytes / totalBytes) * 100);
            console.log(`Upload progress for ${fileName}: ${percentage}% (${processedBytes}/${totalBytes} bytes, step: ${step || 'unknown'})`);
            setUploadProgress(prev => ({ ...prev, [fileName]: percentage }));
            // Update active uploads array with progress
            setActiveUploads(prev => prev.map(upload =>
              upload.name === fileName
                ? { ...upload, progress: percentage }
                : upload
            ));
          },
          onError: (error: any) => {
            // Upload error occurred
            console.error(`Upload error for ${fileName}:`, error);
            const errorMessage = formatUploadError(error?.message || 'Upload failed');
            setErrors(prev => ({ ...prev, [fileName]: errorMessage }));
          },
          onSuccess: () => {
            // Upload completed successfully
            console.log(`Upload success for ${fileName}`);
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
  }, [address, walletType, wallets, ethAccount.chainId, createTurboClient, uploadFileWithX402, freeUploadLimitBytes]);

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options?: {
      jitEnabled?: boolean;
      jitMaxTokenAmount?: number; // In smallest unit
      jitBufferMultiplier?: number;
      customTags?: Array<{ name: string; value: string }>;
      selectedJitToken?: SupportedTokenType; // Selected JIT payment token
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

    for (const file of files) {
      // Check if cancelled
      if (isCancelled) {
        setUploading(false);
        setActiveUploads([]);
        return { results, failedFiles: failedFileNames };
      }

      try {
        // Add to active uploads
        setActiveUploads(prev => [
          ...prev.filter(u => u.name !== file.name),
          { name: file.name, progress: 0, size: file.size }
        ]);

        // Starting upload for file
        const result = await uploadFile(file, options);

        // Remove from active uploads
        setActiveUploads(prev => prev.filter(u => u.name !== file.name));

        // Add to recent files
        setRecentFiles(prev => [
          {
            name: file.name,
            size: file.size,
            status: 'success' as const,
            timestamp: Date.now()
          },
          ...prev
        ].slice(0, 20)); // Keep last 20

        // Upload completed for file
        results.push(result);
        setUploadResults(prev => [...prev, result]);
        setUploadedCount(prev => prev + 1);
        setUploadedSize(prev => prev + file.size);

      } catch (error) {
        // Remove from active uploads
        setActiveUploads(prev => prev.filter(u => u.name !== file.name));

        // Add to recent files as error
        // Format error for user display
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

        // Add to upload errors
        setUploadErrors(prev => [
          ...prev,
          {
            fileName: file.name,
            error: userFriendlyError,
            retryable: true
          }
        ]);

        // Failed to upload file
        setErrors(prev => ({ ...prev, [file.name]: userFriendlyError }));
        failedFileNames.push(file.name);
        setFailedFiles(prev => [...prev, file]);
        setFailedCount(prev => prev + 1);
        setUploadedCount(prev => prev + 1); // Still count as processed

        // Error details logged for debugging
      }
    }

    setUploading(false);
    // Upload summary processed
    return { results, failedFiles: failedFileNames };
  }, [uploadFile, validateWalletState, isCancelled]);

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