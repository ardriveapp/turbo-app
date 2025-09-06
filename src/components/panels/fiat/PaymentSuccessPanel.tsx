import { CheckCircle, ExternalLink, Upload, Zap, Globe, Share2, Clock } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { wincPerCredit, tokenLabels, SupportedTokenType } from '../../../constants';
import { useNavigate } from 'react-router-dom';

interface PaymentSuccessPanelProps {
  onComplete: () => void;
  // Optional crypto payment details
  cryptoAmount?: number;
  tokenType?: SupportedTokenType;
  transactionId?: string;
}

const PaymentSuccessPanel: React.FC<PaymentSuccessPanelProps> = ({ 
  onComplete, 
  cryptoAmount, 
  tokenType, 
  transactionId 
}) => {
  const { paymentIntentResult, creditBalance } = useStore();
  const navigate = useNavigate();

  // Determine if this is a crypto or fiat payment
  const isCryptoPayment = cryptoAmount && tokenType;

  // Extract payment details based on payment type
  const paymentAmount = isCryptoPayment 
    ? cryptoAmount
    : paymentIntentResult?.paymentIntent?.amount 
      ? paymentIntentResult.paymentIntent.amount / 100 
      : 0;
    
  const paymentId = isCryptoPayment 
    ? transactionId || ''
    : paymentIntentResult?.paymentIntent?.id || '';

  return (
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-green/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <CheckCircle className="w-5 h-5 text-turbo-green" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Payment Successful!</h3>
          <p className="text-sm text-link">Your credits have been added to your account</p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-green/5 to-turbo-green/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        
        {/* Success Icon and Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-turbo-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-turbo-green" />
          </div>
          <h4 className="text-2xl font-bold text-turbo-green mb-2">Payment Complete!</h4>
          <p className="text-link">Your credits are now available in your account.</p>
        </div>

        {/* Payment Summary */}
        <div className="bg-canvas rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-link">Payment Amount:</span>
              <span className="font-medium text-fg-muted">
                {isCryptoPayment 
                  ? `${paymentAmount} ${tokenLabels[tokenType!]}`
                  : `$${paymentAmount.toFixed(2)}`
                }
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-link">Current Balance:</span>
              <span className="font-bold text-turbo-green text-lg">
                {creditBalance.toLocaleString()} Credits
              </span>
            </div>
            
            {paymentId && (
              <div className="pt-4 border-t border-default">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-link">
                    {isCryptoPayment ? 'Transaction ID:' : 'Payment ID:'}
                  </span>
                  <span className="font-mono text-xs text-fg-muted break-all">
                    {paymentId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps - Call to Actions */}
        <div className="bg-surface/50 rounded-lg p-4 mb-6">
          <h5 className="font-medium text-fg-muted mb-4">What's Next?</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                onComplete();
                navigate('/upload');
              }}
              className="flex items-center gap-3 p-3 bg-canvas hover:bg-surface transition-colors rounded-lg border border-default hover:border-turbo-red/30 text-left"
            >
              <div className="w-8 h-8 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4 text-turbo-red" />
              </div>
              <div>
                <div className="text-sm font-medium text-fg-muted">Upload Files</div>
                <div className="text-xs text-link">Store files permanently</div>
              </div>
            </button>

            <button
              onClick={() => {
                onComplete();
                navigate('/deploy');
              }}
              className="flex items-center gap-3 p-3 bg-canvas hover:bg-surface transition-colors rounded-lg border border-default hover:border-turbo-red/30 text-left"
            >
              <div className="w-8 h-8 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-turbo-red" />
              </div>
              <div>
                <div className="text-sm font-medium text-fg-muted">Deploy Site</div>
                <div className="text-xs text-link">Launch your app or site</div>
              </div>
            </button>

            <button
              onClick={() => {
                onComplete();
                navigate('/domains');
              }}
              className="flex items-center gap-3 p-3 bg-canvas hover:bg-surface transition-colors rounded-lg border border-default hover:border-turbo-red/30 text-left"
            >
              <div className="w-8 h-8 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-turbo-red" />
              </div>
              <div>
                <div className="text-sm font-medium text-fg-muted">Register Domain</div>
                <div className="text-xs text-link">Get a permanent domain name</div>
              </div>
            </button>

            <div className="flex items-center gap-3 p-3 bg-canvas rounded-lg border border-default opacity-60 text-left">
              <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                <Share2 className="w-4 h-4 text-link" />
              </div>
              <div>
                <div className="text-sm font-medium text-link">Share Credits</div>
                <div className="text-xs text-link flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs text-link mb-2">
            Need help? Contact our support team
          </p>
          <a
            href="mailto:support@ardrive.io"
            className="text-xs text-turbo-red hover:text-turbo-red/80 transition-colors inline-flex items-center gap-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            support@ardrive.io
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPanel;