import { TurboUnauthenticatedConfiguration } from "@ardrive/turbo-sdk";

// Use VITE_NODE_ENV to determine production mode
const isProd = import.meta.env.VITE_NODE_ENV === 'production';

// Legacy constants for backwards compatibility
export const defaultPaymentServiceUrl = isProd
  ? "https://payment.ardrive.io"
  : "https://payment.ardrive.dev";
export const uploadServiceUrl = isProd
  ? "https://upload.ardrive.io"
  : "https://upload.ardrive.dev";
export const arioProcessId = isProd
  ? "qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE"
  : "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA";
export const termsOfServiceUrl = "https://ardrive.io/tos-and-privacy/";
export const defaultUSDAmount = 10.0;

// Dynamic configuration functions (will be used by components)
export const getTurboConfig = (config?: {
  paymentServiceUrl: string;
  uploadServiceUrl: string;
  processId: string;
}): TurboUnauthenticatedConfiguration => {
  if (config) {
    return {
      paymentServiceConfig: { url: config.paymentServiceUrl },
      uploadServiceConfig: { url: config.uploadServiceUrl },
      processId: config.processId,
    };
  }
  
  // Fallback to legacy behavior
  return {
    paymentServiceConfig: { url: defaultPaymentServiceUrl },
    uploadServiceConfig: { url: uploadServiceUrl },
    processId: arioProcessId,
  };
};

// Legacy turboConfig for backwards compatibility (will be replaced)
export const turboConfig: TurboUnauthenticatedConfiguration = getTurboConfig();
export const wincPerCredit = 1_000_000_000_000;
export const defaultDebounceMs = 500;
export const ardriveAppUrl = "https://app.ardrive.io";

export const maxUSDAmount = 10000;
export const maxARAmount = 200;
export const minUSDAmount = 5;

// Turbo wallet addresses URL
export const TURBO_WALLETS_URL = defaultPaymentServiceUrl + '/info';

// Crypto token configuration - matching reference app
export const supportedCryptoTokens = ['arweave', 'ario', 'ethereum', 'base-eth', 'solana', 'kyve', 'matic', 'pol'] as const;
export type SupportedTokenType = typeof supportedCryptoTokens[number];

// Currency labels matching reference app
export const tokenLabels: Record<SupportedTokenType, string> = {
  arweave: 'AR',
  ario: 'ARIO', 
  ethereum: 'ETH (L1)',
  'base-eth': 'ETH (Base)', // Base network ETH
  solana: 'SOL',
  kyve: 'KYVE',
  matic: 'MATIC',
  pol: 'POL',
} as const;

// Detailed network labels for UI contexts
export const tokenNetworkLabels: Record<SupportedTokenType, string> = {
  arweave: 'Arweave Network',
  ario: 'AR.IO Network', 
  ethereum: 'Ethereum Mainnet (L1)',
  'base-eth': 'Base Network (L2)',
  solana: 'Solana Network',
  kyve: 'KYVE Network',
  matic: 'Polygon Network',
  pol: 'Polygon Network',
} as const;

// Network descriptions for user clarity
export const tokenNetworkDescriptions: Record<SupportedTokenType, string> = {
  arweave: 'Native AR tokens on the Arweave blockchain',
  ario: 'ARIO tokens on the AO Super Computer',
  ethereum: 'ETH on Ethereum Layer 1 mainnet',
  'base-eth': 'ETH on Base Layer 2 network',
  solana: 'Native SOL tokens on the Solana blockchain',
  kyve: 'KYVE tokens on the KYVE network',
  matic: 'MATIC tokens on the Polygon network',
  pol: 'POL tokens on the Polygon network',
} as const;

// Token processing time expectations for user communication
export const tokenProcessingTimes: Record<SupportedTokenType, { 
  time: string; 
  speed: 'fast' | 'medium' | 'slow';
  description: string;
}> = {
  arweave: { 
    time: '15-45 minutes', 
    speed: 'slow',
    description: 'Arweave network confirmations take time for security'
  },
  ario: { 
    time: 'near instant-3 minutes', 
    speed: 'fast',
    description: 'ARIO transfers on AO are typically fast'
  },
  ethereum: { 
    time: '10-30 minutes', 
    speed: 'slow',
    description: 'Ethereum L1 requires multiple confirmations'
  },
  'base-eth': { 
    time: 'near instant-3 minutes', 
    speed: 'fast',
    description: 'Base L2 offers faster confirmation times'
  },
  solana: { 
    time: '1-2 minutes', 
    speed: 'fast',
    description: 'Solana transactions confirm quickly'
  },
  kyve: { 
    time: '5-15 minutes', 
    speed: 'medium',
    description: 'KYVE network processing time'
  },
  matic: { 
    time: '2-5 minutes', 
    speed: 'fast',
    description: 'Polygon network is optimized for speed'
  },
  pol: { 
    time: '2-5 minutes', 
    speed: 'fast',
    description: 'Polygon network is optimized for speed'
  },
} as const;

// Preset amounts for each token type
// Error messages matching reference app
export const valueStringError = `Error: Unable to fetch credit estimate`;
export const errorSubmittingTransactionToTurbo = 'Error submitting transaction to Turbo. Please try again or contact support.';

// Button values matching reference app
export const BUTTON_VALUES = {
  fiat: [5, 25, 50, 100],
  arweave: [0.5, 1, 5, 10],
  ario: [50, 100, 500, 1000], // ARIO tokens
  ethereum: [0.01, 0.05, 0.1, 0.25],
  solana: [0.05, 0.1, 0.25, 0.5],
  kyve: [100, 500, 1000, 2000],
  matic: [10, 50, 100, 250],
  pol: [10, 50, 100, 250],
  'base-eth': [0.01, 0.05, 0.1, 0.25],
} as const;