import { useState, useCallback } from 'react';
import {
  TurboFactory,
  TurboAuthenticatedClient,
  ArconnectSigner,
  SolanaWalletAdapter
} from '@ardrive/turbo-sdk/web';
// Removed unused imports - now using walletAdapter pattern instead of direct signers
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { useStore } from '../store/useStore';
import { useTurboConfig } from './useTurboConfig';
import { useWallets } from '@privy-io/react-auth';

interface UploadResult {
  id: string;
  owner: string;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  winc: string;
  timestamp?: number;
  receipt?: any; // Store the full receipt response
}

export function useFileUpload() {
  const { address, walletType } = useStore();
  const turboConfig = useTurboConfig();
  const { wallets } = useWallets(); // Get Privy wallets
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Create Turbo client with proper walletAdapter based on wallet type
  const createTurboClient = useCallback(async (): Promise<TurboAuthenticatedClient> => {
    // Validate wallet state first
    validateWalletState();
    
    switch (walletType) {
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
        // Check if this is a Privy embedded wallet
        const privyWallet = wallets.find(w => w.walletClientType === 'privy');

        if (privyWallet) {
          // Use Privy embedded wallet
          const provider = await privyWallet.getEthereumProvider();
          const ethersProvider = new ethers.BrowserProvider(provider);
          const ethersSigner = await ethersProvider.getSigner();

          return TurboFactory.authenticated({
            token: "ethereum",
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
            token: "ethereum",
            walletAdapter: {
              getSigner: () => ethersSigner as any,
            },
            ...turboConfig,
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
        
        const publicKey = new PublicKey(existingPublicKey);

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
  }, [address, walletType, wallets, turboConfig, validateWalletState]);

  const uploadFile = useCallback(async (file: File) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const fileName = file.name;
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    
    try {
      // Creating Turbo client for upload
      const turbo = await createTurboClient();
      
      // Starting upload for file
      
      // Upload file using the proper uploadFile method for browsers
      const uploadResult = await turbo.uploadFile({
        file: file,  // Pass the File object directly
        dataItemOpts: {
          tags: [
            { name: 'Content-Type', value: file.type || 'application/octet-stream' },
            { name: 'File-Name', value: file.name }
          ]
        },
        events: {
          // Overall progress (includes both signing and upload)
          onProgress: ({ totalBytes, processedBytes }) => {
            const percentage = Math.round((processedBytes / totalBytes) * 100);
            setUploadProgress(prev => ({ ...prev, [fileName]: percentage }));
            // Upload progress tracked
          },
          onError: (error: any) => {
            // Upload error occurred
            const errorMessage = error?.message || 'Upload failed';
            setErrors(prev => ({ ...prev, [fileName]: errorMessage }));
          },
          onSuccess: () => {
            // Upload completed successfully
            setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
          }
        }
      });
      
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
  }, [address, createTurboClient]);

  const uploadMultipleFiles = useCallback(async (files: File[]) => {
    // Validate wallet state before any operations
    validateWalletState();
    
    setUploading(true);
    setErrors({});
    setUploadResults([]);
    
    const results: UploadResult[] = [];
    const failedFiles: string[] = [];

    for (const file of files) {
      try {
        // Starting upload for file
        const result = await uploadFile(file);
        // Upload completed for file
        results.push(result);
        setUploadResults(prev => [...prev, result]);
      } catch (error) {
        // Failed to upload file
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setErrors(prev => ({ ...prev, [file.name]: errorMessage }));
        failedFiles.push(file.name);
        
        // Error details logged for debugging
      }
    }

    setUploading(false);
    // Upload summary processed
    return { results, failedFiles };
  }, [uploadFile, validateWalletState]);

  const reset = useCallback(() => {
    setUploadProgress({});
    setUploadResults([]);
    setErrors({});
    setUploading(false);
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    uploading,
    uploadProgress,
    uploadResults,
    errors,
    reset,
  };
}