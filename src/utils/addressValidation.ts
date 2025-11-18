/**
 * Address validation utilities for multi-chain wallet addresses
 * Supports Arweave, Ethereum, and Solana address formats
 */

export type WalletAddressType = 'arweave' | 'ethereum' | 'solana' | 'unknown';

export interface AddressValidationResult {
  isValid: boolean;
  type: WalletAddressType;
  error?: string;
}

/**
 * Validates a wallet address and determines its type
 * @param address - The wallet address to validate
 * @returns Validation result with type and any error message
 */
export function validateWalletAddress(address: string): AddressValidationResult {
  if (!address || address.trim() === '') {
    return { isValid: false, type: 'unknown', error: 'Address is required' };
  }

  const trimmedAddress = address.trim();

  // Arweave: 43 characters, base64url (alphanumeric, underscore, hyphen)
  const arweaveRegex = /^[a-zA-Z0-9_-]{43}$/;
  if (arweaveRegex.test(trimmedAddress)) {
    return { isValid: true, type: 'arweave' };
  }

  // Ethereum: 42 characters starting with 0x, followed by 40 hex characters
  const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
  if (ethereumRegex.test(trimmedAddress)) {
    return { isValid: true, type: 'ethereum' };
  }

  // Solana: 32-44 characters, base58 (no 0, O, I, l to avoid confusion)
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (solanaRegex.test(trimmedAddress)) {
    return { isValid: true, type: 'solana' };
  }

  return {
    isValid: false,
    type: 'unknown',
    error: 'Invalid address format. Must be a valid Arweave (43 chars), Ethereum (0x + 40 hex), or Solana (32-44 base58) address.'
  };
}

/**
 * Gets a human-readable label for a wallet type
 * @param type - The wallet address type
 * @returns User-friendly label
 */
export function getWalletTypeLabel(type: WalletAddressType): string {
  switch (type) {
    case 'arweave': return 'Arweave';
    case 'ethereum': return 'Ethereum';
    case 'solana': return 'Solana';
    default: return 'Unknown';
  }
}

/**
 * Formats a wallet address for display (shortened with ellipsis)
 * @param address - The full wallet address
 * @param chars - Number of characters to show on each side (default: 6)
 * @returns Formatted address like "abc123...xyz789"
 */
export function formatWalletAddress(address: string, chars: number = 6): string {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Resolves the correct Ethereum address format by checking which one has credits.
 * Ethereum addresses are case-insensitive, but the backend stores them with whatever casing was used.
 * This function checks both the checksummed (mixed case) and lowercase versions to find which has balance.
 *
 * @param address - The Ethereum address (any casing)
 * @param getTurboBalanceFn - Function to fetch balance (address, tokenType) => Promise<{winc: string}>
 * @returns The address format that has credits, or the original if both have 0
 */
export async function resolveEthereumAddress(
  address: string,
  getTurboBalanceFn: (address: string, tokenType: string) => Promise<{ winc: string | number }>
): Promise<string> {
  // Only apply to Ethereum addresses
  const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethereumRegex.test(address)) {
    return address;
  }

  const lowercaseAddress = address.toLowerCase();

  // If already lowercase, just return it
  if (address === lowercaseAddress) {
    return address;
  }

  try {
    // Check balance with the provided address (checksummed/mixed case)
    const checksummedBalance = await getTurboBalanceFn(address, 'ethereum');
    const checksummedWinc = Number(checksummedBalance.winc);

    // If checksummed address has credits, use it
    if (checksummedWinc > 0) {
      return address;
    }

    // Check balance with lowercase version
    const lowercaseBalance = await getTurboBalanceFn(lowercaseAddress, 'ethereum');
    const lowercaseWinc = Number(lowercaseBalance.winc);

    // If lowercase has credits, use lowercase
    if (lowercaseWinc > 0) {
      console.log(`[Address Resolution] Found credits in lowercase format. Using ${lowercaseAddress} instead of ${address}`);
      return lowercaseAddress;
    }

    // Neither has credits, return original
    return address;
  } catch (error) {
    console.error('[Address Resolution] Error resolving Ethereum address:', error);
    // On error, return the original address
    return address;
  }
}
