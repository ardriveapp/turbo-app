import { useState, useCallback } from 'react';
import { 
  TurboFactory, 
  TurboAuthenticatedClient,
  ArconnectSigner,
  SolanaWalletAdapter
} from '@ardrive/turbo-sdk/web';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { turboConfig } from '../constants';
import { useStore } from '../store/useStore';

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

export function useFolderUpload() {
  const store = useStore();
  const { address, walletType } = store;
  
  // useFolderUpload store state logged
  const [deploying, setDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState<number>(0);
  const [deployResults, setDeployResults] = useState<DeployResult[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create Turbo client with proper walletAdapter based on wallet type
  const createTurboClient = useCallback(async (): Promise<TurboAuthenticatedClient> => {
    if (!address || !walletType) {
      throw new Error('Wallet not connected');
    }
    
    console.log('Deploy hook wallet info:', { address, walletType });
    
    // HOTFIX: Detect corrupted wallet type (contains address instead of type)
    let actualWalletType = walletType;
    if (walletType && walletType.length > 20) {
      console.warn('🔧 HOTFIX: walletType contains address, detecting actual type...');
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
      console.log('🔧 Detected wallet type:', actualWalletType);
    }
    
    switch (actualWalletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet extension not found. Please install from https://wander.app');
        }
        // Creating ArconnectSigner for Wander wallet
        const signer = new ArconnectSigner(window.arweaveWallet);
        return TurboFactory.authenticated({ 
          ...turboConfig,
          signer 
        });
        
      case 'ethereum':
        if (!window.ethereum) {
          throw new Error('Ethereum wallet extension not found. Please install MetaMask or WalletConnect');
        }
        // Creating Ethereum walletAdapter
        const ethersProvider = new ethers.BrowserProvider(window.ethereum);
        const ethersSigner = await ethersProvider.getSigner();
        
        return TurboFactory.authenticated({
          token: "ethereum",
          walletAdapter: {
            getSigner: () => ethersSigner as any,
          },
          ...turboConfig,
        });
        
      case 'solana':
        if (!window.solana) {
          throw new Error('Solana wallet extension not found. Please install Phantom or Solflare');
        }
        // Creating Solana walletAdapter
        const provider = window.solana;
        const publicKey = new PublicKey((await provider.connect()).publicKey);

        const walletAdapter: SolanaWalletAdapter = {
          publicKey,
          signMessage: async (message: Uint8Array) => {
            const { signature } = await provider.signMessage(message);
            return signature;
          },
        };

        return TurboFactory.authenticated({
          token: "solana",
          walletAdapter,
          ...turboConfig,
        });
        
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [address, walletType]);

  const deployFolder = useCallback(async (files: File[], manifestOptions?: { indexFile?: string; fallbackFile?: string }) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setDeploying(true);
    setErrors({});
    // Don't clear existing results - accumulate them
    setDeployProgress(0);

    try {
      // Creating Turbo client for folder deployment
      const turbo = await createTurboClient();
      
      // Starting folder deployment
      
      // Create folder structure for Turbo SDK
      const folderPath = files[0]?.webkitRelativePath?.split('/')[0] || 'site';
      
      // Upload files individually and create manifest
      // For web browser, we need to upload files individually and create a manifest
      // Uploading files individually to create manifest
      
      const fileUploadResults = [];
      let processedBytes = 0;
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      
      // Upload each file individually
      for (const file of files) {
        try {
          // Uploading individual file
          
          const fileResult = await turbo.uploadFile({
            file: file,
            dataItemOpts: {
              tags: [
                { name: 'Content-Type', value: file.type || 'application/octet-stream' },
                { name: 'File-Path', value: file.webkitRelativePath || file.name },
                { name: 'App-Name', value: 'Turbo-Deploy' }
              ]
            }
          });
          
          fileUploadResults.push({
            id: fileResult.id,
            path: file.webkitRelativePath || file.name,
            size: file.size,
            receipt: fileResult // Store full result as receipt
          });
          
          processedBytes += file.size;
          setDeployProgress(Math.round((processedBytes / totalBytes) * 90)); // Reserve 10% for manifest
          
        } catch (fileError) {
          // Failed to upload individual file
          throw new Error(`Failed to upload ${file.name}: ${fileError}`);
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
        ...(manifestOptions?.fallbackFile && {
          fallback: {
            id: fileUploadResults.find(file => 
              file.path.endsWith(manifestOptions.fallbackFile!)
            )?.id || fileUploadResults.find(file => 
              file.path.endsWith('index.html')
            )?.id
          }
        }),
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
        dataItemOpts: {
          tags: [
            { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
            { name: 'App-Name', value: 'Turbo-Deploy' },
            { name: 'Type', value: 'manifest' }
          ]
        }
      });
      
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
          files: uploadResult.files,
          timestamp: Date.now()
        });
      }
      
      // Add new results to existing results (prepend for newest first)
      setDeployResults(prev => [...results, ...prev]);
      setDeployProgress(100);
      
      return {
        manifestId: uploadResult.manifestId,
        files: uploadResult.files,
        results
      };
    } catch (error) {
      // Deployment failed
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      setErrors({ deployment: errorMessage });
      throw error;
    } finally {
      setDeploying(false);
    }
  }, [address, createTurboClient]);

  const reset = useCallback(() => {
    setDeployProgress(0);
    setErrors({});
    setDeploying(false);
    // Don't clear results in reset - that's now separate
  }, []);

  const clearResults = useCallback(() => {
    setDeployResults([]);
  }, []);

  return {
    deployFolder,
    deploying,
    deployProgress,
    deployResults,
    errors,
    reset,
    clearResults,
  };
}