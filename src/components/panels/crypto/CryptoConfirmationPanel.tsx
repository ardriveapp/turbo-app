import { TurboFactory, ArconnectSigner, ARToTokenAmount, ARIOToTokenAmount } from '@ardrive/turbo-sdk/web';
import { useEffect, useState, useCallback } from 'react';
import { Clock, RefreshCw, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { turboConfig, tokenLabels, tokenNetworkLabels, tokenProcessingTimes, wincPerCredit, SupportedTokenType } from '../../../constants';
import { useWincForToken } from '../../../hooks/useWincForOneGiB';

interface CryptoConfirmationPanelProps {
  cryptoAmount: number;
  tokenType: SupportedTokenType;
  onBack: () => void;
  onPaymentComplete: (result: any) => void;
}

export default function CryptoConfirmationPanel({
  cryptoAmount,
  tokenType,
  onBack,
  onPaymentComplete
}: CryptoConfirmationPanelProps) {
  const { address, walletType } = useStore();
  const [countdown, setCountdown] = useState(5 * 60); // 5 minutes
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  
  // Use existing hook for AR/ARIO quote calculation
  const wincForToken = useWincForToken(
    (tokenType === 'arweave' || tokenType === 'ario') ? tokenType : 'arweave', 
    (tokenType === 'arweave' || tokenType === 'ario') ? cryptoAmount : 0
  );
  
  const quote = (tokenType === 'arweave' || tokenType === 'ario') && wincForToken ? {
    tokenAmount: cryptoAmount,
    credits: Number(wincForToken) / wincPerCredit,
    gigabytes: (Number(wincForToken) / wincPerCredit) * 0.000268,
  } : null;

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Simplified countdown for quote refresh display
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 5 * 60; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Only allow direct payment for AR - use manual flow for ARIO due to AO service issues
  const canPayDirectly = walletType === 'arweave' && tokenType === 'arweave';

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
            signer,
            token: tokenType,
            paymentServiceConfig: {
              url: turboConfig.paymentServiceConfig.url,
            },
          });

          // Use SDK helper functions like reference app - returns BigNumber (which SDK expects)
          let tokenAmount;
          if (tokenType === 'arweave') {
            tokenAmount = ARToTokenAmount(cryptoAmount);
          } else if (tokenType === 'ario') {
            tokenAmount = ARIOToTokenAmount(cryptoAmount);
          } else {
            throw new Error(`Unsupported token type for direct payment: ${tokenType}`);
          }

          console.log('🔍 ARIO amount conversion:', cryptoAmount, 'ARIO →', tokenAmount.toString(), 'mARIO');

          const result = await turbo.topUpWithTokens({
            tokenAmount,
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
        {quote ? (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-turbo-red mb-2">
                {quote.tokenAmount.toFixed(6)} {tokenLabels[tokenType]}
              </div>
              <div className="text-sm text-link mb-2">
                on {tokenNetworkLabels[tokenType]}
              </div>
              <div className="text-lg text-fg-muted">
                {quote.credits.toFixed(4)} Credits
              </div>
              <div className="text-sm text-link">
                ≈ {quote.gigabytes.toFixed(2)} GiB storage power
              </div>
            </div>

            {/* Quote Status */}
            <div className="flex items-center justify-center bg-surface/50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-link" />
                <span className="text-sm text-link">
                  Live pricing • Updated automatically
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-fg-muted mb-2">Quote Generation Unavailable</p>
            <p className="text-sm text-link mb-4">
              {tokenType === 'arweave' || tokenType === 'ario' 
                ? 'Unable to calculate pricing for this amount'
                : `${tokenLabels[tokenType]} pricing not yet implemented`
              }
            </p>
            <button onClick={onBack} className="text-turbo-red hover:text-turbo-red/80">
              Go Back
            </button>
          </div>
        )}
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
            <div className="mt-2 flex items-center gap-2">
              <Clock className={`w-3 h-3 ${
                tokenProcessingTimes[tokenType].speed === 'fast' ? 'text-green-400' :
                tokenProcessingTimes[tokenType].speed === 'medium' ? 'text-yellow-400' :
                'text-orange-400'
              }`} />
              <p className={`text-xs ${
                tokenProcessingTimes[tokenType].speed === 'fast' ? 'text-green-400' :
                tokenProcessingTimes[tokenType].speed === 'medium' ? 'text-yellow-400' :
                'text-orange-400'
              }`}>
                Expected processing: {tokenProcessingTimes[tokenType].time}
              </p>
            </div>
            <p className="text-xs text-link mt-1">
              {tokenProcessingTimes[tokenType].description}
            </p>
            {!canPayDirectly && (
              <p className="text-xs text-link mt-1">
                You'll be guided through the manual payment process
              </p>
            )}
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
          disabled={!quote || isProcessing}
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