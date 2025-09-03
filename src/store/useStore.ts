import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TurboCryptoFundResponse } from '@ardrive/turbo-sdk/web';
import { PaymentIntent, PaymentIntentResult } from '@stripe/stripe-js';
import { SupportedTokenType } from '../constants';

// Preset configurations
const PRESET_CONFIGS = {
  production: {
    paymentServiceUrl: 'https://payment.ardrive.io',
    uploadServiceUrl: 'https://upload.ardrive.io',
    gatewayUrl: 'https://turbo.ardrive.io',
    stripeKey: 'pk_live_51JUAtwC8apPOWkDLMQqNF9sPpfneNSPnwX8YZ8y1FNDl6v94hZIwzgFSYl27bWE4Oos8CLquunUswKrKcaDhDO6m002Yj9AeKj',
    processId: 'qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE',
    tokenMap: {
      arweave: 'https://arweave.net',
      ario: 'https://arweave.net',
      ethereum: 'https://api.mainnet.ethereumpow.org',
      'base-eth': 'https://base.gateway.fm',
      solana: 'https://api.mainnet-beta.solana.com',
      kyve: 'https://api.kyve.network',
      matic: 'https://polygon-bor-rpc.publicnode.com',
      pol: 'https://polygon-bor-rpc.publicnode.com',
    } as Record<SupportedTokenType, string>,
  },
  development: {
    paymentServiceUrl: 'https://payment.ardrive.dev',
    uploadServiceUrl: 'https://upload.ardrive.dev',
    gatewayUrl: 'https://turbo.ardrive.dev',
    stripeKey: 'pk_test_51JUAtwC8apPOWkDLh2FPZkQkiKZEkTo6wqgLCtQoClL6S4l2jlbbc5MgOdwOUdU9Tn93NNvqAGbu115lkJChMikG00XUfTmo2z',
    processId: 'agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA',
    tokenMap: {
      arweave: 'https://arweave.net',
      ario: 'https://arweave.net',
      ethereum: 'https://ethereum-holesky-rpc.publicnode.com',
      'base-eth': 'https://sepolia.base.org',
      solana: 'https://api.devnet.solana.com',
      kyve: 'https://api.korellia.kyve.network',
      matic: 'https://rpc-amoy.polygon.technology',
      pol: 'https://rpc-amoy.polygon.technology',
    } as Record<SupportedTokenType, string>,
  },
} as const;

interface UploadResult {
  id: string;
  owner: string;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  winc: string;
  timestamp?: number;
  receipt?: any; // Store the full receipt response
}

interface DeployResult {
  type: 'manifest' | 'files';
  id?: string; // Manifest ID
  manifestId?: string;
  files?: Array<{
    id: string;
    path: string;
    size: number;
    receipt?: any;
  }>;
  timestamp?: number;
  receipt?: any; // Store receipt for manifest
}

export interface PaymentInformation {
  paymentMethodId: string;
  email?: string;
}

export type ConfigMode = 'production' | 'development' | 'custom';

export interface DeveloperConfig {
  paymentServiceUrl: string;
  uploadServiceUrl: string;
  gatewayUrl: string;
  stripeKey: string;
  processId: string;
  tokenMap: Record<SupportedTokenType, string>;
}

interface StoreState {
  // Wallet state
  address: string | null;
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  creditBalance: number;
  
  // ArNS state
  arnsNamesCache: Record<string, { name: string; timestamp: number }>;
  
  // Upload history state
  uploadHistory: UploadResult[];
  
  // Deploy history state
  deployHistory: DeployResult[];
  
  // Payment state - matching reference app exactly
  paymentAmount?: number;
  paymentIntent?: PaymentIntent;
  paymentInformation?: PaymentInformation;
  paymentIntentResult?: PaymentIntentResult;
  promoCode?: string;
  
  // Crypto payment state
  cryptoTopupValue?: number;
  cryptoManualTopup: boolean;
  cryptoTopupResponse?: TurboCryptoFundResponse;
  
  // UI state
  showResumeTransactionPanel: boolean;
  
  // Developer configuration state
  configMode: ConfigMode;
  customConfig: DeveloperConfig;
  
  // Actions
  setAddress: (address: string | null, type: 'arweave' | 'ethereum' | 'solana' | null) => void;
  clearAddress: () => void;
  setCreditBalance: (balance: number) => void;
  setArNSName: (address: string, name: string) => void;
  getArNSName: (address: string) => string | null;
  addUploadResults: (results: UploadResult[]) => void;
  clearUploadHistory: () => void;
  addDeployResults: (results: DeployResult[]) => void;
  clearDeployHistory: () => void;
  
  // Payment actions - matching reference app
  setPaymentAmount: (amount?: number) => void;
  setPaymentIntent: (intent?: PaymentIntent) => void;
  setPaymentInformation: (info?: PaymentInformation) => void;
  setPaymentIntentResult: (result?: PaymentIntentResult) => void;
  setPromoCode: (code?: string) => void;
  
  // Crypto actions
  setCryptoTopupValue: (value?: number) => void;
  setCryptoManualTopup: (value: boolean) => void;
  setCryptoTopupResponse: (response?: TurboCryptoFundResponse) => void;
  setShowResumeTransactionPanel: (show: boolean) => void;
  clearAllPaymentState: () => void;
  
  // Developer configuration actions
  setConfigMode: (mode: ConfigMode) => void;
  updateCustomConfig: (key: keyof DeveloperConfig, value: string | Record<SupportedTokenType, string>) => void;
  updateTokenMap: (token: SupportedTokenType, url: string) => void;
  getCurrentConfig: () => DeveloperConfig;
  resetToDefaults: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      address: null,
      walletType: null,
      creditBalance: 0,
      arnsNamesCache: {},
      uploadHistory: [],
      deployHistory: [],
      
      // Developer configuration state
      configMode: 'production',
      customConfig: PRESET_CONFIGS.production,
      
      // Payment state
      paymentAmount: undefined,
      paymentIntent: undefined,
      paymentInformation: undefined,
      paymentIntentResult: undefined,
      promoCode: undefined,
      
      // Crypto state
      cryptoTopupValue: undefined,
      cryptoManualTopup: false,
      cryptoTopupResponse: undefined,
      showResumeTransactionPanel: false,
      
      // Actions
      setAddress: (address, type) => set({ address, walletType: type }),
      clearAddress: () => set({ address: null, walletType: null, creditBalance: 0, arnsNamesCache: {} }),
      setCreditBalance: (balance) => set({ creditBalance: balance }),
      setArNSName: (address, name) => {
        const cache = get().arnsNamesCache;
        set({ 
          arnsNamesCache: { 
            ...cache, 
            [address]: { name, timestamp: Date.now() }
          }
        });
      },
      getArNSName: (address) => {
        const cache = get().arnsNamesCache;
        const entry = cache[address];
        // Cache for 1 hour
        if (entry && Date.now() - entry.timestamp < 3600000) {
          return entry.name;
        }
        return null;
      },
      addUploadResults: (results) => {
        const currentHistory = get().uploadHistory;
        // Add new results to the beginning of the history (most recent first)
        set({ uploadHistory: [...results, ...currentHistory] });
      },
      clearUploadHistory: () => set({ uploadHistory: [] }),
      addDeployResults: (results) => {
        const currentHistory = get().deployHistory;
        // Add new results to the beginning of the history (most recent first)
        set({ deployHistory: [...results, ...currentHistory] });
      },
      clearDeployHistory: () => set({ deployHistory: [] }),
      
      // Payment actions - matching reference app exactly
      setPaymentAmount: (amount) => set({ paymentAmount: amount }),
      setPaymentIntent: (intent) => set({ paymentIntent: intent }),
      setPaymentInformation: (info) => set({ paymentInformation: info }),
      setPaymentIntentResult: (result) => set({ paymentIntentResult: result }),
      setPromoCode: (code) => set({ promoCode: code }),
      
      // Crypto actions
      setCryptoTopupValue: (value) => set({ cryptoTopupValue: value }),
      setCryptoManualTopup: (value) => set({ cryptoManualTopup: value }),
      setCryptoTopupResponse: (response) => set({ cryptoTopupResponse: response }),
      setShowResumeTransactionPanel: (show) => set({ showResumeTransactionPanel: show }),
      clearAllPaymentState: () => set({
        paymentAmount: undefined,
        paymentIntent: undefined,
        paymentInformation: undefined,
        paymentIntentResult: undefined,
        promoCode: undefined,
        cryptoTopupValue: undefined,
        cryptoManualTopup: false,
        cryptoTopupResponse: undefined,
        showResumeTransactionPanel: false,
      }),
      
      // Developer configuration actions
      setConfigMode: (mode) => {
        set({ configMode: mode });
        if (mode !== 'custom') {
          set({ customConfig: PRESET_CONFIGS[mode] });
        }
      },
      
      updateCustomConfig: (key, value) => {
        const currentConfig = get().customConfig;
        set({
          customConfig: {
            ...currentConfig,
            [key]: value,
          },
        });
      },
      
      updateTokenMap: (token, url) => {
        const currentConfig = get().customConfig;
        set({
          customConfig: {
            ...currentConfig,
            tokenMap: {
              ...currentConfig.tokenMap,
              [token]: url,
            },
          },
        });
      },
      
      getCurrentConfig: () => {
        const { configMode, customConfig } = get();
        if (configMode === 'custom') {
          return customConfig;
        }
        return PRESET_CONFIGS[configMode];
      },
      
      resetToDefaults: () => {
        const { configMode } = get();
        if (configMode !== 'custom') {
          set({ customConfig: PRESET_CONFIGS[configMode] });
        } else {
          set({ customConfig: PRESET_CONFIGS.production });
        }
      },
    }),
    {
      name: 'turbo-gateway-store',
      partialize: (state) => ({ 
        address: state.address,
        walletType: state.walletType, 
        arnsNamesCache: state.arnsNamesCache,
        uploadHistory: state.uploadHistory,
        deployHistory: state.deployHistory,
        configMode: state.configMode,
        customConfig: state.customConfig,
      }),
    }
  )
);

// Expose store to window for dynamic configuration access
if (typeof window !== 'undefined') {
  (window as any).__TURBO_STORE__ = useStore;
}