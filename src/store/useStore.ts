import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TurboCryptoFundResponse } from '@ardrive/turbo-sdk/web';
import { PaymentIntent, PaymentIntentResult } from '@stripe/stripe-js';

interface UploadResult {
  id: string;
  owner: string;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  winc: string;
  timestamp?: number;
  receipt?: any; // Store the full receipt response
}

export interface PaymentInformation {
  paymentMethodId: string;
  email?: string;
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
  
  // Actions
  setAddress: (address: string | null, type: 'arweave' | 'ethereum' | 'solana' | null) => void;
  clearAddress: () => void;
  setCreditBalance: (balance: number) => void;
  setArNSName: (address: string, name: string) => void;
  getArNSName: (address: string) => string | null;
  addUploadResults: (results: UploadResult[]) => void;
  clearUploadHistory: () => void;
  
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
    }),
    {
      name: 'turbo-gateway-store',
      partialize: (state) => ({ 
        address: state.address,
        walletType: state.walletType, 
        arnsNamesCache: state.arnsNamesCache,
        uploadHistory: state.uploadHistory
      }),
    }
  )
);