import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useStore } from '../store/useStore';
import { SupportedTokenType, X402_CONFIG, ERC20_ABI, ETHEREUM_CONFIG, POLYGON_CONFIG, BASE_ARIO_CONFIG } from '../constants';
import { getSolanaConnection } from '../utils/solanaConnection';

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
   */
  const fetchBaseEthBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? X402_CONFIG.chainIds.development
        : X402_CONFIG.chainIds.production;

      // If wrong network, return 0 balance with clear error
      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Base Sepolia' : 'Base';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

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
  }, [configMode]);

  /**
   * Fetch BASE-USDC balance using ethers.js and ERC-20 contract
   */
  const fetchBaseUsdcBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? X402_CONFIG.chainIds.development
        : X402_CONFIG.chainIds.production;

      // If wrong network, return 0 balance with clear error
      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Base Sepolia' : 'Base';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

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
  }, [configMode]);

  /**
   * Fetch BASE-ARIO balance using ethers.js and ERC-20 contract
   * ARIO tokens bridged to Base L2 network
   */
  const fetchBaseArioBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network (same chain IDs as base-usdc/base-eth)
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? BASE_ARIO_CONFIG.chainIds.development
        : BASE_ARIO_CONFIG.chainIds.production;

      // If wrong network, return 0 balance with clear error
      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Base Sepolia' : 'Base';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

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
  }, [configMode]);

  /**
   * Fetch Ethereum L1 ETH balance using ethers.js
   */
  const fetchEthereumBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? ETHEREUM_CONFIG.chainIds.development
        : ETHEREUM_CONFIG.chainIds.production;

      // If wrong network, return 0 balance with clear error
      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Sepolia' : 'Ethereum Mainnet';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

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
  }, [configMode]);

  /**
   * Fetch Polygon POL balance using ethers.js
   */
  const fetchPolBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? POLYGON_CONFIG.chainIds.development
        : POLYGON_CONFIG.chainIds.production;

      // If wrong network, return 0 balance with clear error
      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Polygon Amoy' : 'Polygon';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

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
  }, [configMode]);

  /**
   * Fetch USDC balance on Ethereum L1 using ethers.js and ERC-20 contract
   */
  const fetchUsdcBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? ETHEREUM_CONFIG.chainIds.development
        : ETHEREUM_CONFIG.chainIds.production;

      // If wrong network, return 0 balance with clear error
      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Sepolia' : 'Ethereum Mainnet';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

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
  }, [configMode]);

  /**
   * Fetch USDC balance on Polygon using ethers.js and ERC-20 contract
   */
  const fetchPolygonUsdcBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? POLYGON_CONFIG.chainIds.development
        : POLYGON_CONFIG.chainIds.production;

      // If wrong network, return 0 balance with clear error
      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Polygon Amoy' : 'Polygon';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

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
  }, [configMode]);

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
