import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useStore } from '../store/useStore';
import { SupportedTokenType, X402_CONFIG, ERC20_ABI, ETHEREUM_CONFIG, POLYGON_CONFIG, BASE_ARIO_CONFIG } from '../constants';
import { getSolanaConnection } from '../utils/solanaConnection';
import { useAccount, useConfig } from 'wagmi';
import { getConnectorClient, switchChain } from 'wagmi/actions';
import { useWallets } from '@privy-io/react-auth';

/**
 * Network parameters for wallet_addEthereumChain
 * Used when a chain hasn't been added to the user's wallet yet
 */
function getNetworkParams(chainId: number): {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
} | null {
  const configs: Record<number, ReturnType<typeof getNetworkParams>> = {
    // Base Mainnet
    8453: {
      chainId: '0x2105',
      chainName: 'Base',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.base.org'],
      blockExplorerUrls: ['https://basescan.org'],
    },
    // Base Sepolia
    84532: {
      chainId: '0x14a34',
      chainName: 'Base Sepolia',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://sepolia.base.org'],
      blockExplorerUrls: ['https://sepolia.basescan.org'],
    },
    // Ethereum Mainnet (usually pre-configured, but included for completeness)
    1: {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://eth.drpc.org'],
      blockExplorerUrls: ['https://etherscan.io'],
    },
    // Sepolia Testnet
    11155111: {
      chainId: '0xaa36a7',
      chainName: 'Sepolia',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://rpc.sepolia.org'],
      blockExplorerUrls: ['https://sepolia.etherscan.io'],
    },
    // Polygon Mainnet
    137: {
      chainId: '0x89',
      chainName: 'Polygon',
      nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
      rpcUrls: ['https://polygon-rpc.com'],
      blockExplorerUrls: ['https://polygonscan.com'],
    },
    // Polygon Amoy Testnet
    80002: {
      chainId: '0x13882',
      chainName: 'Polygon Amoy',
      nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
      rpcUrls: ['https://rpc-amoy.polygon.technology'],
      blockExplorerUrls: ['https://amoy.polygonscan.com'],
    },
  };

  return configs[chainId] || null;
}

/**
 * Result of token balance fetch
 */
export interface TokenBalanceResult {
  balance: number; // In readable units (e.g., 0.123 SOL, not Lamports)
  balanceSmallestUnit: number; // In smallest unit (e.g., Lamports, Wei, mARIO)
  loading: boolean;
  error: string | null;
  isNetworkError: boolean; // True if error is due to wrong network (should block proceeding)
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and monitor wallet balance for crypto payments
 *
 * Supports:
 * - AR (Arweave native token)
 * - ARIO (Arweave AO token)
 * - SOL (Solana wallets)
 * - BASE-ETH (Ethereum wallets on Base network)
 * - BASE-USDC (Ethereum wallets on Base network)
 *
 * Auto-refreshes every 5 minutes while enabled
 */
export function useTokenBalance(
  tokenType: SupportedTokenType | null,
  walletType: 'arweave' | 'ethereum' | 'solana' | null,
  address: string | null,
  enabled: boolean = true,
  solanaConnection?: Connection
): TokenBalanceResult {
  const { getCurrentConfig, configMode } = useStore();
  const [balance, setBalance] = useState(0);
  const [balanceSmallestUnit, setBalanceSmallestUnit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  // Wagmi hooks for getting the correct Ethereum provider
  const wagmiConfig = useConfig();
  const ethAccount = useAccount();
  const { wallets: privyWallets } = useWallets();

  // Cache the provider to avoid recreating on every fetch
  const ethProviderRef = useRef<any>(null);
  const providerSourceRef = useRef<string | null>(null);

  /**
   * Get the Ethereum provider from the correct source:
   * 1. Privy embedded wallet (if user logged in via email)
   * 2. Wagmi connector (if user connected via RainbowKit)
   * 3. window.ethereum fallback (if direct injection)
   *
   * This ensures we use the same wallet the user connected with,
   * not a random wallet extension that happens to be at window.ethereum
   */
  const getEthereumProvider = useCallback(async (): Promise<any> => {
    // Check for Privy wallet first (email login users)
    const privyWallet = privyWallets.find((w) => w.walletClientType === 'privy');
    if (privyWallet) {
      const provider = await privyWallet.getEthereumProvider();
      ethProviderRef.current = provider;
      providerSourceRef.current = 'privy';
      return provider;
    }

    // Check for wagmi-connected wallet (RainbowKit users)
    if (ethAccount.isConnected && ethAccount.connector) {
      try {
        const connectorClient = await getConnectorClient(wagmiConfig, {
          connector: ethAccount.connector,
        });
        // The transport from viem connector client works as an EIP-1193 provider
        ethProviderRef.current = connectorClient.transport;
        providerSourceRef.current = 'wagmi';
        return connectorClient.transport;
      } catch (err) {
        console.warn('Failed to get wagmi connector client, falling back to window.ethereum:', err);
      }
    }

    // Fallback to window.ethereum (direct MetaMask or other injected wallet)
    if (window.ethereum) {
      ethProviderRef.current = window.ethereum;
      providerSourceRef.current = 'window.ethereum';
      return window.ethereum;
    }

    throw new Error('No Ethereum wallet found. Please connect a wallet first.');
  }, [privyWallets, ethAccount.isConnected, ethAccount.connector, wagmiConfig]);

  /**
   * Ensure the wallet is on the correct network, switching automatically if needed.
   * This provides a seamless UX for Privy users who may be on a different default network.
   *
   * @param expectedChainId - The chain ID required for this token
   * @param networkName - Human-readable network name for error messages
   * @returns Promise that resolves when on correct network
   * @throws Error if switch fails or user rejects
   */
  const ensureCorrectNetwork = useCallback(async (
    expectedChainId: number,
    networkName: string
  ): Promise<void> => {
    // Check for Privy wallet first (email login users)
    const privyWallet = privyWallets.find((w) => w.walletClientType === 'privy');

    if (privyWallet) {
      // For Privy: Check current chain and switch if needed
      const currentChainId = privyWallet.chainId;
      const currentChainIdNum = currentChainId?.startsWith('eip155:')
        ? Number(currentChainId.split(':')[1])
        : Number(currentChainId);

      if (currentChainIdNum !== expectedChainId) {
        try {
          console.log(`[useTokenBalance] Switching Privy wallet from chain ${currentChainIdNum} to ${expectedChainId} (${networkName})`);
          await privyWallet.switchChain(expectedChainId);
          // Wait for switch to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log(`[useTokenBalance] Successfully switched to ${networkName}`);
        } catch (err) {
          console.error(`[useTokenBalance] Failed to switch Privy wallet to ${networkName}:`, err);
          throw new Error(`Failed to switch to ${networkName}. Please switch networks manually in your wallet settings.`);
        }
      }
      return;
    }

    // For wagmi-connected wallets (RainbowKit users)
    if (ethAccount.isConnected && ethAccount.connector) {
      const currentChainId = ethAccount.chainId;

      if (currentChainId !== expectedChainId) {
        try {
          console.log(`[useTokenBalance] Switching wagmi wallet from chain ${currentChainId} to ${expectedChainId} (${networkName})`);
          await switchChain(wagmiConfig, { chainId: expectedChainId });
          // Wait for switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`[useTokenBalance] Successfully switched to ${networkName}`);
        } catch (err) {
          console.error(`[useTokenBalance] Failed to switch wagmi wallet to ${networkName}:`, err);
          throw new Error(`Please switch to ${networkName} in your wallet to view balance.`);
        }
      }
      return;
    }

    // Fallback for direct window.ethereum injection
    if (window.ethereum) {
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(chainIdHex, 16);

        if (currentChainId !== expectedChainId) {
          console.log(`[useTokenBalance] Switching window.ethereum from chain ${currentChainId} to ${expectedChainId} (${networkName})`);
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
            });
          } catch (switchError: any) {
            // Error code 4902 means the chain hasn't been added to the wallet
            if (switchError?.code === 4902) {
              console.log(`[useTokenBalance] Chain ${expectedChainId} not found, adding ${networkName}...`);
              const networkParams = getNetworkParams(expectedChainId);
              if (networkParams) {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [networkParams],
                });
                // Retry switch after adding
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
                });
              } else {
                throw switchError; // Unknown chain, rethrow
              }
            } else {
              throw switchError; // Other error, rethrow
            }
          }
          // Wait for switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`[useTokenBalance] Successfully switched to ${networkName}`);
        }
      } catch (err) {
        console.error(`[useTokenBalance] Failed to switch window.ethereum to ${networkName}:`, err);
        throw new Error(`Please switch to ${networkName} in your wallet to view balance.`);
      }
    }
  }, [privyWallets, ethAccount.isConnected, ethAccount.connector, ethAccount.chainId, wagmiConfig]);

  /**
   * Fetch ARIO balance using AR.IO SDK
   * ARIO is an AO token, so we query the balance from the ARIO process
   */
  const fetchArioBalance = useCallback(async (arweaveAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      // Import AR.IO SDK dynamically
      const { ARIO, ARIO_TESTNET_PROCESS_ID } = await import('@ar.io/sdk');

      // Create ARIO client (mainnet or testnet based on config mode)
      // Use testnet for development, mainnet for production
      const ario = configMode === 'development'
        ? ARIO.init({ processId: ARIO_TESTNET_PROCESS_ID })
        : ARIO.mainnet();

      // Get ARIO token balance for the wallet address
      const balanceInSmallest = await ario.getBalance({
        address: arweaveAddress,
      });

      // Convert mARIO to ARIO (1 ARIO = 1,000,000 mARIO)
      const balanceInArio = balanceInSmallest / 1_000_000;

      return {
        readable: balanceInArio,
        smallest: balanceInSmallest,
      };
    } catch (err) {
      console.error('Failed to fetch ARIO balance:', err);
      throw new Error('Unable to fetch ARIO balance. Please try again.');
    }
  }, [configMode]);

  /**
   * Fetch AR balance using Arweave SDK
   * AR is the native token on Arweave, balance is in winston (1 AR = 1e12 winston)
   */
  const fetchArBalance = useCallback(async (arweaveAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      // Import Arweave SDK dynamically
      const Arweave = (await import('arweave')).default;

      const config = getCurrentConfig();
      const arweaveConfig: any = {
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
      };

      // Use custom gateway if configured (for devnet)
      if (configMode === 'development' && config.tokenMap['arweave']) {
        try {
          const url = new URL(config.tokenMap['arweave']);
          arweaveConfig.host = url.hostname;
          arweaveConfig.port = url.port || 443;
          arweaveConfig.protocol = url.protocol.replace(':', '');
        } catch {
          // Fall back to mainnet if URL parsing fails
        }
      }

      const arweave = Arweave.init(arweaveConfig);

      // Get AR balance in winston
      const balanceInWinston = await arweave.wallets.getBalance(arweaveAddress);
      const balanceInWinstonNumber = Number(balanceInWinston);

      // Convert winston to AR (1 AR = 1e12 winston)
      const balanceInAr = balanceInWinstonNumber / 1e12;

      return {
        readable: balanceInAr,
        smallest: balanceInWinstonNumber,
      };
    } catch (err) {
      console.error('Failed to fetch AR balance:', err);
      throw new Error('Unable to fetch AR balance. Please try again.');
    }
  }, [getCurrentConfig, configMode]);

  /**
   * Fetch SOL balance using Solana web3.js
   * Uses provided connection if available, otherwise creates singleton connection
   */
  const fetchSolBalance = useCallback(async (solanaAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      // Use provided connection if available, otherwise get from singleton
      let connection: Connection;

      if (solanaConnection) {
        connection = solanaConnection;
      } else {
        const config = getCurrentConfig();
        const rpcUrl = config.tokenMap['solana'];
        if (!rpcUrl) {
          throw new Error('Solana RPC URL not configured');
        }
        connection = getSolanaConnection(rpcUrl);
      }

      const publicKey = new PublicKey(solanaAddress);
      const balanceInLamports = await connection.getBalance(publicKey);
      const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;

      return {
        readable: balanceInSol,
        smallest: balanceInLamports,
      };
    } catch (err) {
      console.error('Failed to fetch SOL balance:', err);
      throw new Error('Unable to fetch SOL balance. Please try again.');
    }
  }, [getCurrentConfig, solanaConnection]);

  /**
   * Fetch BASE-ETH balance using ethers.js
   * Automatically switches network if needed
   */
  const fetchBaseEthBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const expectedChainId = configMode === 'development'
        ? X402_CONFIG.chainIds.development
        : X402_CONFIG.chainIds.production;
      const networkName = configMode === 'development' ? 'Base Sepolia' : 'Base';

      // Automatically switch to correct network if needed
      await ensureCorrectNetwork(expectedChainId, networkName);

      // Now get provider (after potential network switch)
      const ethProvider = await getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);

      const balanceInWei = await provider.getBalance(ethAddress);
      const balanceInEth = Number(ethers.formatEther(balanceInWei));
      const balanceInWeiNumber = Number(balanceInWei);

      return {
        readable: balanceInEth,
        smallest: balanceInWeiNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch BASE-ETH balance:', err);
      throw err; // Re-throw to preserve error message
    }
  }, [configMode, getEthereumProvider, ensureCorrectNetwork]);

  /**
   * Fetch BASE-USDC balance using ethers.js and ERC-20 contract
   * Automatically switches network if needed
   */
  const fetchBaseUsdcBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const expectedChainId = configMode === 'development'
        ? X402_CONFIG.chainIds.development
        : X402_CONFIG.chainIds.production;
      const networkName = configMode === 'development' ? 'Base Sepolia' : 'Base';

      // Automatically switch to correct network if needed
      await ensureCorrectNetwork(expectedChainId, networkName);

      // Now get provider (after potential network switch)
      const ethProvider = await getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);

      // Get USDC contract address for current network
      const usdcAddress = configMode === 'development'
        ? X402_CONFIG.usdcAddresses.development
        : X402_CONFIG.usdcAddresses.production;

      // Create contract instance
      const contract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

      // Fetch balance
      const balanceInSmallest = await contract.balanceOf(ethAddress);
      const balanceInUsdc = Number(ethers.formatUnits(balanceInSmallest, 6)); // USDC has 6 decimals
      const balanceInSmallestNumber = Number(balanceInSmallest);

      return {
        readable: balanceInUsdc,
        smallest: balanceInSmallestNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch BASE-USDC balance:', err);
      throw err; // Re-throw to preserve error message
    }
  }, [configMode, getEthereumProvider, ensureCorrectNetwork]);

  /**
   * Fetch BASE-ARIO balance using ethers.js and ERC-20 contract
   * ARIO tokens bridged to Base L2 network
   * Automatically switches network if needed
   */
  const fetchBaseArioBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const expectedChainId = configMode === 'development'
        ? BASE_ARIO_CONFIG.chainIds.development
        : BASE_ARIO_CONFIG.chainIds.production;
      const networkName = configMode === 'development' ? 'Base Sepolia' : 'Base';

      // Automatically switch to correct network if needed
      await ensureCorrectNetwork(expectedChainId, networkName);

      // Now get provider (after potential network switch)
      const ethProvider = await getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);

      // Get Base ARIO contract address for current network
      const arioAddress = configMode === 'development'
        ? BASE_ARIO_CONFIG.contractAddresses.development
        : BASE_ARIO_CONFIG.contractAddresses.production;

      // Create contract instance
      const contract = new ethers.Contract(arioAddress, ERC20_ABI, provider);

      // Fetch balance
      const balanceInSmallest = await contract.balanceOf(ethAddress);
      const balanceInArio = Number(ethers.formatUnits(balanceInSmallest, BASE_ARIO_CONFIG.decimals)); // ARIO uses 6 decimals
      const balanceInSmallestNumber = Number(balanceInSmallest);

      return {
        readable: balanceInArio,
        smallest: balanceInSmallestNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch BASE-ARIO balance:', err);
      throw err; // Re-throw to preserve error message
    }
  }, [configMode, getEthereumProvider, ensureCorrectNetwork]);

  /**
   * Fetch Ethereum L1 ETH balance using ethers.js
   * Automatically switches network if needed
   */
  const fetchEthereumBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const expectedChainId = configMode === 'development'
        ? ETHEREUM_CONFIG.chainIds.development
        : ETHEREUM_CONFIG.chainIds.production;
      const networkName = configMode === 'development' ? 'Sepolia' : 'Ethereum Mainnet';

      // Automatically switch to correct network if needed
      await ensureCorrectNetwork(expectedChainId, networkName);

      // Now get provider (after potential network switch)
      const ethProvider = await getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);

      const balanceInWei = await provider.getBalance(ethAddress);
      const balanceInEth = Number(ethers.formatEther(balanceInWei));
      const balanceInWeiNumber = Number(balanceInWei);

      return {
        readable: balanceInEth,
        smallest: balanceInWeiNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch Ethereum balance:', err);
      throw err; // Re-throw to preserve error message
    }
  }, [configMode, getEthereumProvider, ensureCorrectNetwork]);

  /**
   * Fetch Polygon POL balance using ethers.js
   * Automatically switches network if needed
   */
  const fetchPolBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const expectedChainId = configMode === 'development'
        ? POLYGON_CONFIG.chainIds.development
        : POLYGON_CONFIG.chainIds.production;
      const networkName = configMode === 'development' ? 'Polygon Amoy' : 'Polygon';

      // Automatically switch to correct network if needed
      await ensureCorrectNetwork(expectedChainId, networkName);

      // Now get provider (after potential network switch)
      const ethProvider = await getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);

      const balanceInWei = await provider.getBalance(ethAddress);
      const balanceInPol = Number(ethers.formatEther(balanceInWei));
      const balanceInWeiNumber = Number(balanceInWei);

      return {
        readable: balanceInPol,
        smallest: balanceInWeiNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch POL balance:', err);
      throw err; // Re-throw to preserve error message
    }
  }, [configMode, getEthereumProvider, ensureCorrectNetwork]);

  /**
   * Fetch USDC balance on Ethereum L1 using ethers.js and ERC-20 contract
   * Automatically switches network if needed
   */
  const fetchUsdcBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const expectedChainId = configMode === 'development'
        ? ETHEREUM_CONFIG.chainIds.development
        : ETHEREUM_CONFIG.chainIds.production;
      const networkName = configMode === 'development' ? 'Sepolia' : 'Ethereum Mainnet';

      // Automatically switch to correct network if needed
      await ensureCorrectNetwork(expectedChainId, networkName);

      // Now get provider (after potential network switch)
      const ethProvider = await getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);

      // Get USDC contract address for current network
      const usdcAddress = configMode === 'development'
        ? ETHEREUM_CONFIG.usdcAddresses.development
        : ETHEREUM_CONFIG.usdcAddresses.production;

      // Create contract instance
      const contract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

      // Fetch balance
      const balanceInSmallest = await contract.balanceOf(ethAddress);
      const balanceInUsdc = Number(ethers.formatUnits(balanceInSmallest, 6)); // USDC has 6 decimals
      const balanceInSmallestNumber = Number(balanceInSmallest);

      return {
        readable: balanceInUsdc,
        smallest: balanceInSmallestNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch USDC balance on Ethereum:', err);
      throw err; // Re-throw to preserve error message
    }
  }, [configMode, getEthereumProvider, ensureCorrectNetwork]);

  /**
   * Fetch USDC balance on Polygon using ethers.js and ERC-20 contract
   * Automatically switches network if needed
   */
  const fetchPolygonUsdcBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const expectedChainId = configMode === 'development'
        ? POLYGON_CONFIG.chainIds.development
        : POLYGON_CONFIG.chainIds.production;
      const networkName = configMode === 'development' ? 'Polygon Amoy' : 'Polygon';

      // Automatically switch to correct network if needed
      await ensureCorrectNetwork(expectedChainId, networkName);

      // Now get provider (after potential network switch)
      const ethProvider = await getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);

      // Get USDC contract address for current network
      const usdcAddress = configMode === 'development'
        ? POLYGON_CONFIG.usdcAddresses.development
        : POLYGON_CONFIG.usdcAddresses.production;

      // Create contract instance
      const contract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

      // Fetch balance
      const balanceInSmallest = await contract.balanceOf(ethAddress);
      const balanceInUsdc = Number(ethers.formatUnits(balanceInSmallest, 6)); // USDC has 6 decimals
      const balanceInSmallestNumber = Number(balanceInSmallest);

      return {
        readable: balanceInUsdc,
        smallest: balanceInSmallestNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch USDC balance on Polygon:', err);
      throw err; // Re-throw to preserve error message
    }
  }, [configMode, getEthereumProvider, ensureCorrectNetwork]);

  /**
   * Main fetch function that routes to appropriate token-specific fetcher
   */
  const fetchBalance = useCallback(async () => {
    // Reset state
    setError(null);
    setIsNetworkError(false);

    // Early return if no wallet connected or no token selected
    if (!address || !tokenType || !walletType) {
      setBalance(0);
      setBalanceSmallestUnit(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let result: { readable: number; smallest: number };

      switch (tokenType) {
        case 'arweave':
          result = await fetchArBalance(address);
          break;

        case 'ario':
          result = await fetchArioBalance(address);
          break;

        case 'solana':
          result = await fetchSolBalance(address);
          break;

        case 'ethereum':
          result = await fetchEthereumBalance(address);
          break;

        case 'base-eth':
          result = await fetchBaseEthBalance(address);
          break;

        case 'pol':
          result = await fetchPolBalance(address);
          break;

        case 'usdc':
          result = await fetchUsdcBalance(address);
          break;

        case 'base-usdc':
          result = await fetchBaseUsdcBalance(address);
          break;

        case 'base-ario':
          result = await fetchBaseArioBalance(address);
          break;

        case 'polygon-usdc':
          result = await fetchPolygonUsdcBalance(address);
          break;

        default:
          throw new Error(`Balance fetching not implemented for ${tokenType}`);
      }

      setBalance(result.readable);
      setBalanceSmallestUnit(result.smallest);
      setError(null);
      setIsNetworkError(false);
    } catch (err: any) {
      console.error(`Error fetching ${tokenType} balance:`, err);
      const errorMessage = err.message || 'Unable to fetch balance';
      setError(errorMessage);

      // Detect network errors - these should block proceeding
      const isWrongNetwork = errorMessage.includes('Please switch to') ||
                            errorMessage.includes('network');
      setIsNetworkError(isWrongNetwork);

      setBalance(0);
      setBalanceSmallestUnit(0);
    } finally {
      setLoading(false);
    }
  }, [address, tokenType, walletType, fetchArBalance, fetchArioBalance, fetchSolBalance, fetchEthereumBalance, fetchBaseEthBalance, fetchPolBalance, fetchUsdcBalance, fetchBaseUsdcBalance, fetchBaseArioBalance, fetchPolygonUsdcBalance]);

  // Fetch balance on mount and when dependencies change (only if enabled)
  useEffect(() => {
    if (!enabled) return;
    fetchBalance();
  }, [fetchBalance, enabled]);

  // Auto-refresh every 5 minutes (only when enabled)
  useEffect(() => {
    if (!enabled || !address || !tokenType) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 300000); // 300 seconds (5 minutes)

    return () => clearInterval(interval);
  }, [address, tokenType, fetchBalance, enabled]);

  return {
    balance,
    balanceSmallestUnit,
    loading,
    error,
    isNetworkError,
    refetch: fetchBalance,
  };
}
