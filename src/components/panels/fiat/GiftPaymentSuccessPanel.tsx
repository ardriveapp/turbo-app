import { FC } from 'react';
import { CheckCircle, Gift, Mail, ArrowRight, Send, MessageSquare } from 'lucide-react';

interface GiftPaymentSuccessPanelProps {
  usdAmount: number;
  recipientEmail: string;
  giftMessage: string;
  onContinue: () => void;
}

const GiftPaymentSuccessPanel: FC<GiftPaymentSuccessPanelProps> = ({
  usdAmount,
  recipientEmail,
  giftMessage,
  onContinue,
}) => {
  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-green/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <CheckCircle className="w-5 h-5 text-turbo-green" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Gift Sent Successfully!</h3>
          <p className="text-sm text-link">
            Your gift has been processed and will be delivered shortly
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gradient-to-br from-turbo-green/5 to-turbo-green/3 rounded-xl border border-default p-6 mb-6">
        
        {/* Success Message */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-turbo-green/20 rounded-xl mb-4">
            <Gift className="w-8 h-8 text-turbo-green" />
          </div>
          <h4 className="text-xl font-bold text-fg-muted mb-2">
            ${usdAmount.toFixed(2)} Gift Sent!
          </h4>
          <p className="text-link">
            Your gift has been sent to <strong>{recipientEmail}</strong>
          </p>
        </div>

        {/* Gift Details */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h5 className="font-bold text-fg-muted mb-4">Gift Details</h5>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-turbo-green" />
              <div>
                <div className="text-xs text-link">Recipient will receive an email at:</div>
                <div className="font-medium text-fg-muted">{recipientEmail}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-turbo-green" />
              <div>
                <div className="text-xs text-link">Gift Amount:</div>
                <div className="font-bold text-fg-muted">${usdAmount.toFixed(2)} USD in Turbo Credits</div>
              </div>
            </div>
            
            {giftMessage && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-turbo-green mt-0.5" />
                <div>
                  <div className="text-xs text-link">Your Message:</div>
                  <div className="font-medium text-fg-muted italic">"{giftMessage}"</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-canvas rounded-lg p-4 mb-6">
          <h5 className="font-bold text-fg-muted mb-3">What happens next?</h5>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-turbo-green rounded-full mt-2 flex-shrink-0" />
              <span className="text-link">Recipient receives an email with redemption instructions</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-turbo-green rounded-full mt-2 flex-shrink-0" />
              <span className="text-link">They can redeem with any wallet on our Redeem page</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-turbo-green rounded-full mt-2 flex-shrink-0" />
              <span className="text-link">Credits are immediately available after redemption</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 py-3 px-8 rounded-lg bg-turbo-red text-white font-bold hover:bg-turbo-red/90 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send Another Gift
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftPaymentSuccessPanel;