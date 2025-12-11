import { useState, useEffect } from 'react';
import { SupportedTokenType } from '../constants';

interface UsePaymentFlowOptions {
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  x402OnlyMode: boolean;
  showConfirmModal: boolean;
  initialJitEnabled?: boolean;
}

interface UsePaymentFlowReturn {
  // Payment tab state
  paymentTab: 'credits' | 'crypto';
  setPaymentTab: React.Dispatch<React.SetStateAction<'credits' | 'crypto'>>;

  // Crypto shortage tracking
  cryptoShortage: { amount: number; tokenType: SupportedTokenType } | null;
  setCryptoShortage: React.Dispatch<
    React.SetStateAction<{ amount: number; tokenType: SupportedTokenType } | null>
  >;

  // JIT payment local state
  localJitMax: number;
  setLocalJitMax: React.Dispatch<React.SetStateAction<number>>;
  localJitEnabled: boolean;
  setLocalJitEnabled: React.Dispatch<React.SetStateAction<boolean>>;

  // JIT section expansion (for users with sufficient credits)
  jitSectionExpanded: boolean;
  setJitSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  // Selected JIT token
  selectedJitToken: SupportedTokenType;
  setSelectedJitToken: React.Dispatch<React.SetStateAction<SupportedTokenType>>;

  // Balance sufficiency tracking
  jitBalanceSufficient: boolean;
  setJitBalanceSufficient: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Shared hook for payment flow state and effects used by UploadPanel and CapturePanel.
 * Manages payment tab selection, JIT payment settings, and token selection logic.
 */
export function usePaymentFlow({
  walletType,
  x402OnlyMode,
  showConfirmModal,
  initialJitEnabled = false,
}: UsePaymentFlowOptions): UsePaymentFlowReturn {
  // Payment method state (Credits vs Crypto tabs)
  const [paymentTab, setPaymentTab] = useState<'credits' | 'crypto'>('credits');

  // Track crypto shortage details for combined warning
  const [cryptoShortage, setCryptoShortage] = useState<{
    amount: number;
    tokenType: SupportedTokenType;
  } | null>(null);

  // JIT payment local state
  const [localJitMax, setLocalJitMax] = useState(0);
  const [localJitEnabled, setLocalJitEnabled] = useState(initialJitEnabled);

  // Track if JIT section is expanded (for users with sufficient credits)
  const [jitSectionExpanded, setJitSectionExpanded] = useState(false);

  // Selected JIT token - will be set when user opens "Pay with Crypto"
  // NOT set by default to avoid triggering x402 pricing before user interaction
  const [selectedJitToken, setSelectedJitToken] = useState<SupportedTokenType>(() => {
    if (walletType === 'arweave') return 'ario';
    if (walletType === 'solana') return 'solana';
    return 'base-ario'; // Default for Ethereum - fast L2 ARIO payments
  });

  // Track if user has sufficient crypto balance for JIT payment
  const [jitBalanceSufficient, setJitBalanceSufficient] = useState(true);

  // Switch to base-usdc when x402-only mode is enabled (only option for ETH wallets)
  useEffect(() => {
    if (x402OnlyMode && walletType === 'ethereum') {
      setSelectedJitToken('base-usdc');
    }
  }, [x402OnlyMode, walletType]);

  // Reset payment tab when modal opens
  // In x402-only mode, start on Crypto tab (no credits available)
  // In normal mode, start on Credits tab
  useEffect(() => {
    if (showConfirmModal) {
      setPaymentTab(x402OnlyMode ? 'crypto' : 'credits');
      setJitSectionExpanded(x402OnlyMode); // Auto-expand in x402-only mode
      setLocalJitEnabled(x402OnlyMode); // Auto-enable JIT in x402-only mode
    }
  }, [showConfirmModal, x402OnlyMode]);

  // Auto-select base-ario ONLY when user explicitly opens "Pay with Crypto" section
  // Reset to base-ario when they close it (unless x402-only mode is active)
  useEffect(() => {
    if (walletType === 'ethereum') {
      if (jitSectionExpanded) {
        // Keep current selection when section expands - user can choose via JitTokenSelector
        // Don't auto-switch to base-usdc anymore since base-ario is now the default
      } else if (!x402OnlyMode) {
        setSelectedJitToken('base-ario'); // Reset to base-ario when section collapses (unless x402-only)
      }
    }
  }, [walletType, jitSectionExpanded, x402OnlyMode]);

  return {
    paymentTab,
    setPaymentTab,
    cryptoShortage,
    setCryptoShortage,
    localJitMax,
    setLocalJitMax,
    localJitEnabled,
    setLocalJitEnabled,
    jitSectionExpanded,
    setJitSectionExpanded,
    selectedJitToken,
    setSelectedJitToken,
    jitBalanceSufficient,
    setJitBalanceSufficient,
  };
}
