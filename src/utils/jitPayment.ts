import { SupportedTokenType } from '../constants';

/**
 * Check if a wallet type supports just-in-time (on-demand) payments
 * Currently supported: ARIO, SOL, Base-ETH
 */
export function supportsJitPayment(tokenType: SupportedTokenType | null): boolean {
  return tokenType === 'ario' || tokenType === 'solana' || tokenType === 'base-eth';
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
    matic: 18,
    pol: 18,
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
    matic: 18,
    pol: 18,
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
  if (amount < 0.0001 && amount > 0) {
    // Use up to 8 decimal places for very small amounts
    return amount.toFixed(8).replace(/\.?0+$/, ''); // Remove trailing zeros
  }

  // Standard precision for normal amounts
  const precision: Record<SupportedTokenType, number> = {
    ario: 2,        // 100.50 ARIO
    solana: 6,      // 0.000001 SOL (increased from 4)
    'base-eth': 6,  // 0.000001 ETH (increased from 4)
    ethereum: 6,
    arweave: 4,
    kyve: 2,
    matic: 2,
    pol: 2,
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

  // Fetch fresh pricing from Turbo SDK
  try {
    const { TurboFactory } = await import('@ardrive/turbo-sdk/web');

    // Get current dev mode configuration from store
    const { useStore } = await import('../store/useStore');
    const turboConfig = useStore.getState().getCurrentConfig();

    // Create TurboFactory with proper config including dev mode RPC URLs
    const turbo = TurboFactory.unauthenticated({
      token: tokenType,
      paymentServiceConfig: { url: turboConfig.paymentServiceUrl },
      gatewayUrl: turboConfig.tokenMap[tokenType]
    });

    // Get the cost in tokens for uploading credits worth of data
    // Credits = Winc / wincPerCredit, so we need to figure out winc → bytes → tokens
    const wincPerCredit = 1_000_000_000_000; // 1 trillion winc = 1 credit

    // Estimate: use 1 GiB as baseline to get token price
    const oneGiBBytes = 1024 * 1024 * 1024;
    const priceResult = await turbo.getUploadCosts({ bytes: [oneGiBBytes] });
    const wincPerGiB = Number(priceResult[0]?.winc || 0);

    if (wincPerGiB === 0) {
      throw new Error('Failed to get pricing from Turbo SDK - wincPerGiB is 0');
    }

    // Get token price for 1 GiB worth of winc
    const tokenPriceForGiB = await turbo.getTokenPriceForBytes({ byteCount: oneGiBBytes });
    // SDK already returns price in readable token units (ARIO, not mARIO)
    const tokensPerGiB = Number(tokenPriceForGiB.tokenPrice);

    // Calculate: tokens per credit
    const creditsPerGiB = wincPerGiB / wincPerCredit;
    const tokenPricePerCredit = tokensPerGiB / creditsPerGiB;

    // Try to get USD price from Turbo (getFiatRates or similar)
    let usdPerToken: number | null = null;
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
    console.error('Failed to calculate JIT payment amount from Turbo SDK:', error);
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
    arweave: 0,
    ethereum: 0,
    kyve: 0,
    matic: 0,
    pol: 0,
  };

  return defaults[tokenType] || 0;
}
