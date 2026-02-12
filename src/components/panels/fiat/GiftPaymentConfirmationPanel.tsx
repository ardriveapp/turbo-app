import { FC, useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { ArrowLeft, Gift, Mail, MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../../../store/useStore';

interface GiftPaymentConfirmationPanelProps {
  usdAmount: number;
  recipientEmail: string;
  giftMessage: string;
  paymentIntent: any;
  onBack: () => void;
  onSuccess: () => void;
}

const GiftPaymentConfirmationPanel: FC<GiftPaymentConfirmationPanelProps> = ({
  usdAmount,
  recipientEmail,
  giftMessage,
  paymentIntent,
  onBack,
  onSuccess,
}) => {
  const stripe = useStripe();
  const { paymentInformation } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleConfirmPayment = async () => {
    if (!stripe || !paymentIntent || !paymentInformation?.paymentMethodId) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Confirm the payment intent using stored payment method
      const { error: stripeError } = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: paymentInformation.paymentMethodId,
          receipt_email: paymentInformation.email,
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return;
      }

      // Payment successful
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Confirm Gift Payment</h3>
          <p className="text-sm text-foreground/80">
            Review your gift details and complete the payment
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/3 rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Gift Details */}
        <div className="bg-card rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h4 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Gift Details
          </h4>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-card rounded-2xl">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-foreground/80">Recipient</div>
                <div className="font-medium text-foreground">{recipientEmail}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-card rounded-2xl">
              <Gift className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-foreground/80">Amount</div>
                <div className="font-bold text-foreground text-lg">${usdAmount.toFixed(2)} USD</div>
              </div>
            </div>

            {giftMessage && (
              <div className="flex items-start gap-3 p-3 bg-card rounded-2xl">
                <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs text-foreground/80">Your Message</div>
                  <div className="font-medium text-foreground italic">"{giftMessage}"</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-card rounded-2xl p-4 mb-6">
          <h4 className="font-heading font-bold text-foreground mb-3">Payment Summary</h4>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80">Total Amount:</span>
            <span className="font-bold text-foreground text-xl">${usdAmount.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 text-error">
              <XCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="text-center bg-card/30 rounded-2xl p-4 mt-4 mb-6">
          <p className="text-xs text-foreground/80">
            By continuing, you agree to our{' '}
            <a
              href="https://ardrive.io/tos-and-privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Terms of Service
            </a>
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={isProcessing}
            className="flex-1 py-3 px-6 rounded-full border border-border/20 text-foreground/80 hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleConfirmPayment}
            disabled={isProcessing}
            className="flex-1 py-3 px-6 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Gift...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Send Gift
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftPaymentConfirmationPanel;
