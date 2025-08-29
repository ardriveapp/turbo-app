import { CheckCircle, ExternalLink, Home, RefreshCw } from 'lucide-react';
import { TokenType } from '@ardrive/turbo-sdk/web';
import { tokenLabels, SupportedTokenType } from '../../../constants';

interface CryptoPaymentCompletePanelProps {
  tokenType: SupportedTokenType;
  amount: number;
  credits: number;
  transactionId?: string;
  isManualPayment?: boolean;
  onClose: () => void;
}

export default function CryptoPaymentCompletePanel({
  tokenType,
  amount,
  credits,
  transactionId,
  isManualPayment = false,
  onClose
}: CryptoPaymentCompletePanelProps) {
  
  const getExplorerUrl = (txId: string) => {
    switch (tokenType) {
      case 'arweave':
      case 'ario':
        return `https://viewblock.io/arweave/tx/${txId}`;
      case 'ethereum':
        return `https://etherscan.io/tx/${txId}`;
      case 'base-eth':
        return `https://basescan.org/tx/${txId}`;
      case 'solana':
        return `https://solscan.io/tx/${txId}`;
      default:
        return '';
    }
  };

  const handleRefreshBalance = () => {
    // Trigger balance refresh event
    window.dispatchEvent(new CustomEvent('refresh-balance'));
  };

  return (
    <div className="space-y-6 text-center">
      {/* Success Icon */}
      <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-2xl font-bold text-fg-muted mb-2">
          {isManualPayment ? 'Payment Submitted!' : 'Payment Complete!'}
        </h3>
        <p className="text-link">
          {isManualPayment 
            ? 'Your transaction has been submitted and is being processed'
            : 'Your crypto payment was successful'
          }
        </p>
      </div>

      {/* Payment Summary */}
      <div className="bg-gradient-to-br from-green-500/5 to-green-500/3 rounded-xl border border-green-500/20 p-6">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-link mb-1">Payment Amount</div>
            <div className="text-2xl font-bold text-fg-muted">
              {amount.toFixed(6)} {tokenLabels[tokenType]}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-link mb-1">Credits {isManualPayment ? 'Expected' : 'Received'}</div>
            <div className="text-xl font-bold text-green-500">
              {credits.toFixed(4)} Credits
            </div>
          </div>

          {transactionId && (
            <div>
              <div className="text-sm text-link mb-1">Transaction ID</div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-sm text-fg-muted">
                  {transactionId.slice(0, 8)}...{transactionId.slice(-8)}
                </span>
                <a
                  href={getExplorerUrl(transactionId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-turbo-red hover:text-turbo-red/80"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Information */}
      <div className="bg-surface rounded-lg p-4 border border-default text-left">
        <h4 className="font-medium text-fg-muted mb-2">What's Next?</h4>
        <ul className="space-y-2 text-sm text-link">
          {isManualPayment ? (
            <>
              <li>• Your transaction is being processed on the blockchain</li>
              <li>• Credits will be added to your account once confirmed</li>
              <li>• This usually takes 5-30 minutes depending on network congestion</li>
              <li>• You can check your balance anytime using the refresh button</li>
            </>
          ) : (
            <>
              <li>• Credits have been added to your account immediately</li>
              <li>• You can now upload files or purchase domains</li>
              <li>• Your payment has been processed successfully</li>
            </>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={handleRefreshBalance}
          className="flex-1 px-6 py-3 rounded-lg border border-default bg-surface text-fg-muted font-medium hover:bg-default transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Balance
        </button>
        
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Done
        </button>
      </div>

      {/* Support Note */}
      <div className="text-xs text-link">
        Need help? Contact{' '}
        <a 
          href="mailto:support@ardrive.io" 
          className="text-turbo-red hover:text-turbo-red/80"
        >
          support@ardrive.io
        </a>
        {transactionId && (
          <> and include transaction ID: <span className="font-mono">{transactionId.slice(0, 16)}...</span></>
        )}
      </div>
    </div>
  );
}