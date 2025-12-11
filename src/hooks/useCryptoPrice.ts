import { useQuery } from '@tanstack/react-query';
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { SupportedTokenType } from '../constants';
import { useTurboConfig } from './useTurboConfig';

/**
 * Get the smallest unit for a token type (e.g., 10^18 wei for ETH)
 */
const getTokenSmallestUnit = (tokenType: SupportedTokenType): bigint => {
  switch (tokenType) {
    case 'arweave':
      return BigInt(10 ** 12); // winston
    case 'ario':
    case 'base-ario':
      return BigInt(10 ** 6); // mARIO - 1 ARIO = 1,000,000 mARIO (same for AO and Base)
    case 'ethereum':
    case 'base-eth':
      return BigInt(10 ** 18); // wei
    case 'solana':
      return BigInt(10 ** 9); // lamports
    case 'pol':
      return BigInt(10 ** 18); // wei equivalent
    case 'kyve':
      return BigInt(10 ** 6); // ukyve
    case 'usdc':
    case 'base-usdc':
    case 'polygon-usdc':
      return BigInt(10 ** 6); // USDC uses 6 decimals on all chains
    default:
      return BigInt(10 ** 12); // default
  }
};

/**
 * Hook to convert winc amount to crypto token amount
 * Uses React Query for caching to avoid excessive API calls
 *
 * @param wincAmount - Amount in winc (smallest unit)
 * @param tokenType - Crypto token to convert to
 * @returns Token amount in display units (e.g., ETH not wei) or undefined if not loaded
 */
export function useCryptoPriceForWinc(
  wincAmount: number | undefined,
  tokenType: SupportedTokenType
): number | undefined {
  const turboConfig = useTurboConfig(tokenType);

  const { data: tokenAmount } = useQuery({
    queryKey: ['cryptoPriceForWinc', wincAmount, tokenType, turboConfig.paymentServiceConfig.url],
    queryFn: async () => {
      if (!wincAmount || wincAmount <= 0) return undefined;

      const turbo = TurboFactory.unauthenticated({
        ...turboConfig,
        token: tokenType as any,
      });

      // Get the exchange rate by checking cost of 1 full token
      const oneToken = getTokenSmallestUnit(tokenType);
      const { winc: wincForOneToken } = await turbo.getWincForToken({
        tokenAmount: oneToken,
      });

      // Convert winc to BigInt (API returns string)
      const wincForOneTokenBigInt = BigInt(wincForOneToken);

      // Calculate token amount: (wincAmount / wincForOneToken) * oneToken
      // Then convert to display units by dividing by smallest unit
      const tokenInSmallestUnit = (BigInt(Math.round(wincAmount)) * oneToken) / wincForOneTokenBigInt;

      // Convert to display units (e.g., wei to ETH)
      return Number(tokenInSmallestUnit) / Number(oneToken);
    },
    enabled: !!wincAmount && wincAmount > 0,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
  });

  return tokenAmount;
}

/**
 * Hook to convert crypto token amount to winc
 * Uses React Query for caching to avoid excessive API calls
 *
 * @param tokenAmount - Amount of crypto token (in smallest unit, e.g., wei for ETH)
 * @param tokenType - Crypto token to convert from
 * @returns Winc amount or undefined if not loaded
 */
export function useWincForCrypto(
  tokenAmount: bigint | undefined,
  tokenType: SupportedTokenType
): number | undefined {
  const turboConfig = useTurboConfig(tokenType);

  const { data: wincAmount } = useQuery({
    queryKey: ['wincForCrypto', tokenAmount?.toString(), tokenType, turboConfig.paymentServiceConfig.url],
    queryFn: async () => {
      if (!tokenAmount || tokenAmount <= 0n) return undefined;

      const turbo = TurboFactory.unauthenticated({
        ...turboConfig,
        token: tokenType as any,
      });

      const result = await turbo.getWincForToken({
        tokenAmount,
      });

      return Number(result.winc);
    },
    enabled: !!tokenAmount && tokenAmount > 0n,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
  });

  return wincAmount;
}
