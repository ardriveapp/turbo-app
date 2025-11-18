import { useState, useCallback } from 'react';
import { createData } from 'arbundles';
import { useStore } from '../store/useStore';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { MetaMaskSigner } from '../utils/MetaMaskSigner';
import { APP_NAME, APP_VERSION, X402_CONFIG } from '../constants';

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

  const uploadFileWithX402 = useCallback(
    async (file: File, options: X402UploadOptions): Promise<X402UploadResult> => {
      setUploading(true);

      try {
        const config = getCurrentConfig();
        const x402Url = config.x402UploadUrl;

        // Determine network (Base Mainnet or Sepolia)
        const isProd = configMode === 'production';
        const networkKey = isProd
          ? X402_CONFIG.supportedNetworks.production
          : X402_CONFIG.supportedNetworks.development;
        const chainId = isProd
          ? X402_CONFIG.chainIds.production
          : X402_CONFIG.chainIds.development;
        const usdcAddress = isProd
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

        const ethersProvider = new ethers.BrowserProvider(ethProvider);
        const ethersSigner = await ethersProvider.getSigner();
        const userAddress = await ethersSigner.getAddress();

        // Create MetaMask signer for arbundles
        console.log('Creating data signer for x402 upload...');
        const dataSigner = new MetaMaskSigner(ethersSigner, userAddress);
        await dataSigner.setPublicKey(); // One-time public key derivation

        // Read file
        console.log(`Reading file: ${file.name} (${file.size} bytes)`);
        const fileBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(fileBuffer);

        // Create ANS-104 data item with tags
        const tags = [
          { name: 'App-Name', value: APP_NAME },
          { name: 'App-Feature', value: 'File Upload' },
          { name: 'App-Version', value: APP_VERSION },
          { name: 'Content-Type', value: file.type || 'application/octet-stream' },
          { name: 'File-Name', value: file.name },
          ...(options.tags || []),
        ];

        console.log('Creating ANS-104 data item...');
        const dataItem = createData(fileData, dataSigner as any, { tags });

        console.log('Signing data item (approve in wallet)...');
        await dataItem.sign(dataSigner as any);

        const dataItemId = await dataItem.id;
        console.log(`Data item signed! ID: ${dataItemId}`);

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

        let result: any;
        let paidUsdcAmount: string | undefined;

        // Success with existing credits (200 OK)
        if (uploadResponse.status === 200) {
          console.log('Upload succeeded using existing credits!');
          result = await uploadResponse.json();
          paidUsdcAmount = undefined;
        }
        // Payment required (402)
        else if (uploadResponse.status === 402) {
          console.log('402 Payment Required - processing x402 payment...');
          const priceData = await uploadResponse.json();

          // Find requirements for our network
          const requirements = priceData.accepts.find((a: any) => a.network === networkKey);

          if (!requirements) {
            throw new Error(`Network ${networkKey} not available for payment`);
          }

          const baseAmount = BigInt(requirements.maxAmountRequired);
          const amount = ethers.formatUnits(baseAmount, 6);
          paidUsdcAmount = amount;

          console.log(`Payment required: ${amount} USDC`);

          // Create payment authorization
          const currentTime = Math.floor(Date.now() / 1000);
          const validAfter = currentTime - 3600;
          const timeoutSeconds = requirements.maxTimeoutSeconds || 3600;
          const bufferSeconds = 120;
          const validBefore = currentTime + timeoutSeconds + bufferSeconds;
          const nonce = ethers.hexlify(ethers.randomBytes(32));

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

          console.log('Signing payment authorization (approve in wallet)...');
          const signature = await ethersSigner.signTypedData(domain, types, authorization);
          console.log('Payment authorized!');

          const paymentPayload = {
            x402Version: 1,
            scheme: 'exact',
            network: networkKey,
            payload: { signature, authorization },
          };

          const paymentHeader = btoa(JSON.stringify(paymentPayload));

          // Retry upload with payment (uploadData is already Uint8Array from earlier)
          console.log('Retrying upload with x402 payment...');
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

          result = await uploadResponse.json();
        }
        // Unexpected status
        else {
          const errorText = await uploadResponse.text();
          throw new Error(`Unexpected response: ${uploadResponse.status} - ${errorText}`);
        }

        console.log(`✅ x402 upload successful! ID: ${result.id}`);

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
