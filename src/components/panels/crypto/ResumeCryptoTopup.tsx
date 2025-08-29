import { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { turboConfig, errorSubmittingTransactionToTurbo } from '../../../constants';
import { useStore } from '../../../store/useStore';

const ResumeCryptoTopup = () => {
  const { setShowResumeTransactionPanel } = useStore();
  const [transactionID, setTransactionID] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const turboUnauthenticatedClient = TurboFactory.unauthenticated(turboConfig);

  const submitTransactionToTurbo = async () => {
    if (!transactionID.trim()) {
      setSubmitError('Please enter a transaction ID');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      const response = await turboUnauthenticatedClient.submitFundTransaction({
        txId: transactionID.trim(),
      });

      if (response.status === 'failed') {
        setSubmitError(errorSubmittingTransactionToTurbo);
      } else {
        setSubmitSuccess(true);
        // Auto-close after success
        setTimeout(() => {
          setShowResumeTransactionPanel(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
      setSubmitError(errorSubmittingTransactionToTurbo);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex size-full flex-col items-start bg-canvas p-12 text-left">
      <div>
        <div className="font-bold text-fg-muted">Resume Crypto Top-Up</div>
        <div className="mt-2 text-sm text-fg-disabled">
          If you previously sent crypto to Turbo but didn't submit the transaction ID, you can complete the process here.
        </div>
      </div>

      {!submitSuccess ? (
        <>
          <div className="mt-8 w-full">
            <label className="block text-sm font-medium text-fg-muted mb-3">
              Enter Transaction ID
            </label>
            <input
              type="text"
              value={transactionID}
              onChange={(e) => setTransactionID(e.target.value)}
              placeholder="Enter your transaction hash..."
              className="w-full p-3 rounded border border-default bg-surface text-fg-muted font-mono text-sm focus:outline-none focus:border-turbo-red"
              disabled={isSubmitting}
            />
            <div className="mt-2 text-xs text-fg-disabled">
              This should be the transaction ID from when you sent crypto to Turbo's wallet.
            </div>
          </div>

          {submitError && (
            <div className="mt-4 w-full bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-red-400 text-sm">{submitError}</div>
              </div>
            </div>
          )}

          <div className="mt-8 flex w-full justify-end gap-3">
            <button
              onClick={() => setShowResumeTransactionPanel(false)}
              className="px-4 py-2 text-sm text-fg-disabled hover:text-fg-muted"
            >
              Cancel
            </button>
            <button
              onClick={submitTransactionToTurbo}
              disabled={!transactionID.trim() || isSubmitting}
              className="px-6 py-2 rounded bg-turbo-red text-white font-medium hover:bg-turbo-red/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Transaction'
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-8 w-full text-center">
          <div className="text-lg font-medium text-fg-muted mb-2">
            Transaction Submitted Successfully!
          </div>
          <div className="text-sm text-fg-disabled">
            Your account will be credited shortly. This panel will close automatically.
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeCryptoTopup;