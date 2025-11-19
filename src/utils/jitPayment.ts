import { SupportedTokenType } from '../constants';

/**
 * Check if a wallet type supports just-in-time (on-demand) payments
 * Currently supported: ARIO, SOL, Base-ETH, Base-USDC
 */
export function supportsJitPayment(tokenType: SupportedTokenType | null): boolean {
  return tokenType === 'ario' || tokenType === 'solana' || tokenType === 'base-eth' || tokenType === 'base-usdc';
}

/**
 * Get the token conversion function for a given token type
 * Converts from readable amount to smallest unit (e.g., SOL → Lamports)
 */
export function getTokenConverter(tokenType: SupportedTokenType): ((amount: number) => number) | null {
  const TOKEN_DECIMALS: Record<SupportedTokenType, number> = {
    arweave: 12,
    ario: 6,  // 1 ARIO = 1,000,000 mARIO
    ethereum: 18,
    'base-eth': 18,
    solana: 9,
    kyve: 18,
    pol: 18,
    'usdc': 6,        // USDC uses 6 decimals
    'base-usdc': 6,   // USDC uses 6 decimals
    'polygon-usdc': 6, // USDC uses 6 decimals
  };

  const decimals = TOKEN_DECIMALS[tokenType];
  return (amount: number) => Math.floor(amount * Math.pow(10, decimals));
}

/**
 * Convert smallest unit back to readable amount
 */
export function fromSmallestUnit(amount: number, tokenType: SupportedTokenType): number {
  const TOKEN_DECIMALS: Record<SupportedTokenType, number> = {
    arweave: 12,
    ario: 6,  // 1 ARIO = 1,000,000 mARIO
    ethereum: 18,
    'base-eth': 18,
    solana: 9,
    kyve: 18,
    pol: 18,
    'usdc': 6,        // USDC uses 6 decimals
    'base-usdc': 6,   // USDC uses 6 decimals
    'polygon-usdc': 6, // USDC uses 6 decimals
  };

  const decimals = TOKEN_DECIMALS[tokenType];
  return amount / Math.pow(10, decimals);
}

/**
 * Format token amount for display with appropriate precision
 * Uses dynamic precision to show very small amounts accurately
 */
export function formatTokenAmount(amount: number, tokenType: SupportedTokenType): string {
  // For very small amounts, use higher precision to avoid showing 0.0000
  // Increased threshold to 0.01 to catch small USDC amounts like 0.003734
  if (amount < 0.01 && amount > 0) {
    // Use up to 6 decimal places for very small amounts (USDC has 6 decimals)
    return amount.toFixed(6).replace(/\.?0+$/, ''); // Remove trailing zeros
  }

  // Standard precision for normal amounts
  const precision: Record<SupportedTokenType, number> = {
    ario: 2,        // 100.50 ARIO
    solana: 6,      // 0.000001 SOL (increased from 4)
    'base-eth': 6,  // 0.000001 ETH (increased from 4)
    ethereum: 6,
    arweave: 4,
    kyve: 2,
    pol: 2,
    'usdc': 2,        // 10.50 USDC (stablecoin, dollars and cents)
    'base-usdc': 2,   // 10.50 USDC (stablecoin, dollars and cents)
    'polygon-usdc': 2, // 10.50 USDC (stablecoin, dollars and cents)
  };

  return amount.toFixed(precision[tokenType]);
}

// Price cache to avoid spamming Turbo API
interface PriceCache {
  tokenPricePerCredit: number;
  usdPerToken: number | null;
  timestamp: number;
}

const priceCache = new Map<SupportedTokenType, PriceCache>();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate the required token amount for a given credit shortage
 * Uses Turbo SDK's real-time pricing with caching to avoid spam
 */
export async function calculateRequiredTokenAmount({
  creditsNeeded,
  tokenType,
  bufferMultiplier = 1.05,
}: {
  creditsNeeded: number;
  tokenType: SupportedTokenType;
  bufferMultiplier?: number;
}): Promise<{
  tokenAmount: number; // In smallest unit (e.g., Lamports, Winston)
  tokenAmountReadable: number; // Human-readable (e.g., 0.0001)
  estimatedUSD: number | null;
}> {
  const now = Date.now();
  const cached = priceCache.get(tokenType);

  // Use cached price if available and fresh
  if (cached && (now - cached.timestamp) < PRICE_CACHE_DURATION) {
    const baseAmount = creditsNeeded * cached.tokenPricePerCredit;
    const bufferedAmount = baseAmount * bufferMultiplier;
    const converter = getTokenConverter(tokenType);
    const smallestUnit = converter ? converter(bufferedAmount) : 0;

    return {
      tokenAmount: smallestUnit,
      tokenAmountReadable: bufferedAmount,
      estimatedUSD: cached.usdPerToken ? bufferedAmount * cached.usdPerToken : null,
    };
  }

  // Fetch fresh pricing
  try {
    // Get current dev mode configuration from store
    const { useStore } = await import('../store/useStore');
    const turboConfig = useStore.getState().getCurrentConfig();

    const wincPerCredit = 1_000_000_000_000; // 1 trillion winc = 1 credit
    const oneGiBBytes = 1024 * 1024 * 1024;

    let wincPerGiB: number;
    let tokensPerGiB: number;
    let usdPerToken: number | null = null;

    // X402 pricing for base-usdc (uses upload service endpoint)
    if (tokenType === 'base-usdc') {
      console.log('[X402 Pricing] Fetching price from upload service for base-usdc...');

      const uploadServiceUrl = turboConfig.uploadServiceUrl;
      const priceUrl = `${uploadServiceUrl}/price/x402/data-item/base-usdc/${oneGiBBytes}`;

      const response = await fetch(priceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch x402 pricing: ${response.status} ${response.statusText}`);
      }

      const priceData = await response.json();
      console.log('[X402 Pricing] Response:', priceData);

      // Parse x402 response
      // winstonCost is string, convert to number
      wincPerGiB = Number(priceData.winstonCost);

      // usdcAmount is in smallest unit (6 decimals), convert to readable USDC
      const usdcSmallestUnit = Number(priceData.usdcAmount);
      tokensPerGiB = usdcSmallestUnit / 1_000_000; // Convert to readable USDC

      // USDC is pegged to USD (1 USDC = $1 USD)
      usdPerToken = 1.0;

      console.log(`[X402 Pricing] 1 GiB costs ${wincPerGiB} winc = ${tokensPerGiB} USDC`);

      if (wincPerGiB === 0) {
        throw new Error('Failed to get x402 pricing - wincPerGiB is 0');
      }
    }
    // Regular Turbo SDK pricing for all other tokens
    else {
      const { TurboFactory } = await import('@ardrive/turbo-sdk/web');

      // Create TurboFactory with proper config including dev mode RPC URLs
      const turbo = TurboFactory.unauthenticated({
        token: tokenType,
        paymentServiceConfig: { url: turboConfig.paymentServiceUrl },
        gatewayUrl: turboConfig.tokenMap[tokenType]
      });

      // Get the cost in tokens for uploading credits worth of data
      const priceResult = await turbo.getUploadCosts({ bytes: [oneGiBBytes] });
      wincPerGiB = Number(priceResult[0]?.winc || 0);

      if (wincPerGiB === 0) {
        throw new Error('Failed to get pricing from Turbo SDK - wincPerGiB is 0');
      }

      // Get token price for 1 GiB worth of winc
      const tokenPriceForGiB = await turbo.getTokenPriceForBytes({ byteCount: oneGiBBytes });
      // SDK already returns price in readable token units (ARIO, not mARIO)
      tokensPerGiB = Number(tokenPriceForGiB.tokenPrice);

      // Try to get USD price from Turbo (getFiatRates or similar)
      try {
        const fiatRates = await turbo.getFiatRates();
        // fiatRates.fiat gives USD per GiB, we know tokens per GiB
        const usdPerGiB = fiatRates.fiat?.usd || 0;
        if (usdPerGiB > 0 && tokensPerGiB > 0) {
          usdPerToken = usdPerGiB / tokensPerGiB;
        }
      } catch (err) {
        console.warn('Failed to get USD price for JIT payment:', err);
      }
    }

    // Calculate: tokens per credit (same for both x402 and regular)
    const creditsPerGiB = wincPerGiB / wincPerCredit;
    const tokenPricePerCredit = tokensPerGiB / creditsPerGiB;

    // Cache the result
    priceCache.set(tokenType, {
      tokenPricePerCredit,
      usdPerToken,
      timestamp: now,
    });

    // Calculate final amounts
    const baseAmount = creditsNeeded * tokenPricePerCredit;
    const bufferedAmount = baseAmount * bufferMultiplier;

    const converter = getTokenConverter(tokenType);
    const smallestUnit = converter ? converter(bufferedAmount) : 0;

    return {
      tokenAmount: smallestUnit,
      tokenAmountReadable: bufferedAmount,
      estimatedUSD: usdPerToken ? bufferedAmount * usdPerToken : null,
    };
  } catch (error) {
    const source = tokenType === 'base-usdc' ? 'x402 pricing endpoint' : 'Turbo SDK';
    console.error(`Failed to calculate JIT payment amount from ${source}:`, error);
    // Fallback: return 0 and let user know pricing failed
    return {
      tokenAmount: 0,
      tokenAmountReadable: 0,
      estimatedUSD: null,
    };
  }
}

/**
 * Get the default maximum token amount for JIT payments
 * Same value ($20-25 equivalent) across all supported tokens
 */
export function getDefaultMaxTokenAmount(tokenType: SupportedTokenType): number {
  // Aim for ~$20-25 equivalent across all types
  const defaults: Record<SupportedTokenType, number> = {
    ario: 200,      // 200 ARIO ≈ $20 at $0.10/ARIO
    solana: 0.15,   // 0.15 SOL ≈ $22.50 at $150/SOL
    'base-eth': 0.01, // 0.01 ETH ≈ $25 at $2500/ETH
    'base-usdc': 25,  // 25 USDC = $25 (stablecoin)
    arweave: 0,
    ethereum: 0,
    kyve: 0,
    pol: 0,
    'usdc': 0,        // Not supported for JIT (too slow)
    'polygon-usdc': 0, // Not supported for JIT (too slow)
  };

  return defaults[tokenType] || 0;
}
