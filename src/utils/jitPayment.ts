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
    ario: 12,
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
    ario: 12,
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

/**
 * Get estimated USD value for a token amount (simple placeholder)
 * In production, this should fetch real-time prices from Turbo SDK
 */
export function estimateUSD(amount: number, tokenType: SupportedTokenType): number | null {
  // Rough estimates - in production use Turbo SDK's price API
  const roughPrices: Record<SupportedTokenType, number> = {
    ario: 0.10,      // $0.10 per ARIO
    solana: 150,     // $150 per SOL
    'base-eth': 2500, // $2500 per ETH
    ethereum: 2500,
    arweave: 15,
    kyve: 0.05,
    matic: 0.50,
    pol: 0.50,
  };

  return amount * roughPrices[tokenType];
}

/**
 * Calculate the required token amount for a given credit shortage
 * This uses the Turbo SDK's pricing to convert credits → winc → tokens
 */
export async function calculateRequiredTokenAmount({
  creditsNeeded,
  tokenType,
  bufferMultiplier = 1.1,
}: {
  creditsNeeded: number;
  tokenType: SupportedTokenType;
  bufferMultiplier?: number;
}): Promise<{
  tokenAmount: number; // In smallest unit (e.g., Lamports, Winston)
  tokenAmountReadable: number; // Human-readable (e.g., 0.0001)
  estimatedUSD: number | null;
}> {
  // For now, use a simplified calculation
  // In production, integrate with Turbo SDK's getTokenPriceForBytes

  // Rough conversion: 1 credit ≈ cost of uploading ~1 GiB
  // For ARIO: ~500 ARIO per GiB → 0.002 ARIO per credit
  // For SOL: ~0.1 SOL per GiB → 0.0002 SOL per credit
  // For Base-ETH: ~0.01 ETH per GiB → 0.00002 ETH per credit

  const creditsToToken: Record<SupportedTokenType, number> = {
    ario: 0.002,      // credits → ARIO
    solana: 0.0002,   // credits → SOL
    'base-eth': 0.00002, // credits → ETH
    arweave: 0,
    ethereum: 0,
    kyve: 0,
    matic: 0,
    pol: 0,
  };

  const baseAmount = creditsNeeded * creditsToToken[tokenType];
  const bufferedAmount = baseAmount * bufferMultiplier;

  const converter = getTokenConverter(tokenType);
  const smallestUnit = converter ? converter(bufferedAmount) : 0;

  return {
    tokenAmount: smallestUnit,
    tokenAmountReadable: bufferedAmount,
    estimatedUSD: estimateUSD(bufferedAmount, tokenType),
  };
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
