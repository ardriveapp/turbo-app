import { useState, useEffect, useCallback, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { useCreditsForFiat } from '../../hooks/useCreditsForFiat';
import useDebounce from '../../hooks/useDebounce';
import { defaultUSDAmount, minUSDAmount, maxUSDAmount, wincPerCredit, tokenLabels, SupportedTokenType } from '../../constants';
import { useStore } from '../../store/useStore';
import { Loader2, Lock, CreditCard, DollarSign, Wallet, Info, Shield, AlertCircle, HardDrive, ChevronDown, Check, MapPin } from 'lucide-react';
import { useWincForOneGiB, useWincForAnyToken } from '../../hooks/useWincForOneGiB';
import { useCryptoPriceForWinc } from '../../hooks/useCryptoPrice';
import CryptoConfirmationPanel from './crypto/CryptoConfirmationPanel';
import CryptoManualPaymentPanel from './crypto/CryptoManualPaymentPanel';
import PaymentDetailsPanel from './fiat/PaymentDetailsPanel';
import PaymentConfirmationPanel from './fiat/PaymentConfirmationPanel';
import PaymentSuccessPanel from './fiat/PaymentSuccessPanel';
import { getPaymentIntent } from '../../services/paymentService';
import { validateWalletAddress, getWalletTypeLabel } from '../../utils/addressValidation';
import WalletSelectionModal from '../modals/WalletSelectionModal';
import { getTurboBalance } from '../../utils';


export default function TopUpPanel() {
  const {
    address,
    walletType,
    creditBalance,
    setPaymentAmount,
    setPaymentIntent,
    clearAllPaymentState,
    paymentTargetAddress,
    paymentTargetType,
    setPaymentTarget,
    clearPaymentTarget,
  } = useStore();

  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('fiat');
  const [inputType, setInputType] = useState<'dollars' | 'storage'>('dollars');
  const [usdAmount, setUsdAmount] = useState(defaultUSDAmount);
  const [usdAmountInput, setUsdAmountInput] = useState(String(defaultUSDAmount));
  const [storageAmount, setStorageAmount] = useState(1);
  const [storageUnit, setStorageUnit] = useState<'MiB' | 'GiB' | 'TiB'>('GiB');

  // Storage units for the Listbox
  const storageUnits = [
    { value: 'MiB', label: 'MiB' },
    { value: 'GiB', label: 'GiB' },
    { value: 'TiB', label: 'TiB' },
  ] as const;
  const [cryptoAmount, setCryptoAmount] = useState(0.01); // Default crypto amount
  const [cryptoAmountInput, setCryptoAmountInput] = useState('0.01');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Target wallet state
  const [targetAddressInput, setTargetAddressInput] = useState('');
  const [targetAddressError, setTargetAddressError] = useState('');
  const [targetBalance, setTargetBalance] = useState<number | null>(null);
  const [loadingTargetBalance, setLoadingTargetBalance] = useState(false);
  const [isRecipientExpanded, setIsRecipientExpanded] = useState(false);

  // Wallet modal state
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Payment flow state
  const [fiatFlowStep, setFiatFlowStep] = useState<'amount' | 'details' | 'confirmation' | 'success'>('amount');

  // Crypto flow state
  const [cryptoFlowStep, setCryptoFlowStep] = useState<'selection' | 'confirmation' | 'manual-payment' | 'complete'>('selection');
  const [selectedTokenType, setSelectedTokenType] = useState<SupportedTokenType>('arweave');
  const [cryptoPaymentResult, setCryptoPaymentResult] = useState<any>(null);

  // Token selection is handled by effect at line ~437 using getAvailableTokens() priority order

  const debouncedUsdAmount = useDebounce(usdAmount);
  const debouncedCryptoAmount = useDebounce(cryptoAmount);
  const debouncedStorageAmount = useDebounce(storageAmount);
  const [credits] = useCreditsForFiat(debouncedUsdAmount, setErrorMessage);
  // Use comprehensive hook for all token types
  const { wincForToken: wincForSelectedToken, error: tokenPricingError, loading: tokenPricingLoading } = useWincForAnyToken(selectedTokenType, debouncedCryptoAmount);

  // Calculate credits from winc (works for all tokens that have pricing)
  const cryptoCredits = wincForSelectedToken ? Number(wincForSelectedToken) / wincPerCredit : undefined;
  const wincForOneGiB = useWincForOneGiB();
  const [creditsForOneUSD] = useCreditsForFiat(1, () => {});

  // Calculate storage in GiB (immediate, no debounce for responsive UI)
  const storageInGiB = (() => {
    switch (storageUnit) {
      case 'MiB':
        return storageAmount / 1024;
      case 'TiB':
        return storageAmount * 1024;
      default:
        return storageAmount;
    }
  })();

  // Calculate storage in GiB (function for use elsewhere)
  const getStorageInGiB = () => {
    return storageInGiB;
  };

  // Calculate crypto amount needed for storage mode (use debounced for API calls)
  const debouncedStorageInGiB = (() => {
    switch (storageUnit) {
      case 'MiB':
        return debouncedStorageAmount / 1024;
      case 'TiB':
        return debouncedStorageAmount * 1024;
      default:
        return debouncedStorageAmount;
    }
  })();

  const wincNeededForStorage = wincForOneGiB && debouncedStorageAmount > 0
    ? (debouncedStorageInGiB * Number(wincForOneGiB))
    : undefined;
  const cryptoForStorage = useCryptoPriceForWinc(wincNeededForStorage, selectedTokenType);

  // Calculate cost in dollars for storage
  const calculateStorageCost = () => {
    if (!wincForOneGiB || !creditsForOneUSD) return 0;
    const storageInGiB = getStorageInGiB();
    const wincNeeded = storageInGiB * Number(wincForOneGiB);
    const creditsNeeded = wincNeeded / 1e12; // Convert winc to credits
    const dollarsNeeded = creditsNeeded / creditsForOneUSD;
    return dollarsNeeded;
  };

  // Get the effective USD amount to use for checkout
  const getEffectiveUsdAmount = () => {
    return inputType === 'storage' ? calculateStorageCost() : usdAmount;
  };

  // Format number with commas
  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Smart storage display - show in appropriate units
  const formatStorage = (gigabytes: number): string => {
    if (gigabytes >= 1) {
      return `${formatNumber(gigabytes, 2)} GiB`;
    } else if (gigabytes >= 0.001) {
      const mebibytes = gigabytes * 1024;
      return `${formatNumber(mebibytes, 1)} MiB`;
    } else if (gigabytes > 0) {
      const kibibytes = gigabytes * 1024 * 1024;
      return `${formatNumber(kibibytes, 0)} KiB`;
    } else {
      return '0 storage';
    }
  };

  // Truncate address for display
  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Helper function to get token amount for USD amount

  const presetAmounts = [10, 25, 50, 100, 250, 500];

  // Crypto preset amounts based on token type (from reference app)
  const getCryptoPresets = (tokenType: SupportedTokenType) => {
    switch (tokenType) {
      case 'arweave': return [0.5, 1, 5, 10];
      case 'ario': return [50, 100, 500, 1000];
      case 'base-ario': return [50, 100, 500, 1000]; // Same presets as ARIO
      case 'ethereum': return [0.01, 0.05, 0.1, 0.25];
      case 'base-eth': return [0.01, 0.05, 0.1, 0.25];
      case 'solana': return [0.05, 0.1, 0.25, 0.5];
      case 'kyve': return [100, 500, 1000, 2000];
      case 'pol': return [10, 50, 100, 250];
      case 'usdc': return [10, 25, 50, 100];
      case 'base-usdc': return [10, 25, 50, 100];
      case 'polygon-usdc': return [10, 25, 50, 100];
      default: return [0.01, 0.05, 0.1, 0.25];
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setUsdAmountInput(inputValue);

    // Parse the numeric value
    const amount = Number(inputValue);

    // Only update the actual amount if it's a valid number
    if (!isNaN(amount)) {
      if (amount > maxUSDAmount) {
        setUsdAmount(maxUSDAmount);
        setErrorMessage(`Maximum purchase amount is $${maxUSDAmount}`);
      } else if (amount < 0) {
        setUsdAmount(0);
        setErrorMessage('');
      } else {
        setUsdAmount(amount);
        setErrorMessage('');
      }
    }
  };

  const handleCryptoAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setCryptoAmountInput(inputValue);

    const amount = Number(inputValue);
    if (!isNaN(amount) && amount >= 0) {
      setCryptoAmount(amount);
      setErrorMessage('');
    }
  };

  const handleCheckout = async () => {
    const effectiveAmount = getEffectiveUsdAmount();

    // Validate recipient address - block if there's a visible validation error
    if (targetAddressError) {
      setErrorMessage('Please fix the recipient address error before continuing');
      return;
    }

    // Validate amount limits
    if (effectiveAmount < minUSDAmount) {
      setErrorMessage(`Minimum purchase amount is $${minUSDAmount}${inputType === 'storage' ? ' (reduce storage amount)' : ''}`);
      return;
    }

    if (effectiveAmount > maxUSDAmount) {
      setErrorMessage(`Maximum purchase amount is $${maxUSDAmount}${inputType === 'storage' ? ' (reduce storage amount)' : ''}`);
      return;
    }

    if (paymentMethod === 'fiat') {
      // For fiat, we need either a connected wallet OR a target address
      const targetAddress = paymentTargetAddress || address;
      const targetToken = paymentTargetType || walletType;

      if (!targetAddress) {
        setErrorMessage('Please connect your wallet or enter a recipient address');
        return;
      }

      setIsProcessing(true);
      setErrorMessage('');

      try {
        // Map wallet type to token type
        const tokenMap = {
          'arweave': 'arweave',
          'ethereum': 'ethereum',
          'solana': 'solana'
        } as const;

        const token = tokenMap[targetToken || 'arweave'];

        // Create payment intent for inline flow
        // The Turbo SDK accepts ANY address here - no authentication required
        const paymentIntentResponse = await getPaymentIntent(
          targetAddress, // ✅ Uses target address (can be different from connected wallet)
          effectiveAmount * 100, // Convert to cents
          token as any,
        );

        // Store payment state
        setPaymentAmount(effectiveAmount * 100);
        setPaymentIntent(paymentIntentResponse.paymentSession);

        // Move to payment details step
        setFiatFlowStep('details');
      } catch (error) {
        // Error creating payment intent
        if (error instanceof Error) {
          setErrorMessage(`Payment initialization failed: ${error.message}`);
        } else {
          setErrorMessage('Failed to initialize payment. Please try again.');
        }
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Handle crypto payment flow
      if (!selectedTokenType) {
        setErrorMessage('Please select a crypto token');
        return;
      }

      // Validate wallet-token compatibility
      if (!isTokenCompatibleWithWallet(selectedTokenType)) {
        setErrorMessage(getWalletRequirementMessage(selectedTokenType));
        return;
      }

      // Use crypto amount instead of USD amount for crypto flow
      setCryptoFlowStep('confirmation');
    }
  };

  // Crypto flow handlers
  const handleCryptoPaymentComplete = (result: any) => {
    setCryptoPaymentResult(result);

    if (result.requiresManualPayment) {
      setCryptoFlowStep('manual-payment');
    } else {
      setCryptoFlowStep('complete');
      // Trigger balance refresh
      window.dispatchEvent(new CustomEvent('refresh-balance'));
    }
  };

  const handleManualPaymentComplete = () => {
    // Reset crypto flow and trigger balance refresh
    setCryptoFlowStep('selection');
    setCryptoPaymentResult(null);
    setPaymentMethod('fiat'); // Reset to fiat
    window.dispatchEvent(new CustomEvent('refresh-balance'));
  };


  const handleCryptoBackToSelection = () => {
    setCryptoFlowStep('selection');
    setCryptoPaymentResult(null);
  };

  // Fiat flow handlers
  const handleFiatBackToAmount = () => {
    setFiatFlowStep('amount');
    clearAllPaymentState();
  };

  const handleFiatPaymentDetailsNext = () => {
    setFiatFlowStep('confirmation');
  };

  const handleFiatPaymentSuccess = () => {
    setFiatFlowStep('success');
  };

  const handleFiatComplete = () => {
    // Reset to amount selection
    setFiatFlowStep('amount');
    clearAllPaymentState();
    setPaymentMethod('fiat');
  };

  // Get available tokens based on wallet type (ordered by priority - first token is default)
  const getAvailableTokens = useCallback((): SupportedTokenType[] => {
    switch (walletType) {
      case 'arweave':
        return ['ario', 'arweave']; // ARIO first (preferred default for Arweave wallets)
      case 'ethereum':
        return ['base-ario', 'ario', 'base-usdc', 'base-eth', 'usdc', 'polygon-usdc', 'pol', 'ethereum']; // Base ARIO first, then ARIO (AO)
      case 'solana':
        return ['solana'];
      default:
        return []; // No crypto tokens available without wallet
    }
  }, [walletType]);

  // Check if selected token is compatible with connected wallet
  const isTokenCompatibleWithWallet = (tokenType: SupportedTokenType): boolean => {
    if (!walletType) return false;
    const availableTokens = getAvailableTokens();
    return availableTokens.includes(tokenType);
  };

  // Get wallet requirement message for a token
  const getWalletRequirementMessage = (tokenType: SupportedTokenType): string => {
    switch (tokenType) {
      case 'arweave':
        return 'Connect an Arweave wallet (like Wander) to pay with AR tokens on Arweave';
      case 'ario':
        return 'Connect an Arweave or Ethereum wallet (like Wander or MetaMask) to pay with ARIO tokens';
      case 'base-ario':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with ARIO on Base L2 (fast & low fees)';
      case 'ethereum':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with ETH on Ethereum L1 (higher fees)';
      case 'base-eth':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with ETH on Base L2 (lower fees)';
      case 'pol':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with POL on Polygon network';
      case 'usdc':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with USDC on Ethereum L1';
      case 'base-usdc':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with USDC on Base L2';
      case 'polygon-usdc':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with USDC on Polygon network';
      case 'solana':
        return 'Connect a Solana wallet (like Phantom) to pay with SOL tokens';
      default:
        return 'Connect a compatible wallet to use this token';
    }
  };

  // The reference app doesn't do USD->Crypto conversion
  // Instead, crypto mode lets users enter token amounts directly
  // We should simplify this to match the reference pattern

  // Fetch balance for target address when it changes
  useEffect(() => {
    const fetchTargetBalance = async () => {
      if (paymentTargetAddress && paymentTargetType) {
        setLoadingTargetBalance(true);
        try {
          const tokenMap = {
            'arweave': 'arweave',
            'ethereum': 'ethereum',
            'solana': 'solana'
          } as const;
          const result = await getTurboBalance(paymentTargetAddress, tokenMap[paymentTargetType]);
          setTargetBalance(result.winc ? result.winc / wincPerCredit : 0);
        } catch (error) {
          console.error('Error fetching target balance:', error);
          setTargetBalance(0);
        } finally {
          setLoadingTargetBalance(false);
        }
      } else {
        setTargetBalance(null);
      }
    };
    fetchTargetBalance();
  }, [paymentTargetAddress, paymentTargetType]);

  // Auto-select token based on wallet type
  useEffect(() => {
    const availableTokens = getAvailableTokens();
    if (availableTokens.length > 0) {
      setSelectedTokenType(availableTokens[0]);
    }
  }, [walletType, getAvailableTokens]);


  // Set initial target to connected wallet when user logs in
  useEffect(() => {
    if (address && walletType && !paymentTargetAddress) {
      setPaymentTarget(address, walletType);
    }
  }, [address, walletType, paymentTargetAddress, setPaymentTarget]);

  // Clear payment state when wallet changes
  useEffect(() => {
    clearAllPaymentState();
    setFiatFlowStep('amount');
  }, [address, clearAllPaymentState]);


  // Render fiat flow screens
  if (paymentMethod === 'fiat' && fiatFlowStep !== 'amount') {
    // Determine target address for payment (use target if set, otherwise connected wallet)
    const targetAddress = paymentTargetAddress || address;
    const targetWalletType = paymentTargetType || walletType;

    switch (fiatFlowStep) {
      case 'details':
        return (
          <PaymentDetailsPanel
            usdAmount={getEffectiveUsdAmount()}
            onBack={handleFiatBackToAmount}
            onNext={handleFiatPaymentDetailsNext}
            targetAddress={targetAddress || ''}
            targetWalletType={targetWalletType || 'arweave'}
          />
        );
      case 'confirmation':
        return (
          <PaymentConfirmationPanel
            usdAmount={getEffectiveUsdAmount()}
            onBack={() => setFiatFlowStep('details')}
            onSuccess={handleFiatPaymentSuccess}
            targetAddress={targetAddress || ''}
            targetWalletType={targetWalletType || 'arweave'}
          />
        );
      case 'success':
        return (
          <PaymentSuccessPanel
            onComplete={handleFiatComplete}
            targetAddress={targetAddress || ''}
          />
        );
    }
  }

  // Render crypto flow screens
  if (paymentMethod === 'crypto' && cryptoFlowStep !== 'selection') {
    switch (cryptoFlowStep) {
      case 'confirmation':
        return (
          <CryptoConfirmationPanel
            cryptoAmount={inputType === 'storage' && cryptoForStorage !== undefined ? cryptoForStorage : cryptoAmount}
            tokenType={selectedTokenType}
            onBack={handleCryptoBackToSelection}
            onPaymentComplete={handleCryptoPaymentComplete}
          />
        );
      case 'manual-payment':
        return (
          <CryptoManualPaymentPanel
            cryptoTopupValue={cryptoPaymentResult?.quote?.tokenAmount || 0}
            tokenType={selectedTokenType}
            onBack={handleCryptoBackToSelection}
            onComplete={handleManualPaymentComplete}
          />
        );
      case 'complete':
        return (
          <PaymentSuccessPanel
            cryptoAmount={cryptoAmount}
            tokenType={selectedTokenType}
            transactionId={cryptoPaymentResult?.transactionId || cryptoPaymentResult?.id}
            creditsReceived={cryptoPaymentResult?.quote?.credits}
            owner={cryptoPaymentResult?.owner}
            recipient={cryptoPaymentResult?.recipient}
            onComplete={() => {
              setCryptoFlowStep('selection');
              setCryptoPaymentResult(null);
              setPaymentMethod('fiat');
            }}
          />
        );
    }
  }

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border border-border/20">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Buy Credits</h3>
          <p className="text-sm text-foreground/80">Purchase credits for permanent storage and domains on Arweave</p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-card rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Payment Method Selection - Always show */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground/80 mb-3">Choose Payment Method</label>
          <div className="inline-flex bg-card rounded-2xl p-1 border border-border/20 w-full">
            <button
              onClick={() => {
                setPaymentMethod('fiat');
                setErrorMessage('');
              }}
              className={`flex-1 px-4 py-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                paymentMethod === 'fiat'
                  ? 'bg-foreground text-card'
                  : 'text-foreground/80 hover:text-foreground'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Credit/Debit Card
            </button>
            <button
              onClick={() => {
                // If no wallet connected, show wallet modal
                if (!address || !walletType) {
                  setShowWalletModal(true);
                  setErrorMessage('');
                } else {
                  setPaymentMethod('crypto');
                  setErrorMessage('');
                }
              }}
              className={`flex-1 px-4 py-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                paymentMethod === 'crypto'
                  ? 'bg-foreground text-card'
                  : 'text-foreground/80 hover:text-foreground'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Crypto
            </button>
          </div>
        </div>

        {/* Recipient Wallet Address - Only show for fiat payments */}
        {paymentMethod === 'fiat' && !address && (
          <div className="mb-6">
            <div className="bg-card rounded-2xl p-4 border border-border/20">
              <label className="block text-sm font-medium text-foreground/80 mb-3">
                Enter Recipient Wallet Address
              </label>
              <input
                type="text"
                value={targetAddressInput}
                onChange={(e) => {
                  setTargetAddressInput(e.target.value);
                  setTargetAddressError('');
                  setTargetBalance(null);
                }}
                onBlur={() => {
                  const trimmed = targetAddressInput.trim();
                  if (trimmed) {
                    const validation = validateWalletAddress(trimmed);
                    if (validation.isValid && validation.type !== 'unknown') {
                      setPaymentTarget(trimmed, validation.type);
                      setTargetAddressError('');
                    } else {
                      setTargetAddressError(validation.error || 'Invalid address');
                      setTargetBalance(null);
                    }
                  } else {
                    // Clear target when field is empty
                    clearPaymentTarget();
                    setTargetAddressError('');
                    setTargetBalance(null);
                  }
                }}
                placeholder="Enter Arweave, Ethereum, or Solana address"
                className={`w-full p-3 rounded-2xl border bg-card text-foreground font-mono text-sm focus:outline-none transition-colors ${
                  targetAddressError
                    ? 'border-error focus:border-error'
                    : 'border-border/20 focus:border-foreground'
                }`}
              />
              {targetAddressError && (
                <div className="mt-2 text-xs text-error">{targetAddressError}</div>
              )}
              {paymentTargetAddress && !targetAddressError && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-xs text-success">
                      Valid {getWalletTypeLabel(paymentTargetType || 'unknown')} address
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* For logged-in users with fiat - show editable recipient field */}
        {paymentMethod === 'fiat' && address && (
          <div className="mb-6">
            {!isRecipientExpanded ? (
              // Collapsed state - summary button
              <button
                onClick={() => setIsRecipientExpanded(true)}
                className="w-full bg-card rounded-2xl p-4 border border-border/20 hover:border-foreground/80/50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-foreground/80" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">
                      Buying for: {truncateAddress(paymentTargetAddress || address)}
                      {(!paymentTargetAddress || paymentTargetAddress === address) && (
                        <span className="text-foreground/80 ml-2">(You)</span>
                      )}
                    </div>
                    {paymentTargetAddress && paymentTargetAddress !== address && (
                      <div className="text-xs text-foreground/80 mt-0.5">
                        {getWalletTypeLabel(paymentTargetType || 'unknown')} address
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-foreground/80 group-hover:text-foreground transition-colors" />
              </button>
            ) : (
              // Expanded state - full input field
              <div className="bg-card rounded-2xl border border-border/20">
                <button
                  onClick={() => setIsRecipientExpanded(false)}
                  className="w-full p-4 flex items-center justify-between hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-foreground/80" />
                    <span className="text-sm font-medium text-foreground/80">Recipient Wallet Address</span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-foreground/80 rotate-180 transition-transform" />
                </button>
                <div className="px-4 pb-4">
                  <input
                    type="text"
                    value={targetAddressInput || address}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTargetAddressInput(value);
                      setTargetAddressError('');
                      setTargetBalance(null);

                      // If user clears to match their address, set target to their wallet
                      if (value === address) {
                        setPaymentTarget(address, walletType);
                      }
                    }}
                    onBlur={() => {
                      const trimmed = targetAddressInput.trim();
                      if (trimmed && trimmed !== address) {
                        // Validating a different address
                        const validation = validateWalletAddress(trimmed);
                        if (validation.isValid && validation.type !== 'unknown') {
                          setPaymentTarget(trimmed, validation.type);
                          setTargetAddressError('');
                        } else {
                          setTargetAddressError(validation.error || 'Invalid address');
                          setTargetBalance(null);
                        }
                      } else if (!trimmed) {
                        // Reset to connected wallet if cleared
                        setTargetAddressInput('');
                        setPaymentTarget(address, walletType);
                        setTargetAddressError('');
                        setTargetBalance(null);
                      } else {
                        // It's their own address
                        setTargetAddressInput('');
                        setPaymentTarget(address, walletType);
                        setTargetAddressError('');
                        setTargetBalance(null);
                      }
                    }}
                    onFocus={() => {
                      // If showing connected address, clear input for easy editing
                      if (!targetAddressInput) {
                        setTargetAddressInput(address || '');
                      }
                    }}
                    placeholder="Enter Arweave, Ethereum, or Solana address"
                    className={`w-full p-3 rounded-2xl border bg-card text-foreground font-mono text-sm focus:outline-none transition-colors ${
                      targetAddressError
                        ? 'border-error focus:border-error'
                        : 'border-border/20 focus:border-foreground'
                    }`}
                  />
                  {targetAddressError && (
                    <div className="mt-2 text-xs text-error">{targetAddressError}</div>
                  )}
                  {paymentTargetAddress && !targetAddressError && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-xs text-success">
                          {paymentTargetAddress === address
                            ? 'Credits will be added to your wallet'
                            : `Valid ${getWalletTypeLabel(paymentTargetType || 'unknown')} address - sending to another wallet`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-foreground/80/70">
                    Leave as your address to top up yourself, or enter a different address to send credits to another wallet
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Crypto Token Selection - Show immediately after selecting crypto */}
        {/* Hide selector if only one token available (e.g., Solana wallet only has SOL) */}
        {paymentMethod === 'crypto' && getAvailableTokens().length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground/80 mb-3">Select Cryptocurrency</label>

            {!walletType ? (
              <div className="bg-info/10 border border-info/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-info mb-2">Wallet Required for Crypto Payments</p>
                    <p className="text-info/80 text-sm mb-3">
                      Connect a wallet that supports the cryptocurrency you want to use:
                    </p>
                    <div className="space-y-2 text-sm text-info/80">
                      <div>• <strong>AR or ARIO tokens:</strong> Connect Wander wallet</div>
                      <div>• <strong>ETH (L1) or ETH (Base):</strong> Connect MetaMask or Ethereum wallet</div>
                      <div>• <strong>SOL tokens:</strong> Connect Phantom or Solana wallet</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : getAvailableTokens().length === 0 ? (
              <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning mb-2">No Compatible Crypto Tokens</p>
                    <p className="text-warning/80 text-sm">
                      Your current {walletType} wallet doesn't support our crypto payment tokens.
                      Please use fiat payment or connect a different wallet.
                    </p>
                  </div>
                </div>
              </div>
            ) : walletType === 'ethereum' ? (
              // Compact layout for Ethereum wallet with all token options
              <div className="space-y-3">
                {/* Native Tokens Row - Base ARIO, ARIO (AO), ETH options, POL */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(['base-ario', 'ario', 'ethereum', 'base-eth', 'pol'] as const).map((tokenType) => {
                    const tokenName = tokenType === 'base-ario' ? 'ARIO'
                      : tokenType === 'ario' ? 'ARIO'
                      : tokenType === 'ethereum' ? 'ETH'
                      : tokenType === 'base-eth' ? 'ETH'
                      : 'POL';
                    const networkName = tokenType === 'base-ario' ? 'Base'
                      : tokenType === 'ario' ? 'AO'
                      : tokenType === 'ethereum' ? 'Ethereum'
                      : tokenType === 'base-eth' ? 'Base'
                      : 'Polygon';
                    const isFast = tokenType === 'base-ario' || tokenType === 'ario' || tokenType === 'base-eth' || tokenType === 'pol';
                    const isNoFee = tokenType === 'base-ario' || tokenType === 'ario';

                    return (
                      <button
                        key={tokenType}
                        onClick={() => {
                          setSelectedTokenType(tokenType);
                          setErrorMessage('');
                        }}
                        className={`p-2 rounded-2xl border transition-all text-left ${
                          selectedTokenType === tokenType
                            ? 'border-foreground bg-foreground/10 text-foreground'
                            : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm">{tokenName}</div>
                            <div className="text-[10px] opacity-75">{networkName}</div>
                          </div>
                          {selectedTokenType === tokenType && (
                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                        </div>
                        {(isFast || isNoFee) && (
                          <div className="flex gap-1 mt-1">
                            {isFast && (
                              <span className="text-[9px] text-success font-medium">Fast</span>
                            )}
                            {isNoFee && (
                              <span className="text-[9px] text-info font-medium">No Fee</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* USDC Stablecoins Row */}
                <div>
                  <div className="text-[10px] font-medium text-foreground/80 mb-1.5 px-1 uppercase tracking-wider">Stablecoins</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['usdc', 'base-usdc', 'polygon-usdc'] as const).map((tokenType) => {
                      const networkName = tokenType === 'usdc' ? 'Ethereum'
                        : tokenType === 'base-usdc' ? 'Base'
                        : 'Polygon';
                      const isFast = tokenType === 'base-usdc' || tokenType === 'polygon-usdc';

                      return (
                        <button
                          key={tokenType}
                          onClick={() => {
                            setSelectedTokenType(tokenType);
                            setErrorMessage('');
                          }}
                          className={`p-2 rounded-2xl border transition-all text-left ${
                            selectedTokenType === tokenType
                              ? 'border-foreground bg-foreground/10 text-foreground'
                              : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-sm">USDC</div>
                              <div className="text-[10px] opacity-75">{networkName}</div>
                            </div>
                            {selectedTokenType === tokenType && (
                              <Check className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                          </div>
                          {isFast && (
                            <div className="mt-1">
                              <span className="text-[9px] text-success font-medium">Fast</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Compact layout for other wallet types (Arweave, Solana)
              <div className={`grid gap-1.5 ${getAvailableTokens().length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {getAvailableTokens().map((tokenType) => {
                  const tokenName = tokenType === 'ario' ? 'ARIO'
                    : tokenType === 'arweave' ? 'AR'
                    : tokenType === 'solana' ? 'SOL'
                    : tokenLabels[tokenType];
                  const networkName = tokenType === 'ario' ? 'AO Network'
                    : tokenType === 'arweave' ? 'Arweave'
                    : tokenType === 'solana' ? 'Solana'
                    : '';
                  const isFast = tokenType === 'ario' || tokenType === 'solana';
                  const isNoFee = tokenType === 'ario';

                  return (
                    <button
                      key={tokenType}
                      onClick={() => {
                        setSelectedTokenType(tokenType);
                        setErrorMessage('');
                      }}
                      className={`p-3 rounded-2xl border transition-all text-left ${
                        selectedTokenType === tokenType
                          ? 'border-foreground bg-foreground/10 text-foreground'
                          : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-base">{tokenName}</div>
                          <div className="text-xs opacity-75">{networkName}</div>
                        </div>
                        {selectedTokenType === tokenType && (
                          <Check className="w-4 h-4 flex-shrink-0" />
                        )}
                      </div>
                      {(isFast || isNoFee) && (
                        <div className="flex gap-2 mt-1.5">
                          {isFast && (
                            <span className="text-[10px] text-success font-medium">Fast</span>
                          )}
                          {isNoFee && (
                            <span className="text-[10px] text-info font-medium">No Fee</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Recipient Wallet Address for Crypto - Only if wallet is connected */}
        {paymentMethod === 'crypto' && address && (
          <div className="mb-6">
            {!isRecipientExpanded ? (
              // Collapsed state - summary button
              <button
                onClick={() => setIsRecipientExpanded(true)}
                className="w-full bg-card rounded-2xl p-4 border border-border/20 hover:border-foreground/80/50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-foreground/80" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">
                      Buying for: {truncateAddress(paymentTargetAddress || address)}
                      {(!paymentTargetAddress || paymentTargetAddress === address) && (
                        <span className="text-foreground/80 ml-2">(You)</span>
                      )}
                    </div>
                    {paymentTargetAddress && paymentTargetAddress !== address && (
                      <div className="text-xs text-foreground/80 mt-0.5">
                        {getWalletTypeLabel(paymentTargetType || 'unknown')} address
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-foreground/80 group-hover:text-foreground transition-colors" />
              </button>
            ) : (
              // Expanded state - full input field
              <div className="bg-card rounded-2xl border border-border/20">
                <button
                  onClick={() => setIsRecipientExpanded(false)}
                  className="w-full p-4 flex items-center justify-between hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-foreground/80" />
                    <span className="text-sm font-medium text-foreground/80">Recipient Wallet Address</span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-foreground/80 rotate-180 transition-transform" />
                </button>
                <div className="px-4 pb-4">
                  <input
                    type="text"
                    value={targetAddressInput || address}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTargetAddressInput(value);
                      setTargetAddressError('');
                      setTargetBalance(null);

                      // If user clears to match their address, set target to their wallet
                      if (value === address) {
                        setPaymentTarget(address, walletType);
                      }
                    }}
                    onBlur={() => {
                      const trimmed = targetAddressInput.trim();
                      if (trimmed && trimmed !== address) {
                        // Validating a different address
                        const validation = validateWalletAddress(trimmed);
                        if (validation.isValid && validation.type !== 'unknown') {
                          setPaymentTarget(trimmed, validation.type);
                          setTargetAddressError('');
                        } else {
                          setTargetAddressError(validation.error || 'Invalid address');
                          setTargetBalance(null);
                        }
                      } else if (!trimmed) {
                        // Reset to connected wallet if cleared
                        setTargetAddressInput('');
                        setPaymentTarget(address, walletType);
                        setTargetAddressError('');
                        setTargetBalance(null);
                      } else {
                        // It's their own address
                        setTargetAddressInput('');
                        setPaymentTarget(address, walletType);
                        setTargetAddressError('');
                        setTargetBalance(null);
                      }
                    }}
                    onFocus={() => {
                      // If showing connected address, clear input for easy editing
                      if (!targetAddressInput) {
                        setTargetAddressInput(address || '');
                      }
                    }}
                    placeholder="Enter Arweave, Ethereum, or Solana address"
                    className={`w-full p-3 rounded-2xl border bg-card text-foreground font-mono text-sm focus:outline-none transition-colors ${
                      targetAddressError
                        ? 'border-error focus:border-error'
                        : 'border-border/20 focus:border-foreground'
                    }`}
                  />
                  {targetAddressError && (
                    <div className="mt-2 text-xs text-error">{targetAddressError}</div>
                  )}
                  {paymentTargetAddress && !targetAddressError && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-xs text-success">
                          {paymentTargetAddress === address
                            ? 'Credits will be added to your wallet'
                            : `Valid ${getWalletTypeLabel(paymentTargetType || 'unknown')} address - sending to another wallet`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-foreground/80/70">
                    Leave as your address to top up yourself, or enter a different address to send credits to another wallet
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Amount Selection */}
        <div className="mb-6">
          {paymentMethod === 'fiat' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-foreground/80">
                  {inputType === 'dollars' ? 'Select USD Amount' : 'Enter Storage Amount'}
                </label>
                <div className="inline-flex bg-card rounded-2xl p-0.5 border border-border/20">
                  <button
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputType === 'storage'
                        ? 'bg-foreground text-card'
                        : 'text-foreground/80 hover:text-foreground'
                    }`}
                    onClick={() => {
                      setInputType('storage');
                      setErrorMessage('');
                    }}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Storage
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputType === 'dollars'
                        ? 'bg-foreground text-card'
                        : 'text-foreground/80 hover:text-foreground'
                    }`}
                    onClick={() => {
                      setInputType('dollars');
                      setErrorMessage('');
                    }}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    USD
                  </button>
                </div>
              </div>

              {inputType === 'dollars' ? (
                <>
                  {/* USD Preset Amounts */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {presetAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          setUsdAmount(amount);
                          setUsdAmountInput(String(amount));
                          setErrorMessage('');
                        }}
                        className={`py-3 px-3 rounded-2xl border transition-all font-medium ${
                          usdAmount === amount
                            ? 'border-foreground bg-foreground/10 text-foreground'
                            : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  {/* Custom USD Input */}
                  <div className="bg-card rounded-2xl p-4">
                    <label className="block text-xs font-medium text-foreground/80 mb-2 uppercase tracking-wider">
                      Custom Amount (USD)
                    </label>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-foreground" />
                      <input
                        type="text"
                        value={usdAmountInput}
                        onChange={handleAmountChange}
                        onBlur={() => {
                          if (usdAmount >= minUSDAmount && usdAmount <= maxUSDAmount) {
                            setUsdAmountInput(String(usdAmount));
                          }
                        }}
                        className={`flex-1 p-3 rounded-2xl border bg-card text-foreground font-medium text-lg focus:outline-none transition-colors ${
                          usdAmount > maxUSDAmount || (usdAmount < minUSDAmount && usdAmount > 0)
                            ? 'border-error focus:border-error'
                            : 'border-border/20 focus:border-foreground'
                        }`}
                        placeholder="Enter amount"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="mt-2 text-xs text-foreground/80">
                      Min: ${minUSDAmount} • Max: ${maxUSDAmount.toLocaleString()}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Storage Preset Amounts */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      { amount: 100, unit: 'MiB', label: '100 MiB' },
                      { amount: 500, unit: 'MiB', label: '500 MiB' },
                      { amount: 1, unit: 'GiB', label: '1 GiB' },
                      { amount: 10, unit: 'GiB', label: '10 GiB' },
                      { amount: 100, unit: 'GiB', label: '100 GiB' },
                      { amount: 1, unit: 'TiB', label: '1 TiB' },
                    ].map((preset) => {
                      const isSelected = storageAmount === preset.amount && storageUnit === preset.unit;
                      return (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setStorageAmount(preset.amount);
                            setStorageUnit(preset.unit as 'MiB' | 'GiB' | 'TiB');
                            setErrorMessage('');
                          }}
                          className={`py-3 px-3 rounded-2xl border transition-all font-medium ${
                            isSelected
                              ? 'border-foreground bg-foreground/10 text-foreground'
                              : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Storage Input */}
                  <div className="bg-card rounded-2xl p-4 mb-4">
                    <label className="block text-xs font-medium text-foreground/80 mb-2 uppercase tracking-wider">
                      Custom Amount
                    </label>
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                      <Listbox
                        value={storageUnits.find(unit => unit.value === storageUnit)}
                        onChange={(unit) => setStorageUnit(unit.value)}
                      >
                        <div className="relative w-full sm:w-auto">
                          <Listbox.Button className="relative w-full sm:w-auto rounded-2xl border border-border/20 bg-card pl-4 pr-12 py-3 text-lg font-medium text-foreground focus:border-foreground focus:outline-none cursor-pointer text-left">
                            <span className="block truncate">{storageUnits.find(unit => unit.value === storageUnit)?.label}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                              <ChevronDown className="h-5 w-5 text-foreground/80" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 w-full rounded-2xl bg-card border border-border/20 shadow-lg focus:outline-none">
                              {storageUnits.map((unit) => (
                                <Listbox.Option
                                  key={unit.value}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-3 pl-4 pr-10 ${
                                      active ? 'bg-card text-foreground' : 'text-foreground/80'
                                    }`
                                  }
                                  value={unit}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span className={`block truncate text-lg font-medium ${selected ? 'font-bold text-foreground' : 'font-medium'}`}>
                                        {unit.label}
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-foreground">
                                          <Check className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={storageAmount}
                        onChange={(e) => {
                          const value = Math.max(0, parseFloat(e.target.value) || 0);
                          setStorageAmount(value);
                          setErrorMessage('');
                        }}
                        className="w-full sm:flex-1 rounded-2xl border border-border/20 bg-card px-4 py-3 text-lg font-medium text-foreground focus:border-foreground focus:outline-none"
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="mt-2 text-xs text-foreground/80">
                      Min: ${minUSDAmount} • Max: ${maxUSDAmount.toLocaleString()}
                    </div>
                  </div>

                </>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-foreground/80">
                  {inputType === 'storage' ? 'Enter Storage Amount' : `Select ${tokenLabels[selectedTokenType]} Amount`}
                </label>
                <div className="inline-flex bg-card rounded-2xl p-0.5 border border-border/20">
                  <button
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputType === 'storage'
                        ? 'bg-foreground text-card'
                        : 'text-foreground/80 hover:text-foreground'
                    }`}
                    onClick={() => {
                      setInputType('storage');
                      setErrorMessage('');
                    }}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Storage
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      inputType === 'dollars'
                        ? 'bg-foreground text-card'
                        : 'text-foreground/80 hover:text-foreground'
                    }`}
                    onClick={() => {
                      setInputType('dollars');
                      setErrorMessage('');
                    }}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Token
                  </button>
                </div>
              </div>

              {inputType === 'storage' ? (
                <>
                  {/* Storage Preset Amounts for Crypto */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      { amount: 100, unit: 'MiB', label: '100 MiB' },
                      { amount: 500, unit: 'MiB', label: '500 MiB' },
                      { amount: 1, unit: 'GiB', label: '1 GiB' },
                      { amount: 10, unit: 'GiB', label: '10 GiB' },
                      { amount: 100, unit: 'GiB', label: '100 GiB' },
                      { amount: 1, unit: 'TiB', label: '1 TiB' },
                    ].map((preset) => {
                      const isSelected = storageAmount === preset.amount && storageUnit === preset.unit;
                      return (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setStorageAmount(preset.amount);
                            setStorageUnit(preset.unit as 'MiB' | 'GiB' | 'TiB');
                            setErrorMessage('');
                          }}
                          className={`py-3 px-3 rounded-2xl border transition-all font-medium ${
                            isSelected
                              ? 'border-foreground bg-foreground/10 text-foreground'
                              : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Storage Input for Crypto */}
                  <div className="bg-card rounded-2xl p-4 mb-4">
                    <label className="block text-xs font-medium text-foreground/80 mb-2 uppercase tracking-wider">
                      Custom Amount
                    </label>
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                      <Listbox
                        value={storageUnits.find(unit => unit.value === storageUnit)}
                        onChange={(unit) => setStorageUnit(unit.value)}
                      >
                        <div className="relative w-full sm:w-auto">
                          <Listbox.Button className="relative w-full sm:w-auto rounded-2xl border border-border/20 bg-card pl-4 pr-12 py-3 text-lg font-medium text-foreground focus:border-foreground focus:outline-none cursor-pointer text-left">
                            <span className="block truncate">{storageUnits.find(unit => unit.value === storageUnit)?.label}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                              <ChevronDown className="h-5 w-5 text-foreground/80" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 w-full rounded-2xl bg-card border border-border/20 shadow-lg focus:outline-none">
                              {storageUnits.map((unit) => (
                                <Listbox.Option
                                  key={unit.value}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-3 pl-4 pr-10 ${
                                      active ? 'bg-card text-foreground' : 'text-foreground/80'
                                    }`
                                  }
                                  value={unit}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span className={`block truncate text-lg font-medium ${selected ? 'font-bold text-foreground' : 'font-medium'}`}>
                                        {unit.label}
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-foreground">
                                          <Check className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={storageAmount}
                        onChange={(e) => {
                          const value = Math.max(0, parseFloat(e.target.value) || 0);
                          setStorageAmount(value);
                          setErrorMessage('');
                        }}
                        className="w-full sm:flex-1 rounded-2xl border border-border/20 bg-card px-4 py-3 text-lg font-medium text-foreground focus:border-foreground focus:outline-none"
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="mt-2 text-xs text-foreground/80">
                      Min: ${minUSDAmount} • Max: ${maxUSDAmount.toLocaleString()}
                    </div>
                  </div>

                </>
              ) : (
                <>
                  {/* Crypto Preset Amounts */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {getCryptoPresets(selectedTokenType).map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          setCryptoAmount(amount);
                          setCryptoAmountInput(String(amount));
                          setErrorMessage('');
                        }}
                        className={`py-3 px-2 rounded-2xl border transition-all font-medium text-sm ${
                          cryptoAmount === amount
                            ? 'border-foreground bg-foreground/10 text-foreground'
                            : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
                        }`}
                      >
                        {amount} {tokenLabels[selectedTokenType].replace(/\s*\([^)]*\)/, '')}
                      </button>
                    ))}
                  </div>

                  {/* Custom Crypto Input */}
                  <div className="bg-card rounded-2xl p-4">
                    <label className="block text-xs font-medium text-foreground/80 mb-2 uppercase tracking-wider">
                      Custom Amount ({tokenLabels[selectedTokenType]})
                    </label>
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-foreground" />
                      <input
                        type="text"
                        value={cryptoAmountInput}
                        onChange={handleCryptoAmountChange}
                        onBlur={() => {
                          if (cryptoAmount > 0) {
                            setCryptoAmountInput(String(cryptoAmount));
                          }
                        }}
                        className="flex-1 p-3 rounded-2xl border bg-card text-foreground font-medium text-lg focus:outline-none transition-colors border-border/20 focus:border-foreground"
                        placeholder={`Enter ${tokenLabels[selectedTokenType]} amount`}
                        inputMode="decimal"
                      />
                    </div>
                    <div className="mt-2 text-xs text-foreground/80">
                      Enter the amount of {tokenLabels[selectedTokenType]} you want to spend
                    </div>

                    {/* Token Pricing Status */}
                    {tokenPricingLoading && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-info/10 border border-info/20 rounded-2xl">
                        <Loader2 className="w-4 h-4 text-info flex-shrink-0 mt-0.5 animate-spin" />
                        <div>
                          <div className="text-info font-medium text-sm mb-1">Fetching Pricing...</div>
                          <div className="text-info/80 text-xs">Getting current {tokenLabels[selectedTokenType]} rates</div>
                        </div>
                      </div>
                    )}
                    {tokenPricingError && !tokenPricingLoading && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-2xl">
                        <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-warning font-medium text-sm mb-1">Quote Generation Unavailable</div>
                          <div className="text-warning/80 text-xs">{tokenPricingError}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Purchase Summary - Shopping Cart Style */}
        {((paymentMethod === 'fiat' && ((inputType === 'dollars' && usdAmount > 0) || (inputType === 'storage' && storageAmount > 0))) || (paymentMethod === 'crypto' && ((inputType === 'dollars' && cryptoAmount > 0) || (inputType === 'storage' && storageAmount > 0)))) && (
          <div className="bg-card border-2 border-foreground rounded-2xl p-6 mb-6">
            {/* Header */}
            <div className="text-sm text-foreground/80 mb-4">Purchase Summary</div>

            {/* Purchase Details Section */}
            <div className="space-y-3 mb-4 pb-4 border-b border-border/20">
              <div className="flex justify-between items-start">
                <div className="text-foreground font-medium">Credits</div>
                <div className="text-right">
                  <div className="text-lg font-medium text-foreground">
                    {paymentMethod === 'fiat'
                      ? (inputType === 'storage'
                          ? formatNumber((getStorageInGiB() * Number(wincForOneGiB || 0)) / 1e12)
                          : credits?.toLocaleString() || '...'
                        )
                      : (inputType === 'storage'
                          ? formatNumber((getStorageInGiB() * Number(wincForOneGiB || 0)) / 1e12)
                          : cryptoCredits?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4}) || '...'
                        )
                    }
                  </div>
                  {wincForOneGiB && (
                    <div className="text-xs text-foreground/80">
                      ~{paymentMethod === 'fiat'
                        ? (inputType === 'storage'
                            ? formatStorage(getStorageInGiB())
                            : credits ? formatStorage((credits * wincPerCredit) / Number(wincForOneGiB)) : '...'
                          )
                        : (inputType === 'storage'
                            ? formatStorage(getStorageInGiB())
                            : cryptoCredits ? formatStorage((cryptoCredits * wincPerCredit) / Number(wincForOneGiB)) : '...'
                          )
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Price Row */}
              {paymentMethod === 'fiat' && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-foreground/80">Price</div>
                  <div className="text-lg font-medium text-foreground">
                    ${inputType === 'storage' && wincForOneGiB && creditsForOneUSD
                      ? formatNumber(calculateStorageCost())
                      : formatNumber(usdAmount)
                    }
                  </div>
                </div>
              )}
              {paymentMethod === 'crypto' && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-foreground/80">Pay with {tokenLabels[selectedTokenType]}</div>
                  <div className="text-right">
                    <div className="text-lg font-medium text-foreground">
                      {inputType === 'storage'
                        ? (cryptoForStorage !== undefined
                            ? `${cryptoForStorage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} ${tokenLabels[selectedTokenType]}`
                            : '...'
                          )
                        : `${cryptoAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} ${tokenLabels[selectedTokenType]}`
                      }
                    </div>
                    {creditsForOneUSD && (
                      <div className="text-xs text-foreground/80">
                        ≈ ${inputType === 'storage' && wincForOneGiB
                          ? formatNumber(calculateStorageCost())
                          : cryptoCredits && creditsForOneUSD
                            ? formatNumber(cryptoCredits / creditsForOneUSD)
                            : '...'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Balance Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="text-sm text-foreground/80">Current Balance</div>
                <div className="text-right">
                  {loadingTargetBalance ? (
                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-medium text-foreground">
                        {formatNumber(targetBalance !== null ? targetBalance : creditBalance)}
                      </div>
                      {wincForOneGiB && (targetBalance !== null ? targetBalance : creditBalance) > 0 && (
                        <div className="text-xs text-foreground/80">
                          ~{formatStorage(((targetBalance !== null ? targetBalance : creditBalance) * wincPerCredit) / Number(wincForOneGiB))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/20"></div>

              {/* New Balance */}
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-foreground">New Balance</div>
                <div className="text-right">
                  <div className="text-lg font-bold text-success">
                    {paymentMethod === 'fiat'
                      ? (inputType === 'storage'
                          ? formatNumber((targetBalance !== null ? targetBalance : creditBalance) + (getStorageInGiB() * Number(wincForOneGiB || 0)) / 1e12)
                          : credits ? formatNumber((targetBalance !== null ? targetBalance : creditBalance) + credits) : '...'
                        )
                      : (inputType === 'storage'
                          ? formatNumber((targetBalance !== null ? targetBalance : creditBalance) + (getStorageInGiB() * Number(wincForOneGiB || 0)) / 1e12)
                          : cryptoCredits ? formatNumber((targetBalance !== null ? targetBalance : creditBalance) + cryptoCredits) : '...'
                        )
                    }
                  </div>
                  {wincForOneGiB && (
                    <div className="text-xs text-success">
                      ~{paymentMethod === 'fiat'
                        ? (inputType === 'storage'
                            ? formatStorage((((targetBalance !== null ? targetBalance : creditBalance) + (getStorageInGiB() * Number(wincForOneGiB)) / 1e12) * wincPerCredit) / Number(wincForOneGiB))
                            : credits ? formatStorage((((targetBalance !== null ? targetBalance : creditBalance) + credits) * wincPerCredit) / Number(wincForOneGiB)) : '...'
                          )
                        : (inputType === 'storage'
                            ? formatStorage((((targetBalance !== null ? targetBalance : creditBalance) + (getStorageInGiB() * Number(wincForOneGiB)) / 1e12) * wincPerCredit) / Number(wincForOneGiB))
                            : cryptoCredits ? formatStorage((((targetBalance !== null ? targetBalance : creditBalance) + cryptoCredits) * wincPerCredit) / Number(wincForOneGiB)) : '...'
                          )
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && errorMessage.trim() !== '' && (
          <div className="bg-error/10 border border-error/20 rounded-2xl p-4 mb-4">
            <div className="text-error text-sm">{errorMessage}</div>
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          className="w-full py-4 px-6 rounded-full bg-foreground text-card font-bold text-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          disabled={
            (paymentMethod === 'fiat' && (
              (!paymentTargetAddress && !address) || // Must have either a target address or connected wallet
              !!targetAddressError || // Block checkout if recipient address validation failed
              (inputType === 'dollars' && (!credits || usdAmount < minUSDAmount || usdAmount > maxUSDAmount)) ||
              (inputType === 'storage' && (!wincForOneGiB || !creditsForOneUSD || storageAmount <= 0 || calculateStorageCost() < minUSDAmount || calculateStorageCost() > maxUSDAmount))
            )) ||
            (paymentMethod === 'crypto' && (
              !!targetAddressError || // Block checkout if recipient address validation failed
              (inputType === 'dollars' && (cryptoAmount <= 0 || !walletType || !isTokenCompatibleWithWallet(selectedTokenType) || !!tokenPricingError)) ||
              (inputType === 'storage' && (!wincForOneGiB || !creditsForOneUSD || storageAmount <= 0 || !walletType || !isTokenCompatibleWithWallet(selectedTokenType) || cryptoForStorage === undefined))
            )) ||
            isProcessing
          }
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {paymentMethod === 'fiat' ? (
                <>
                  <Shield className="w-5 h-5" />
                  Continue
                </>
              ) : !walletType ? (
                <>
                  <Wallet className="w-5 h-5" />
                  Connect Wallet for Crypto Payment
                </>
              ) : !isTokenCompatibleWithWallet(selectedTokenType) ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Incompatible Wallet Type
                </>
              ) : tokenPricingError ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Pricing Unavailable for {tokenLabels[selectedTokenType as keyof typeof tokenLabels]}
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Continue with {tokenLabels[selectedTokenType as keyof typeof tokenLabels]}
                </>
              )}
            </>
          )}
        </button>

        {/* Payment Method Info */}
        {paymentMethod === 'fiat' && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-foreground/80">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure payment powered by Stripe</span>
          </div>
        )}

      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <WalletSelectionModal
          onClose={() => setShowWalletModal(false)}
        />
      )}
    </div>
  );
}
