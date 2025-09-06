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
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Gift className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Confirm Gift Payment</h3>
          <p className="text-sm text-link">
            Review your gift details and complete the payment
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        
        {/* Gift Details */}
        <div className="bg-surface rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h4 className="font-bold text-fg-muted mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-turbo-red" />
            Gift Details
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-canvas rounded-lg">
              <Mail className="w-5 h-5 text-turbo-red" />
              <div>
                <div className="text-xs text-link">Recipient</div>
                <div className="font-medium text-fg-muted">{recipientEmail}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-canvas rounded-lg">
              <Gift className="w-5 h-5 text-turbo-red" />
              <div>
                <div className="text-xs text-link">Amount</div>
                <div className="font-bold text-fg-muted text-lg">${usdAmount.toFixed(2)} USD</div>
              </div>
            </div>
            
            {giftMessage && (
              <div className="flex items-start gap-3 p-3 bg-canvas rounded-lg">
                <MessageSquare className="w-5 h-5 text-turbo-red mt-0.5" />
                <div>
                  <div className="text-xs text-link">Your Message</div>
                  <div className="font-medium text-fg-muted italic">"{giftMessage}"</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-surface rounded-lg p-4 mb-6">
          <h4 className="font-bold text-fg-muted mb-3">Payment Summary</h4>
          <div className="flex justify-between items-center">
            <span className="text-link">Total Amount:</span>
            <span className="font-bold text-fg-muted text-xl">${usdAmount.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="text-center bg-surface/30 rounded-lg p-4 mt-4 mb-6">
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

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={isProcessing}
            className="flex-1 py-3 px-6 rounded-lg border border-default text-link hover:text-fg-muted hover:border-turbo-red/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleConfirmPayment}
            disabled={isProcessing}
            className="flex-1 py-3 px-6 rounded-lg bg-turbo-red text-white font-bold hover:bg-turbo-red/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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