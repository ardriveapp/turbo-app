import { useState, useCallback, useRef } from 'react';
import {
  TurboFactory,
  TurboAuthenticatedClient,
  ArconnectSigner,
  SolanaWalletAdapter,
  OnDemandFunding,
  TurboUnauthenticatedConfiguration,
} from '@ardrive/turbo-sdk/web';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { useStore } from '../store/useStore';
import { useWallets } from '@privy-io/react-auth';
import { supportsJitPayment } from '../utils/jitPayment';

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
  const { wallets } = useWallets(); // Get Privy wallets

  // useFolderUpload store state logged
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
        // Creating ArconnectSigner for Wander wallet
        const signer = new ArconnectSigner(window.arweaveWallet);
        return TurboFactory.authenticated({
          ...dynamicTurboConfig,
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
            ...dynamicTurboConfig,
          });
        } else {
          // Fallback to regular Ethereum wallet (MetaMask, WalletConnect)
          if (!window.ethereum) {
            throw new Error('Ethereum wallet extension not found. Please install MetaMask or WalletConnect');
          }
          // Creating Ethereum walletAdapter
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const ethersSigner = await ethersProvider.getSigner();

          return TurboFactory.authenticated({
            token: (tokenTypeOverride || "ethereum") as any, // Use base-eth for JIT, ethereum otherwise
            walletAdapter: {
              getSigner: () => ethersSigner as any,
            },
            ...dynamicTurboConfig,
          });
        }
        
      case 'solana':
        // WALLET ISOLATION: Strict validation - only access Solana when explicitly using Solana wallet
        if (walletType !== 'solana') {
          throw new Error('Internal error: Attempting Solana operations with non-Solana wallet');
        }
        
        if (!window.solana) {
          throw new Error('Solana wallet extension not found. Please install Phantom or Solflare');
        }
        
        // Verify this is an intentional Solana connection
        if (!window.solana.isConnected) {
          throw new Error('Solana wallet not connected. Please connect your Solana wallet first.');
        }
        
        // Creating Solana walletAdapter
        const provider = window.solana;
        
        // Use existing connection instead of calling connect() again
        const existingPublicKey = provider.publicKey;
        if (!existingPublicKey) {
          throw new Error('Solana wallet connection lost. Please reconnect your Solana wallet.');
        }

        return TurboFactory.authenticated({
          token: "solana",
          walletAdapter: window.solana,
          ...dynamicTurboConfig,
        });

      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [address, walletType, wallets, getCurrentConfig, validateWalletState]);


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
    maxRetries = 3
  ): Promise<any> => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Check if already cancelled before retry
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      try {
        // Add timeout wrapper for upload
        const uploadPromise = turbo.uploadFile({
          file: file,
          signal: signal, // Pass the abort signal to the SDK
          fundingMode, // Pass JIT funding mode (TypeScript types don't include this yet, but runtime supports it)
          dataItemOpts: {
            tags: [
              { name: 'Content-Type', value: getContentType(file) },
              { name: 'File-Path', value: file.webkitRelativePath || file.name },
              { name: 'App-Name', value: 'Turbo-Deploy' }
            ]
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
      jitEnabled?: boolean;
      jitMaxTokenAmount?: number; // In smallest unit
      jitBufferMultiplier?: number;
    }
  ) => {
    // Validate wallet state before any operations
    validateWalletState();

    setDeploying(true);
    setErrors({});
    setFileProgress({});
    setDeployProgress(0);
    setDeployStage('uploading');
    setCurrentFile('');
    setUploadedCount(0);
    setTotalFilesCount(files.length);
    setFailedCount(0);
    setActiveUploads([]);
    setRecentFiles([]);
    setUploadErrors([]);
    setFailedFiles([]);
    setIsCancelled(false);

    // Create a new AbortController for this deployment
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Calculate total size
    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
    setTotalSize(totalSizeBytes);
    setUploadedSize(0);

    // Determine the token type for JIT payment
    // Arweave wallets must use ARIO for JIT (not AR)
    // Ethereum wallets use Base-ETH for JIT
    const jitTokenType = walletType === 'arweave'
      ? 'ario'
      : walletType === 'ethereum'
      ? 'base-eth'
      : walletType;

    // Create funding mode if JIT enabled and supported
    let fundingMode: OnDemandFunding | undefined = undefined;
    if (manifestOptions?.jitEnabled && jitTokenType && supportsJitPayment(jitTokenType)) {
      fundingMode = new OnDemandFunding({
        maxTokenAmount: manifestOptions.jitMaxTokenAmount || 0,
        topUpBufferMultiplier: manifestOptions.jitBufferMultiplier || 1.1,
      });
    }

    try {
      // Creating Turbo client for folder deployment
      const turbo = await createTurboClient(jitTokenType || undefined);
      
      // Starting folder deployment
      
      // Create folder structure for Turbo SDK
      const folderPath = files[0]?.webkitRelativePath?.split('/')[0] || 'site';
      
      // Upload files with concurrent batching for better performance
      // For web browser, we need to upload files individually and create a manifest
      // Uploading files with concurrent batches to avoid hanging

      const fileUploadResults: Array<{
        id: string;
        path: string;
        size: number;
        receipt: any;
      }> = [];
      const totalFiles = files.length;
      const BATCH_SIZE = 5; // Upload 5 files concurrently
      let completedFiles = 0;
      const failedUploads: { file: File; error: Error }[] = [];

      // Process files in batches
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        // Check if cancelled
        if (isCancelled) {
          setDeploying(false);
          setActiveUploads([]);
          return { results: fileUploadResults, failedFileNames: [] };
        }

        const batch = files.slice(i, Math.min(i + BATCH_SIZE, files.length));

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

            // Upload with retry logic and timeout
            const fileResult = await uploadFileWithRetry(turbo, file, folderPath, controller.signal, fundingMode);

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
        if (fileUploadResults.length === 0) {
          throw new Error('All file uploads failed');
        }
      }
      
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
          const fallbackFile = fileUploadResults.find(file => {
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
        paths: fileUploadResults.reduce((acc, file) => {
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
      
      const manifestResult = await turbo.uploadFile({
        file: manifestFile,
        signal: controller.signal, // Also pass signal to manifest upload
        fundingMode, // Pass JIT funding mode to manifest upload (TypeScript types don't include this yet, but runtime supports it)
        dataItemOpts: {
          tags: [
            { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
            { name: 'App-Name', value: 'Turbo-Deploy' },
            { name: 'Type', value: 'manifest' }
          ]
        }
      } as any); // Type assertion needed until SDK types are updated
      
      const uploadResult = {
        manifestId: manifestResult.id,
        files: fileUploadResults
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
        receipt: manifestResult // Store manifest upload result
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
  }, [createTurboClient, getContentType, validateWalletState, isCancelled, uploadFileWithRetry]);

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
  };
}