import { FC } from 'react';
import { CheckCircle, Gift, Mail, Send, MessageSquare } from 'lucide-react';

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
        <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Gift Sent Successfully!</h3>
          <p className="text-sm text-foreground/80">
            Your gift has been processed and will be delivered shortly
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gradient-to-br from-success/5 to-success/3 rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Success Message */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success/20 rounded-xl mb-4">
            <Gift className="w-8 h-8 text-success" />
          </div>
          <h4 className="text-xl font-heading font-bold text-foreground mb-2">
            ${usdAmount.toFixed(2)} Gift Sent!
          </h4>
          <p className="text-foreground/80">
            Your gift has been sent to <strong>{recipientEmail}</strong>
          </p>
        </div>

        {/* Gift Details */}
        <div className="bg-card rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h5 className="font-heading font-bold text-foreground mb-4">Gift Details</h5>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-success" />
              <div>
                <div className="text-xs text-foreground/80">Recipient will receive an email at:</div>
                <div className="font-medium text-foreground">{recipientEmail}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-success" />
              <div>
                <div className="text-xs text-foreground/80">Gift Amount:</div>
                <div className="font-bold text-foreground">${usdAmount.toFixed(2)} USD in Credits</div>
              </div>
            </div>

            {giftMessage && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <div className="text-xs text-foreground/80">Your Message:</div>
                  <div className="font-medium text-foreground italic">"{giftMessage}"</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-card rounded-2xl p-4 mb-6">
          <h5 className="font-heading font-bold text-foreground mb-3">What happens next?</h5>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
              <span className="text-foreground/80">Recipient receives an email with redemption instructions</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
              <span className="text-foreground/80">They can redeem with any wallet on our Redeem page</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
              <span className="text-foreground/80">Credits are immediately available after redemption</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 py-3 px-8 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
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
