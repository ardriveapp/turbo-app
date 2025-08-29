import { useState, useEffect, useCallback } from 'react';
import { useCreditsForFiat } from '../../hooks/useCreditsForFiat';
import useDebounce from '../../hooks/useDebounce';
import { defaultUSDAmount, minUSDAmount, maxUSDAmount, wincPerCredit, tokenLabels, SupportedTokenType, defaultPaymentServiceUrl } from '../../constants';
import { useStore } from '../../store/useStore';
import { TurboFactory, USD } from '@ardrive/turbo-sdk/web';
import { turboConfig } from '../../constants';
import { Loader2, Lock, CreditCard, Zap, DollarSign, Wallet, Info, Shield, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import CryptoConfirmationPanel from './crypto/CryptoConfirmationPanel';
import CryptoManualPaymentPanel from './crypto/CryptoManualPaymentPanel';


export default function TopUpPanel() {
  const { address, walletType, creditBalance } = useStore();
  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('fiat');
  const [usdAmount, setUsdAmount] = useState(defaultUSDAmount);
  const [usdAmountInput, setUsdAmountInput] = useState(String(defaultUSDAmount));
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Crypto flow state  
  const [cryptoFlowStep, setCryptoFlowStep] = useState<'selection' | 'confirmation' | 'manual-payment' | 'complete'>('selection');
  const [selectedTokenType, setSelectedTokenType] = useState<SupportedTokenType>('arweave');
  const [cryptoPaymentResult, setCryptoPaymentResult] = useState<any>(null);
  
  const debouncedUsdAmount = useDebounce(usdAmount);
  const [credits] = useCreditsForFiat(debouncedUsdAmount, setErrorMessage);
  const wincForOneGiB = useWincForOneGiB();
  
  // State for crypto amounts
  const [cryptoAmount, setCryptoAmount] = useState<number>(0);
  const [cryptoLoading, setCryptoLoading] = useState(false);

  const presetAmounts = [10, 25, 50, 100, 250, 500];

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
        
        // Create Turbo instance with the appropriate token
        const turbo = TurboFactory.unauthenticated({
          ...turboConfig,
          token: token as any
        });
        
        // Create checkout session with Turbo SDK (no success/cancel URLs for testing)
        // Creating checkout session for payment
        
        const checkoutSession = await turbo.createCheckoutSession({
          amount: USD(usdAmount),
          owner: address,
          uiMode: 'hosted',
        });
        
        // Open Stripe checkout in new window
        if (checkoutSession.url) {
          window.open(checkoutSession.url, '_blank');
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        // Error creating checkout session
        
        if (error instanceof Error) {
          setErrorMessage(`Checkout failed: ${error.message}`);
        } else {
          setErrorMessage('Failed to create checkout session. Please try again.');
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
      case 'ario':
        return 'Connect an Arweave wallet (like ArConnect) to pay with AR or ARIO tokens';
      case 'ethereum':
      case 'base-eth':
        return 'Connect an Ethereum wallet (like MetaMask) to pay with ETH or ETH on Base';
      case 'solana':
        return 'Connect a Solana wallet (like Phantom) to pay with SOL tokens';
      default:
        return 'Connect a compatible wallet to use this token';
    }
  };

  // Calculate crypto amount for USD equivalent
  const calculateCryptoAmount = useCallback(async () => {
    if (paymentMethod !== 'crypto' || !usdAmount || usdAmount <= 0) {
      setCryptoAmount(0);
      return;
    }

    setCryptoLoading(true);
    try {
      const turbo = TurboFactory.unauthenticated({
        ...turboConfig,
        token: selectedTokenType as any,
      });
      
      // Get winc for USD amount
      const wincForFiat = await turbo.getWincForFiat({
        amount: USD(usdAmount),
      });

      // Use the payment service API to get token amount for this winc value
      const PAYMENT_SERVICE_FQDN = defaultPaymentServiceUrl.replace('https://', '');
      
      // Simplified conversion - in production this should use proper Turbo SDK methods
      let estimatedTokenAmount = 0;
      switch (selectedTokenType) {
        case 'arweave':
          estimatedTokenAmount = usdAmount * 0.05;
          break;
        case 'ario':
          estimatedTokenAmount = usdAmount * 100;
          break;
        case 'ethereum':
          estimatedTokenAmount = usdAmount * 0.0003;
          break;
        case 'base-eth':
          estimatedTokenAmount = usdAmount * 0.0003;
          break;
        case 'solana':
          estimatedTokenAmount = usdAmount * 0.005;
          break;
      }
      
      setCryptoAmount(estimatedTokenAmount);
    } catch (error) {
      console.error('Error calculating crypto amount:', error);
      setCryptoAmount(0);
    } finally {
      setCryptoLoading(false);
    }
  }, [paymentMethod, usdAmount, selectedTokenType]);

  // Auto-select token based on wallet type
  useEffect(() => {
    const availableTokens = getAvailableTokens();
    if (availableTokens.length > 0) {
      setSelectedTokenType(availableTokens[0]);
    }
  }, [walletType, getAvailableTokens]);

  // Update crypto amount when USD amount or token changes
  useEffect(() => {
    calculateCryptoAmount();
  }, [calculateCryptoAmount]);

  // Render crypto flow screens
  if (paymentMethod === 'crypto' && cryptoFlowStep !== 'selection') {
    switch (cryptoFlowStep) {
      case 'confirmation':
        return (
          <CryptoConfirmationPanel
            usdAmount={usdAmount}
            tokenType={selectedTokenType}
            onBack={handleCryptoBackToSelection}
            onPaymentComplete={handleCryptoPaymentComplete}
          />
        );
      case 'manual-payment':
        return (
          <CryptoManualPaymentPanel
            cryptoTopupValue={cryptoPaymentResult?.quote?.tokenAmount || 0}
            onBack={handleCryptoBackToSelection}
            onComplete={handleManualPaymentComplete}
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
                      <div>• <strong>AR or ARIO tokens:</strong> Connect ArConnect wallet</div>
                      <div>• <strong>ETH or ETH on Base:</strong> Connect MetaMask or Ethereum wallet</div>
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
                    className={`p-4 rounded-lg border transition-all font-medium ${
                      selectedTokenType === tokenType
                        ? 'border-turbo-red bg-turbo-red/10 text-turbo-red'
                        : 'border-default text-link hover:bg-surface hover:text-fg-muted'
                    }`}
                  >
                    <div className="text-lg">{tokenLabels[tokenType as keyof typeof tokenLabels]}</div>
                    <div className="text-xs opacity-75">
                      {tokenType === 'base-eth' ? 'Base Network' : tokenType.toUpperCase()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Amount Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-link mb-3">Select Amount</label>
          
          {/* Preset Amounts */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {presetAmounts.map((amount) => {
              // Calculate crypto equivalent for this preset amount
              let cryptoEquivalent = 0;
              if (paymentMethod === 'crypto') {
                switch (selectedTokenType) {
                  case 'arweave': cryptoEquivalent = amount * 0.05; break;
                  case 'ario': cryptoEquivalent = amount * 100; break;
                  case 'ethereum': cryptoEquivalent = amount * 0.0003; break;
                  case 'base-eth': cryptoEquivalent = amount * 0.0003; break;
                  case 'solana': cryptoEquivalent = amount * 0.005; break;
                }
              }
              
              return (
                <button
                  key={amount}
                  onClick={() => {
                    setUsdAmount(amount);
                    setUsdAmountInput(String(amount));
                    setErrorMessage('');
                  }}
                  className={`py-3 px-3 rounded-lg border transition-all font-medium text-center ${
                    usdAmount === amount
                      ? 'border-turbo-red bg-turbo-red/10 text-turbo-red'
                      : 'border-default text-link hover:bg-surface hover:text-fg-muted'
                  }`}
                >
                  <div>${amount}</div>
                  {paymentMethod === 'crypto' && walletType && (
                    <div className="text-xs opacity-75 mt-1">
                      {cryptoEquivalent.toFixed(cryptoEquivalent < 1 ? 6 : 2)} {tokenLabels[selectedTokenType as keyof typeof tokenLabels]}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Custom Amount Input */}
          <div className="bg-surface rounded-lg p-4">
            <label className="block text-xs font-medium text-link mb-2 uppercase tracking-wider">
              Custom Amount {paymentMethod === 'crypto' ? `(USD ≈ ${tokenLabels[selectedTokenType as keyof typeof tokenLabels]})` : '(USD)'}
            </label>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-fg-muted" />
              <input
                type="text"
                value={usdAmountInput}
                onChange={handleAmountChange}
                onBlur={() => {
                  // Clean up the input on blur
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
            
            {/* Show crypto equivalent for custom amount */}
            {paymentMethod === 'crypto' && walletType && usdAmount > 0 && (
              <div className="mt-3 p-3 bg-canvas rounded border border-default">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-link">Crypto Amount:</span>
                  <div className="text-right">
                    {cryptoLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-turbo-red" />
                        <span className="text-xs text-link">Calculating...</span>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-fg-muted">
                          {cryptoAmount.toFixed(cryptoAmount < 1 ? 6 : 4)} {tokenLabels[selectedTokenType as keyof typeof tokenLabels]}
                        </div>
                        <div className="text-xs text-link">≈ ${usdAmount}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Credits Preview */}
        {credits && usdAmount > 0 && (
          <div className="space-y-4 mb-6">
            {/* Purchase Summary */}
            <div className="bg-canvas border-2 border-turbo-red rounded-lg p-6">
              <div className="text-sm text-link mb-1">You'll Receive</div>
              <div className="text-4xl font-bold text-turbo-red mb-1">
                {credits.toLocaleString()} Credits
              </div>
              {wincForOneGiB && (
                <div className="text-sm text-link">
                  = ~{((credits * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB storage power
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
                    {(creditBalance + credits).toLocaleString()} Credits
                  </span>
                  {wincForOneGiB && (
                    <div className="text-xs text-turbo-green">
                      ~{(((creditBalance + credits) * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB storage power
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
            !credits || 
            usdAmount < minUSDAmount || 
            usdAmount > maxUSDAmount || 
            isProcessing ||
            (paymentMethod === 'crypto' && (!walletType || !isTokenCompatibleWithWallet(selectedTokenType)))
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
                  Continue to Secure Payment
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

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Instant Credits</h4>
              <p className="text-xs text-link">
                Credits are added to your account immediately after successful payment.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Permanent Storage</h4>
              <p className="text-xs text-link">
                Pay once, store forever. No monthly fees or expiration dates.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Live Pricing</h4>
              <p className="text-xs text-link">
                Real-time pricing based on current network rates and demand.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="text-center bg-surface/30 rounded-lg p-4">
        <p className="text-xs text-link">
          By continuing, you agree to our{' '}
          <a 
            href="https://ardrive.io/tos-and-privacy/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-turbo-red hover:text-turbo-red/80 transition-colors"
          >
            Terms of Service
          </a>
          {' '}and{' '}
          <a 
            href="https://ardrive.io/tos-and-privacy/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-turbo-red hover:text-turbo-red/80 transition-colors"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}