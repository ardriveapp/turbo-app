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

// Use a fixed 1 MiB probe size to avoid OOM with large file sizes
// The pricing is linear, so we can scale the result based on the requested size
const PROBE_SIZE_BYTES = 1024 * 1024; // 1 MiB

/**
 * Hook to get x402 pricing for a given file size
 * Makes a request to the x402 endpoint with a 1 MiB probe to get pricing rate,
 * then scales the result linearly to the requested file size.
 * This avoids OOM issues with large file sizes (e.g., 1 GiB probes).
 *
 * @param fileSizeBytes - The size of the file in bytes
 * @returns Pricing information in USDC (scaled to the requested file size)
 */
export function useX402Pricing(fileSizeBytes: number): X402PricingResult {
  // Select config values directly from store to ensure reactivity
  const { configMode, config } = useStore((s) => ({
    configMode: s.configMode,
    config: s.getCurrentConfig(),
  }));

  const [usdcAmount, setUsdcAmount] = useState<number>(0);
  const [usdcAmountSmallestUnit, setUsdcAmountSmallestUnit] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize x402 URL to prevent unnecessary re-renders and API calls
  // Recomputes when configMode or uploadServiceUrl changes
  const x402Url = useMemo(() => {
    return `${config.uploadServiceUrl}/x402/data-item/signed`;
  }, [config.uploadServiceUrl]);

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
        console.log(`[X402 Pricing] Fetching rate using ${PROBE_SIZE_BYTES} byte probe, scaling to ${fileSizeBytes} bytes`);

        // Make a POST request with a fixed 1 MiB probe size to avoid OOM
        // The pricing is linear, so we'll scale the result based on the requested size
        const response = await fetch(x402Url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: new Uint8Array(PROBE_SIZE_BYTES), // Fixed 1 MiB probe
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

          // Parse the USDC amount for the probe size (in smallest unit - 6 decimals)
          const probeAmountSmallestUnit = requirements.maxAmountRequired;
          const probeAmountUSDC = Number(probeAmountSmallestUnit) / 1_000_000;

          // Scale linearly to the requested file size
          const scaleFactor = fileSizeBytes / PROBE_SIZE_BYTES;
          const scaledAmountUSDC = probeAmountUSDC * scaleFactor;
          const scaledAmountSmallestUnit = Math.ceil(Number(probeAmountSmallestUnit) * scaleFactor).toString();

          console.log(`[X402 Pricing] Probe price: ${probeAmountUSDC} USDC, Scaled price: ${scaledAmountUSDC} USDC (${scaledAmountSmallestUnit} smallest unit)`);

          setUsdcAmount(scaledAmountUSDC);
          setUsdcAmountSmallestUnit(scaledAmountSmallestUnit);
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
  }, [fileSizeBytes, x402Url, configMode]); // Re-fetch when file size, x402 URL, or config mode changes

  return {
    usdcAmount,
    usdcAmountSmallestUnit,
    loading,
    error,
  };
}
