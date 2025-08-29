import { TurboUnauthenticatedConfiguration } from "@ardrive/turbo-sdk";

// Use VITE_NODE_ENV to determine production mode
const isProd = import.meta.env.VITE_NODE_ENV === 'production';

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
export const turboConfig: TurboUnauthenticatedConfiguration = {
  paymentServiceConfig: { url: defaultPaymentServiceUrl },
  uploadServiceConfig: { url: uploadServiceUrl },
  processId: arioProcessId,
};
export const wincPerCredit = 1_000_000_000_000;
export const defaultDebounceMs = 500;
export const ardriveAppUrl = "https://app.ardrive.io";

export const maxUSDAmount = 2000;
export const maxARAmount = 200;
export const minUSDAmount = 5;

// Crypto token configuration - matching reference app
export const supportedCryptoTokens = ['arweave', 'ario', 'ethereum', 'base-eth', 'solana', 'kyve', 'matic', 'pol'] as const;
export type SupportedTokenType = typeof supportedCryptoTokens[number];

// Currency labels matching reference app
export const tokenLabels: Record<SupportedTokenType, string> = {
  arweave: 'AR',
  ario: 'ARIO', 
  ethereum: 'ETH',
  'base-eth': 'ETH', // Base network ETH
  solana: 'SOL',
  kyve: 'KYVE',
  matic: 'MATIC',
  pol: 'POL',
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