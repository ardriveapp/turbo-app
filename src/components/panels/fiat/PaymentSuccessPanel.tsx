import { CheckCircle, ExternalLink, Upload, Zap, Globe, Share2, Clock, Mail } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { tokenLabels, SupportedTokenType } from '../../../constants';
import { useNavigate } from 'react-router-dom';

interface PaymentSuccessPanelProps {
  onComplete: () => void;
  // Optional crypto payment details
  cryptoAmount?: number;
  tokenType?: SupportedTokenType;
  transactionId?: string;
  creditsReceived?: number;
}

const PaymentSuccessPanel: React.FC<PaymentSuccessPanelProps> = ({ 
  onComplete, 
  cryptoAmount, 
  tokenType, 
  transactionId,
  creditsReceived
}) => {
  const { paymentIntentResult, creditBalance } = useStore();
  const navigate = useNavigate();

  // Get appropriate blockchain explorer URL
  const getExplorerUrl = (txId: string, tokenType?: SupportedTokenType): string | null => {
    if (!tokenType) return null;
    
    switch (tokenType) {
      case 'ethereum':
        return `https://etherscan.io/tx/${txId}`;
      case 'base-eth':
        return `https://basescan.org/tx/${txId}`;
      case 'arweave':
        return `https://viewblock.io/arweave/tx/${txId}`;
      case 'ario':
        return `https://www.ao.link/#/message/${txId}`;
      case 'solana':
        return `https://solscan.io/tx/${txId}`;
      default:
        return null;
    }
  };

  // Format transaction ID for display (mobile-friendly)
  const formatTxId = (txId: string, mobile: boolean = false): string => {
    if (!mobile || txId.length <= 20) return txId;
    return `${txId.substring(0, 10)}...${txId.substring(txId.length - 10)}`;
  };

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
      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-green/5 to-turbo-green/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        
        {/* Success Icon and Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-turbo-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-turbo-green" />
          </div>
          <h4 className="text-2xl font-bold text-turbo-green mb-2">Payment Complete!</h4>
          <p className="text-link">
            {isCryptoPayment && tokenType === 'arweave' 
              ? 'Your account will be credited in 15-30 minutes.'
              : 'Your credits are now available in your account.'
            }
          </p>
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
            
            {creditsReceived && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-link">Credits Received:</span>
                <span className="font-bold text-turbo-green text-lg">
                  +{creditsReceived.toFixed(4)} Credits
                </span>
              </div>
            )}
            
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg-muted">
                      <span className="hidden sm:inline">{paymentId}</span>
                      <span className="sm:hidden">{formatTxId(paymentId, true)}</span>
                    </span>
                    {isCryptoPayment && getExplorerUrl(paymentId, tokenType) && (
                      <a
                        href={getExplorerUrl(paymentId, tokenType)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link hover:text-fg-muted transition-colors"
                        title="View on blockchain explorer"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
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
              className="flex items-center gap-3 p-3 bg-canvas hover:bg-surface transition-colors rounded-lg border border-default hover:border-turbo-yellow/30 text-left"
            >
              <div className="w-8 h-8 bg-turbo-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-turbo-yellow" />
              </div>
              <div>
                <div className="text-sm font-medium text-fg-muted">Register Domain</div>
                <div className="text-xs text-link">Get a permanent domain name</div>
              </div>
            </button>

            <button
              onClick={() => {
                onComplete();
                navigate('/share');
              }}
              className="flex items-center gap-3 p-3 bg-canvas hover:bg-surface transition-colors rounded-lg border border-default hover:border-fg-muted/30 text-left w-full"
            >
              <div className="w-8 h-8 bg-fg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Share2 className="w-4 h-4 text-fg-muted" />
              </div>
              <div>
                <div className="text-sm font-medium text-fg-muted">Share Credits</div>
                <div className="text-xs text-link">Transfer credits to other wallets</div>
              </div>
            </button>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs text-link mb-2">
            Need help? Contact our support team
          </p>
          <a
            href="mailto:support@ardrive.io"
            className="text-xs text-fg-muted hover:text-fg-muted/80 transition-colors inline-flex items-center gap-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            support@ardrive.io
            <Mail className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPanel;