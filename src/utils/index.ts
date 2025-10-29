import {
  ARToTokenAmount,
  ETHToTokenAmount,
  SOLToTokenAmount,
  TokenType,
  TurboWincForFiatResponse,
  TwoDecimalCurrency,
} from '@ardrive/turbo-sdk/web';

/**
 * Get current payment service URL from developer configuration
 */
const getPaymentServiceUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__TURBO_STORE__) {
    const config = (window as any).__TURBO_STORE__.getState().getCurrentConfig();
    return config.paymentServiceUrl;
  }
  // Fallback to production default
  return 'https://payment.ardrive.io';
};

/**
 * Get current AR.IO gateway URL from developer configuration
 */
const getArioGatewayUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__TURBO_STORE__) {
    const config = (window as any).__TURBO_STORE__.getState().getCurrentConfig();
    return config.arioGatewayUrl;
  }
  // Fallback to production default
  return 'https://turbo-gateway.com';
};

export const getTurboBalance = async (
  address: string,
  tokenType: string = 'arweave',
) => {
  const paymentServiceUrl = getPaymentServiceUrl();
  const url = `${paymentServiceUrl}/v1/account/balance/${tokenType}?address=${address}`;

  const response = await fetch(url);

  if (response.status == 404) {
    return { winc: 0 };
  }

  return response.json();
};

export const getWincForToken = async (
  amount: number,
  tokenType: string = 'arweave',
): Promise<{ winc: string }> => {
  const paymentServiceUrl = getPaymentServiceUrl();
  const url = `${paymentServiceUrl}/v1/price/${tokenType}/${amount}`;

  const response = await fetch(url);

  if (response.status == 404) {
    return { winc: '0' };
  }

  return response.json();
};

export const getWincForFiat = async ({
  amount,
  promoCode,
  destinationAddress,
}: {
  amount: TwoDecimalCurrency;
  promoCode?: string;
  destinationAddress?: string;
}): Promise<TurboWincForFiatResponse> => {
  const paymentServiceUrl = getPaymentServiceUrl();
  const url = `${paymentServiceUrl}/v1/price/usd/${amount.amount}`;
  const queryString =
    promoCode && destinationAddress
      ? `?${new URLSearchParams({ promoCode, destinationAddress }).toString()}`
      : '';
  const response = await fetch(url.concat(queryString));

  if (response.status == 404) {
    return {
      winc: '0',
      adjustments: [],
      fees: [],
      actualPaymentAmount: 0,
      quotedPaymentAmount: 0,
    };
  }

  return response.json();
};

export const formatWalletAddress = (address: string, shownCount = 4) => {
  if (!address || typeof address !== 'string') {
    return 'Invalid Address';
  }
  
  if (address.length <= shownCount * 2) {
    return address; // Return full address if it's too short to truncate
  }
  
  return `${address.slice(0, shownCount)}...${address.slice(
    address.length - shownCount,
    address.length,
  )}`;
};

export const wincToCredits = (winc: number) => {
  return winc / 1_000_000_000_000;
};

export const getAmountByTokenType = (amount: number, token?: TokenType) => {
  switch (token) {
    case 'arweave':
      return ARToTokenAmount(amount);
    case 'ethereum':
      return ETHToTokenAmount(amount);
    case 'solana':
      return SOLToTokenAmount(amount);
  }
  return undefined;
};

export const getExplorerUrl = (txid: string, token: string) => {
  switch (token) {
    case 'arweave':
      return `https://viewblock.io/arweave/tx/${txid}`;
    case 'ethereum':
      return `https://etherscan.io/tx/${txid}`;
    case 'base-eth':
      return `https://basescan.org/tx/${txid}`;
    case 'pol':
      return `https://polygonscan.com/tx/${txid}`;
    case 'solana':
      return `https://solscan.io/tx/${txid}`;
  }
  return undefined;
};

export const getGatewayBaseUrl = (): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // Get configured AR.IO gateway from store
  const configuredGateway = getArioGatewayUrl();

  // Local development - use configured AR.IO gateway
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return configuredGateway;
  }

  // Check if we're on a subdomain-based ArNS gateway (e.g., turbo.ar.io, turbo.vilenarios.com)
  const hasTurboSubdomain = hostname.startsWith('turbo.');

  if (hasTurboSubdomain) {
    // Remove the 'turbo.' subdomain to get the base gateway
    const baseGateway = hostname.replace('turbo.', '');

    // Special case: ar.io cannot serve transaction content
    if (baseGateway === 'ar.io') {
      return configuredGateway;
    }

    // For other gateways that can serve content (vilenarios.com, arweave.net, etc.)
    // Use the base gateway without the turbo subdomain
    const baseUrl = port ? `${protocol}//${baseGateway}:${port}` : `${protocol}//${baseGateway}`;
    return baseUrl;
  }

  // For non-subdomain access (direct domain), use current domain
  const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
  return baseUrl;
};

export const getArweaveUrl = (txId: string): string => {
  const gatewayBase = getGatewayBaseUrl();

  // The gateway base URL already handles all the logic:
  // - localhost -> configured AR.IO gateway (default: turbo-gateway.com)
  // - turbo.ar.io -> configured AR.IO gateway (ar.io cannot serve content)
  // - turbo.vilenarios.com -> vilenarios.com (can serve content)
  // - turbo-gateway.com -> turbo-gateway.com
  return `${gatewayBase}/${txId}`;
};

export const getArweaveRawUrl = (txId: string): string => {
  const gatewayBase = getGatewayBaseUrl();

  // The gateway base URL already handles the logic for which domain to use
  // ar.io -> configured AR.IO gateway (cannot serve content)
  // vilenarios.com -> vilenarios.com (can serve content)
  // turbo-gateway.com -> turbo-gateway.com (can serve content)
  return `${gatewayBase}/raw/${txId}`;
};

// Capitalize first letter of a string
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Create possessive form of a name (e.g., "John" -> "John's", "Vilenarios" -> "Vilenarios'")
export const makePossessive = (name: string): string => {
  if (!name) return name;
  const capitalizedName = capitalizeFirstLetter(name);
  return capitalizedName.endsWith('s') ? `${capitalizedName}'` : `${capitalizedName}'s`;
};

// Helper to decode punycode ArNS names for better display
export const decodePunycode = (name: string): string => {
  try {
    // Modern browsers have punycode built into URL/domain APIs
    if (name.startsWith('xn--')) {
      // Use the native browser API to decode punycode
      const url = new URL(`https://${name}.example.com`);
      const decoded = url.hostname.split('.')[0];
      return decoded !== name ? decoded : name;
    }
    return name;
  } catch (error) {
    // If decoding fails, return original name
    console.warn('Failed to decode punycode name:', name, error);
    return name;
  }
};

// Get display-friendly ArNS name (handles punycode)
export const getDisplayArNSName = (name: string, showOriginal = false): string => {
  const decoded = decodePunycode(name);
  if (showOriginal && decoded !== name) {
    return `${decoded} (${name})`;
  }
  return decoded;
};

/**
 * Detect the appropriate token type based on the current Ethereum network chainId
 * This is used for Ethereum wallets to determine whether to use ETH, Base-ETH, or POL
 */
export const getTokenTypeFromChainId = (chainId: number): 'ethereum' | 'base-eth' | 'pol' => {
  // Ethereum Mainnet and Holesky testnet
  if (chainId === 1 || chainId === 17000) {
    return 'ethereum';
  }
  // Base and Base Sepolia
  if (chainId === 8453 || chainId === 84532) {
    return 'base-eth';
  }
  // Polygon and Amoy testnet
  if (chainId === 137 || chainId === 80002) {
    return 'pol';
  }
  // Default to ethereum for unknown chains
  return 'ethereum';
};

/**
 * Get the current chain ID from an Ethereum provider
 */
export const getCurrentChainId = async (provider: any): Promise<number> => {
  const network = await provider.getNetwork();
  return Number(network.chainId);
};

// Export address validation utilities
export { validateWalletAddress, getWalletTypeLabel, formatWalletAddress as formatWalletAddressLong } from './addressValidation';
export type { WalletAddressType, AddressValidationResult } from './addressValidation';

// Export AR.IO configuration helpers
export { getARIO, getANT, WRITE_OPTIONS, createContractSigner } from './arIOConfig';