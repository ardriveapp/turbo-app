import { TurboFactory, ArconnectSigner, USD, ARIOToTokenAmount, ETHToTokenAmount, SOLToTokenAmount } from '@ardrive/turbo-sdk/web';
import { useEffect, useState, useCallback } from 'react';
import { Clock, RefreshCw, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { turboConfig, tokenLabels, tokenNetworkLabels, SupportedTokenType } from '../../../constants';

interface CryptoConfirmationPanelProps {
  usdAmount: number;
  tokenType: SupportedTokenType;
  onBack: () => void;
  onPaymentComplete: (result: any) => void;
}

export default function CryptoConfirmationPanel({
  usdAmount,
  tokenType,
  onBack,
  onPaymentComplete
}: CryptoConfirmationPanelProps) {
  const { address, walletType } = useStore();
  const [countdown, setCountdown] = useState(5 * 60); // 5 minutes
  const [tosAgreed, setTosAgreed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  
  // Quote state
  const [quote, setQuote] = useState<{
    tokenAmount: number;
    credits: number;
    gigabytes: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch quote from Turbo SDK
  const fetchQuote = useCallback(async () => {
    if (!usdAmount || usdAmount <= 0) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    setPaymentError(undefined);

    try {
      const turbo = TurboFactory.unauthenticated({
        ...turboConfig,
        token: tokenType as any,
      });

      // Get winc for USD amount (this is our target)
      const wincForFiat = await turbo.getWincForFiat({
        amount: USD(usdAmount),
      });

      const targetWinc = Number(wincForFiat.winc);
      const credits = targetWinc / 1_000_000_000_000;
      const gigabytes = credits * 0.000268;

      // Simple estimation for display - Turbo SDK will handle exact amounts
      let tokenAmount = 0;
      switch (tokenType) {
        case 'arweave': tokenAmount = usdAmount * 0.05; break;
        case 'ario': tokenAmount = usdAmount * 50; break;
        case 'ethereum': tokenAmount = usdAmount * 0.0003; break;
        case 'base-eth': tokenAmount = usdAmount * 0.0003; break;
        case 'solana': tokenAmount = usdAmount * 0.004; break;
      }

      setQuote({ tokenAmount, credits, gigabytes });
    } catch (error) {
      console.error('Error fetching quote:', error);
      setPaymentError('Failed to get pricing quote. Please try again.');
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [usdAmount, tokenType]);

  const refreshQuote = () => {
    fetchQuote();
  };

  // Fetch quote on mount and when parameters change
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshQuote();
          return 5 * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshQuote]);

  const canPayDirectly = walletType === 'arweave' && (tokenType === 'arweave' || tokenType === 'ario');

  const handlePayment = async () => {
    if (!address || !quote) return;

    setIsProcessing(true);
    setPaymentError(undefined);

    try {
      if (canPayDirectly) {
        // Direct payment via Turbo SDK (only for Arweave wallets)
        if (walletType === 'arweave' && window.arweaveWallet) {
          const signer = new ArconnectSigner(window.arweaveWallet);
          const turbo = TurboFactory.authenticated({
            ...turboConfig,
            token: tokenType,
            signer,
          });

          const result = await turbo.topUpWithTokens({
            tokenAmount: quote.tokenAmount.toString(),
          });

          onPaymentComplete({
            ...result,
            quote,
            tokenType,
            transactionId: result.id,
          });
        } else {
          throw new Error('Arweave wallet not available');
        }
      } else {
        // Manual payment flow - user needs to send crypto manually
        onPaymentComplete({ 
          requiresManualPayment: true, 
          quote,
          tokenType 
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!quote && !quoteLoading) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-fg-muted mb-4">Unable to generate payment quote</p>
        <button onClick={onBack} className="text-turbo-red hover:text-turbo-red/80">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Wallet className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Review Payment</h3>
          <p className="text-sm text-link">Confirm your crypto payment details</p>
        </div>
      </div>

      {/* Quote Display */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6">
        {quoteLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-turbo-red" />
            <p className="text-fg-muted">Getting latest pricing...</p>
          </div>
        ) : quote ? (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-turbo-red mb-2">
                {quote.tokenAmount.toFixed(6)} {tokenLabels[tokenType]}
              </div>
              <div className="text-sm text-link mb-2">
                on {tokenNetworkLabels[tokenType]}
              </div>
              <div className="text-lg text-fg-muted">
                = ${usdAmount} = {quote.credits.toFixed(4)} Credits
              </div>
              <div className="text-sm text-link">
                ≈ {quote.gigabytes.toFixed(2)} GiB storage power
              </div>
            </div>

            {/* Quote Status */}
            <div className="flex items-center justify-between bg-surface/50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-link" />
                <span className="text-sm text-link">
                  Quote expires in {formatCountdown(countdown)}
                </span>
              </div>
              <button
                onClick={refreshQuote}
                disabled={quoteLoading}
                className="flex items-center gap-1 text-sm text-turbo-red hover:text-turbo-red/80 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${quoteLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Payment Method Info */}
      <div className="bg-surface rounded-lg p-4 border border-default">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-fg-muted mb-1">Payment Method</h4>
            <p className="text-sm text-link">
              {canPayDirectly 
                ? `Direct payment using your ${tokenLabels[tokenType]} balance on ${tokenNetworkLabels[tokenType]}`
                : `Manual transfer of ${tokenLabels[tokenType]} on ${tokenNetworkLabels[tokenType]} required`
              }
            </p>
            {!canPayDirectly && (
              <p className="text-xs text-link mt-1">
                You'll be guided through the manual payment process
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Terms of Service */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="tosCheckbox"
          checked={tosAgreed}
          onChange={(e) => setTosAgreed(e.target.checked)}
          className="mt-1 w-4 h-4 text-turbo-red bg-canvas border-default rounded focus:ring-turbo-red"
        />
        <label htmlFor="tosCheckbox" className="text-sm text-link">
          I agree to the{' '}
          <a
            href="https://ardrive.io/tos-and-privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-turbo-red hover:text-turbo-red/80"
          >
            Terms of Service and Privacy Policy
          </a>
        </label>
      </div>

      {/* Error Message */}
      {paymentError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-400 text-sm">{paymentError}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-default">
        <button
          onClick={onBack}
          className="text-sm text-link hover:text-fg-muted"
        >
          Back
        </button>
        
        <button
          onClick={handlePayment}
          disabled={!tosAgreed || !quote || isProcessing}
          className="px-6 py-3 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              {canPayDirectly ? 'Pay Now' : 'Continue'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}