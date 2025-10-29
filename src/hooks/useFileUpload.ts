import { useState, useCallback } from 'react';
import {
  TurboFactory,
  TurboAuthenticatedClient,
  ArconnectSigner,
  OnDemandFunding,
} from '@ardrive/turbo-sdk/web';
import { ethers } from 'ethers';
import { useStore } from '../store/useStore';
import { useWallets } from '@privy-io/react-auth';
import { supportsJitPayment } from '../utils/jitPayment';
import { APP_NAME, APP_VERSION, SupportedTokenType } from '../constants';

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
  const [totalSize, setTotalSize] = useState<number>(0);
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);

  // Validate wallet state to prevent cross-wallet conflicts
  const validateWalletState = useCallback((): void => {
    if (!address || !walletType) {
      throw new Error('Wallet not connected');
    }

    // WALLET ISOLATION: Verify correct wallet is available and connected
    switch (walletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet not available. Please reconnect your Arweave wallet.');
        }
        break;
      case 'ethereum':
        if (!window.ethereum) {
          throw new Error('MetaMask not available. Please reconnect your Ethereum wallet.');
        }
        break;
      case 'solana':
        if (!window.solana || !window.solana.isConnected) {
          throw new Error('Solana wallet not connected. Please reconnect your Solana wallet.');
        }
        break;
    }
  }, [address, walletType]);

  // Get config function from store
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);

  // Create Turbo client with proper walletAdapter based on wallet type
  const createTurboClient = useCallback(async (tokenTypeOverride?: string): Promise<TurboAuthenticatedClient> => {
    // Validate wallet state first
    validateWalletState();

    // Get turbo config based on the token type (use override if provided, otherwise use wallet type)
    const effectiveTokenType = tokenTypeOverride || walletType;
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
        return TurboFactory.authenticated({
          ...turboConfig,
          signer,
          // Use token type override if provided (for JIT with ARIO)
          ...(tokenTypeOverride && tokenTypeOverride !== 'arweave' ? { token: tokenTypeOverride as any } : {})
        });
        
      case 'ethereum':
        // Check if this is a Privy embedded wallet
        const privyWallet = wallets.find(w => w.walletClientType === 'privy');

        if (privyWallet) {
          // Use Privy embedded wallet
          const provider = await privyWallet.getEthereumProvider();
          const ethersProvider = new ethers.BrowserProvider(provider);
          const ethersSigner = await ethersProvider.getSigner();

          return TurboFactory.authenticated({
            token: (tokenTypeOverride || "ethereum") as any, // Use base-eth for JIT, ethereum otherwise
            walletAdapter: {
              getSigner: () => ethersSigner as any,
            },
            ...turboConfig,
          });
        } else {
          // Fallback to regular Ethereum wallet (MetaMask, WalletConnect)
          if (!window.ethereum) {
            throw new Error('Ethereum wallet extension not found. Please install MetaMask or WalletConnect');
          }
          // Creating Ethereum walletAdapter
          // Create ethers provider and get the signer
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const ethersSigner = await ethersProvider.getSigner();

          return TurboFactory.authenticated({
            token: (tokenTypeOverride || "ethereum") as any, // Use base-eth for JIT, ethereum otherwise
            walletAdapter: {
              getSigner: () => ethersSigner as any,
            },
            ...turboConfig,
          });
        }
        
      case 'solana':
        if (!window.solana) {
          throw new Error('Solana wallet extension not found. Please install Phantom or Solflare');
        }

        return TurboFactory.authenticated({
          token: "solana",
          walletAdapter: window.solana,
          ...turboConfig,
        });
        
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [walletType, wallets, getCurrentConfig, validateWalletState]);

  const uploadFile = useCallback(async (
    file: File,
    options?: {
      jitEnabled?: boolean;
      jitMaxTokenAmount?: number; // In smallest unit
      jitBufferMultiplier?: number;
      customTags?: Array<{ name: string; value: string }>;
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
      try {
        const { ethers } = await import('ethers');
        const { getTokenTypeFromChainId } = await import('../utils');

        // Check if this is a Privy embedded wallet
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
                  { name: 'Content-Type', value: file.type || 'application/octet-stream' },
                  { name: 'File-Name', value: file.name }
                ],
                options.customTags
              )
            : [
                { name: 'App-Name', value: APP_NAME },
                { name: 'App-Feature', value: 'File Upload' },
                { name: 'App-Version', value: APP_VERSION },
                { name: 'Content-Type', value: file.type || 'application/octet-stream' },
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
            const errorMessage = error?.message || 'Upload failed';
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
        contentType: file.type || 'application/octet-stream',
        receipt: uploadResult // Store the entire upload response as receipt
      };
      
      setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setErrors(prev => ({ ...prev, [fileName]: errorMessage }));
      throw error;
    }
  }, [address, walletType, createTurboClient]);

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options?: {
      jitEnabled?: boolean;
      jitMaxTokenAmount?: number; // In smallest unit
      jitBufferMultiplier?: number;
      customTags?: Array<{ name: string; value: string }>;
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
        setRecentFiles(prev => [
          {
            name: file.name,
            size: file.size,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          },
          ...prev
        ].slice(0, 20));

        // Add to upload errors
        setUploadErrors(prev => [
          ...prev,
          {
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: true
          }
        ]);

        // Failed to upload file
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setErrors(prev => ({ ...prev, [file.name]: errorMessage }));
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