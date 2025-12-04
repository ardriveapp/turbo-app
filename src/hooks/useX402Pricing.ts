import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { TurboFactory } from '@ardrive/turbo-sdk/web';

interface X402PricingResult {
  usdcAmount: number; // In human-readable USDC (e.g., 2.5 for 2.5 USDC)
  usdcAmountSmallestUnit: string; // In smallest unit (6 decimals) as string (e.g., "2500000")
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get x402 pricing for a given file size using Turbo SDK's getTokenPriceForBytes
 *
 * Uses the SDK's pricing endpoint which returns the token price for a given byte count.
 * The SDK returns the price in the token's smallest unit (mUSDC for base-usdc).
 *
 * @param fileSizeBytes - The size of the file in bytes
 * @returns Pricing information in USDC
 */
export function useX402Pricing(fileSizeBytes: number): X402PricingResult {
  // Select config values directly from store to ensure reactivity
  const { config } = useStore((s) => ({
    config: s.getCurrentConfig(),
  }));

  const [usdcAmount, setUsdcAmount] = useState<number>(0);
  const [usdcAmountSmallestUnit, setUsdcAmountSmallestUnit] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize Turbo client creation to avoid recreating on every render
  const turboClient = useMemo(() => {
    // Create unauthenticated client for pricing queries
    // We use base-usdc token type since x402 only supports base-usdc
    return TurboFactory.unauthenticated({
      token: 'base-usdc',
      paymentServiceConfig: { url: config.paymentServiceUrl },
      uploadServiceConfig: { url: config.uploadServiceUrl },
    });
  }, [config.paymentServiceUrl, config.uploadServiceUrl]);

  const fetchPricing = useCallback(async () => {
    if (fileSizeBytes <= 0) {
      setUsdcAmount(0);
      setUsdcAmountSmallestUnit('0');
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[X402 Pricing] Fetching price for ${fileSizeBytes} bytes`);

      // Use SDK's getTokenPriceForBytes method
      const response = await turboClient.getTokenPriceForBytes({
        byteCount: fileSizeBytes,
      });

      // Response format: { tokenPrice: string, byteCount: number, token: TokenType }
      // tokenPrice is returned with 6 decimal places (e.g., "0.001700" for 0.0017 USDC)
      // This is the human-readable USDC amount, NOT the smallest unit
      const tokenPriceStr = response.tokenPrice;
      const priceInUSDC = Number(tokenPriceStr);
      // Convert to smallest unit (mUSDC) for internal use - multiply by 1,000,000
      const priceInSmallestUnit = Math.ceil(priceInUSDC * 1_000_000).toString();

      console.log(
        `[X402 Pricing] Price: ${priceInUSDC} USDC (${priceInSmallestUnit} mUSDC) for ${fileSizeBytes} bytes`
      );

      setUsdcAmount(priceInUSDC);
      setUsdcAmountSmallestUnit(priceInSmallestUnit);
    } catch (err) {
      console.error('[X402 Pricing] Error fetching pricing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch x402 pricing';
      setError(errorMessage);
      setUsdcAmount(0);
      setUsdcAmountSmallestUnit('0');
    } finally {
      setLoading(false);
    }
  }, [fileSizeBytes, turboClient]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  return {
    usdcAmount,
    usdcAmountSmallestUnit,
    loading,
    error,
  };
}
