import { useBalance as useWagmiBalance } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SupportedTokenType } from '../constants';
import { useState, useEffect } from 'react';

interface CryptoBalanceResult {
  balance: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch crypto balance for a given wallet address and token type
 * Uses wallet providers directly (wagmi for ETH/Base, Solana wallet-adapter for SOL)
 * Supports: ETH (Ethereum mainnet), Base-ETH, SOL (Solana)
 */
export function useCryptoBalance(
  address: string | null,
  tokenType: SupportedTokenType
): CryptoBalanceResult {
  // Ethereum mainnet balance using wagmi
  const ethBalance = useWagmiBalance({
    address: address as `0x${string}` | undefined,
    chainId: mainnet.id,
    query: {
      enabled: tokenType === 'ethereum' && !!address,
      staleTime: 30 * 1000, // 30 second cache
      refetchInterval: false,
    },
  });

  // Base network balance using wagmi
  const baseBalance = useWagmiBalance({
    address: address as `0x${string}` | undefined,
    chainId: base.id,
    query: {
      enabled: tokenType === 'base-eth' && !!address,
      staleTime: 30 * 1000, // 30 second cache
      refetchInterval: false,
    },
  });

  // Solana balance using wallet-adapter connection
  const { connection } = useConnection();
  const [solanaBalance, setSolanaBalance] = useState<string | null>(null);
  const [solanaLoading, setSolanaLoading] = useState(false);
  const [solanaError, setSolanaError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenType !== 'solana' || !address || !connection) {
      setSolanaBalance(null);
      setSolanaLoading(false);
      setSolanaError(null);
      return;
    }

    const fetchSolanaBalance = async () => {
      setSolanaLoading(true);
      setSolanaError(null);

      try {
        const pubKey = new PublicKey(address);
        const balanceLamports = await connection.getBalance(pubKey);
        const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

        // Format to 6 decimal places (remove trailing zeros)
        const balanceStr = balanceSol.toFixed(6).replace(/\.?0+$/, '');
        setSolanaBalance(balanceStr);
      } catch (err) {
        console.error('Error fetching Solana balance:', err);
        setSolanaError(err instanceof Error ? err.message : 'Failed to fetch balance');
        setSolanaBalance(null);
      } finally {
        setSolanaLoading(false);
      }
    };

    fetchSolanaBalance();
  }, [address, tokenType, connection]);

  // Return the appropriate balance based on token type
  if (tokenType === 'ethereum') {
    return {
      balance: ethBalance.data?.formatted
        ? parseFloat(ethBalance.data.formatted).toFixed(6).replace(/\.?0+$/, '')
        : null,
      loading: ethBalance.isLoading || ethBalance.isFetching,
      error: ethBalance.error ? ethBalance.error.message : null,
    };
  }

  if (tokenType === 'base-eth') {
    return {
      balance: baseBalance.data?.formatted
        ? parseFloat(baseBalance.data.formatted).toFixed(6).replace(/\.?0+$/, '')
        : null,
      loading: baseBalance.isLoading || baseBalance.isFetching,
      error: baseBalance.error ? baseBalance.error.message : null,
    };
  }

  if (tokenType === 'solana') {
    return {
      balance: solanaBalance,
      loading: solanaLoading,
      error: solanaError,
    };
  }

  // Token type not supported for balance display
  return {
    balance: null,
    loading: false,
    error: null,
  };
}
