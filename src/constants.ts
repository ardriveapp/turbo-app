import { TurboUnauthenticatedConfiguration } from "@ardrive/turbo-sdk";
import packageJson from '../package.json';

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

// App metadata for tagging uploads
export const APP_NAME = 'ar.io Console';
export const APP_VERSION = packageJson.version;

export const maxUSDAmount = 10000;
export const maxARAmount = 200;
export const minUSDAmount = 5;

// Crypto token configuration - matching reference app
export const supportedCryptoTokens = ['arweave', 'ario', 'base-ario', 'ethereum', 'base-eth', 'solana', 'kyve', 'pol', 'usdc', 'base-usdc', 'polygon-usdc'] as const;
export type SupportedTokenType = typeof supportedCryptoTokens[number];

// Currency labels matching reference app
export const tokenLabels: Record<SupportedTokenType, string> = {
  arweave: 'AR',
  ario: 'ARIO',
  'base-ario': 'ARIO (Base)',
  ethereum: 'ETH (L1)',
  'base-eth': 'ETH (Base)', // Base network ETH
  solana: 'SOL',
  kyve: 'KYVE',
  pol: 'POL',
  'usdc': 'USDC (ETH)',
  'base-usdc': 'USDC (Base)',
  'polygon-usdc': 'USDC (Polygon)',
} as const;

// Detailed network labels for UI contexts
export const tokenNetworkLabels: Record<SupportedTokenType, string> = {
  arweave: 'Arweave Network',
  ario: 'AR.IO Network',
  'base-ario': 'the Base Network',
  ethereum: 'Ethereum Mainnet',
  'base-eth': 'the Base Network',
  solana: 'Solana Network',
  kyve: 'KYVE Network',
  pol: 'Polygon Network',
  'usdc': 'Ethereum Mainnet',
  'base-usdc': 'the Base Network',
  'polygon-usdc': 'Polygon Network',
} as const;

// Network descriptions for user clarity
export const tokenNetworkDescriptions: Record<SupportedTokenType, string> = {
  arweave: 'Native AR tokens on the Arweave blockchain',
  ario: 'ARIO tokens on the AO Super Computer',
  'base-ario': 'ARIO tokens bridged to Base Layer 2 network',
  ethereum: 'ETH on Ethereum Layer 1 mainnet',
  'base-eth': 'ETH on Base Layer 2 network',
  solana: 'Native SOL tokens on the Solana blockchain',
  kyve: 'KYVE tokens on the KYVE network',
  pol: 'POL tokens on the Polygon network',
  'usdc': 'USDC stablecoin on Ethereum mainnet',
  'base-usdc': 'USDC stablecoin on Base Layer 2',
  'polygon-usdc': 'USDC stablecoin on Polygon network',
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
  'base-ario': {
    time: 'near instant-3 minutes',
    speed: 'fast',
    description: 'ARIO on Base L2 offers faster confirmation times'
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
  pol: {
    time: '2-5 minutes',
    speed: 'fast',
    description: 'Polygon network is optimized for speed'
  },
  'usdc': {
    time: '10-30 minutes',
    speed: 'slow',
    description: 'USDC on Ethereum L1 requires multiple confirmations'
  },
  'base-usdc': {
    time: 'near instant-3 minutes',
    speed: 'fast',
    description: 'USDC on Base L2 offers faster confirmation times'
  },
  'polygon-usdc': {
    time: '2-5 minutes',
    speed: 'fast',
    description: 'USDC on Polygon network is optimized for speed'
  },
} as const;

// x402 payment protocol configuration
export const X402_CONFIG = {
  enabled: true,
  maxRetries: 1,
  supportedNetworks: {
    production: 'base' as const,
    development: 'base-sepolia' as const,
  },
  chainIds: {
    production: 8453, // Base Mainnet
    development: 84532, // Base Sepolia
  },
  usdcAddresses: {
    production: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet USDC
    development: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
  },
} as const;

// Ethereum network configuration
export const ETHEREUM_CONFIG = {
  chainIds: {
    production: 1, // Ethereum Mainnet
    development: 11155111, // Sepolia Testnet
  },
  usdcAddresses: {
    production: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet USDC
    development: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
  },
} as const;

// Polygon network configuration
export const POLYGON_CONFIG = {
  chainIds: {
    production: 137, // Polygon Mainnet
    development: 80002, // Amoy Testnet
  },
  usdcAddresses: {
    production: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon Mainnet USDC (native)
    development: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Amoy USDC
  },
} as const;

// Base ARIO configuration (ARIO bridged to Base L2)
export const BASE_ARIO_CONFIG = {
  chainIds: {
    production: 8453, // Base Mainnet (same as X402_CONFIG)
    development: 84532, // Base Sepolia (same as X402_CONFIG)
  },
  contractAddresses: {
    production: '0x138746adfA52909E5920def027f5a8dc1C7EfFb6', // Base Mainnet ARIO
    development: '0x138746adfA52909E5920def027f5a8dc1C7EfFb6', // Base Sepolia ARIO (TBD - using same for now)
  },
  decimals: 6, // 1 ARIO = 1,000,000 mARIO (same as ARIO on AO)
} as const;

// ERC-20 ABI for token balance checking
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
] as const;

// Preset amounts for each token type
// Error messages matching reference app
export const valueStringError = `Error: Unable to fetch credit estimate`;
export const errorSubmittingTransactionToTurbo = 'Error submitting transaction to Turbo. Please try again or contact support.';

// Button values matching reference app
export const BUTTON_VALUES = {
  fiat: [5, 25, 50, 100],
  arweave: [0.5, 1, 5, 10],
  ario: [50, 100, 500, 1000], // ARIO tokens
  'base-ario': [50, 100, 500, 1000], // ARIO on Base (same presets as ARIO)
  ethereum: [0.01, 0.05, 0.1, 0.25],
  solana: [0.05, 0.1, 0.25, 0.5],
  kyve: [100, 500, 1000, 2000],
  pol: [10, 50, 100, 250],
  'base-eth': [0.01, 0.05, 0.1, 0.25],
} as const;