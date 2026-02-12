import { useCallback, useRef } from 'react';
import { TurboFactory, TurboAuthenticatedClient } from '@ardrive/turbo-sdk/web';
import { InjectedEthereumSigner } from '@ar.io/sdk/web';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { useAccount, useConfig } from 'wagmi';
import { getConnectorClient, switchChain } from 'wagmi/actions';
import { useStore } from '../store/useStore';

// Custom connect message for Ethereum wallet uploads (instead of SDK's generic message)
const ETHEREUM_CONNECT_MESSAGE = 'Sign this message to connect to ar.io';

// Cache structure for the Ethereum signer (shared across all token types)
// The signer is independent of token type - only address and config matter
interface CachedEthereumSigner {
  injectedSigner: any; // InjectedEthereumSigner with public key set
  ethersSigner: ethers.JsonRpcSigner;
  publicKey: Buffer; // The recovered public key from our custom connect message
  address: string;
  configKey: string;
}

// Cache structure for Ethereum Turbo clients (per token type)
interface CachedEthereumClient {
  client: TurboAuthenticatedClient;
  address: string;
  tokenType: string;
  configKey: string;
}

// Module-level cache for the SIGNER (shared across ALL token types)
// This ensures the "connect" signature is only requested once per session
let sharedEthereumSignerCache: CachedEthereumSigner | null = null;

// Module-level cache for CLIENTS (per token type, but reuses the signer)
const sharedEthereumClientCache: Map<string, CachedEthereumClient> = new Map();

/**
 * Hook to create authenticated Turbo clients for Ethereum wallets with a custom connect message.
 *
 * The SDK's default behavior when using `walletAdapter` is to show a generic
 * "sign this message to connect to your account" message. This hook creates
 * the InjectedEthereumSigner manually with a custom message and caches the
 * result globally so the signature is only requested once per session.
 *
 * TWO-LEVEL CACHING:
 * 1. SIGNER cache: Shared across ALL token types. The "connect" signature only happens once.
 * 2. CLIENT cache: Per token type. Each token type gets its own Turbo client, but reuses the signer.
 */
export function useEthereumTurboClient() {
  const { wallets } = useWallets();
  const { getCurrentConfig, address } = useStore();
  const wagmiConfig = useConfig();
  const ethAccount = useAccount();

  // Track if we're currently creating a signer (to prevent duplicate signature requests)
  const creatingSignerRef = useRef<Promise<CachedEthereumSigner> | null>(null);

  /**
   * Gets or creates the shared Ethereum signer (requests signature only once per session)
   */
  const getOrCreateSigner = useCallback(async (
    config: ReturnType<typeof getCurrentConfig>,
    configKey: string
  ): Promise<CachedEthereumSigner> => {
    // Check if we can reuse cached signer
    if (
      sharedEthereumSignerCache &&
      sharedEthereumSignerCache.address === address &&
      sharedEthereumSignerCache.configKey === configKey
    ) {
      return sharedEthereumSignerCache;
    }

    // If we're already creating a signer, wait for it
    if (creatingSignerRef.current) {
      return creatingSignerRef.current;
    }

    // Create new signer
    const createSigner = async (): Promise<CachedEthereumSigner> => {
      console.log('[useEthereumTurboClient] Creating new signer...');
      // Get Ethereum provider - priority: Privy > RainbowKit/Wagmi > window.ethereum
      const privyWallet = wallets.find((w) => w.walletClientType === 'privy');
      let ethersSigner: ethers.JsonRpcSigner;

      if (privyWallet) {
        const ethProvider = await privyWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(ethProvider);
        ethersSigner = await ethersProvider.getSigner();
      } else if (ethAccount.isConnected && ethAccount.connector) {
        try {
          const connectorClient = await getConnectorClient(wagmiConfig, {
            connector: ethAccount.connector,
          });
          const ethersProvider = new ethers.BrowserProvider(connectorClient.transport, 'any');
          ethersSigner = await ethersProvider.getSigner();
        } catch {
          // Fallback for injected wallets if connector client fails
          if (window.ethereum) {
            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            ethersSigner = await ethersProvider.getSigner();
          } else {
            throw new Error('Failed to get Ethereum provider from connected wallet');
          }
        }
      } else if (window.ethereum) {
        const ethersProvider = new ethers.BrowserProvider(window.ethereum);
        ethersSigner = await ethersProvider.getSigner();
      } else {
        throw new Error('No Ethereum wallet found. Please connect a wallet first.');
      }

      const userAddress = await ethersSigner.getAddress();

      // Create InjectedEthereumSigner with custom provider
      // The signer's signMessage can receive string, Uint8Array, or object with raw property
      let signatureRequestCount = 0;
      const injectedProvider = {
        getSigner: () => ({
          signMessage: async (message: string | Uint8Array | { raw?: string }) => {
            signatureRequestCount++;
            const msgPreview = typeof message === 'string'
              ? message.slice(0, 50)
              : message instanceof Uint8Array
                ? `[Uint8Array ${message.length} bytes]`
                : `[Object: ${JSON.stringify(message).slice(0, 50)}]`;
            console.log(`[useEthereumTurboClient] signMessage #${signatureRequestCount}:`, msgPreview);

            // Handle different message types:
            // - string: pass directly
            // - Uint8Array: pass directly (ethers handles it)
            // - object with raw: extract raw value
            if (typeof message === 'string' || message instanceof Uint8Array) {
              return await ethersSigner.signMessage(message);
            }
            // Object with raw property
            const msg = message.raw || '';
            return await ethersSigner.signMessage(msg);
          },
          getAddress: async () => userAddress,
        }),
      };

      const injectedSigner = new InjectedEthereumSigner(injectedProvider as any);

      // Manually set the public key using our custom connect message
      // THIS IS THE ONLY SIGNATURE REQUEST - shared across all token types
      console.log('[useEthereumTurboClient] Requesting signature for connect message...');
      const signature = await ethersSigner.signMessage(ETHEREUM_CONNECT_MESSAGE);
      console.log('[useEthereumTurboClient] Signature received');
      const messageHash = ethers.hashMessage(ETHEREUM_CONNECT_MESSAGE);
      const recoveredKey = ethers.SigningKey.recoverPublicKey(messageHash, signature);
      const publicKey = Buffer.from(ethers.getBytes(recoveredKey));
      injectedSigner.publicKey = publicKey;

      // Cache the signer globally (shared across all token types)
      const cachedSigner: CachedEthereumSigner = {
        injectedSigner,
        ethersSigner,
        publicKey,
        address: userAddress,
        configKey,
      };
      sharedEthereumSignerCache = cachedSigner;
      return cachedSigner;
    };

    // Store the promise to prevent duplicate requests
    creatingSignerRef.current = createSigner();

    try {
      return await creatingSignerRef.current;
    } finally {
      creatingSignerRef.current = null;
    }
  }, [wallets, address, wagmiConfig, ethAccount.isConnected, ethAccount.connector]);

  /**
   * Creates an authenticated Turbo client for Ethereum wallets.
   * Uses a custom connect message and caches the signer globally (shared across token types).
   * Each token type gets its own client instance, but they all reuse the same signer.
   *
   * @param tokenType - The token type (e.g., 'ethereum', 'base-eth', 'base-usdc')
   * @returns Authenticated Turbo client
   */
  const createEthereumTurboClient = useCallback(
    async (tokenType: string = 'ethereum'): Promise<TurboAuthenticatedClient> => {
      const config = getCurrentConfig();
      const configKey = `${config.paymentServiceUrl}|${config.uploadServiceUrl}`;
      const clientCacheKey = `${configKey}|${tokenType}`;

      // Check if we can reuse cached client for this specific token type
      const cachedClient = sharedEthereumClientCache.get(clientCacheKey);
      if (cachedClient && cachedClient.address === address) {
        return cachedClient.client;
      }

      // Build turbo config for this token type
      const turboConfig = {
        paymentServiceConfig: { url: config.paymentServiceUrl },
        uploadServiceConfig: { url: config.uploadServiceUrl },
        ...(config.tokenMap[tokenType as keyof typeof config.tokenMap]
          ? { gatewayUrl: config.tokenMap[tokenType as keyof typeof config.tokenMap] }
          : {}),
      };

      // Tokens requiring walletAdapter for topUpWithTokens() (on-chain token transfers need sendTransaction)
      // NOTE: 'ethereum' is NOT included here because:
      // 1. ETH L1 payments are handled directly in CryptoConfirmationPanel (not via this hook)
      // 2. When 'ethereum' is passed here, it's for regular uploads which need InjectedEthereumSigner
      const evmTokenTransferTypes = new Set([
        'base-ario', 'base-eth', 'base-usdc', 'polygon-usdc', 'pol', 'usdc'
      ]);

      // For EVM token transfers, we need to switch network BEFORE getting the signer
      // Otherwise the signer will be connected to the wrong network
      const privyWallet = wallets.find((w) => w.walletClientType === 'privy');

      if (evmTokenTransferTypes.has(tokenType)) {
        // EVM token transfers: must switch to correct network first
        const isDevMode = config.paymentServiceUrl?.includes('.dev');
        const expectedChainId = (tokenType === 'usdc')
          ? (isDevMode ? 17000 : 1)  // Holesky testnet : Ethereum mainnet
          : (tokenType === 'base-eth' || tokenType === 'base-usdc' || tokenType === 'base-ario')
          ? (isDevMode ? 84532 : 8453) // Base Sepolia : Base mainnet
          : (tokenType === 'pol' || tokenType === 'polygon-usdc')
          ? (isDevMode ? 80002 : 137) // Amoy testnet : Polygon mainnet
          : 8453; // Default to Base mainnet for unknown EVM tokens

        if (privyWallet) {
          // For Privy: Check current chain and switch if needed BEFORE getting provider
          const currentChainId = privyWallet.chainId;

          if (currentChainId !== `eip155:${expectedChainId}` && Number(currentChainId?.split(':')[1]) !== expectedChainId) {
            try {
              await privyWallet.switchChain(expectedChainId);
              // Wait for switch to complete
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch {
              const networkName = (tokenType === 'base-eth' || tokenType === 'base-usdc' || tokenType === 'base-ario')
                ? (isDevMode ? 'Base Sepolia testnet' : 'Base network')
                : (tokenType === 'pol' || tokenType === 'polygon-usdc')
                ? (isDevMode ? 'Polygon Amoy testnet' : 'Polygon Mainnet')
                : (isDevMode ? 'Ethereum Holesky testnet' : 'Ethereum Mainnet');
              throw new Error(`Failed to switch to ${networkName}. Please switch networks manually and try again.`);
            }
          }
        } else if (ethAccount.isConnected && ethAccount.connector) {
          // For wagmi-connected wallets (RainbowKit): Use wagmi's switchChain action
          // This ensures we use the same wallet the user connected with
          try {
            const currentChainId = ethAccount.chainId;

            if (currentChainId !== expectedChainId) {
              await switchChain(wagmiConfig, { chainId: expectedChainId });
              // Wait for switch to complete
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch {
            const networkName = (tokenType === 'base-eth' || tokenType === 'base-usdc' || tokenType === 'base-ario')
              ? (isDevMode ? 'Base Sepolia testnet' : 'Base network')
              : (tokenType === 'pol' || tokenType === 'polygon-usdc')
              ? (isDevMode ? 'Polygon Amoy testnet' : 'Polygon Mainnet')
              : (isDevMode ? 'Ethereum Holesky testnet' : 'Ethereum Mainnet');
            throw new Error(`Please switch to ${networkName} in your wallet for ${tokenType} payments.`);
          }
        } else if (window.ethereum) {
          // Fallback for direct window.ethereum injection (no wagmi connection)
          try {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainIdHex, 16);

            if (currentChainId !== expectedChainId) {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
              });
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch {
            const networkName = (tokenType === 'base-eth' || tokenType === 'base-usdc' || tokenType === 'base-ario')
              ? (isDevMode ? 'Base Sepolia testnet' : 'Base network')
              : (tokenType === 'pol' || tokenType === 'polygon-usdc')
              ? (isDevMode ? 'Polygon Amoy testnet' : 'Polygon Mainnet')
              : (isDevMode ? 'Ethereum Holesky testnet' : 'Ethereum Mainnet');
            throw new Error(`Please switch to ${networkName} in your wallet for ${tokenType} payments.`);
          }
        }
      }

      // NOW get the signer (after network switch if needed)
      let ethersSigner: ethers.JsonRpcSigner;

      if (privyWallet) {
        const ethProvider = await privyWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(ethProvider);
        ethersSigner = await ethersProvider.getSigner();
      } else if (ethAccount.isConnected && ethAccount.connector) {
        try {
          const connectorClient = await getConnectorClient(wagmiConfig, {
            connector: ethAccount.connector,
          });
          const ethersProvider = new ethers.BrowserProvider(connectorClient.transport, 'any');
          ethersSigner = await ethersProvider.getSigner();
        } catch {
          if (window.ethereum) {
            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            ethersSigner = await ethersProvider.getSigner();
          } else {
            throw new Error('Failed to get Ethereum provider from connected wallet');
          }
        }
      } else if (window.ethereum) {
        const ethersProvider = new ethers.BrowserProvider(window.ethereum);
        ethersSigner = await ethersProvider.getSigner();
      } else {
        throw new Error('No Ethereum wallet found. Please connect a wallet first.');
      }

      let client: TurboAuthenticatedClient;

      if (evmTokenTransferTypes.has(tokenType)) {
        // EVM token transfers: use walletAdapter pattern (SDK handles its own signature)
        client = TurboFactory.authenticated({
          token: tokenType as any,
          walletAdapter: {
            getSigner: () => ethersSigner,
          },
          ...turboConfig,
        });
      } else {
        // Regular uploads: use cached InjectedEthereumSigner with custom connect message
        const signerCache = await getOrCreateSigner(config, configKey);
        client = TurboFactory.authenticated({
          token: tokenType as any,
          signer: signerCache.injectedSigner,
          ...turboConfig,
        });
      }

      // Cache the client for this token type
      const userAddress = await ethersSigner.getAddress();
      sharedEthereumClientCache.set(clientCacheKey, {
        client,
        address: userAddress,
        tokenType,
        configKey,
      });

      return client;
    },
    [getCurrentConfig, address, wallets, wagmiConfig, ethAccount.isConnected, ethAccount.connector, getOrCreateSigner]
  );

  /**
   * Clears all cached signers and clients (useful when switching wallets/accounts)
   */
  const clearCache = useCallback(() => {
    sharedEthereumSignerCache = null;
    sharedEthereumClientCache.clear();
  }, []);

  return {
    createEthereumTurboClient,
    clearCache,
  };
}

/**
 * Utility function to clear the Ethereum signer and client caches from outside React components
 * Also clears the X402 signer cache to ensure consistency
 */
export function clearEthereumTurboClientCache() {
  sharedEthereumSignerCache = null;
  sharedEthereumClientCache.clear();

  // Also clear X402 signer cache - import dynamically to avoid circular dependency
  import('./useX402Upload').then(({ clearX402SignerCache }) => {
    clearX402SignerCache();
  }).catch(() => {
    // Module not loaded yet, that's fine
  });
}

/**
 * Get the cached Ethereum signer if available.
 * Returns null if no signer is cached (user hasn't done an Ethereum operation yet).
 * Used by arIOConfig.ts to reuse the same signer for ArNS operations.
 */
export function getCachedEthereumSigner(): { injectedSigner: any; address: string } | null {
  if (sharedEthereumSignerCache) {
    return {
      injectedSigner: sharedEthereumSignerCache.injectedSigner,
      address: sharedEthereumSignerCache.address,
    };
  }
  return null;
}

/**
 * Set the cached Ethereum signer from external code (e.g., arIOConfig.ts).
 * This allows ArNS operations to share the signer cache with Turbo operations.
 */
export function setCachedEthereumSigner(
  injectedSigner: any,
  ethersSigner: ethers.JsonRpcSigner,
  address: string,
  configKey: string = 'arns'
) {
  // Get the publicKey from the injectedSigner if available
  const publicKey = injectedSigner.publicKey || Buffer.alloc(65);
  sharedEthereumSignerCache = {
    injectedSigner,
    ethersSigner,
    publicKey,
    address,
    configKey,
  };
}
