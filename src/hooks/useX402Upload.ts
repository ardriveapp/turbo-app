import { useState, useCallback, useRef } from 'react';
import { createData } from 'arbundles';
import { useStore } from '../store/useStore';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { MetaMaskSigner } from '../utils/MetaMaskSigner';
import { APP_NAME, APP_VERSION, X402_CONFIG } from '../constants';
import { getContentType } from '../utils/mimeTypes';

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

export function useX402Upload() {
  const { getCurrentConfig, configMode } = useStore();
  const { wallets } = useWallets();
  const [uploading, setUploading] = useState(false);

  // Reuse MetaMask signer across uploads (only authorize once per session)
  const dataSignerRef = useRef<{ signer: MetaMaskSigner; address: string } | null>(null);

  const uploadFileWithX402 = useCallback(
    async (file: File, options: X402UploadOptions): Promise<X402UploadResult> => {
      setUploading(true);

      try {
        const config = getCurrentConfig();
        // Derive x402 URL from base upload URL
        // x402UploadUrl was removed from config, always derive from uploadServiceUrl
        const x402Url = `${config.uploadServiceUrl}/x402/data-item/signed`;

        // Determine network (Base Mainnet or Sepolia)
        // Only development mode uses Sepolia testnet, production and custom use Mainnet
        const useMainnet = configMode !== 'development';
        const networkKey = useMainnet
          ? X402_CONFIG.supportedNetworks.production
          : X402_CONFIG.supportedNetworks.development;
        const chainId = useMainnet
          ? X402_CONFIG.chainIds.production
          : X402_CONFIG.chainIds.development;
        const usdcAddress = useMainnet
          ? X402_CONFIG.usdcAddresses.production
          : X402_CONFIG.usdcAddresses.development;

        // Get Ethereum signer (Privy or MetaMask)
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
              await new Promise(resolve => setTimeout(resolve, 1000));

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
                    params: [{
                      chainId: `0x${chainId.toString(16)}`,
                      chainName: networkName,
                      nativeCurrency: {
                        name: 'Ethereum',
                        symbol: 'ETH',
                        decimals: 18,
                      },
                      rpcUrls: [rpcUrl],
                      blockExplorerUrls: [blockExplorerUrl],
                    }],
                  });
                  console.log(`Added and switched to ${networkName}`);

                  // Wait for network add/switch to complete
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  // Create fresh provider and signer after add
                  ethersProvider = new ethers.BrowserProvider(window.ethereum);
                  ethersSigner = await ethersProvider.getSigner();
                } catch {
                  throw new Error(`Failed to add ${networkName} to your wallet. Please add it manually.`);
                }
              } else {
                const networkName = useMainnet ? 'Base Network' : 'Base Sepolia testnet';
                throw new Error(`Please switch to ${networkName} in your wallet for X402 payments.`);
              }
            }
          } else {
            const networkName = useMainnet ? 'Base Network' : 'Base Sepolia testnet';
            throw new Error(`Please switch to ${networkName} in your wallet for X402 payments.`);
          }
        }

        // Create or reuse MetaMask signer for arbundles
        // Only create new signer if address changed or first time
        let dataSigner: MetaMaskSigner;
        if (dataSignerRef.current && dataSignerRef.current.address === userAddress) {
          console.log('Reusing existing data signer (already authorized)');
          dataSigner = dataSignerRef.current.signer;
        } else {
          console.log('Creating new data signer for x402 upload...');
          dataSigner = new MetaMaskSigner(ethersSigner, userAddress);
          await dataSigner.setPublicKey(); // One-time public key derivation (user approves once)
          dataSignerRef.current = { signer: dataSigner, address: userAddress };
          console.log('Data signer created and cached for session');
        }

        // Read file
        console.log(`Reading file: ${file.name} (${file.size} bytes)`);
        const fileBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(fileBuffer);

        // Create ANS-104 data item with tags
        const tags = [
          { name: 'App-Name', value: APP_NAME },
          { name: 'App-Feature', value: 'File Upload' },
          { name: 'App-Version', value: APP_VERSION },
          { name: 'Content-Type', value: getContentType(file) },
          { name: 'File-Name', value: file.name },
          ...(options.tags || []),
        ];

        console.log('Creating ANS-104 data item...');
        const dataItem = createData(fileData, dataSigner as any, { tags });

        console.log('Signing data item (approve in wallet)...');
        await dataItem.sign(dataSigner as any);

        const dataItemId = await dataItem.id;
        console.log(`Data item signed! ID: ${dataItemId}`);
        options.onProgress?.(20); // Data item created and signed

        const uploadDataBuffer = dataItem.getRaw();
        // Convert Buffer to Uint8Array for fetch
        const uploadData = new Uint8Array(uploadDataBuffer);

        // Try upload first
        console.log('Attempting x402 upload...');
        let uploadResponse = await fetch(x402Url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': uploadData.length.toString(),
          },
          body: uploadData,
        });

        options.onProgress?.(40); // First upload attempt complete

        let result: any;
        let paidUsdcAmount: string | undefined;

        // Success with existing credits (200 OK)
        if (uploadResponse.status === 200) {
          console.log('Upload succeeded using existing credits!');
          options.onProgress?.(90); // Upload successful
          result = await uploadResponse.json();
          paidUsdcAmount = undefined;
        }
        // Payment required (402)
        else if (uploadResponse.status === 402) {
          console.log('402 Payment Required - processing x402 payment...');
          const priceData = await uploadResponse.json();
          console.log('[X402] Pricing response:', JSON.stringify(priceData, null, 2));

          // Find requirements for our network
          const requirements = priceData.accepts.find((a: any) => a.network === networkKey);

          if (!requirements) {
            throw new Error(`Network ${networkKey} not available for payment`);
          }

          console.log('[X402] Selected requirements:', JSON.stringify(requirements, null, 2));

          // Use the exact value from the server to avoid precision issues
          // maxAmountRequired is already in smallest unit (6 decimals for USDC)
          const amountInSmallestUnit = requirements.maxAmountRequired;

          console.log(`[X402] Server maxAmountRequired (raw):`, amountInSmallestUnit, `(type: ${typeof amountInSmallestUnit})`);

          // For BigInt conversion, handle both string and number from server
          const baseAmount = typeof amountInSmallestUnit === 'string'
            ? BigInt(Math.round(Number(amountInSmallestUnit)))
            : BigInt(Math.round(amountInSmallestUnit));

          const amount = ethers.formatUnits(baseAmount, 6);
          paidUsdcAmount = amount;

          console.log(`[X402] Payment required: ${amount} USDC (${baseAmount.toString()} smallest unit)`);

          // Enforce client-side maxUsdcAmount cap before building authorization
          const maxAmountInSmallestUnit = BigInt(Math.round(options.maxUsdcAmount * 1_000_000)); // Convert to 6 decimals
          if (baseAmount > maxAmountInSmallestUnit) {
            const maxAmountFormatted = ethers.formatUnits(maxAmountInSmallestUnit, 6);
            throw new Error(
              `Upload cost (${amount} USDC) exceeds configured maximum (${maxAmountFormatted} USDC). ` +
              `Please reduce file size or increase payment limit.`
            );
          }

          // Create payment authorization
          const currentTime = Math.floor(Date.now() / 1000);
          const validAfter = currentTime - 3600;
          const timeoutSeconds = requirements.maxTimeoutSeconds || 3600;
          const bufferSeconds = 120;
          const validBefore = currentTime + timeoutSeconds + bufferSeconds;
          const nonce = ethers.hexlify(ethers.randomBytes(32));

          // Create authorization object (must use same object for signing and server)
          // The signature is cryptographically bound to these exact values
          const authorization = {
            from: userAddress,
            to: requirements.payTo,
            value: baseAmount.toString(),
            validAfter,
            validBefore,
            nonce,
          };

          // EIP-712 domain and types for USDC transferWithAuthorization
          const domain = {
            name: 'USD Coin',
            version: '2',
            chainId: chainId,
            verifyingContract: usdcAddress,
          };

          const types = {
            TransferWithAuthorization: [
              { name: 'from', type: 'address' },
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'validAfter', type: 'uint256' },
              { name: 'validBefore', type: 'uint256' },
              { name: 'nonce', type: 'bytes32' },
            ],
          };

          console.log('[X402] Signing payment authorization (approve in wallet)...');
          console.log('[X402] Domain:', domain);
          console.log('[X402] Authorization:', authorization);
          const signature = await ethersSigner.signTypedData(domain, types, authorization);
          console.log('[X402] Payment authorized! Signature created.');
          options.onProgress?.(60); // Payment authorization created

          const paymentPayload = {
            x402Version: 1,
            scheme: 'exact',
            network: networkKey,
            payload: { signature, authorization },
          };

          console.log('[X402] Payment payload:', JSON.stringify(paymentPayload, null, 2));
          const paymentHeader = btoa(JSON.stringify(paymentPayload));
          console.log('[X402] Payment header (base64):', paymentHeader.substring(0, 100) + '...');

          // Retry upload with payment (uploadData is already Uint8Array from earlier)
          console.log('[X402] Retrying upload with x402 payment...');
          uploadResponse = await fetch(x402Url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': uploadData.length.toString(),
              'X-PAYMENT': paymentHeader,
            },
            body: uploadData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(
              `Upload with payment failed: ${uploadResponse.status} - ${errorText}`
            );
          }

          options.onProgress?.(90); // Retry upload with payment successful
          result = await uploadResponse.json();
        }
        // Unexpected status
        else {
          const errorText = await uploadResponse.text();
          throw new Error(`Unexpected response: ${uploadResponse.status} - ${errorText}`);
        }

        console.log(`✅ x402 upload successful! ID: ${result.id}`);
        options.onProgress?.(100); // Upload complete

        return {
          id: result.id,
          owner: result.owner || userAddress,
          dataCaches: result.dataCaches || [],
          fastFinalityIndexes: result.fastFinalityIndexes || [],
          winc: result.winc || '0',
          paidUsdcAmount,
          receipt: result,
        };
      } catch (error) {
        console.error('x402 upload error:', error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [getCurrentConfig, configMode, wallets]
  );

  return {
    uploadFileWithX402,
    uploading,
  };
}
