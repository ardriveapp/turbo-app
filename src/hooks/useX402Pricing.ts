import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface X402PricingResult {
  usdcAmount: number; // In human-readable USDC (e.g., 2.5 for 2.5 USDC)
  usdcAmountSmallestUnit: string; // In smallest unit (6 decimals) as string (e.g., "2500000")
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get x402 pricing for a given file size
 * Makes a request to the x402 endpoint with Content-Length to get pricing
 *
 * @param fileSizeBytes - The size of the file in bytes
 * @returns Pricing information in USDC
 */
export function useX402Pricing(fileSizeBytes: number): X402PricingResult {
  const { getCurrentConfig, configMode } = useStore();
  const [usdcAmount, setUsdcAmount] = useState<number>(0);
  const [usdcAmountSmallestUnit, setUsdcAmountSmallestUnit] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if file size is 0 or negative
    if (fileSizeBytes <= 0) {
      setUsdcAmount(0);
      setUsdcAmountSmallestUnit('0');
      setError(null);
      return;
    }

    const fetchX402Pricing = async () => {
      setLoading(true);
      setError(null);

      try {
        const config = getCurrentConfig();

        // Derive x402 URL from base upload URL if in custom mode
        const x402Url = configMode === 'custom'
          ? `${config.uploadServiceUrl}/x402/data-item/signed`
          : config.x402UploadUrl;

        console.log(`[X402 Pricing] Fetching price for ${fileSizeBytes} bytes from ${x402Url}`);

        // Make a POST request with actual body size (like curl --data-binary)
        // The body must be the correct size for Content-Length to be accurate
        // This will return a 402 response with pricing information
        const response = await fetch(x402Url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: new Uint8Array(fileSizeBytes), // Body with correct size (zeros)
        });

        // We expect a 402 Payment Required response with pricing
        if (response.status === 402) {
          const data = await response.json();

          // Find the Base network requirements
          const useMainnet = configMode !== 'development';
          const networkKey = useMainnet ? 'base' : 'base-sepolia';
          const requirements = data.accepts?.find((a: any) => a.network === networkKey);

          if (!requirements) {
            throw new Error(`Network ${networkKey} not available in x402 pricing response`);
          }

          // Parse the USDC amount (in smallest unit - 6 decimals)
          const amountSmallestUnit = requirements.maxAmountRequired;
          const amountUSDC = Number(amountSmallestUnit) / 1_000_000; // Convert from smallest unit to USDC

          console.log(`[X402 Pricing] Price: ${amountUSDC} USDC (${amountSmallestUnit} smallest unit)`);

          setUsdcAmount(amountUSDC);
          setUsdcAmountSmallestUnit(amountSmallestUnit);
        } else {
          // Unexpected status code
          const errorText = await response.text();
          throw new Error(`Unexpected response status ${response.status}: ${errorText}`);
        }
      } catch (err) {
        console.error('[X402 Pricing] Error fetching pricing:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch x402 pricing';
        setError(errorMessage);
        setUsdcAmount(0);
        setUsdcAmountSmallestUnit('0');
      } finally {
        setLoading(false);
      }
    };

    fetchX402Pricing();
  }, [fileSizeBytes, getCurrentConfig, configMode]);

  return {
    usdcAmount,
    usdcAmountSmallestUnit,
    loading,
    error,
  };
}
