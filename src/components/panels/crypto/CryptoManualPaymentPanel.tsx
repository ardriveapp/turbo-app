import { useState } from 'react';
import { CheckCircle, Copy, AlertTriangle, RefreshCw } from 'lucide-react';
import { tokenLabels, errorSubmittingTransactionToTurbo, defaultPaymentServiceUrl } from '../../../constants';
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { turboConfig } from '../../../constants';
import useAddressState, { TransferTransactionResult } from '../../../hooks/useAddressState';
import useTurboWallets from '../../../hooks/useTurboWallets';
import CopyButton from '../../CopyButton';



interface CryptoManualPaymentPanelProps {
  cryptoTopupValue: number; // Amount in tokens, not quote object
  onBack: () => void;
  onComplete: () => void;
}

export default function CryptoManualPaymentPanel({
  cryptoTopupValue,
  onBack,
  onComplete
}: CryptoManualPaymentPanelProps) {
  const address = useAddressState();
  const { data: turboWallets } = useTurboWallets();
  
  const [transferTransactionResult, setTransferTransactionResult] = useState<TransferTransactionResult>();
  const [transactionSubmitted, setTransactionSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  const [signingMessage, setSigningMessage] = useState<string>();

  const turboWallet = address && turboWallets ? turboWallets[address.token] : undefined;
  
  // Get unauthenticated Turbo client for submitting fund transactions
  const turboUnauthenticatedClient = TurboFactory.unauthenticated(turboConfig);

  // Step 1: Submit native transaction (send crypto to Turbo wallet)
  const submitNativeTransaction = async (amount: number) => {
    setPaymentError(undefined);
    if (address?.submitNativeTransaction && turboWallet) {
      try {
        setSigningMessage(
          'Signing transaction with your wallet and awaiting confirmation...',
        );
        const response = await address.submitNativeTransaction(amount, turboWallet);
        setTransferTransactionResult(response);
      } catch (e: unknown) {
        console.error(e);
        setPaymentError(errorSubmittingTransactionToTurbo);
      } finally {
        setSigningMessage(undefined);
      }
    }
  };

  // Step 2: Submit transaction to Turbo
  const submitTransactionToTurbo = async () => {
    setPaymentError(undefined);
    if (turboUnauthenticatedClient && transferTransactionResult) {
      setSigningMessage('Submitting Transaction to Turbo...');
      try {
        const response = await turboUnauthenticatedClient.submitFundTransaction({
          txId: transferTransactionResult.txid,
        });

        if (response.status === 'failed') {
          setPaymentError(errorSubmittingTransactionToTurbo);
        } else {
          setTransactionSubmitted(true);
          // Auto-complete after successful submission
          setTimeout(() => {
            onComplete();
          }, 2000);
        }
      } catch (e: unknown) {
        console.error(e);
        setPaymentError(errorSubmittingTransactionToTurbo);
      } finally {
        setSigningMessage(undefined);
      }
    }
  };

  const formatWalletAddress = (address: string, shownCount = 8) => {
    return `${address.slice(0, shownCount)}...${address.slice(-shownCount)}`;
  };


  return (
    <div className="space-y-6">
      {/* Header matching your design system */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Copy className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Submit Transactions</h3>
          <p className="text-sm text-link">Complete your {address ? tokenLabels[address.token] : 'crypto'} payment to Turbo</p>
        </div>
      </div>

      {/* Amount Summary in your gradient container style */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-turbo-red mb-1">
            {cryptoTopupValue} {address ? tokenLabels[address.token] : 'TOKEN'}
          </div>
          <div className="text-sm text-link">Payment amount required</div>
        </div>
      </div>

      {/* Step 1 - Send Payment */}
      <div className="bg-surface rounded-lg border border-default">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              !transferTransactionResult 
                ? 'bg-turbo-red text-white' 
                : 'bg-green-500 text-white'
            }`}>
              {transferTransactionResult ? '✓' : '1'}
            </div>
            <div>
              <h4 className="font-medium text-fg-muted">
                Send {address ? tokenLabels[address.token] : 'TOKEN'} to Turbo
              </h4>
              <p className="text-sm text-link">
                Transfer {cryptoTopupValue} {address ? tokenLabels[address.token] : 'TOKEN'} from your wallet
              </p>
            </div>
          </div>

          {!transferTransactionResult ? (
            <div className="space-y-4">
              <div className="bg-canvas rounded-lg p-4 border border-default">
                <p className="text-sm text-link mb-2">
                  This step sends {address ? tokenLabels[address.token] : 'TOKEN'} to Turbo. 
                  You can verify the recipient is Turbo's wallet address{' '}
                  <a
                    href={`${defaultPaymentServiceUrl}/info`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-turbo-red hover:text-turbo-red/80 underline"
                  >
                    here
                  </a>
                  .
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (address?.submitNativeTransaction && cryptoTopupValue) {
                    submitNativeTransaction(cryptoTopupValue);
                  }
                }}
                className="w-full px-6 py-3 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90 transition-colors"
              >
                Send Payment
              </button>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-400 mb-2">Transaction Success</p>
                  <div className="text-sm text-green-300 space-y-2">
                    <div className="flex items-center gap-2">
                      <span>Transaction ID:</span>
                      <a
                        href={transferTransactionResult.explorerURL}
                        className="text-green-300 underline hover:text-green-200"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {formatWalletAddress(transferTransactionResult.txid, 8)}
                      </a>
                      <CopyButton textToCopy={transferTransactionResult.txid} />
                    </div>
                    <p className="text-xs">
                      Please record this transaction ID for your records. If there are any issues, 
                      you can submit it to{' '}
                      <a
                        href="mailto:support@ardrive.io"
                        className="underline hover:text-green-200"
                      >
                        customer support
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex w-full">
        <div className="ml-[.475rem] border-l border-fg-disabled/50"></div>
        {!transferTransactionResult && (
          <div className="ml-6 mt-2 p-4 text-sm">
            This step sends {address ? tokenLabels[address?.token] : 'TOKEN'}{' '}
            to Turbo. You can verify the recipient is Turbo's wallet address{' '}
            <a
              href={`${defaultPaymentServiceUrl}/info`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-muted underline"
            >
              here
            </a>
            .
          </div>
        )}

        {transferTransactionResult && (
          <div className="ml-6 mt-4 rounded bg-surface p-4 text-sm text-fg-disabled">
            <p className="text-fg-muted">Transaction success.</p>
            <div className="mt-4 flex gap-2">
              Transaction ID:{' '}
              <a
                href={transferTransactionResult.explorerURL}
                className="text-fg-muted underline"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Payment Transaction"
              >
                {formatWalletAddress(transferTransactionResult.txid, 8)}
              </a>
              <CopyButton textToCopy={transferTransactionResult.txid} />
            </div>
            <p className="mt-4">
              Please record the transaction ID for your records. If there are
              any issues, you can submit the transaction ID to
              <a
                className="ml-1 underline"
                href="mailto:support@ardrive.io"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Email ArDrive Support"
              >
                customer support
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Step 2 - Submit to Turbo */}
      {transferTransactionResult && (
        <div className="bg-surface rounded-lg border border-default">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                !transactionSubmitted 
                  ? 'bg-turbo-red text-white' 
                  : 'bg-green-500 text-white'
              }`}>
                {transactionSubmitted ? '✓' : '2'}
              </div>
              <div>
                <h4 className="font-medium text-fg-muted">Submit Transaction to Turbo</h4>
                <p className="text-sm text-link">
                  Confirm your transaction with Turbo's payment service
                </p>
              </div>
            </div>

            {!transactionSubmitted ? (
              <div className="space-y-4">
                <div className="bg-canvas rounded-lg p-4 border border-default">
                  <p className="text-sm text-link">
                    This step submits your transaction to Turbo for processing. 
                    Once submitted, your credits will be added to your account.
                  </p>
                </div>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    submitTransactionToTurbo();
                  }}
                  className="w-full px-6 py-3 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90 transition-colors flex items-center justify-center gap-2"
                  disabled={!transferTransactionResult}
                >
                  Submit to Turbo
                </button>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-green-400 text-sm">
                    <p className="font-medium mb-1">Payment Complete!</p>
                    <p>Your account will be credited shortly.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {paymentError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-400 text-sm">{paymentError}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-default">
        <button
          onClick={onBack}
          disabled={transactionSubmitted}
          className="text-sm text-link hover:text-fg-muted disabled:opacity-50"
        >
          Back
        </button>
        
        {transactionSubmitted && (
          <button
            onClick={onComplete}
            className="px-6 py-3 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90"
          >
            Complete
          </button>
        )}
      </div>
      {signingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-surface p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-turbo-red" />
              <span className="text-fg-muted">{signingMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}