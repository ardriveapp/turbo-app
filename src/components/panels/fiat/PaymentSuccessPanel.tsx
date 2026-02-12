import { CheckCircle, ExternalLink, Upload, Zap, Globe, Share2, Mail, Users } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { tokenLabels, SupportedTokenType } from '../../../constants';
import { useNavigate } from 'react-router-dom';
import CopyButton from '../../CopyButton';

interface PaymentSuccessPanelProps {
  onComplete: () => void;
  // Optional crypto payment details
  cryptoAmount?: number;
  tokenType?: SupportedTokenType;
  transactionId?: string;
  creditsReceived?: number;
  // Target wallet details (legacy fiat flow)
  targetAddress?: string;
  // Cross-wallet top-up fields (from SDK v1.34.0+)
  owner?: string; // Who paid
  recipient?: string; // Who received credits
}

const PaymentSuccessPanel: React.FC<PaymentSuccessPanelProps> = ({
  onComplete,
  cryptoAmount,
  tokenType,
  transactionId,
  creditsReceived,
  targetAddress,
  owner,
  recipient
}) => {
  const { paymentIntentResult, creditBalance, address } = useStore();
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
        return `https://scan.ar.io/#/message/${txId}`;
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
      <div className="bg-gradient-to-br from-success/5 to-success/3 rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Success Icon and Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h4 className="text-2xl font-heading font-bold text-success mb-2">Payment Complete!</h4>
          <p className="text-foreground/80">
            {isCryptoPayment && tokenType === 'arweave'
              ? 'Your account will be credited in 15-30 minutes.'
              : 'Your credits are now available.'
            }
          </p>
        </div>

        {/* Show cross-wallet top-up info if sending to a different address */}
        {((recipient && owner && recipient !== owner) || (targetAddress && targetAddress !== address)) && (
          <div className="mb-6 bg-success/10 border border-success/20 rounded-2xl p-4">
            {/* Highlighted recipient address */}
            <div className="flex items-center gap-2 text-success mb-3">
              <Users className="w-4 h-4" />
              <span className="font-medium text-sm">Credits sent to:</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <code className="text-sm text-success font-mono break-all flex-1 p-2 bg-card/50 rounded">
                {recipient || targetAddress}
              </code>
              <CopyButton textToCopy={recipient || targetAddress || ''} />
            </div>

            {/* Smaller text showing who paid */}
            {owner && (
              <div className="pt-3 border-t border-success/20">
                <div className="text-xs text-foreground/80/70 mb-1">Paid from your wallet:</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-foreground/80/80 font-mono break-all flex-1">
                    {owner}
                  </code>
                  <CopyButton textToCopy={owner} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-card rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/80">Payment Amount:</span>
              <span className="font-medium text-foreground">
                {isCryptoPayment
                  ? `${paymentAmount} ${tokenLabels[tokenType!]}`
                  : `$${paymentAmount.toFixed(2)}`
                }
              </span>
            </div>

            {creditsReceived && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/80">Credits Received:</span>
                <span className="font-bold text-success text-lg">
                  +{creditsReceived.toFixed(4)} Credits
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/80">Current Balance:</span>
              <span className="font-bold text-success text-lg">
                {creditBalance.toLocaleString()} Credits
              </span>
            </div>

            {paymentId && (
              <div className="pt-4 border-t border-border/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-foreground/80">
                    {isCryptoPayment ? 'Transaction ID:' : 'Payment ID:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">
                      <span className="hidden sm:inline">{paymentId}</span>
                      <span className="sm:hidden">{formatTxId(paymentId, true)}</span>
                    </span>
                    {isCryptoPayment && getExplorerUrl(paymentId, tokenType) && (
                      <a
                        href={getExplorerUrl(paymentId, tokenType)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/80 hover:text-foreground transition-colors"
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
        <div className="bg-card rounded-2xl p-4 mb-6">
          <h5 className="font-heading font-medium text-foreground mb-4">What's Next?</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                onComplete();
                navigate('/upload');
              }}
              className="flex items-center gap-3 p-3 bg-card hover:bg-card/80 transition-colors rounded-2xl border border-border/20 hover:border-primary/30 text-left"
            >
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Upload Files</div>
                <div className="text-xs text-foreground/80">Store files permanently</div>
              </div>
            </button>

            <button
              onClick={() => {
                onComplete();
                navigate('/deploy');
              }}
              className="flex items-center gap-3 p-3 bg-card hover:bg-card/80 transition-colors rounded-2xl border border-border/20 hover:border-primary/30 text-left"
            >
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Deploy Site</div>
                <div className="text-xs text-foreground/80">Launch your app or site</div>
              </div>
            </button>

            <button
              onClick={() => {
                onComplete();
                navigate('/domains');
              }}
              className="flex items-center gap-3 p-3 bg-card hover:bg-card/80 transition-colors rounded-2xl border border-border/20 hover:border-primary/30 text-left"
            >
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Register Domain</div>
                <div className="text-xs text-foreground/80">Get a permanent domain name</div>
              </div>
            </button>

            <button
              onClick={() => {
                onComplete();
                navigate('/share');
              }}
              className="flex items-center gap-3 p-3 bg-card hover:bg-card/80 transition-colors rounded-2xl border border-border/20 hover:border-foreground/30 text-left w-full"
            >
              <div className="w-8 h-8 bg-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-border/20">
                <Share2 className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Share Credits</div>
                <div className="text-xs text-foreground/80">Transfer credits to other wallets</div>
              </div>
            </button>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs text-foreground/80 mb-2">
            Need help? Contact our support team
          </p>
          <a
            href="mailto:support@ardrive.io"
            className="text-xs text-foreground hover:text-foreground/80 transition-colors inline-flex items-center gap-1"
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
