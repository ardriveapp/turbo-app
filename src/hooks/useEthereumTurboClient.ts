import { useCallback, useRef } from 'react';
import { TurboFactory, TurboAuthenticatedClient } from '@ardrive/turbo-sdk/web';
import { InjectedEthereumSigner } from '@ar.io/sdk/web';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { useAccount, useConfig } from 'wagmi';
import { getConnectorClient } from 'wagmi/actions';
import { useStore } from '../store/useStore';

// Custom connect message for Ethereum wallet uploads (instead of SDK's generic message)
const ETHEREUM_CONNECT_MESSAGE = 'Sign this message to connect to Turbo Gateway';

// Cache structure for the Ethereum signer (shared across all token types)
// The signer is independent of token type - only address and config matter
interface CachedEthereumSigner {
  injectedSigner: any; // InjectedEthereumSigner with public key set
  ethersSigner: ethers.JsonRpcSigner;
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
      console.log('✅ Reusing cached Ethereum signer (no signature needed)');
      return sharedEthereumSignerCache;
    }

    // If we're already creating a signer, wait for it
    if (creatingSignerRef.current) {
      console.log('⏳ Waiting for in-progress signer creation...');
      return creatingSignerRef.current;
    }

    // Create new signer
    const createSigner = async (): Promise<CachedEthereumSigner> => {
      console.log('Creating new Ethereum signer (will request signature)...');

      // Get Ethereum provider - priority: Privy > RainbowKit/Wagmi > window.ethereum
      const privyWallet = wallets.find((w) => w.walletClientType === 'privy');
      let ethersSigner: ethers.JsonRpcSigner;

      if (privyWallet) {
        // Privy embedded wallet (email login)
        console.log('Using Privy embedded wallet');
        const ethProvider = await privyWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(ethProvider);
        ethersSigner = await ethersProvider.getSigner();
      } else if (ethAccount.isConnected && ethAccount.connector) {
        // RainbowKit/Wagmi connected wallet (MetaMask, WalletConnect, Coinbase, etc.)
        console.log(`Using RainbowKit wallet: ${ethAccount.connector.name}`);
        try {
          // Get the connector client from wagmi - this works for ALL wallet types including WalletConnect
          const connectorClient = await getConnectorClient(wagmiConfig, {
            connector: ethAccount.connector,
          });
          // Create ethers provider from the connector's transport
          const ethersProvider = new ethers.BrowserProvider(connectorClient.transport, 'any');
          ethersSigner = await ethersProvider.getSigner();
        } catch (error) {
          console.warn('Failed to get connector client, falling back to window.ethereum:', error);
          // Fallback for injected wallets if connector client fails
          if (window.ethereum) {
            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            ethersSigner = await ethersProvider.getSigner();
          } else {
            throw new Error('Failed to get Ethereum provider from connected wallet');
          }
        }
      } else if (window.ethereum) {
        // Direct window.ethereum fallback (legacy support)
        console.log('Using window.ethereum fallback');
        const ethersProvider = new ethers.BrowserProvider(window.ethereum);
        ethersSigner = await ethersProvider.getSigner();
      } else {
        throw new Error('No Ethereum wallet found. Please connect a wallet first.');
      }

      const userAddress = await ethersSigner.getAddress();

      // Create InjectedEthereumSigner with custom provider
      // The signer's signMessage can receive string, Uint8Array, or object with raw property
      const injectedProvider = {
        getSigner: () => ({
          signMessage: async (message: string | Uint8Array | { raw?: string }) => {
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
      const signature = await ethersSigner.signMessage(ETHEREUM_CONNECT_MESSAGE);
      const messageHash = ethers.hashMessage(ETHEREUM_CONNECT_MESSAGE);
      const recoveredKey = ethers.SigningKey.recoverPublicKey(messageHash, signature);
      // Strip the 0x04 uncompressed prefix (first byte) - InjectedEthereumSigner expects 64 bytes
      injectedSigner.publicKey = Buffer.from(ethers.getBytes(recoveredKey).slice(1));

      // Cache the signer globally (shared across all token types)
      const cachedSigner: CachedEthereumSigner = {
        injectedSigner,
        ethersSigner,
        address: userAddress,
        configKey,
      };
      sharedEthereumSignerCache = cachedSigner;

      console.log('✅ Ethereum signer created and cached globally');
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
        console.log(`✅ Reusing cached Ethereum Turbo client for ${tokenType}`);
        return cachedClient.client;
      }

      // Get or create the shared signer (signature only requested once)
      const signerCache = await getOrCreateSigner(config, configKey);

      // Build turbo config for this token type
      const turboConfig = {
        paymentServiceConfig: { url: config.paymentServiceUrl },
        uploadServiceConfig: { url: config.uploadServiceUrl },
        ...(config.tokenMap[tokenType as keyof typeof config.tokenMap]
          ? { gatewayUrl: config.tokenMap[tokenType as keyof typeof config.tokenMap] }
          : {}),
      };

      // Create authenticated Turbo client with the shared signer
      const client = TurboFactory.authenticated({
        signer: signerCache.injectedSigner,
        token: tokenType as any,
        ...turboConfig,
      });

      // Cache the client for this token type
      sharedEthereumClientCache.set(clientCacheKey, {
        client,
        address: signerCache.address,
        tokenType,
        configKey,
      });

      console.log(`✅ Ethereum Turbo client created for ${tokenType} (reused signer)`);
      return client;
    },
    [getCurrentConfig, address, getOrCreateSigner]
  );

  /**
   * Clears all cached signers and clients (useful when switching wallets/accounts)
   */
  const clearCache = useCallback(() => {
    sharedEthereumSignerCache = null;
    sharedEthereumClientCache.clear();
    console.log('Ethereum signer and client caches cleared');
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
  sharedEthereumSignerCache = {
    injectedSigner,
    ethersSigner,
    address,
    configKey,
  };
  console.log('✅ Ethereum signer cached from external source (ArNS)');
}
