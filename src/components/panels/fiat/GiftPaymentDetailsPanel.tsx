import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { StripeCardElementOptions } from '@stripe/stripe-js';
import { FC, useState } from 'react';
import { isEmail } from 'validator';
import { CircleX, CreditCard, Gift, Loader2 } from 'lucide-react';
import useCountries from '../../../hooks/useCountries';
import { useStore } from '../../../store/useStore';

interface GiftPaymentDetailsPanelProps {
  usdAmount: number;
  recipientEmail: string;
  giftMessage: string;
  paymentIntent: any;
  onBack: () => void;
  onNext: () => void;
}

const GiftPaymentDetailsPanel: FC<GiftPaymentDetailsPanelProps> = ({ 
  usdAmount, 
  recipientEmail, 
  giftMessage, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  paymentIntent, 
  onBack, 
  onNext 
}) => {
  const countries = useCountries();
  const stripe = useStripe();
  const elements = useElements();
  const { setPaymentInformation } = useStore();

  const [name, setName] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [keepMeUpdated, setKeepMeUpdated] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [nameError, setNameError] = useState<string>('');
  const [cardError, setCardError] = useState<string>('');
  const [countryError, setCountryError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const validateAndProceed = async () => {
    // Reset errors
    setNameError('');
    setCardError('');
    setCountryError('');
    setEmailError('');

    let hasErrors = false;

    // Validate name
    if (!name.trim()) {
      setNameError('Name is required');
      hasErrors = true;
    }

    // Validate country
    if (!country) {
      setCountryError('Country is required');
      hasErrors = true;
    }

    // Validate email (optional, but if provided must be valid)
    if (email && !isEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasErrors = true;
    }

    // Validate card
    if (!elements) {
      setCardError('Card information is required');
      hasErrors = true;
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardError('Card information is required');
      hasErrors = true;
      return;
    }

    if (hasErrors) return;

    setIsProcessing(true);

    try {
      // Create Stripe payment method
      const { error, paymentMethod } = await stripe!.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name,
          email: email || undefined,
        },
      });

      if (error) {
        setCardError(error.message || 'Failed to process card information');
        return;
      }

      // Store payment information in store (only supported fields)
      setPaymentInformation({
        paymentMethodId: paymentMethod.id,
        email: email || undefined,
      });

      // Store additional gift info separately for confirmation display
      (window as any).__GIFT_SENDER_INFO__ = {
        name,
        country,
        keepMeUpdated,
      };

      onNext();
    } catch {
      setCardError('Failed to process payment information');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions: StripeCardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ededed',
        backgroundColor: '#171717',
        '::placeholder': {
          color: '#A3A3AD',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Gift className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Payment Details</h3>
          <p className="text-sm text-link">
            Enter your payment information to send the gift
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        
        {/* Gift Summary */}
        <div className="bg-surface rounded-lg p-4 mb-6">
          <h4 className="font-bold text-fg-muted mb-3">Gift Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-link">Amount:</span>
              <span className="font-medium">${usdAmount.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-link">Recipient:</span>
              <span className="font-medium">{recipientEmail}</span>
            </div>
            {giftMessage && (
              <div className="flex justify-between">
                <span className="text-link">Message:</span>
                <span className="font-medium italic">"{giftMessage}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-link mb-2">
              Cardholder Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-lg border border-default bg-canvas text-fg-muted focus:border-turbo-red focus:outline-none"
              placeholder="Enter your full name"
            />
            {nameError && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <CircleX className="w-4 h-4" />
                {nameError}
              </div>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-link mb-2">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full p-3 rounded-lg border border-default bg-canvas text-fg-muted focus:border-turbo-red focus:outline-none"
            >
              <option value="">Select your country</option>
              {countries?.data?.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {countryError && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <CircleX className="w-4 h-4" />
                {countryError}
              </div>
            )}
          </div>

          {/* Card */}
          <div>
            <label className="block text-sm font-medium text-link mb-2">
              Card Information <span className="text-red-400">*</span>
            </label>
            <div className="p-3 rounded-lg border border-default bg-canvas">
              <CardElement options={cardElementOptions} onChange={(e) => {
                if (e.error) {
                  setCardError(e.error.message);
                } else {
                  setCardError('');
                }
              }} />
            </div>
            {cardError && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <CircleX className="w-4 h-4" />
                {cardError}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-link mb-2">
              Email Address (optional - for receipt)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg border border-default bg-canvas text-fg-muted focus:border-turbo-red focus:outline-none"
              placeholder="your.email@example.com"
            />
            {emailError && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <CircleX className="w-4 h-4" />
                {emailError}
              </div>
            )}
          </div>

          {/* Newsletter Opt-in */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="newsletter"
              checked={keepMeUpdated}
              onChange={(e) => setKeepMeUpdated(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="newsletter" className="text-sm text-link">
              Keep me updated on Turbo features and improvements
            </label>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-default">
          <button
            className="text-sm text-link hover:text-fg-muted transition-colors"
            onClick={onBack}
          >
            Back
          </button>
          <button
            onClick={validateAndProceed}
            disabled={isProcessing}
            className="py-3 px-6 rounded-lg bg-turbo-red text-white font-bold hover:bg-turbo-red/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Continue to Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftPaymentDetailsPanel;