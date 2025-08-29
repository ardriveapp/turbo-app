import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TurboCryptoFundResponse } from '@ardrive/turbo-sdk/web';

interface UploadResult {
  id: string;
  owner: string;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  winc: string;
  timestamp?: number;
  receipt?: any; // Store the full receipt response
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
  
  // Payment state - matching reference app
  paymentIntent: any | null;
  paymentInformation: any | null;
  paymentIntentResult: any | null;
  cryptoTopupValue?: number; // Token amount, not generic
  cryptoManualTopup: boolean;
  cryptoTopupResponse?: TurboCryptoFundResponse; // Proper SDK type
  
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
  setPaymentIntent: (intent: any) => void;
  setPaymentInformation: (info: any) => void;
  setPaymentIntentResult: (result: any) => void;
  setCryptoTopupValue: (value: number | undefined) => void;
  setCryptoManualTopup: (value: boolean) => void;
  setCryptoTopupResponse: (response: any) => void;
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
      paymentIntent: null,
      paymentInformation: null,
      paymentIntentResult: null,
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
      setPaymentIntent: (intent) => set({ paymentIntent: intent }),
      setPaymentInformation: (info) => set({ paymentInformation: info }),
      setPaymentIntentResult: (result) => set({ paymentIntentResult: result }),
      setCryptoTopupValue: (value) => set({ cryptoTopupValue: value }),
      setCryptoManualTopup: (value) => set({ cryptoManualTopup: value }),
      setCryptoTopupResponse: (response) => set({ cryptoTopupResponse: response }),
      setShowResumeTransactionPanel: (show) => set({ showResumeTransactionPanel: show }),
      clearAllPaymentState: () => set({
        paymentIntent: null,
        paymentInformation: null,
        paymentIntentResult: null,
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