import { TurboWincForFiatResponse, USD } from '@ardrive/turbo-sdk/web';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { StripeCardElementOptions } from '@stripe/stripe-js';
import { FC, useCallback, useEffect, useState } from 'react';
import { isEmail } from 'validator';
import { CircleX, RefreshCw, CreditCard, Users } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { useTheme } from '../../../hooks/useTheme';
import useCountries from '../../../hooks/useCountries';
import { useWincForOneGiB } from '../../../hooks/useWincForOneGiB';
import { getPaymentIntent, getWincForFiat } from '../../../services/paymentService';
import FormEntry from '../../FormEntry';
import { wincPerCredit } from '../../../constants';
import { getWalletTypeLabel } from '../../../utils/addressValidation';
import CopyButton from '../../CopyButton';

interface PaymentDetailsPanelProps {
  usdAmount: number;
  onBack: () => void;
  onNext: () => void;
  targetAddress: string; // NEW - address receiving credits
  targetWalletType: 'arweave' | 'ethereum' | 'solana'; // NEW - type of target wallet
}

const isValidPromoCode = async (
  paymentAmount: number,
  promoCode: string,
  destinationAddress: string,
) => {
  try {
    const response = await getWincForFiat({
      amount: USD(paymentAmount / 100),
      promoCode,
      destinationAddress,
    });
    return response.adjustments.length > 0;
  } catch {
    return false;
  }
};

const PaymentDetailsPanel: FC<PaymentDetailsPanelProps> = ({ usdAmount, onBack, onNext, targetAddress, targetWalletType }) => {
  const countries = useCountries();
  const wincForOneGiB = useWincForOneGiB();
  const { address } = useStore();
  const { isLight } = useTheme();

  const {
    setPaymentIntent,
    setPaymentInformation,
    promoCode,
    setPromoCode,
  } = useStore();

  const [localPromoCode, setLocalPromoCode] = useState<string>('');
  const [promoCodeError, setPromoCodeError] = useState<string>('');

  const stripe = useStripe();
  const elements = useElements();

  const [estimatedCredits, setEstimatedCredits] = useState<TurboWincForFiatResponse>();

  const [name, setName] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [keepMeUpdated, setKeepMeUpdated] = useState<boolean>(false);

  const [nameError, setNameError] = useState<string>('');
  const [cardError, setCardError] = useState<string>('');
  const [countryError, setCountryError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const [countdown, setCountdown] = useState<number>(5 * 60);
  const [paymentMethodError, setPaymentMethodError] = useState<string>('');

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
        promoCode: promoCode,
        destinationAddress: targetAddress, // ✅ Use target address instead of connected wallet
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

  const isValid =
    name.trim().length > 0 &&
    estimatedCredits &&
    cardError === '' &&
    country.trim().length > 0 &&
    (!email || isEmail(email));

  const cardElementOptions: StripeCardElementOptions = {
    style: {
      base: {
        color: isLight ? '#23232D' : '#ededed', // text-foreground (theme-aware)
        fontSize: '16px',
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        '::placeholder': {
          color: isLight ? '#6C6C87' : '#A3A3AD', // text-foreground/80 (theme-aware)
        },
      },
    },
    hidePostalCode: true,
  };

  const actualPaymentAmount = estimatedCredits
    ? (estimatedCredits.actualPaymentAmount / 100).toFixed(2)
    : '0';

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

  const adjustment =
    estimatedCredits?.adjustments && estimatedCredits.adjustments.length > 0
      ? estimatedCredits.adjustments[0]
      : undefined;

  const discountAmount = adjustment
    ? `(${100 - adjustment.operatorMagnitude * 100}% discount applied)`
    : undefined;

  const handleSubmit = async () => {
    const cardElement = elements?.getElement(CardElement);

    if (name && country && cardElement && stripe) {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name,
          email: keepMeUpdated ? email : undefined,
        },
      });

      if (error) {
        console.error(error);
        setPaymentMethodError(error.message || 'Payment method creation failed');
      } else if (paymentMethod) {
        setPaymentInformation({
          paymentMethodId: paymentMethod.id,
          email,
        });
        onNext();
      }
    }
  };

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border border-border/20">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Payment Details</h3>
          <p className="text-sm text-foreground/80">We do not save credit card information. See our T&C for more info.</p>
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

        {/* Credits Summary */}
        <div className="grid grid-cols-2 mb-8">
          {estimatedCredits ? (
            <div className="flex flex-col">
              <div className="text-2xl font-bold text-foreground">
                {((Number(estimatedCredits?.winc ?? 0)) / wincPerCredit).toFixed(4)} Credits
              </div>
              <div className="text-sm text-foreground/80">
                ${actualPaymentAmount}{' '}
                {discountAmount && (
                  <span className="text-foreground/80">{discountAmount}</span>
                )}
              </div>
              {storageAmount > 0 && (
                <div className="text-xs text-foreground/80 mt-1">
                  ≈ {formatStorage(storageAmount)} storage power
                </div>
              )}
            </div>
          ) : (
            <div className="text-base font-bold text-error">
              Error calculating price
            </div>
          )}
          <div className="flex flex-col items-center bg-card px-6 py-3 text-center text-sm text-foreground/80 rounded-2xl">
            <div>
              Quote Updates in{' '}
              <span className="text-foreground">
                {formatCountdown(countdown)}
              </span>
            </div>
            <button
              className="flex items-center gap-1 mt-1 text-foreground hover:text-foreground/80 transition-colors"
              onClick={() => {
                setCountdown(5 * 60);
                updateEstimatedCredits();
              }}
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-6">
          <FormEntry name="name" label="Name on Card *" errorText={nameError}>
            <input
              className="w-full bg-card border border-border/20 px-4 py-3 text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              type="text"
              name="name"
              value={name}
              onChange={(e) => {
                const v = e.target.value ?? '';
                const cleaned = v.replace(/[^a-zA-Z\s]/g, '');
                setName(cleaned);
                setNameError(
                  cleaned.length === 0 ? 'Name is required' : '',
                );
              }}
            />
          </FormEntry>

          <FormEntry name="card" label="Credit Card *" errorText={cardError}>
            <CardElement
              options={cardElementOptions}
              className="w-full bg-card border border-border/20 px-4 py-3 text-foreground rounded-2xl"
              onChange={(e) => {
                setCardError(e.error?.message || '');
              }}
            />
          </FormEntry>

          <FormEntry name="country" label="Country *" errorText={countryError}>
            <select
              className="w-full bg-card border border-border/20 px-4 py-3 text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCountryError(
                  !e.target.value ? 'Country is required' : '',
                );
              }}
            >
              <option value="">Select Country</option>
              {countries?.data?.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </FormEntry>

          {/* Promo Code Section */}
          {promoCode ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-foreground/80">Promo Code</label>
              <div className="flex items-center gap-2 text-sm text-success">
                Promo code successfully applied.
                <button
                  className="text-foreground hover:text-foreground/80"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (targetAddress) {
                      try {
                        // Reset payment intent to one without promo code
                        const newPaymentIntent = await getPaymentIntent(
                          targetAddress,
                          usdAmount * 100,
                          targetWalletType === 'ethereum' ? 'ethereum' :
                          targetWalletType === 'solana' ? 'solana' : 'arweave',
                        );
                        setPaymentIntent(newPaymentIntent.paymentSession);
                        setPromoCode(undefined);
                        setLocalPromoCode('');
                        setPromoCodeError('');
                      } catch (e: unknown) {
                        console.error(e);
                        setPromoCodeError('Error removing promo code, please try again.');
                      }
                    }
                  }}
                >
                  <CircleX className="w-4 h-4" />
                </button>
              </div>
              {promoCodeError && (
                <div className="text-xs text-error">{promoCodeError}</div>
              )}
            </div>
          ) : (
            <FormEntry name="promoCode" label="Promo Code" errorText={promoCodeError}>
              <div className="relative">
                <input
                  className="peer w-full bg-card border border-border/20 px-4 py-3 pr-16 text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  type="text"
                  name="promoCode"
                  value={localPromoCode}
                  onChange={(e) => {
                    const v = e.target.value ?? '';
                    const cleaned = v.replace(/[^a-zA-Z0-9\s]/g, '');
                    setLocalPromoCode(cleaned);
                    setPromoCodeError('');
                  }}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-foreground hover:text-foreground/80 transition-colors"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (targetAddress && localPromoCode && localPromoCode.length > 0) {
                      if (await isValidPromoCode(usdAmount * 100, localPromoCode, targetAddress)) {
                        try {
                          const newPaymentIntent = await getPaymentIntent(
                            targetAddress,
                            usdAmount * 100,
                            targetWalletType === 'ethereum' ? 'ethereum' :
                            targetWalletType === 'solana' ? 'solana' : 'arweave',
                            localPromoCode,
                          );
                          setPaymentIntent(newPaymentIntent.paymentSession);
                          setPromoCode(localPromoCode);
                        } catch (e: unknown) {
                          console.error(e);
                          setPromoCodeError('Error applying promo code, please try again.');
                        }
                      } else {
                        setLocalPromoCode('');
                        setPromoCodeError('Promo code is invalid or expired.');
                      }
                    }
                  }}
                >
                  Apply
                </button>
              </div>
            </FormEntry>
          )}

          {/* Email Section */}
          <FormEntry name="email" label="Email (optional - for receipt)" errorText={emailError}>
            <input
              type="email"
              className="w-full bg-card border border-border/20 px-4 py-3 text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              name="email"
              value={email}
              onChange={(e) => {
                const newEmail = e.target.value;
                setEmail(newEmail);
                setEmailError(
                  newEmail.length === 0 || isEmail(newEmail)
                    ? ''
                    : 'Please enter a valid email address.',
                );
              }}
            />
          </FormEntry>

          {email && (
            <div className="flex items-center">
              <input
                disabled={!email}
                type="checkbox"
                className="w-4 h-4 bg-card border-2 border-border/20 rounded focus:ring-0 checked:bg-card checked:border-border/20 accent-white transition-colors mr-2"
                id="keepMeUpdatedCheckbox"
                checked={keepMeUpdated}
                onChange={(e) => setKeepMeUpdated(e.target.checked)}
              />
              <label className="text-sm text-foreground/80" htmlFor="keepMeUpdatedCheckbox">
                Keep me up to date on news and promotions.
              </label>
            </div>
          )}
        </div>

        {/* Error Message */}
        {paymentMethodError && (
          <div className="mt-4 text-sm text-error">
            {paymentMethodError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border/20">
          <button
            className="text-sm text-foreground/80 hover:text-foreground transition-colors"
            onClick={onBack}
          >
            Back
          </button>
          <button
            disabled={!isValid}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:bg-card disabled:text-foreground/80 disabled:cursor-not-allowed transition-colors"
            onClick={handleSubmit}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsPanel;
