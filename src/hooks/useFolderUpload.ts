import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TurboFactory,
  TurboAuthenticatedClient,
  ArconnectSigner,
  OnDemandFunding,
  TurboUnauthenticatedConfiguration,
} from '@ardrive/turbo-sdk/web';
import { useStore } from '../store/useStore';
import { useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
// supportsJitPayment import removed - using pre-topup flow instead of per-file JIT
import { APP_NAME, APP_VERSION, SupportedTokenType } from '../constants';
import { useEthereumTurboClient } from './useEthereumTurboClient';
import { useFreeUploadLimit, isFileFree } from './useFreeUploadLimit';
import { hashFilesAsync } from '../utils/fileHash';

// Deduplication stats for Smart Deploy
export interface DeduplicationStats {
  totalFiles: number;
  cachedFiles: number;
  newFiles: number;
  cachedSize: number;
  newSize: number;
  billableSize: number; // newSize minus files under free limit
}

interface DeployResult {
  type: 'manifest' | 'files';
  id?: string; // Manifest ID
  manifestId?: string;
  files?: Array<{
    id: string;
    path: string;
    size: number;
    receipt?: any;
  }>;
  timestamp?: number;
  receipt?: any; // Store receipt for manifest
  appName?: string; // User's app/site name
  appVersion?: string; // User's app/site version
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

export function useFolderUpload() {
  const store = useStore();
  const { address, walletType } = store;
  const { wallets } = useWallets();
  const ethAccount = useAccount();
  const { createEthereumTurboClient } = useEthereumTurboClient();
  const freeUploadLimitBytes = useFreeUploadLimit();
  const [deploying, setDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState<number>(0);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [deployStage, setDeployStage] = useState<'idle' | 'uploading' | 'manifest' | 'updating-arns' | 'complete' | 'cancelled'>('idle');
  const [currentFile, setCurrentFile] = useState<string>('');
  const [deployResults, setDeployResults] = useState<DeployResult[]>([]);
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Smart Deploy state
  const [hashingProgress, setHashingProgress] = useState<number>(0);
  const [hashingStage, setHashingStage] = useState<'idle' | 'hashing' | 'complete' | 'cancelled'>('idle');
  const hashingAbortRef = useRef<AbortController | null>(null);
  const [fileHashes, setFileHashes] = useState<Map<string, string> | null>(null);
  const [deduplicationStats, setDeduplicationStats] = useState<DeduplicationStats | null>(null);

  // Get store functions for file hash cache
  const getFileHashEntry = useStore((state) => state.getFileHashEntry);
  const updateFileHashCache = useStore((state) => state.updateFileHashCache);

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

  // Analyze folder for Smart Deploy deduplication
  // Always hashes files to show potential savings, regardless of toggle state
  // The toggle only affects whether we USE the cache during deploy
  // Non-blocking: Uses Web Workers when available, with graceful fallback
  const analyzeFolder = useCallback(async (files: File[]) => {
    // Cancel any previous hashing operation
    if (hashingAbortRef.current) {
      hashingAbortRef.current.abort();
    }

    // Create new abort controller for this operation
    const abortController = new AbortController();
    hashingAbortRef.current = abortController;

    setHashingStage('hashing');
    setHashingProgress(0);
    setFileHashes(null);
    setDeduplicationStats(null);

    try {
      // hashFilesAsync uses:
      // - Web Workers for non-blocking UI (falls back to main thread if unavailable)
      // - Dynamic concurrency based on file sizes (50 parallel for tiny, 2 for huge)
      // - Automatic retry for transient failures
      // - Cancellation via AbortSignal
      const result = await hashFilesAsync(files, {
        signal: abortController.signal,
        onProgress: (progress) => {
          setHashingProgress(Math.round((progress.completed / progress.total) * 100));
        },
      });

      // Check if cancelled
      if (result.cancelled) {
        setHashingStage('cancelled');
        return;
      }

      // Log any errors (files that failed to hash will be uploaded as "new")
      if (result.errors.size > 0) {
        console.warn(`Smart Deploy: ${result.errors.size} files failed to hash (will upload as new):`,
          Object.fromEntries(result.errors));
      }

      const hashes = result.results;
      setFileHashes(hashes);

      // Calculate deduplication stats (always calculate to show potential savings)
      let cachedFilesCount = 0;
      let cachedSize = 0;
      let newFilesCount = 0;
      let newSize = 0;
      let billableSize = 0;

      files.forEach(file => {
        const path = file.webkitRelativePath || file.name;
        const hash = hashes.get(path);
        const cached = hash ? getFileHashEntry(hash) : null;

        if (cached) {
          cachedFilesCount++;
          cachedSize += file.size;
        } else {
          newFilesCount++;
          newSize += file.size;
          // Only add to billable if over free limit
          if (!isFileFree(file.size, freeUploadLimitBytes)) {
            billableSize += file.size;
          }
        }
      });

      setDeduplicationStats({
        totalFiles: files.length,
        cachedFiles: cachedFilesCount,
        newFiles: newFilesCount,
        cachedSize,
        newSize,
        billableSize,
      });
      setHashingStage('complete');
    } catch (error) {
      // Check if this was a cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        setHashingStage('cancelled');
        return;
      }

      console.warn('Hashing failed, will upload all files:', error);
      setFileHashes(null);

      // Calculate billable size for all files (fallback when hashing fails)
      let totalSizeCalc = 0;
      let billableSize = 0;
      files.forEach(f => {
        totalSizeCalc += f.size;
        if (!isFileFree(f.size, freeUploadLimitBytes)) {
          billableSize += f.size;
        }
      });
      setDeduplicationStats({
        totalFiles: files.length,
        cachedFiles: 0,
        newFiles: files.length,
        cachedSize: 0,
        newSize: totalSizeCalc,
        billableSize,
      });
      setHashingStage('complete');
    }
  }, [getFileHashEntry, freeUploadLimitBytes]);

  // Reset analysis state and cancel any ongoing hashing
  const resetAnalysis = useCallback(() => {
    // Cancel any ongoing hashing
    if (hashingAbortRef.current) {
      hashingAbortRef.current.abort();
      hashingAbortRef.current = null;
    }
    setHashingProgress(0);
    setHashingStage('idle');
    setFileHashes(null);
    setDeduplicationStats(null);
  }, []);

  // Cleanup worker pool on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing hashing
      if (hashingAbortRef.current) {
        hashingAbortRef.current.abort();
      }
      // Note: We don't terminate the worker pool here because it's shared
      // across multiple components. The pool will be cleaned up when the
      // page unloads.
    };
  }, []);

  // Get config function from store
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);

  // Create Turbo client with proper walletAdapter based on wallet type
  const createTurboClient = useCallback(async (tokenTypeOverride?: string): Promise<TurboAuthenticatedClient> => {
    // Validate wallet state first
    validateWalletState();

    // Get turbo config based on the token type (use override if provided, otherwise use wallet type)
    const effectiveTokenType = tokenTypeOverride || walletType;
    const config = getCurrentConfig();
    const dynamicTurboConfig: TurboUnauthenticatedConfiguration = {
      paymentServiceConfig: { url: config.paymentServiceUrl },
      uploadServiceConfig: { url: config.uploadServiceUrl },
      processId: config.processId,
      ...(effectiveTokenType && config.tokenMap[effectiveTokenType as keyof typeof config.tokenMap]
        ? { gatewayUrl: config.tokenMap[effectiveTokenType as keyof typeof config.tokenMap] }
        : {})
    };

    // HOTFIX: Detect corrupted wallet type (contains address instead of type)
    let actualWalletType = walletType;
    if (walletType && walletType.length > 20) {
      // Detect wallet type based on address format
      if (address?.startsWith('0x')) {
        actualWalletType = 'ethereum';
      } else if (address && address.length >= 32 && address.length <= 44 && !/[_-]/.test(address)) {
        actualWalletType = 'solana';
      } else if (address && address.length === 43) {
        actualWalletType = 'arweave';
      } else {
        actualWalletType = 'arweave'; // Default fallback for Arweave
      }
    }

    switch (actualWalletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet extension not found. Please install from https://wander.app');
        }
        const signer = new ArconnectSigner(window.arweaveWallet);
        return TurboFactory.authenticated({
          ...dynamicTurboConfig,
          signer,
          // Use token type override if provided (for JIT with ARIO)
          ...(tokenTypeOverride && tokenTypeOverride !== 'arweave' ? { token: tokenTypeOverride as any } : {})
        });

      case 'ethereum':
        return createEthereumTurboClient(tokenTypeOverride || 'ethereum');

      case 'solana':
        if (walletType !== 'solana') {
          throw new Error('Internal error: Attempting Solana operations with non-Solana wallet');
        }
        if (!window.solana) {
          throw new Error('Solana wallet extension not found. Please install Phantom or Solflare');
        }
        if (!window.solana.isConnected || !window.solana.publicKey) {
          throw new Error('Solana wallet not connected. Please connect your Solana wallet first.');
        }
        return TurboFactory.authenticated({
          token: "solana",
          walletAdapter: window.solana,
          ...dynamicTurboConfig,
        });

      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [address, walletType, getCurrentConfig, validateWalletState, createEthereumTurboClient]);


  // Smart content type detection based on file extensions
  const getContentType = useCallback((file: File): string => {
    // Use file.type if available and valid
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }

    // Fallback to extension-based detection
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',

      // Documents
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'txt': 'text/plain',
      'md': 'text/markdown',

      // Fonts
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'otf': 'font/otf',

      // Other
      'pdf': 'application/pdf',
      'zip': 'application/zip',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }, []);

  // Upload with retry logic
  const uploadFileWithRetry = useCallback(async (
    turbo: TurboAuthenticatedClient,
    file: File,
    folderPath: string,
    signal: AbortSignal,
    fundingMode: OnDemandFunding | undefined,
    maxRetries = 3,
    fileHash?: string, // Optional SHA-256 hash for Smart Deploy
    appName?: string, // User's app name for App-Name tag
    appVersion?: string // User's app version for App-Version tag
  ): Promise<any> => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Check if already cancelled before retry
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      try {
        // Build tags array
        const tags = [
          { name: 'Deployed-By', value: APP_NAME },
          { name: 'Deployed-By-Version', value: APP_VERSION },
          { name: 'App-Feature', value: 'Deploy Site' },
          { name: 'Content-Type', value: getContentType(file) },
          { name: 'File-Path', value: file.webkitRelativePath || file.name }
        ];

        // Add hash tag for Smart Deploy deduplication
        if (fileHash) {
          tags.push({ name: 'File-Hash-SHA256', value: fileHash });
        }

        // Add user's App-Name and App-Version tags if provided
        if (appName) {
          tags.push({ name: 'App-Name', value: appName });
        }
        if (appVersion) {
          tags.push({ name: 'App-Version', value: appVersion });
        }

        // Add timeout wrapper for upload
        const uploadPromise = turbo.uploadFile({
          file: file,
          signal: signal, // Pass the abort signal to the SDK
          fundingMode, // Pass JIT funding mode (TypeScript types don't include this yet, but runtime supports it)
          dataItemOpts: {
            tags
          },
          events: {
            // Track progress for individual files
            onProgress: ({ totalBytes, processedBytes }: { totalBytes: number; processedBytes: number }) => {
              const percentage = Math.round((processedBytes / totalBytes) * 100);
              setFileProgress(prev => ({ ...prev, [file.name]: percentage }));
              // Update active upload progress
              setActiveUploads(prev => prev.map(u =>
                u.name === file.name ? { ...u, progress: percentage } : u
              ));
            },
            onError: (error: any) => {
              console.error(`Upload error for ${file.name}:`, error);
            },
            onSuccess: () => {
              // Progress is already tracked by onProgress, just ensure it's at 100%
              setActiveUploads(prev => prev.map(u =>
                u.name === file.name ? { ...u, progress: 100 } : u
              ));
            }
          }
        } as any); // Type assertion needed until SDK types are updated

        // 5 minute timeout per file
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout after 5 minutes')), 5 * 60 * 1000);
        });

        const result = await Promise.race([uploadPromise, timeoutPromise]);
        return result;

      } catch (error) {
        lastError = error;
        console.warn(`Upload attempt ${attempt} failed for ${file.name}:`, error);

        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error(`Failed to upload ${file.name} after ${maxRetries} attempts`);
  }, [getContentType, setFileProgress, setActiveUploads]);

  const deployFolder = useCallback(async (
    files: File[],
    manifestOptions?: {
      indexFile?: string;
      fallbackFile?: string;
      cryptoPayment?: boolean; // If true, top up with crypto first (one payment for all files)
      tokenAmount?: number; // Amount to top up in smallest unit
      selectedToken?: SupportedTokenType; // Token to use for crypto payment
      appName?: string; // User's app/site name (for App-Name tag)
      appVersion?: string; // User's app/site version (for App-Version tag)
    },
    smartDeployEnabled?: boolean // Smart Deploy: skip unchanged files
  ) => {
    // Validate wallet state before any operations
    validateWalletState();

    // Separate cached vs new files for Smart Deploy
    const cachedFilesForManifest: Array<{ file: File; hash: string; txId: string }> = [];
    const filesToUpload: File[] = [];

    if (smartDeployEnabled && fileHashes) {
      files.forEach(file => {
        const path = file.webkitRelativePath || file.name;
        const hash = fileHashes.get(path);

        if (hash) {
          const cached = getFileHashEntry(hash);
          if (cached) {
            cachedFilesForManifest.push({ file, hash, txId: cached.txId });
          } else {
            filesToUpload.push(file);
          }
        } else {
          // Hash not found (hashing failed for this file), treat as new
          filesToUpload.push(file);
        }
      });
    } else {
      // Smart Deploy disabled or hashing failed - upload all files
      filesToUpload.push(...files);
    }

    setDeploying(true);
    setErrors({});
    setFileProgress({});
    setDeployProgress(0);
    setDeployStage('uploading');
    setCurrentFile('');
    setUploadedCount(0);
    setTotalFilesCount(filesToUpload.length); // Only count files being uploaded
    setFailedCount(0);
    setActiveUploads([]);
    setRecentFiles([]);
    setUploadErrors([]);
    setFailedFiles([]);
    setIsCancelled(false);

    // Create a new AbortController for this deployment
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Calculate total size (only for files being uploaded)
    const totalSizeBytes = filesToUpload.reduce((sum, file) => sum + file.size, 0);
    setTotalSize(totalSizeBytes);
    setUploadedSize(0);

    // Use selectedToken if provided for crypto payment
    const selectedToken = manifestOptions?.selectedToken;

    // Handle crypto payment: top up once for all files before uploading
    if (manifestOptions?.cryptoPayment && selectedToken && manifestOptions?.tokenAmount) {
      try {
        const turbo = await createTurboClient(selectedToken);
        await turbo.topUpWithTokens({
          tokenAmount: BigInt(manifestOptions.tokenAmount),
        });
        // Dispatch balance refresh event
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
              // Success - continue with deployment
            } else {
              throw new Error('Transaction confirmation failed after retry');
            }
          } catch (retryError) {
            setDeploying(false);
            const retryMsg = retryError instanceof Error ? retryError.message : 'Unknown error';
            throw new Error(`Crypto payment polling timed out. Your transaction (${txId}) may have succeeded - check your balance or try "Buy Credits" to resubmit. Error: ${retryMsg}`);
          }
        } else {
          setDeploying(false);
          throw new Error(`Crypto payment failed: ${errorMessage}`);
        }
      }
    }

    // No per-file JIT needed - we already topped up with crypto payment above
    const fundingMode: OnDemandFunding | undefined = undefined;

    try {
      // IMPORTANT: For uploads after crypto pre-topup, do NOT pass the token type
      // The token type is only needed for topUpWithTokens() (which uses walletAdapter)
      // For uploads, we want to use the cached InjectedEthereumSigner (no extra signature)
      const turbo = await createTurboClient(undefined);
      
      // Starting folder deployment

      // Create folder structure for Turbo SDK (use original files for folder name)
      const folderPath = files[0]?.webkitRelativePath?.split('/')[0] || 'site';

      // Upload files with concurrent batching for better performance
      // For web browser, we need to upload files individually and create a manifest
      // Uploading files with concurrent batches to avoid hanging
      // Note: Only uploading filesToUpload (Smart Deploy skips cached files)

      const fileUploadResults: Array<{
        id: string;
        path: string;
        size: number;
        receipt: any;
      }> = [];
      const totalFiles = filesToUpload.length;
      const BATCH_SIZE = 5; // Upload 5 files concurrently
      let completedFiles = 0;
      const failedUploads: { file: File; error: Error }[] = [];

      // Smart Deploy: Fast path when all files are cached
      if (totalFiles === 0 && cachedFilesForManifest.length > 0) {
        console.log(`Smart Deploy: All ${cachedFilesForManifest.length} files are cached, skipping uploads`);
        setCurrentFile('All files cached - creating manifest...');
        setDeployProgress(90); // Jump to manifest stage
        // Skip upload loop, go straight to manifest creation
      } else {
        // Process files in batches (only filesToUpload - Smart Deploy)
      for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
        // Check if cancelled
        if (isCancelled) {
          setDeploying(false);
          setActiveUploads([]);
          return { results: fileUploadResults, failedFileNames: [] };
        }

        const batch = filesToUpload.slice(i, Math.min(i + BATCH_SIZE, filesToUpload.length));

        // Clear completed files from previous batch and add new batch files
        // This ensures smooth transition without empty state
        setActiveUploads(prev => {
          // Remove files at 100% or failed (-1) from previous batches
          const stillUploading = prev.filter(u => u.progress > 0 && u.progress < 100);
          // Add all files from new batch
          const newFiles = batch.map(file => ({
            name: file.name,
            progress: 0,
            size: file.size
          }));
          // Combine and limit to reasonable size
          return [...stillUploading, ...newFiles].slice(-10);
        });

        // Upload batch concurrently
        const batchPromises = batch.map(async (file) => {
          try {

            // Set current file being uploaded
            setCurrentFile(file.name);
            setFileProgress(prev => {
              // Limit object size to prevent memory issues
              const newProgress = { ...prev };
              // Only keep last 1000 file progress entries to prevent memory issues
              const keys = Object.keys(newProgress);
              if (keys.length > 1000) {
                // Remove oldest entries
                keys.slice(0, keys.length - 1000).forEach(key => delete newProgress[key]);
              }
              newProgress[file.name] = 0;
              return newProgress;
            });

            // Get the hash for this file (for Smart Deploy tagging)
            const filePath = file.webkitRelativePath || file.name;
            const hash = fileHashes?.get(filePath);

            // Regular upload with retry logic and timeout (pass hash for Smart Deploy tag + app metadata)
            const fileResult = await uploadFileWithRetry(
              turbo, file, folderPath, controller.signal, fundingMode, 3, hash,
              manifestOptions?.appName, manifestOptions?.appVersion
            );

            // Mark file as complete in active uploads (keep at 100%)
            setActiveUploads(prev => prev.map(u =>
              u.name === file.name ? { ...u, progress: 100 } : u
            ));

            // Don't remove completed files - they'll be cleared when next batch starts

            // Add to recent files (keep last 20)
            setRecentFiles(prev => [
              {
                name: file.name,
                size: file.size,
                status: 'success' as const,
                timestamp: Date.now()
              },
              ...prev
            ].slice(0, 20));

            fileUploadResults.push({
              id: fileResult.id,
              path: file.webkitRelativePath || file.name,
              size: file.size,
              receipt: fileResult // Store full result as receipt
            });

            completedFiles += 1;
            setUploadedCount(completedFiles);
            setUploadedSize(prev => prev + file.size);
            setDeployProgress(Math.round((completedFiles / totalFiles) * 90)); // Reserve 10% for manifest

            return { success: true, file };

          } catch (fileError: any) {
            // Check if error is due to cancellation
            if (fileError.message === 'Upload cancelled' || controller.signal.aborted) {
              // Don't log cancellation as an error, just skip
              return null;
            }
            // Mark file as failed but continue with other files
            console.error(`Failed to upload ${file.name}:`, fileError);
            setFileProgress(prev => ({ ...prev, [file.name]: -1 })); // -1 indicates error
            setErrors(prev => ({ ...prev, [file.name]: fileError instanceof Error ? fileError.message : 'Upload failed' }));

            // Mark as failed in active uploads (set to -1 to indicate error)
            setActiveUploads(prev => prev.map(u =>
              u.name === file.name ? { ...u, progress: -1 } : u
            ));

            // Don't remove failed files - they'll be cleared when next batch starts

            // Add to recent files as error
            setRecentFiles(prev => [
              {
                name: file.name,
                size: file.size,
                status: 'error' as const,
                error: fileError instanceof Error ? fileError.message : 'Upload failed',
                timestamp: Date.now()
              },
              ...prev
            ].slice(0, 20));

            // Add to upload errors
            setUploadErrors(prev => [
              ...prev,
              {
                fileName: file.name,
                error: fileError instanceof Error ? fileError.message : 'Upload failed',
                retryable: true
              }
            ]);

            failedUploads.push({
              file,
              error: fileError instanceof Error ? fileError : new Error('Upload failed')
            });

            setFailedCount(prev => prev + 1);
            setUploadedCount(prev => prev + 1); // Still count as processed

            return { success: false, file, error: fileError };
          }
        });

        // Wait for batch to complete before starting next batch
        await Promise.allSettled(batchPromises);

        // Check again if cancelled after batch completes
        if (isCancelled || controller.signal.aborted) {
          setDeploying(false);
          setActiveUploads([]);
          abortControllerRef.current = null;
          return { results: fileUploadResults, failedFileNames: [] };
        }

        // Check if we should abort due to too many failures
        if (failedUploads.length > totalFiles * 0.1) { // Stop if more than 10% failed
          throw new Error(`Too many upload failures (${failedUploads.length}/${totalFiles}). Stopping deployment.`);
        }

        // No need to pre-add files anymore - the UI handles transitions smoothly
      }

        // If some files failed but not too many, log them but continue
        if (failedUploads.length > 0) {
          console.warn(`${failedUploads.length} files failed to upload:`, failedUploads);
          // Optionally continue with successful uploads
          if (fileUploadResults.length === 0 && cachedFilesForManifest.length === 0) {
            throw new Error('All file uploads failed');
          }
        }
      } // End of else block for non-cached files

      // Check if cancelled before manifest creation
      if (isCancelled || controller.signal.aborted) {
        setDeploying(false);
        setActiveUploads([]);
        abortControllerRef.current = null;
        return { results: fileUploadResults, failedFileNames: [] };
      }

      // Switch to manifest creation stage
      setDeployStage('manifest');
      setCurrentFile('Creating manifest...');
      setDeployProgress(90);

      // Clear all active uploads since we're done with file uploads
      setActiveUploads([]);

      // Smart Deploy: Combine cached files with newly uploaded files for manifest
      const allFilesForManifest: Array<{
        id: string;
        path: string;
        size: number;
      }> = [
        // Cached files (reused from previous deployments)
        ...cachedFilesForManifest.map(({ file, txId }) => ({
          id: txId,
          path: file.webkitRelativePath || file.name,
          size: file.size,
        })),
        // Newly uploaded files
        ...fileUploadResults.map(result => ({
          id: result.id,
          path: result.path,
          size: result.size,
        })),
      ];

      // Update file hash cache with newly uploaded files
      if (smartDeployEnabled && fileHashes && fileUploadResults.length > 0) {
        const newCacheEntries = fileUploadResults
          .map(result => {
            const hash = fileHashes.get(result.path);
            if (!hash) return null;
            const file = filesToUpload.find(f => (f.webkitRelativePath || f.name) === result.path);
            return {
              hash,
              txId: result.id,
              size: result.size,
              contentType: file ? getContentType(file) : 'application/octet-stream',
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        if (newCacheEntries.length > 0) {
          updateFileHashCache(newCacheEntries);
        }
      }

      // Create manifest using version 0.2.0 spec with fallback support
      const manifestData = {
        manifest: 'arweave/paths',
        version: '0.2.0',
        index: {
          path: manifestOptions?.indexFile
            ? (manifestOptions.indexFile.startsWith(folderPath + '/')
                ? manifestOptions.indexFile.substring(folderPath.length + 1)
                : manifestOptions.indexFile)
            : 'index.html'
        },
        ...(manifestOptions?.fallbackFile && (() => {
          // Find the fallback file by exact path match or relative path match
          // Search in all files (both cached and newly uploaded)
          const fallbackFile = allFilesForManifest.find(file => {
            const relativePath = file.path.startsWith(folderPath + '/')
              ? file.path.substring(folderPath.length + 1)
              : file.path;

            return file.path === manifestOptions.fallbackFile ||
                   relativePath === manifestOptions.fallbackFile ||
                   file.path.endsWith('/' + manifestOptions.fallbackFile);
          });

          if (!fallbackFile) {
            console.warn(`Warning: Specified fallback file "${manifestOptions.fallbackFile}" not found in uploaded files. No fallback will be set.`);
            return {};
          }

          return {
            fallback: {
              id: fallbackFile.id
            }
          };
        })()),
        paths: allFilesForManifest.reduce((acc, file) => {
          const relativePath = file.path.startsWith(folderPath + '/')
            ? file.path.substring(folderPath.length + 1)
            : file.path;
          acc[relativePath] = {
            id: file.id
          };
          return acc;
        }, {} as Record<string, { id: string }>)
      };
      
      // Upload manifest
      const manifestBlob = new Blob([JSON.stringify(manifestData, null, 2)], {
        type: 'application/x.arweave-manifest+json'
      });
      
      const manifestFile = new File([manifestBlob], 'manifest.json', {
        type: 'application/x.arweave-manifest+json'
      });

      // Build manifest tags
      const manifestTags = [
        { name: 'Deployed-By', value: APP_NAME },
        { name: 'Deployed-By-Version', value: APP_VERSION },
        { name: 'App-Feature', value: 'Deploy Site' },
        { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
        { name: 'Type', value: 'manifest' }
      ];

      // Add user's App-Name and App-Version tags if provided
      if (manifestOptions?.appName) {
        manifestTags.push({ name: 'App-Name', value: manifestOptions.appName });
      }
      if (manifestOptions?.appVersion) {
        manifestTags.push({ name: 'App-Version', value: manifestOptions.appVersion });
      }

      // Upload manifest with Turbo SDK
      const manifestResult = await turbo.uploadFile({
        file: manifestFile,
        signal: controller.signal,
        dataItemOpts: {
          tags: manifestTags
        }
      } as any); // Type assertion needed until SDK types are updated
      
      const uploadResult = {
        manifestId: manifestResult.id,
        // Include all files in manifest (cached + newly uploaded)
        files: allFilesForManifest.map(f => ({
          id: f.id,
          path: f.path,
          size: f.size,
          receipt: fileUploadResults.find(r => r.path === f.path)?.receipt // Only new uploads have receipts
        }))
      };

      // Folder deployment completed

      // Create results structure
      const results: DeployResult[] = [];

      // Add manifest result
      results.push({
        type: 'manifest',
        id: uploadResult.manifestId,
        manifestId: uploadResult.manifestId,
        timestamp: Date.now(),
        receipt: manifestResult, // Store manifest upload result
        appName: manifestOptions?.appName,
        appVersion: manifestOptions?.appVersion,
      });

      // Add individual files
      if (uploadResult.files && uploadResult.files.length > 0) {
        results.push({
          type: 'files',
          manifestId: uploadResult.manifestId,
          files: uploadResult.files,
          timestamp: Date.now()
        });
      }
      
      // Add new results to existing results (prepend for newest first)
      setDeployResults(prev => [...results, ...prev]);
      setDeployProgress(100);
      setDeployStage('complete');
      setCurrentFile('');
      abortControllerRef.current = null; // Clear the controller when done

      return {
        manifestId: uploadResult.manifestId,
        files: uploadResult.files,
        results
      };
    } catch (error) {
      // Deployment failed
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      setErrors({ deployment: errorMessage });
      abortControllerRef.current = null; // Clear the controller on error
      throw error;
    } finally {
      setDeploying(false);
    }
  }, [createTurboClient, validateWalletState, isCancelled, uploadFileWithRetry, walletType, freeUploadLimitBytes, getContentType, fileHashes, getFileHashEntry, updateFileHashCache]);

  const reset = useCallback(() => {
    setDeployProgress(0);
    setFileProgress({});
    setDeployStage('idle');
    setCurrentFile('');
    setErrors({});
    setDeploying(false);
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
    abortControllerRef.current = null;
    // Don't clear results in reset - that's now separate
  }, []);

  const clearResults = useCallback(() => {
    setDeployResults([]);
  }, []);

  const updateDeployStage = useCallback((stage: 'idle' | 'uploading' | 'manifest' | 'updating-arns' | 'complete' | 'cancelled') => {
    setDeployStage(stage);

    // Keep deploying true during ArNS updates, only set false on complete or cancelled
    if (stage === 'complete' || stage === 'cancelled') {
      setDeploying(false);
    } else if (stage !== 'idle') {
      setDeploying(true);
    }
  }, []);

  // Retry failed files
  const retryFailedFiles = useCallback(async () => {
    if (failedFiles.length === 0) return;

    // Reset failed state
    setFailedCount(0);
    setUploadErrors([]);

    // Re-attempt upload of failed files
    // This would call deployFolder with just the failed files
    // Implementation depends on how you want to handle partial retries
  }, [failedFiles]);

  // Cancel ongoing uploads
  const cancelUploads = useCallback(() => {
    setIsCancelled(true);
    // Abort all in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDeploying(false);
    setActiveUploads([]);
    setDeployStage('cancelled');
  }, []);

  return {
    deployFolder,
    deploying,
    deployProgress,
    fileProgress,
    deployStage,
    currentFile,
    deployResults,
    errors,
    reset,
    clearResults,
    updateDeployStage,
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
    // Smart Deploy state
    analyzeFolder,
    hashingProgress,
    hashingStage,
    deduplicationStats,
    resetAnalysis,
  };
}