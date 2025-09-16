import { TurboWincForFiatResponse, USD } from '@ardrive/turbo-sdk/web';
import { useStripe } from '@stripe/react-stripe-js';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { getWincForFiat } from '../../../services/paymentService';
import { useWincForOneGiB } from '../../../hooks/useWincForOneGiB';
import TurboLogo from '../../TurboLogo';
import { wincPerCredit } from '../../../constants';

interface PaymentConfirmationPanelProps {
  usdAmount: number;
  onBack: () => void;
  onSuccess: () => void;
}

const PaymentConfirmationPanel: React.FC<PaymentConfirmationPanelProps> = ({ 
  usdAmount, 
  onBack, 
  onSuccess 
}) => {
  const stripe = useStripe();
  const wincForOneGiB = useWincForOneGiB();
  const { 
    address, 
    paymentIntent, 
    paymentInformation,
    promoCode,
    setPaymentIntentResult
  } = useStore();

  const [estimatedCredits, setEstimatedCredits] = useState<TurboWincForFiatResponse>();
  const [countdown, setCountdown] = useState<number>(5 * 60);
  const [paymentError, setPaymentError] = useState<string>('');
  const [sendingPayment, setSendingPayment] = useState<boolean>(false);

  const formatCountdown = (countdown: number) => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateEstimatedCredits = useCallback(async () => {
    if (!address) return;
    
    try {
      const response = await getWincForFiat({
        amount: USD(usdAmount),
        promoCode,
        destinationAddress: address,
      });
      setEstimatedCredits(response);
    } catch (e: unknown) {
      console.error(e);
      setEstimatedCredits(undefined);
    }
  }, [address, usdAmount, promoCode]);

  useEffect(() => {
    updateEstimatedCredits();
  }, [updateEstimatedCredits]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      let c = countdown - 1;
      if (c < 0) {
        c = 5 * 60;
        updateEstimatedCredits();
      }
      setCountdown(c);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  });

  const submitPayment = async () => {
    if (!stripe || !paymentIntent?.client_secret || !paymentInformation) {
      return;
    }

    setSendingPayment(true);
    setPaymentError('');

    try {
      const result = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: paymentInformation.paymentMethodId,
          receipt_email: paymentInformation.email,
        },
      );

      if (result.error) {
        console.error(result.error.message);
        setPaymentError(result.error.message || 'Payment failed');
      } else {
        setPaymentIntentResult(result);
        // Trigger balance refresh
        window.dispatchEvent(new CustomEvent('refresh-balance'));
        onSuccess();
      }
    } catch {
      setPaymentError('Payment processing failed. Please try again.');
    } finally {
      setSendingPayment(false);
    }
  };

  const actualPaymentAmount = estimatedCredits
    ? estimatedCredits.actualPaymentAmount / 100
    : 0;
  const originalAmount = usdAmount;

  const credits = estimatedCredits 
    ? ((Number(estimatedCredits.winc) || 0) / wincPerCredit)
    : 0;

  // Smart storage display - show in appropriate units
  const formatStorage = (gigabytes: number): string => {
    if (gigabytes >= 1) {
      return `${gigabytes.toFixed(2)} GiB`;
    } else if (gigabytes >= 0.001) {
      const mebibytes = gigabytes * 1024;
      return `${mebibytes.toFixed(1)} MiB`;
    } else if (gigabytes > 0) {
      const kibibytes = gigabytes * 1024 * 1024;
      return `${kibibytes.toFixed(0)} KiB`;
    } else {
      return '0 storage';
    }
  };

  const storageAmount = estimatedCredits && wincForOneGiB 
    ? (Number(estimatedCredits.winc) / Number(wincForOneGiB))
    : 0;

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-fg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <CheckCircle className="w-5 h-5 text-fg-muted" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Review Payment</h3>
          <p className="text-sm text-link">Confirm your credit card payment details</p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-fg-muted/5 to-fg-muted/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        
        {/* Order Summary */}
        <div className="bg-canvas p-6 rounded-lg mb-6">
          <div className="flex items-center gap-3 mb-4">
            <TurboLogo />
          </div>
          
          {estimatedCredits ? (
            <>
              <div className="flex flex-col items-center py-4 mb-4">
                <div className="text-4xl font-bold text-fg-muted mb-1">
                  {credits.toFixed(4)}
                </div>
                <div className="text-sm text-link">Credits</div>
                {storageAmount > 0 && (
                  <div className="text-xs text-link mt-1">
                    ≈ {formatStorage(storageAmount)} storage power
                  </div>
                )}
              </div>
              
              {/* Pricing Breakdown */}
              {actualPaymentAmount !== originalAmount && (
                <>
                  <div className="flex justify-between py-2 text-sm text-link border-t border-default">
                    <div>Subtotal:</div>
                    <div>${originalAmount.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between py-2 text-sm text-turbo-green border-t border-default">
                    <div>Discount:</div>
                    <div>-${(originalAmount - actualPaymentAmount).toFixed(2)}</div>
                  </div>
                </>
              )}
              
              <div className="flex justify-between pt-4 text-sm text-fg-muted border-t border-default font-medium">
                <div>Total:</div>
                <div>${actualPaymentAmount.toFixed(2)}</div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="text-xl font-bold text-red-400">
                Error calculating final price
              </div>
            </div>
          )}
        </div>

        {/* Quote Refresh */}
        <div className="flex justify-between items-center bg-surface px-6 py-3 text-center text-sm text-link rounded-lg mb-6">
          <div>
            Quote Updates in{' '}
            <span className="text-fg-muted">{formatCountdown(countdown)}</span>
          </div>
          <button
            className="flex items-center gap-1 text-fg-muted hover:text-fg-muted/80 transition-colors"
            onClick={() => {
              setCountdown(5 * 60);
              updateEstimatedCredits();
            }}
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Terms of Service Message */}
        <div className="text-center bg-surface/30 rounded-lg p-4 mb-6">
          <p className="text-xs text-link">
            By continuing, you agree to our{' '}
            <a 
              href="https://ardrive.io/tos-and-privacy/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-fg-muted hover:text-fg-muted/80 transition-colors"
            >
              Terms of Service
            </a>
          </p>
        </div>

        {/* Error Message */}
        {paymentError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="text-red-400 text-sm">{paymentError}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-default">
          <button
            className="text-sm text-link hover:text-fg-muted transition-colors"
            onClick={onBack}
            disabled={sendingPayment}
          >
            Back
          </button>
          <button
            disabled={sendingPayment || !estimatedCredits}
            className="px-8 py-3 rounded-lg bg-fg-muted text-black font-bold hover:bg-fg-muted/90 disabled:bg-surface disabled:text-link disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            onClick={submitPayment}
          >
            {sendingPayment ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              'Complete Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationPanel;