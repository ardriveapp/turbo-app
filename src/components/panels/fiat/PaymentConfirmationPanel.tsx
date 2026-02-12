import { TurboWincForFiatResponse, USD } from '@ardrive/turbo-sdk/web';
import { useStripe } from '@stripe/react-stripe-js';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Users } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { getWincForFiat } from '../../../services/paymentService';
import { useWincForOneGiB } from '../../../hooks/useWincForOneGiB';
import { wincPerCredit } from '../../../constants';
import { getWalletTypeLabel } from '../../../utils/addressValidation';
import CopyButton from '../../CopyButton';

interface PaymentConfirmationPanelProps {
  usdAmount: number;
  onBack: () => void;
  onSuccess: () => void;
  targetAddress: string; // NEW - address receiving credits
  targetWalletType: 'arweave' | 'ethereum' | 'solana'; // NEW - type of target wallet
}

const PaymentConfirmationPanel: React.FC<PaymentConfirmationPanelProps> = ({
  usdAmount,
  onBack,
  onSuccess,
  targetAddress,
  targetWalletType
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
    if (!targetAddress) return;

    try {
      const response = await getWincForFiat({
        amount: USD(usdAmount),
        promoCode,
        destinationAddress: targetAddress, // ✅ Use target address
      });
      setEstimatedCredits(response);
    } catch (e: unknown) {
      console.error(e);
      setEstimatedCredits(undefined);
    }
  }, [targetAddress, usdAmount, promoCode]);

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
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border border-border/20">
          <CheckCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Review Payment</h3>
          <p className="text-sm text-foreground/80">Confirm your credit card payment details</p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-card rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Show recipient info if funding another wallet */}
        {targetAddress && targetAddress !== address && (
          <div className="mb-6 bg-info/10 border border-info/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-info mb-2">
              <Users className="w-4 h-4" />
              <span className="font-medium text-sm">Credits will be delivered to:</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm text-info font-mono break-all flex-1 p-2 bg-card/50 rounded">
                {targetAddress}
              </code>
              <CopyButton textToCopy={targetAddress} />
            </div>
            <div className="text-xs text-info/80 mt-2">
              {getWalletTypeLabel(targetWalletType)} wallet
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-card p-6 rounded-2xl mb-6">
          {estimatedCredits ? (
            <>
              <div className="flex flex-col items-center py-4 mb-4">
                <div className="text-4xl font-bold text-foreground mb-1">
                  {credits.toFixed(4)}
                </div>
                <div className="text-sm text-foreground/80">Credits</div>
                {storageAmount > 0 && (
                  <div className="text-xs text-foreground/80 mt-1">
                    ≈ {formatStorage(storageAmount)} storage power
                  </div>
                )}
              </div>

              {/* Pricing Breakdown */}
              {actualPaymentAmount !== originalAmount && (
                <>
                  <div className="flex justify-between py-2 text-sm text-foreground/80 border-t border-border/20">
                    <div>Subtotal:</div>
                    <div>${originalAmount.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between py-2 text-sm text-success border-t border-border/20">
                    <div>Discount:</div>
                    <div>-${(originalAmount - actualPaymentAmount).toFixed(2)}</div>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4 text-sm text-foreground border-t border-border/20 font-medium">
                <div>Total:</div>
                <div>${actualPaymentAmount.toFixed(2)}</div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="text-xl font-bold text-error">
                Error calculating final price
              </div>
            </div>
          )}
        </div>

        {/* Quote Refresh */}
        <div className="flex justify-between items-center bg-card px-6 py-3 text-center text-sm text-foreground/80 rounded-2xl mb-6">
          <div>
            Quote Updates in{' '}
            <span className="text-foreground">{formatCountdown(countdown)}</span>
          </div>
          <button
            className="flex items-center gap-1 text-foreground hover:text-foreground/80 transition-colors"
            onClick={() => {
              setCountdown(5 * 60);
              updateEstimatedCredits();
            }}
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Terms of Service Message */}
        <div className="text-center bg-card/30 rounded-2xl p-4 mb-6">
          <p className="text-xs text-foreground/80">
            By continuing, you agree to our{' '}
            <a
              href="https://ardrive.io/tos-and-privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-foreground/80 transition-colors"
            >
              Terms of Service
            </a>
          </p>
        </div>

        {/* Error Message */}
        {paymentError && (
          <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-2xl">
            <div className="text-error text-sm">{paymentError}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-border/20">
          <button
            className="text-sm text-foreground/80 hover:text-foreground transition-colors"
            onClick={onBack}
            disabled={sendingPayment}
          >
            Back
          </button>
          <button
            disabled={sendingPayment || !estimatedCredits}
            className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:bg-card disabled:text-foreground/80 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
