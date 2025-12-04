import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { X402Funding } from '@ardrive/turbo-sdk/web';
import { createWalletClient, custom } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { APP_NAME, APP_VERSION, X402_CONFIG } from '../constants';
import { getContentType } from '../utils/mimeTypes';
import { useEthereumTurboClient } from './useEthereumTurboClient';
import type { Signer as X402Signer } from 'x402-fetch';

export interface X402UploadOptions {
  maxUsdcAmount: number; // In USDC (6 decimals), e.g., 2.5 for 2.5 USDC
  onProgress?: (progress: number) => void;
  tags?: Array<{ name: string; value: string }>;
}

export interface X402UploadResult {
  id: string;
  owner: string;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  winc: string;
  paidUsdcAmount?: string; // Amount of USDC paid (if payment was required)
  receipt: any;
}

/**
 * Creates an x402 signer (viem WalletClient) for the appropriate network
 * Supports both Base Mainnet and Base Sepolia based on config mode
 */
async function createX402Signer(
  ethProvider: any,
  useMainnet: boolean
): Promise<X402Signer> {
  // Request accounts to get the connected account
  const accounts = (await ethProvider.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned from wallet');
  }

  const account = accounts[0] as `0x${string}`;
  const chain = useMainnet ? base : baseSepolia;

  // Create a wallet client that matches the x402Signer type
  // The SDK expects a viem WalletClient
  return createWalletClient({
    account,
    chain,
    transport: custom(ethProvider),
  }) as unknown as X402Signer;
}

// Module-level cache for x402 signer only (Turbo client is shared via useEthereumTurboClient)
interface CachedX402Signer {
  signer: X402Signer;
  address: string;
  useMainnet: boolean;
}

let sharedX402SignerCache: CachedX402Signer | null = null;

export function useX402Upload() {
  const { configMode } = useStore();
  const { wallets } = useWallets();
  const { createEthereumTurboClient } = useEthereumTurboClient();
  const [uploading, setUploading] = useState(false);

  const uploadFileWithX402 = useCallback(
    async (file: File, options: X402UploadOptions): Promise<X402UploadResult> => {
      setUploading(true);

      try {
        // Determine network (Base Mainnet or Sepolia)
        // Only development mode uses Sepolia testnet, production and custom use Mainnet
        const useMainnet = configMode !== 'development';
        const chainId = useMainnet
          ? X402_CONFIG.chainIds.production
          : X402_CONFIG.chainIds.development;

        // Get Ethereum provider (Privy or MetaMask)
        const privyWallet = wallets.find((w) => w.walletClientType === 'privy');
        let ethProvider;

        if (privyWallet) {
          ethProvider = await privyWallet.getEthereumProvider();
        } else if (window.ethereum) {
          ethProvider = window.ethereum;
        } else {
          throw new Error('No Ethereum wallet found');
        }

        let ethersProvider = new ethers.BrowserProvider(ethProvider);
        let ethersSigner = await ethersProvider.getSigner();
        const userAddress = await ethersSigner.getAddress();

        // Check and switch network if needed
        const network = await ethersProvider.getNetwork();
        const currentChainId = Number(network.chainId);

        if (currentChainId !== chainId) {
          console.log(`Network mismatch. Current: ${currentChainId}, Expected: ${chainId}`);

          // Only attempt auto-switching for regular wallets (not Privy)
          if (window.ethereum && !privyWallet) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${chainId.toString(16)}` }],
              });
              console.log(`Switched to chain ID ${chainId}`);

              // Wait for network switch to complete
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Create fresh provider and signer after switch
              ethersProvider = new ethers.BrowserProvider(window.ethereum);
              ethersSigner = await ethersProvider.getSigner();
            } catch (switchError: any) {
              // Error 4902 means the network doesn't exist in MetaMask - add it first
              if (switchError.code === 4902) {
                const networkName = useMainnet ? 'Base Network' : 'Base Sepolia testnet';
                const rpcUrl = useMainnet
                  ? 'https://mainnet.base.org'
                  : 'https://sepolia.base.org';
                const blockExplorerUrl = useMainnet
                  ? 'https://basescan.org'
                  : 'https://sepolia.basescan.org';

                try {
                  await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                      {
                        chainId: `0x${chainId.toString(16)}`,
                        chainName: networkName,
                        nativeCurrency: {
                          name: 'Ethereum',
                          symbol: 'ETH',
                          decimals: 18,
                        },
                        rpcUrls: [rpcUrl],
                        blockExplorerUrls: [blockExplorerUrl],
                      },
                    ],
                  });
                  console.log(`Added and switched to ${networkName}`);

                  // Wait for network add/switch to complete
                  await new Promise((resolve) => setTimeout(resolve, 1000));

                  // Create fresh provider and signer after add
                  ethersProvider = new ethers.BrowserProvider(window.ethereum);
                  ethersSigner = await ethersProvider.getSigner();
                } catch {
                  throw new Error(
                    `Failed to add ${networkName} to your wallet. Please add it manually.`
                  );
                }
              } else {
                const networkName = useMainnet ? 'Base Network' : 'Base Sepolia testnet';
                throw new Error(
                  `Please switch to ${networkName} in your wallet for X402 payments.`
                );
              }
            }
          } else {
            const networkName = useMainnet ? 'Base Network' : 'Base Sepolia testnet';
            throw new Error(
              `Please switch to ${networkName} in your wallet for X402 payments.`
            );
          }
        }

        options.onProgress?.(10); // Network setup complete

        // Get or create x402 signer (viem WalletClient for USDC payments)
        let x402Signer: X402Signer;
        if (
          sharedX402SignerCache &&
          sharedX402SignerCache.address === userAddress &&
          sharedX402SignerCache.useMainnet === useMainnet
        ) {
          console.log('Reusing cached x402 signer');
          x402Signer = sharedX402SignerCache.signer;
        } else {
          console.log('Creating new x402 signer...');
          x402Signer = await createX402Signer(ethProvider, useMainnet);
          sharedX402SignerCache = {
            signer: x402Signer,
            address: userAddress,
            useMainnet,
          };
        }

        options.onProgress?.(15);

        // Get Turbo client from the shared hook - this reuses the same client
        // and connect signature as regular uploads
        console.log('Getting shared Turbo client for x402 upload...');
        const turbo = await createEthereumTurboClient('base-usdc');

        options.onProgress?.(20); // Client ready

        // Prepare tags
        const tags = [
          { name: 'App-Name', value: APP_NAME },
          { name: 'App-Feature', value: 'File Upload' },
          { name: 'App-Version', value: APP_VERSION },
          { name: 'Content-Type', value: getContentType(file) },
          { name: 'File-Name', value: file.name },
          ...(options.tags || []),
        ];

        // Convert maxUsdcAmount to smallest unit (6 decimals) - mUSDC
        const maxMUSDCAmount = Math.ceil(options.maxUsdcAmount * 1_000_000);

        console.log(
          `Uploading ${file.name} (${file.size} bytes) with x402, max ${options.maxUsdcAmount} USDC`
        );

        options.onProgress?.(30); // Starting upload

        // Upload using SDK's X402Funding mode
        const result = await turbo.uploadFile({
          fileStreamFactory: () => file.stream(),
          fileSizeFactory: () => file.size,
          dataItemOpts: { tags },
          fundingMode: new X402Funding({
            signer: x402Signer,
            maxMUSDCAmount,
          }),
          events: {
            onProgress: (event: { totalBytes: number; processedBytes: number; step: string }) => {
              // Calculate percentage from bytes
              const pct = event.totalBytes > 0 ? (event.processedBytes / event.totalBytes) * 100 : 0;
              // Map SDK progress (0-100) to our progress range (30-90)
              const mappedProgress = 30 + pct * 0.6;
              options.onProgress?.(Math.round(mappedProgress));
            },
          },
        });

        console.log(`✅ x402 upload successful! ID: ${result.id}`);
        options.onProgress?.(100); // Upload complete

        return {
          id: result.id,
          owner: result.owner || userAddress,
          dataCaches: result.dataCaches || [],
          fastFinalityIndexes: result.fastFinalityIndexes || [],
          winc: result.winc || '0',
          // Note: SDK doesn't return paid amount directly, but the payment happened if needed
          paidUsdcAmount: undefined,
          receipt: result,
        };
      } catch (error) {
        console.error('x402 upload error:', error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [configMode, wallets, createEthereumTurboClient]
  );

  return {
    uploadFileWithX402,
    uploading,
  };
}
