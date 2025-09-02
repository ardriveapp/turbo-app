import { useState, useEffect, useCallback } from 'react';
import { useCreditsForFiat } from '../../hooks/useCreditsForFiat';
import useDebounce from '../../hooks/useDebounce';
import { defaultUSDAmount, minUSDAmount, maxUSDAmount, wincPerCredit, tokenLabels, tokenNetworkLabels, tokenNetworkDescriptions, SupportedTokenType, defaultPaymentServiceUrl } from '../../constants';
import { useStore } from '../../store/useStore';
import { TurboFactory, USD } from '@ardrive/turbo-sdk/web';
import { turboConfig } from '../../constants';
import { Loader2, Lock, CreditCard, Zap, DollarSign, Wallet, Info, Shield, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { useWincForOneGiB, useWincForToken } from '../../hooks/useWincForOneGiB';
import CryptoConfirmationPanel from './crypto/CryptoConfirmationPanel';
import CryptoManualPaymentPanel from './crypto/CryptoManualPaymentPanel';
import PaymentDetailsPanel from './fiat/PaymentDetailsPanel';
import PaymentConfirmationPanel from './fiat/PaymentConfirmationPanel';
import PaymentSuccessPanel from './fiat/PaymentSuccessPanel';
import { getPaymentIntent } from '../../services/paymentService';


export default function TopUpPanel() {
  const { 
    address, 
    walletType, 
    creditBalance, 
    paymentIntent,
    paymentInformation,
    paymentIntentResult,
    setPaymentAmount,
    setPaymentIntent,
    clearAllPaymentState
  } = useStore();
  
  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('fiat');
  const [usdAmount, setUsdAmount] = useState(defaultUSDAmount);
  const [usdAmountInput, setUsdAmountInput] = useState(String(defaultUSDAmount));
  const [cryptoAmount, setCryptoAmount] = useState(0.01); // Default crypto amount
  const [cryptoAmountInput, setCryptoAmountInput] = useState('0.01');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment flow state
  const [fiatFlowStep, setFiatFlowStep] = useState<'amount' | 'details' | 'confirmation' | 'success'>('amount');
  
  // Crypto flow state  
  const [cryptoFlowStep, setCryptoFlowStep] = useState<'selection' | 'confirmation' | 'manual-payment' | 'complete'>('selection');
  const [selectedTokenType, setSelectedTokenType] = useState<SupportedTokenType>('arweave');
  const [cryptoPaymentResult, setCryptoPaymentResult] = useState<any>(null);
  
  const debouncedUsdAmount = useDebounce(usdAmount);
  const debouncedCryptoAmount = useDebounce(cryptoAmount);
  const [credits] = useCreditsForFiat(debouncedUsdAmount, setErrorMessage);
  // Use existing hook for AR/ARIO only since that's what it supports
  const wincForArweave = useWincForToken(
    (selectedTokenType === 'arweave' || selectedTokenType === 'ario') ? selectedTokenType : 'arweave', 
    (selectedTokenType === 'arweave' || selectedTokenType === 'ario') ? debouncedCryptoAmount : 0
  );
  const cryptoCredits = (selectedTokenType === 'arweave' || selectedTokenType === 'ario') && wincForArweave 
    ? Number(wincForArweave) / wincPerCredit 
    : undefined;
  const wincForOneGiB = useWincForOneGiB();
  
  
  // Helper function to get token amount for USD amount
  const getTokenAmountForUSD = async (usdAmount: number, tokenType: SupportedTokenType): Promise<number> => {
    try {
      const turbo = TurboFactory.unauthenticated({
        ...turboConfig,
        token: tokenType as any,
      });
      
      const wincForFiat = await turbo.getWincForFiat({
        amount: USD(usdAmount),
      });
      
      const targetWinc = Number(wincForFiat.winc);
      const PAYMENT_SERVICE_FQDN = defaultPaymentServiceUrl.replace('https://', '');
      
      // Quick estimation using 1 token unit as baseline
      const url = `https://${PAYMENT_SERVICE_FQDN}/v1/price/${tokenType}/1`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        const wincPerToken = Number(result.winc);
        if (wincPerToken > 0) {
          return targetWinc / wincPerToken;
        }
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  };

  const presetAmounts = [10, 25, 50, 100, 250, 500];
  
  // Crypto preset amounts based on token type (from reference app)
  const getCryptoPresets = (tokenType: SupportedTokenType) => {
    switch (tokenType) {
      case 'arweave': return [0.5, 1, 5, 10];
      case 'ario': return [50, 100, 500, 1000];
      case 'ethereum': return [0.01, 0.05, 0.1, 0.25];
      case 'base-eth': return [0.01, 0.05, 0.1, 0.25];
      case 'solana': return [0.05, 0.1, 0.25, 0.5];
      case 'kyve': return [100, 500, 1000, 2000];
      case 'matic': return [10, 50, 100, 250];
      case 'pol': return [10, 50, 100, 250];
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
    if (!address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    // Validate amount limits
    if (usdAmount < minUSDAmount) {
      setErrorMessage(`Minimum purchase amount is $${minUSDAmount}`);
      return;
    }
    
    if (usdAmount > maxUSDAmount) {
      setErrorMessage(`Maximum purchase amount is $${maxUSDAmount}`);
      return;
    }

    if (paymentMethod === 'fiat') {
      setIsProcessing(true);
      setErrorMessage('');
      
      try {
        // Determine the token type based on wallet type
        const tokenMap = {
          'arweave': 'arweave',
          'ethereum': 'ethereum', 
          'solana': 'solana'
        } as const;
        
        const token = tokenMap[walletType || 'arweave'];
        
        // Create payment intent for inline flow
        const paymentIntentResponse = await getPaymentIntent(
          address,
          usdAmount * 100, // Convert to cents
          token as any,
        );
        
        // Store payment state
        setPaymentAmount(usdAmount * 100);
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

  // Get available tokens based on wallet type
  const getAvailableTokens = useCallback((): SupportedTokenType[] => {
    switch (walletType) {
      case 'arweave':
        return ['arweave', 'ario'];
      case 'ethereum':
        return ['ethereum', 'base-eth'];
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
        return 'Connect an Arweave wallet (like Wander) to pay with ARIO tokens';
      case 'ethereum':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with ETH on Ethereum L1 (higher fees)';
      case 'base-eth':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with ETH on Base L2 (lower fees)';
      case 'solana':
        return 'Connect a Solana wallet (like Phantom) to pay with SOL tokens';
      default:
        return 'Connect a compatible wallet to use this token';
    }
  };

  // The reference app doesn't do USD->Crypto conversion
  // Instead, crypto mode lets users enter token amounts directly
  // We should simplify this to match the reference pattern

  // Auto-select token based on wallet type
  useEffect(() => {
    const availableTokens = getAvailableTokens();
    if (availableTokens.length > 0) {
      setSelectedTokenType(availableTokens[0]);
    }
  }, [walletType, getAvailableTokens]);


  // Clear payment state when wallet changes
  useEffect(() => {
    clearAllPaymentState();
    setFiatFlowStep('amount');
  }, [address, clearAllPaymentState]);


  // Render fiat flow screens
  if (paymentMethod === 'fiat' && fiatFlowStep !== 'amount') {
    switch (fiatFlowStep) {
      case 'details':
        return (
          <PaymentDetailsPanel
            usdAmount={usdAmount}
            onBack={handleFiatBackToAmount}
            onNext={handleFiatPaymentDetailsNext}
          />
        );
      case 'confirmation':
        return (
          <PaymentConfirmationPanel
            usdAmount={usdAmount}
            onBack={() => setFiatFlowStep('details')}
            onSuccess={handleFiatPaymentSuccess}
          />
        );
      case 'success':
        return (
          <PaymentSuccessPanel
            onComplete={handleFiatComplete}
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
            cryptoAmount={cryptoAmount}
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
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <CreditCard className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Buy Credits</h3>
          <p className="text-sm text-link">Purchase credits for permanent storage and domains on Arweave</p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-blue/5 rounded-xl border border-default p-6 mb-6">
        
        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-link mb-3">Choose Payment Method</label>
          <div className="inline-flex bg-surface rounded-lg p-1 border border-default w-full">
            <button
              onClick={() => {
                setPaymentMethod('fiat');
                setErrorMessage('');
              }}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                paymentMethod === 'fiat'
                  ? 'bg-turbo-red text-white'
                  : 'text-link hover:text-fg-muted'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Credit/Debit Card
            </button>
            <button
              onClick={() => {
                setPaymentMethod('crypto');
                setErrorMessage('');
              }}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                paymentMethod === 'crypto'
                  ? 'bg-turbo-red text-white'
                  : 'text-link hover:text-fg-muted'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Crypto
            </button>
          </div>
        </div>

        {/* Crypto Token Selection - Show immediately after selecting crypto */}
        {paymentMethod === 'crypto' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-link mb-3">Select Cryptocurrency</label>
            
            {!walletType ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-400 mb-2">Wallet Required for Crypto Payments</p>
                    <p className="text-blue-300 text-sm mb-3">
                      Connect a wallet that supports the cryptocurrency you want to use:
                    </p>
                    <div className="space-y-2 text-sm text-blue-300">
                      <div>• <strong>AR or ARIO tokens:</strong> Connect Wander wallet</div>
                      <div>• <strong>ETH (L1) or ETH (Base):</strong> Connect MetaMask or Ethereum wallet</div>
                      <div>• <strong>SOL tokens:</strong> Connect Phantom or Solana wallet</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : getAvailableTokens().length === 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400 mb-2">No Compatible Crypto Tokens</p>
                    <p className="text-yellow-300 text-sm">
                      Your current {walletType} wallet doesn't support our crypto payment tokens. 
                      Please use fiat payment or connect a different wallet.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {getAvailableTokens().map((tokenType) => (
                  <button 
                    key={tokenType}
                    onClick={() => {
                      setSelectedTokenType(tokenType);
                      setErrorMessage('');
                    }}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      selectedTokenType === tokenType
                        ? 'border-turbo-red bg-turbo-red/10 text-turbo-red'
                        : 'border-default text-link hover:bg-surface hover:text-fg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-lg">
                        {tokenLabels[tokenType as keyof typeof tokenLabels]}
                      </div>
                      {tokenType === 'base-eth' && (
                        <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-md text-xs font-medium">
                          Lower Fees
                        </div>
                      )}
                      {tokenType === 'ethereum' && (
                        <div className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-md text-xs font-medium">
                          Higher Fees
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium opacity-90 mb-1">
                      {tokenNetworkLabels[tokenType]}
                    </div>
                    <div className="text-xs opacity-75">
                      {tokenNetworkDescriptions[tokenType]}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Amount Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-link mb-3">
            {paymentMethod === 'fiat' ? 'Select USD Amount' : `Select ${tokenLabels[selectedTokenType]} Amount`}
          </label>
          
          {paymentMethod === 'fiat' ? (
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
                    className={`py-3 px-3 rounded-lg border transition-all font-medium ${
                      usdAmount === amount
                        ? 'border-turbo-red bg-turbo-red/10 text-turbo-red'
                        : 'border-default text-link hover:bg-surface hover:text-fg-muted'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              
              {/* Custom USD Input */}
              <div className="bg-surface rounded-lg p-4">
                <label className="block text-xs font-medium text-link mb-2 uppercase tracking-wider">
                  Custom Amount (USD)
                </label>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-fg-muted" />
                  <input
                    type="text"
                    value={usdAmountInput}
                    onChange={handleAmountChange}
                    onBlur={() => {
                      if (usdAmount >= minUSDAmount && usdAmount <= maxUSDAmount) {
                        setUsdAmountInput(String(usdAmount));
                      }
                    }}
                    className={`flex-1 p-3 rounded-lg border bg-canvas text-fg-muted font-medium text-lg focus:outline-none transition-colors ${
                      usdAmount > maxUSDAmount || (usdAmount < minUSDAmount && usdAmount > 0)
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-default focus:border-turbo-red'
                    }`}
                    placeholder="Enter amount"
                    inputMode="decimal"
                  />
                </div>
                <div className="mt-2 text-xs text-link">
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
                    className={`py-3 px-2 rounded-lg border transition-all font-medium text-sm ${
                      cryptoAmount === amount
                        ? 'border-turbo-red bg-turbo-red/10 text-turbo-red'
                        : 'border-default text-link hover:bg-surface hover:text-fg-muted'
                    }`}
                  >
                    {amount} {tokenLabels[selectedTokenType].replace(/\s*\([^)]*\)/, '')}
                  </button>
                ))}
              </div>
              
              {/* Custom Crypto Input */}
              <div className="bg-surface rounded-lg p-4">
                <label className="block text-xs font-medium text-link mb-2 uppercase tracking-wider">
                  Custom Amount ({tokenLabels[selectedTokenType]})
                </label>
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-fg-muted" />
                  <input
                    type="text"
                    value={cryptoAmountInput}
                    onChange={handleCryptoAmountChange}
                    onBlur={() => {
                      if (cryptoAmount > 0) {
                        setCryptoAmountInput(String(cryptoAmount));
                      }
                    }}
                    className="flex-1 p-3 rounded-lg border bg-canvas text-fg-muted font-medium text-lg focus:outline-none transition-colors border-default focus:border-turbo-red"
                    placeholder={`Enter ${tokenLabels[selectedTokenType]} amount`}
                    inputMode="decimal"
                  />
                </div>
                <div className="mt-2 text-xs text-link">
                  Enter the amount of {tokenLabels[selectedTokenType]} you want to spend
                </div>
              </div>
            </>
          )}
        </div>

        {/* Credits Preview */}
        {((paymentMethod === 'fiat' && credits && usdAmount > 0) || (paymentMethod === 'crypto' && cryptoCredits && cryptoCredits > 0)) && (
          <div className="space-y-4 mb-6">
            {/* Purchase Summary */}
            <div className="bg-canvas border-2 border-turbo-red rounded-lg p-6">
              <div className="text-sm text-link mb-1">You'll Receive</div>
              <div className="text-4xl font-bold text-turbo-red mb-1">
                {paymentMethod === 'fiat' 
                  ? credits?.toLocaleString() || '...'
                  : cryptoCredits?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4}) || '...'
                } Credits
              </div>
              {wincForOneGiB && (
                <div className="text-sm text-link">
                  = ~{paymentMethod === 'fiat' 
                    ? credits ? ((credits * wincPerCredit) / Number(wincForOneGiB)).toFixed(2) : '...'
                    : cryptoCredits ? ((cryptoCredits * wincPerCredit) / Number(wincForOneGiB)).toFixed(2) : '...'
                  } GiB storage power
                </div>
              )}
            </div>

            {/* Balance Comparison */}
            <div className="bg-surface/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-link">Current Balance</span>
                <div className="text-right">
                  <span className="font-medium text-fg-muted">
                    {creditBalance.toLocaleString()} Credits
                  </span>
                  {wincForOneGiB && creditBalance > 0 && (
                    <div className="text-xs text-link">
                      ~{((creditBalance * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-link">After Purchase</span>
                <div className="text-right">
                  <span className="font-bold text-turbo-green text-lg">
                    {paymentMethod === 'fiat' 
                      ? credits ? (creditBalance + credits).toLocaleString() : '...'
                      : cryptoCredits ? (creditBalance + cryptoCredits).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4}) : '...'
                    } Credits
                  </span>
                  {wincForOneGiB && (
                    <div className="text-xs text-turbo-green">
                      ~{paymentMethod === 'fiat'
                        ? credits ? (((creditBalance + credits) * wincPerCredit) / Number(wincForOneGiB)).toFixed(2) : '...'
                        : cryptoCredits ? (((creditBalance + cryptoCredits) * wincPerCredit) / Number(wincForOneGiB)).toFixed(2) : '...'
                      } GiB storage power
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && errorMessage.trim() !== '' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <div className="text-red-400 text-sm">{errorMessage}</div>
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          className="w-full py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          disabled={
            (paymentMethod === 'fiat' && (!credits || usdAmount < minUSDAmount || usdAmount > maxUSDAmount)) ||
            (paymentMethod === 'crypto' && (cryptoAmount <= 0 || !walletType || !isTokenCompatibleWithWallet(selectedTokenType))) ||
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
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-link">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure payment powered by Stripe</span>
          </div>
        )}

      </div>

    </div>
  );
}