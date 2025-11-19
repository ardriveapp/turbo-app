import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useStore } from '../store/useStore';
import { SupportedTokenType, X402_CONFIG, ERC20_ABI } from '../constants';

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
 * Hook to fetch and monitor wallet balance for JIT payment tokens
 *
 * Supports:
 * - ARIO (Arweave wallets)
 * - SOL (Solana wallets)
 * - BASE-ETH (Ethereum wallets on Base network)
 * - BASE-USDC (Ethereum wallets on Base network)
 *
 * Auto-refreshes every 15 seconds while component is mounted
 */
export function useTokenBalance(
  tokenType: SupportedTokenType | null,
  walletType: 'arweave' | 'ethereum' | 'solana' | null,
  address: string | null
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
   * Fetch SOL balance using Solana web3.js
   */
  const fetchSolBalance = useCallback(async (solanaAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      const config = getCurrentConfig();
      const rpcUrl = config.tokenMap['solana'];

      if (!rpcUrl) {
        throw new Error('Solana RPC URL not configured');
      }

      const connection = new Connection(rpcUrl);
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
  }, [getCurrentConfig]);

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
        case 'ario':
          result = await fetchArioBalance(address);
          break;

        case 'solana':
          result = await fetchSolBalance(address);
          break;

        case 'base-eth':
          result = await fetchBaseEthBalance(address);
          break;

        case 'base-usdc':
          result = await fetchBaseUsdcBalance(address);
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
  }, [address, tokenType, walletType, fetchArioBalance, fetchSolBalance, fetchBaseEthBalance, fetchBaseUsdcBalance]);

  // Fetch balance on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!address || !tokenType) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [address, tokenType, fetchBalance]);

  return {
    balance,
    balanceSmallestUnit,
    loading,
    error,
    isNetworkError,
    refetch: fetchBalance,
  };
}
