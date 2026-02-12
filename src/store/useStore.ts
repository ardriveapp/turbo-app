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
    captureServiceUrl: 'https://vilenarios.com/local/capture',
    arioGatewayUrl: 'https://turbo-gateway.com',
    stripeKey: 'pk_live_51JUAtwC8apPOWkDLMQqNF9sPpfneNSPnwX8YZ8y1FNDl6v94hZIwzgFSYl27bWE4Oos8CLquunUswKrKcaDhDO6m002Yj9AeKj',
    processId: 'qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE',
    tokenMap: {
      arweave: 'https://arweave.net',
      ario: 'https://arweave.net',
      'base-ario': 'https://mainnet.base.org',
      ethereum: 'https://ethereum.publicnode.com',
      'base-eth': 'https://mainnet.base.org',
      solana: 'https://hardworking-restless-sea.solana-mainnet.quiknode.pro/44d938fae3eb6735ec30d8979551827ff70227f5/',
      kyve: 'https://api.kyve.network',
      pol: 'https://polygon-bor-rpc.publicnode.com',
      'usdc': 'https://cloudflare-eth.com',
      'base-usdc': 'https://mainnet.base.org',
      'polygon-usdc': 'https://polygon-bor-rpc.publicnode.com',
    } as Record<SupportedTokenType, string>,
  },
  development: {
    paymentServiceUrl: 'https://payment.ardrive.dev',
    uploadServiceUrl: 'https://upload.ardrive.dev',
    captureServiceUrl: 'https://vilenarios.com/local/capture',
    arioGatewayUrl: 'https://turbo-gateway.com',
    stripeKey: 'pk_test_51JUAtwC8apPOWkDLh2FPZkQkiKZEkTo6wqgLCtQoClL6S4l2jlbbc5MgOdwOUdU9Tn93NNvqAGbu115lkJChMikG00XUfTmo2z',
    processId: 'agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA',
    tokenMap: {
      arweave: 'https://arweave.net',
      ario: 'https://arweave.net',
      'base-ario': 'https://sepolia.base.org',
      ethereum: 'https://eth-sepolia.public.blastapi.io',
      'base-eth': 'https://sepolia.base.org',
      solana: 'https://api.devnet.solana.com',
      kyve: 'https://api.korellia.kyve.network',
      pol: 'https://rpc-amoy.polygon.technology',
      'usdc': 'https://eth-sepolia.public.blastapi.io',
      'base-usdc': 'https://sepolia.base.org',
      'polygon-usdc': 'https://rpc-amoy.polygon.technology',
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
  fileName?: string; // Original file name
  fileSize?: number; // Original file size in bytes
  contentType?: string; // Original file MIME type
  receipt?: any; // Store the full receipt response
  // ArNS assignment fields
  arnsName?: string; // ArNS name assigned to this file
  undername?: string; // Undername if used
  arnsTransactionId?: string; // ArNS update transaction ID
}

interface DeployResult {
  type: 'manifest' | 'files' | 'arns-update';
  id?: string; // Manifest ID or ArNS transaction ID
  manifestId?: string;
  files?: Array<{
    id: string;
    path: string;
    size: number;
    receipt?: any;
  }>;
  timestamp?: number;
  receipt?: any; // Store receipt for manifest
  // ArNS-specific fields
  arnsName?: string;      // ArNS name updated
  undername?: string;     // Undername if used
  targetId?: string;      // Transaction ID the name now points to
  arnsStatus?: 'success' | 'failed' | 'pending';
  arnsError?: string;     // Error message if failed
  // App metadata fields (user-provided)
  appName?: string;       // User's app/site name
  appVersion?: string;    // User's app/site version
}

// File hash cache entry for Smart Deploy deduplication
interface FileHashEntry {
  txId: string;
  hash: string;
  size: number;
  contentType: string;
  timestamp: number;
}

// Deployed app metadata for App Details feature
interface DeployedAppEntry {
  appVersion: string;
  lastDeployed: number; // timestamp
}

export interface PaymentInformation {
  paymentMethodId: string;
  email?: string;
}

export type ConfigMode = 'production' | 'development' | 'custom';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface DeveloperConfig {
  paymentServiceUrl: string;
  uploadServiceUrl: string;
  captureServiceUrl: string;
  arioGatewayUrl: string;
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
  arnsNamesCache: Record<string, { name: string; logo?: string; timestamp: number }>;
  ownedArnsCache: Record<string, { names: Array<{name: string; processId: string; currentTarget?: string; undernames?: string[]; ttl?: number; undernameTTLs?: Record<string, number>}>; timestamp: number }>;
  
  // Upload history state
  uploadHistory: UploadResult[];
  
  // Deploy history state
  deployHistory: DeployResult[];
  
  // Upload status cache (persisted) - stores full API response
  uploadStatusCache: Record<string, {
    status: 'CONFIRMED' | 'FINALIZED' | 'FAILED' | 'NOT_FOUND';
    bundleId?: string;
    info?: string;
    startOffsetInRootBundle?: number;
    rawContentLength?: number;
    payloadContentType?: string;
    payloadDataStart?: number;
    payloadContentLength?: number;
    winc?: string;
    timestamp: number; // When status was fetched
  }>;
  
  // Payment state - matching reference app exactly
  paymentAmount?: number;
  paymentIntent?: PaymentIntent;
  paymentInformation?: PaymentInformation;
  paymentIntentResult?: PaymentIntentResult;
  promoCode?: string;

  // Target wallet for payments (can be different from connected wallet)
  // This allows users to fund any wallet without authentication
  paymentTargetAddress: string | null;
  paymentTargetType: 'arweave' | 'ethereum' | 'solana' | null;

  // Crypto payment state
  cryptoTopupValue?: number;
  cryptoManualTopup: boolean;
  cryptoTopupResponse?: TurboCryptoFundResponse;

  // Just-in-time payment preferences (persistent)
  jitPaymentEnabled: boolean;
  jitMaxTokenAmount: Record<SupportedTokenType, number>; // Human-readable amounts (e.g., 0.15 SOL, 200 ARIO)
  jitBufferMultiplier: number; // Buffer multiplier for JIT payments (e.g., 1.1 = 10% buffer)

  // UI state
  showResumeTransactionPanel: boolean;

  // Theme state
  theme: ThemeMode;
  
  // Developer configuration state
  configMode: ConfigMode;
  customConfig: DeveloperConfig;

  // X402-only mode (disables payment service features)
  x402OnlyMode: boolean;

  // Smart Deploy state (file deduplication)
  fileHashCache: Record<string, FileHashEntry>;
  smartDeployEnabled: boolean;

  // App Details state (deployed apps history)
  deployedApps: Record<string, DeployedAppEntry>; // Keyed by app name
  lastDeployedAppName: string | null; // Most recently deployed app for pre-fill

  // Actions
  setAddress: (address: string | null, type: 'arweave' | 'ethereum' | 'solana' | null) => void;
  clearAddress: () => void;
  setCreditBalance: (balance: number) => void;
  setArNSName: (address: string, name: string, logo?: string) => void;
  getArNSName: (address: string) => { name: string; logo?: string } | null;
  setOwnedArNSNames: (address: string, names: Array<{name: string; processId: string; currentTarget?: string; undernames?: string[]; ttl?: number; undernameTTLs?: Record<string, number>}>) => void;
  getOwnedArNSNames: (address: string) => Array<{name: string; processId: string; currentTarget?: string; undernames?: string[]; ttl?: number; undernameTTLs?: Record<string, number>}> | null;
  addUploadResults: (results: UploadResult[]) => void;
  updateUploadWithArNS: (uploadId: string, arnsName: string, undername?: string, arnsTransactionId?: string) => void;
  clearUploadHistory: () => void;
  addDeployResults: (results: DeployResult[]) => void;
  clearDeployHistory: () => void;
  setUploadStatus: (txId: string, status: {
    status: 'CONFIRMED' | 'FINALIZED' | 'FAILED' | 'NOT_FOUND';
    bundleId?: string;
    info?: string;
    startOffsetInRootBundle?: number;
    rawContentLength?: number;
    payloadContentType?: string;
    payloadDataStart?: number;
    payloadContentLength?: number;
    winc?: string;
  }) => void;
  getUploadStatus: (txId: string) => {
    status: 'CONFIRMED' | 'FINALIZED' | 'FAILED' | 'NOT_FOUND';
    bundleId?: string;
    info?: string;
    startOffsetInRootBundle?: number;
    rawContentLength?: number;
    payloadContentType?: string;
    payloadDataStart?: number;
    payloadContentLength?: number;
    winc?: string;
  } | null;
  
  // Payment actions - matching reference app
  setPaymentAmount: (amount?: number) => void;
  setPaymentIntent: (intent?: PaymentIntent) => void;
  setPaymentInformation: (info?: PaymentInformation) => void;
  setPaymentIntentResult: (result?: PaymentIntentResult) => void;
  setPromoCode: (code?: string) => void;
  setPaymentTarget: (address: string | null, type: 'arweave' | 'ethereum' | 'solana' | null) => void;
  clearPaymentTarget: () => void;
  
  // Crypto actions
  setCryptoTopupValue: (value?: number) => void;
  setCryptoManualTopup: (value: boolean) => void;
  setCryptoTopupResponse: (response?: TurboCryptoFundResponse) => void;
  setShowResumeTransactionPanel: (show: boolean) => void;
  clearAllPaymentState: () => void;

  // Theme actions
  setTheme: (theme: ThemeMode) => void;

  // Just-in-time payment actions
  setJitPaymentEnabled: (enabled: boolean) => void;
  setJitMaxTokenAmount: (token: SupportedTokenType, amount: number) => void;
  setJitBufferMultiplier: (multiplier: number) => void;
  
  // Developer configuration actions
  setConfigMode: (mode: ConfigMode) => void;
  updateCustomConfig: (key: keyof DeveloperConfig, value: string | Record<SupportedTokenType, string>) => void;
  updateTokenMap: (token: SupportedTokenType, url: string) => void;
  getCurrentConfig: () => DeveloperConfig;
  resetToDefaults: () => void;

  // X402-only mode actions
  setX402OnlyMode: (enabled: boolean) => void;
  isPaymentServiceAvailable: () => boolean;

  // Smart Deploy actions
  updateFileHashCache: (entries: Array<{ hash: string; txId: string; size: number; contentType: string }>) => void;
  getFileHashEntry: (hash: string) => FileHashEntry | null;
  clearFileHashCache: () => void;
  setSmartDeployEnabled: (enabled: boolean) => void;

  // App Details actions
  saveDeployedApp: (appName: string, appVersion: string) => void;
  getDeployedApp: (appName: string) => DeployedAppEntry | null;
  getRecentAppNames: (limit?: number) => string[];
  getLastDeployedApp: () => { appName: string; appVersion: string } | null;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      address: null,
      walletType: null,
      creditBalance: 0,

      arnsNamesCache: {},
      ownedArnsCache: {},
      uploadHistory: [],
      deployHistory: [],
      uploadStatusCache: {},
      
      // Theme state
      theme: 'system', // Default to system preference

      // Developer configuration state
      configMode: 'production',
      customConfig: PRESET_CONFIGS.production,

      // X402-only mode (disabled by default)
      x402OnlyMode: false,

      // Smart Deploy state (file deduplication)
      fileHashCache: {},
      smartDeployEnabled: true, // Default ON

      // App Details state (deployed apps history)
      deployedApps: {},
      lastDeployedAppName: null,

      // Payment state
      paymentAmount: undefined,
      paymentIntent: undefined,
      paymentInformation: undefined,
      paymentIntentResult: undefined,
      promoCode: undefined,
      paymentTargetAddress: null,
      paymentTargetType: null,

      // Crypto state
      cryptoTopupValue: undefined,
      cryptoManualTopup: false,
      cryptoTopupResponse: undefined,
      showResumeTransactionPanel: false,

      // Just-in-time payment state (defaults - persistent)
      jitPaymentEnabled: true, // Default opt-in
      jitMaxTokenAmount: {
        ario: 200,      // 200 ARIO ≈ $20
        'base-ario': 200, // 200 ARIO ≈ $20 (on Base L2)
        solana: 0.15,   // 0.15 SOL ≈ $22.50
        'base-eth': 0.01, // 0.01 ETH ≈ $25
        'base-usdc': 25,  // 25 USDC = $25 (stablecoin)
        arweave: 0,
        ethereum: 0,
        kyve: 0,
        pol: 0,
        'usdc': 0,        // Not supported for JIT (too slow)
        'polygon-usdc': 0, // Not supported for JIT (too slow)
      },
      jitBufferMultiplier: 1.1, // Default 10% buffer
      // Actions
      setAddress: (address, type) => set({ address, walletType: type }),
      clearAddress: () => set({ address: null, walletType: null, creditBalance: 0, arnsNamesCache: {}, ownedArnsCache: {} }),
      setCreditBalance: (balance) => set({ creditBalance: balance }),
      setArNSName: (address, name, logo) => {
        const cache = get().arnsNamesCache;
        set({ 
          arnsNamesCache: { 
            ...cache, 
            [address]: { name, logo, timestamp: Date.now() }
          }
        });
      },
      getArNSName: (address) => {
        const cache = get().arnsNamesCache;
        const entry = cache[address];
        // Cache for 24 hours to match reference implementation
        if (entry && Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
          return { name: entry.name, logo: entry.logo };
        }
        return null;
      },
      setOwnedArNSNames: (address, names) => {
        const cache = get().ownedArnsCache;
        set({
          ownedArnsCache: {
            ...cache,
            [address]: { names, timestamp: Date.now() }
          }
        });
      },
      getOwnedArNSNames: (address) => {
        const cache = get().ownedArnsCache;
        const entry = cache[address];
        // Cache for 6 hours
        if (entry && Date.now() - entry.timestamp < 21600000) {
          return entry.names;
        }
        return null;
      },
      addUploadResults: (results) => {
        const currentHistory = get().uploadHistory;
        // Add new results to the beginning of the history (most recent first)
        set({ uploadHistory: [...results, ...currentHistory] });
      },
      updateUploadWithArNS: (uploadId, arnsName, undername, arnsTransactionId) => {
        const currentHistory = get().uploadHistory;
        const updatedHistory = currentHistory.map(upload => 
          upload.id === uploadId 
            ? { ...upload, arnsName, undername, arnsTransactionId }
            : upload
        );
        set({ uploadHistory: updatedHistory });
      },
      clearUploadHistory: () => set({ uploadHistory: [] }),
      addDeployResults: (results) => {
        const currentHistory = get().deployHistory;
        // Add new results to the beginning of the history (most recent first)
        set({ deployHistory: [...results, ...currentHistory] });
      },
      clearDeployHistory: () => set({ deployHistory: [], fileHashCache: {} }), // Also clear file hash cache
      setUploadStatus: (txId, status) => {
        const cache = get().uploadStatusCache;
        set({ 
          uploadStatusCache: { 
            ...cache, 
            [txId]: { ...status, timestamp: Date.now() }
          }
        });
      },
      getUploadStatus: (txId) => {
        const cache = get().uploadStatusCache;
        const cached = cache[txId];
        if (!cached) return null;
        
        // Cache expires after 1 hour for confirmed files, 24 hours for finalized
        const maxAge = cached.status === 'FINALIZED' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
        if (Date.now() - cached.timestamp > maxAge) {
          return null; // Expired
        }
        
        return { status: cached.status, info: cached.info };
      },
      
      // Payment actions - matching reference app exactly
      setPaymentAmount: (amount) => set({ paymentAmount: amount }),
      setPaymentIntent: (intent) => set({ paymentIntent: intent }),
      setPaymentInformation: (info) => set({ paymentInformation: info }),
      setPaymentIntentResult: (result) => set({ paymentIntentResult: result }),
      setPromoCode: (code) => set({ promoCode: code }),
      setPaymentTarget: (address, type) => set({ paymentTargetAddress: address, paymentTargetType: type }),
      clearPaymentTarget: () => set({ paymentTargetAddress: null, paymentTargetType: null }),
      
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
        paymentTargetAddress: null,
        paymentTargetType: null,
        cryptoTopupValue: undefined,
        cryptoManualTopup: false,
        cryptoTopupResponse: undefined,
        showResumeTransactionPanel: false,
      }),

      // Theme action
      setTheme: (theme) => set({ theme }),

      // Just-in-time payment actions
      setJitPaymentEnabled: (enabled) => set({ jitPaymentEnabled: enabled }),
      setJitMaxTokenAmount: (token, amount) => {
        const current = get().jitMaxTokenAmount;
        set({ jitMaxTokenAmount: { ...current, [token]: amount } });
      },
      setJitBufferMultiplier: (multiplier) => {
        set({ jitBufferMultiplier: multiplier });
      },
      // Developer configuration actions
      setConfigMode: (mode) => {
        const { configMode: currentMode, customConfig } = get();
        set({ configMode: mode });

        if (mode === 'custom') {
          // When switching TO custom mode, initialize with current preset values
          const currentPresetConfig = currentMode !== 'custom' ? PRESET_CONFIGS[currentMode] : PRESET_CONFIGS.production;
          // Only initialize if customConfig is empty or matches a preset (not user-modified)
          const isUnmodified = JSON.stringify(customConfig) === JSON.stringify(PRESET_CONFIGS.production) ||
                               JSON.stringify(customConfig) === JSON.stringify(PRESET_CONFIGS.development);
          if (isUnmodified) {
            set({ customConfig: currentPresetConfig });
          }
        } else {
          // When switching AWAY from custom mode, update customConfig to the new preset
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

      // X402-only mode actions
      setX402OnlyMode: (enabled) => set({ x402OnlyMode: enabled }),
      isPaymentServiceAvailable: () => !get().x402OnlyMode,

      // Smart Deploy actions
      updateFileHashCache: (entries) => {
        const cache = get().fileHashCache;
        const newEntries: Record<string, FileHashEntry> = {};
        const MAX_CACHE_ENTRIES = 5000; // Limit to prevent localStorage overflow

        entries.forEach(({ hash, txId, size, contentType }) => {
          newEntries[hash] = {
            txId,
            hash,
            size,
            contentType,
            timestamp: Date.now(),
          };
        });

        const mergedCache = { ...cache, ...newEntries };

        // LRU eviction: if cache exceeds limit, remove oldest entries
        const cacheKeys = Object.keys(mergedCache);
        if (cacheKeys.length > MAX_CACHE_ENTRIES) {
          // Sort by timestamp (oldest first) and remove excess
          const sortedEntries = cacheKeys
            .map(key => ({ key, timestamp: mergedCache[key].timestamp }))
            .sort((a, b) => a.timestamp - b.timestamp);

          const entriesToRemove = sortedEntries.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES);
          entriesToRemove.forEach(({ key }) => {
            delete mergedCache[key];
          });

          console.log(`Smart Deploy cache: evicted ${entriesToRemove.length} old entries (limit: ${MAX_CACHE_ENTRIES})`);
        }

        set({ fileHashCache: mergedCache });
      },
      getFileHashEntry: (hash) => {
        const entry = get().fileHashCache[hash];
        return entry || null; // No expiry - cache is permanent until cleared
      },
      clearFileHashCache: () => set({ fileHashCache: {} }),
      setSmartDeployEnabled: (enabled) => set({ smartDeployEnabled: enabled }),

      // App Details actions
      saveDeployedApp: (appName, appVersion) => {
        if (!appName.trim()) return; // Don't save empty app names
        const apps = get().deployedApps;
        set({
          deployedApps: {
            ...apps,
            [appName]: {
              appVersion,
              lastDeployed: Date.now(),
            },
          },
          lastDeployedAppName: appName,
        });
      },
      getDeployedApp: (appName) => {
        return get().deployedApps[appName] || null;
      },
      getRecentAppNames: (limit = 5) => {
        const apps = get().deployedApps;
        return Object.entries(apps)
          .sort(([, a], [, b]) => b.lastDeployed - a.lastDeployed)
          .slice(0, limit)
          .map(([name]) => name);
      },
      getLastDeployedApp: () => {
        const { lastDeployedAppName, deployedApps } = get();
        if (!lastDeployedAppName) return null;
        const app = deployedApps[lastDeployedAppName];
        if (!app) return null;
        return { appName: lastDeployedAppName, appVersion: app.appVersion };
      },
    }),
    {
      name: 'turbo-gateway-store',
      partialize: (state) => ({
        address: state.address,
        walletType: state.walletType,
        arnsNamesCache: state.arnsNamesCache,
        ownedArnsCache: state.ownedArnsCache,
        uploadHistory: state.uploadHistory,
        deployHistory: state.deployHistory,
        uploadStatusCache: state.uploadStatusCache,
        theme: state.theme,
        configMode: state.configMode,
        customConfig: state.customConfig,
        x402OnlyMode: state.x402OnlyMode,
        // JIT payment preferences
        jitPaymentEnabled: state.jitPaymentEnabled,
        jitMaxTokenAmount: state.jitMaxTokenAmount,
        jitBufferMultiplier: state.jitBufferMultiplier,
        // Smart Deploy state
        fileHashCache: state.fileHashCache,
        smartDeployEnabled: state.smartDeployEnabled,
        // App Details state
        deployedApps: state.deployedApps,
        lastDeployedAppName: state.lastDeployedAppName,
      }),
    }
  )
);

// Expose store to window for dynamic configuration access
if (typeof window !== 'undefined') {
  (window as any).__TURBO_STORE__ = useStore;
}