import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { X402_CONFIG } from '../constants';
import type { ConfigMode } from '../store/useStore';

interface X402PricingResult {
  usdcAmount: number; // In human-readable USDC (e.g., 2.5 for 2.5 USDC)
  usdcAmountSmallestUnit: string; // In smallest unit (6 decimals) as string (e.g., "2500000")
  loading: boolean;
  error: string | null;
}

/**
 * Helper to get the x402 network key from config mode
 * Uses centralized X402_CONFIG mapping instead of hard-coded logic
 */
function getNetworkKeyFromConfigMode(configMode: ConfigMode): string {
  // Custom mode uses production network (mainnet)
  const normalizedMode = configMode === 'custom' ? 'production' : configMode;
  return X402_CONFIG.supportedNetworks[normalizedMode as keyof typeof X402_CONFIG.supportedNetworks];
}

/**
 * Hook to get x402 pricing for a given file size
 * Makes a request to the x402 endpoint with Content-Length to get pricing
 *
 * @param fileSizeBytes - The size of the file in bytes
 * @returns Pricing information in USDC
 */
export function useX402Pricing(fileSizeBytes: number): X402PricingResult {
  const getCurrentConfig = useStore(s => s.getCurrentConfig);
  const configMode = useStore(s => s.configMode);
  const [usdcAmount, setUsdcAmount] = useState<number>(0);
  const [usdcAmountSmallestUnit, setUsdcAmountSmallestUnit] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Derive stable config object - safe because getCurrentConfig() never throws
  const config = useMemo(() => getCurrentConfig(), [getCurrentConfig]);

  // Memoize x402 URL to prevent unnecessary re-renders and API calls
  // Safe dependencies: configMode and derived config values (no direct customConfig access)
  const x402Url = useMemo(() => {
    return configMode === 'custom'
      ? `${config.uploadServiceUrl}/x402/data-item/signed`
      : config.x402UploadUrl || `${config.uploadServiceUrl}/x402/data-item/signed`;
  }, [configMode, config.uploadServiceUrl, config.x402UploadUrl]);

  useEffect(() => {
    // Skip if file size is 0 or negative
    if (fileSizeBytes <= 0) {
      setUsdcAmount(0);
      setUsdcAmountSmallestUnit('0');
      setLoading(false); // Explicitly set loading to false
      setError(null);
      return;
    }

    const fetchX402Pricing = async () => {
      setLoading(true);
      setError(null);

      try {

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

          // Find the Base network requirements using centralized config mapping
          const networkKey = getNetworkKeyFromConfigMode(configMode);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileSizeBytes, x402Url]); // Only re-fetch when file size or x402 URL changes

  return {
    usdcAmount,
    usdcAmountSmallestUnit,
    loading,
    error,
  };
}
