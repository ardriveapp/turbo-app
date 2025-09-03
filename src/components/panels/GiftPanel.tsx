import { useState } from 'react';
import { useCreditsForFiat } from '../../hooks/useCreditsForFiat';
import useDebounce from '../../hooks/useDebounce';
import { defaultUSDAmount, minUSDAmount, maxUSDAmount } from '../../constants';
import { useStore } from '../../store/useStore';
import { Gift, Mail, MessageSquare, Send, CheckCircle, Heart, Loader2, Lock } from 'lucide-react';
import { getGiftPaymentIntent } from '../../services/paymentService';
import GiftPaymentDetailsPanel from './fiat/GiftPaymentDetailsPanel';
import GiftPaymentConfirmationPanel from './fiat/GiftPaymentConfirmationPanel';
import GiftPaymentSuccessPanel from './fiat/GiftPaymentSuccessPanel';

export default function GiftPanel() {
  const { 
    paymentIntent,
    paymentInformation,
    paymentIntentResult,
    setPaymentAmount,
    setPaymentIntent,
    clearAllPaymentState
  } = useStore();
  
  const [usdAmount, setUsdAmount] = useState(defaultUSDAmount);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Gift flow state
  const [giftFlowStep, setGiftFlowStep] = useState<'form' | 'details' | 'confirmation' | 'success'>('form');
  
  const debouncedUsdAmount = useDebounce(usdAmount);
  const [credits] = useCreditsForFiat(debouncedUsdAmount, setErrorMessage);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = Number(e.target.value);
    if (amount > maxUSDAmount) {
      setUsdAmount(maxUSDAmount);
      return;
    }
    if (amount < 0) {
      setUsdAmount(0);
      return;
    }
    setUsdAmount(amount);
  };

  const handleSendGift = async () => {
    if (!canSubmit) return;
    
    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      // Create gift payment intent
      const result = await getGiftPaymentIntent({
        amount: usdAmount,
        recipientEmail,
        giftMessage: giftMessage || undefined,
      });
      
      // Store payment intent and amount in store
      setPaymentIntent(result.paymentSession);
      setPaymentAmount(usdAmount);
      
      // Move to payment details step
      setGiftFlowStep('details');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create gift payment';
      setErrorMessage(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canSubmit = credits && recipientEmail && isValidEmail(recipientEmail) && usdAmount >= minUSDAmount;

  // Handle flow step rendering
  if (giftFlowStep === 'details') {
    return (
      <GiftPaymentDetailsPanel 
        usdAmount={usdAmount}
        recipientEmail={recipientEmail}
        giftMessage={giftMessage}
        paymentIntent={paymentIntent}
        onBack={() => {
          setGiftFlowStep('form');
          clearAllPaymentState();
        }}
        onNext={() => setGiftFlowStep('confirmation')}
      />
    );
  }

  if (giftFlowStep === 'confirmation') {
    return (
      <GiftPaymentConfirmationPanel 
        usdAmount={usdAmount}
        recipientEmail={recipientEmail}
        giftMessage={giftMessage}
        paymentIntent={paymentIntent}
        onBack={() => setGiftFlowStep('details')}
        onSuccess={() => setGiftFlowStep('success')}
      />
    );
  }

  if (giftFlowStep === 'success') {
    return (
      <GiftPaymentSuccessPanel 
        usdAmount={usdAmount}
        recipientEmail={recipientEmail}
        giftMessage={giftMessage}
        onContinue={() => {
          setGiftFlowStep('form');
          clearAllPaymentState();
          // Reset form
          setUsdAmount(defaultUSDAmount);
          setRecipientEmail('');
          setGiftMessage('');
        }}
      />
    );
  }

  return (
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Gift className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Send Gift</h3>
          <p className="text-sm text-link">
            Send credits to anyone via email - perfect for onboarding new users to Arweave
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6 mb-6">

      {/* Amount Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Gift Amount (USD)</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fg-muted text-lg font-medium">$</div>
          <input
            type="number"
            value={usdAmount}
            onChange={handleAmountChange}
            className="w-full p-3 pl-8 rounded-lg border border-default bg-canvas text-fg-muted font-medium text-lg focus:border-turbo-red focus:outline-none transition-colors"
            placeholder="10.00"
            min={minUSDAmount}
            max={maxUSDAmount}
          />
        </div>
        {credits && (
          <div className="text-sm text-link mt-2">
            Recipient will receive: {credits.toLocaleString()} Credits
          </div>
        )}
      </div>

      {/* Recipient Email */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Recipient Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fg-disabled" />
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full p-3 pl-11 rounded-lg border border-default bg-canvas text-fg-muted focus:border-turbo-red focus:outline-none transition-colors"
            placeholder="recipient@example.com"
          />
        </div>
      </div>

      {/* Gift Message */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Gift Message (Optional)</label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-fg-disabled" />
          <textarea
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value)}
            className="w-full p-3 pl-11 rounded-lg border border-default bg-canvas text-fg-muted min-h-[100px] focus:border-turbo-red focus:outline-none transition-colors resize-none"
            placeholder="Add a personal message..."
            maxLength={500}
          />
        </div>
        <div className="text-xs text-link mt-1">
          {giftMessage.length}/500 characters
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="text-error text-sm mb-4">{errorMessage}</div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSendGift}
        className="w-full py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={!canSubmit || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Gift...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send Gift
          </>
        )}
      </button>

      {/* Stripe Security Notice */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-link">
        <Lock className="w-3.5 h-3.5" />
        <span>Secure payment powered by Stripe</span>
      </div>
      </div>

      {/* Gift Process Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Email Delivery</h4>
              <p className="text-xs text-link">
                Recipient gets an email with redemption instructions and gift code.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Never Expires</h4>
              <p className="text-xs text-link">
                Credits remain available indefinitely once redeemed by recipient.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Personal Touch</h4>
              <p className="text-xs text-link">
                Include a custom message to make your gift more meaningful.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}