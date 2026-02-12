import { useState } from 'react';
import { CheckCircle, Copy, AlertTriangle, RefreshCw } from 'lucide-react';
import { tokenLabels, tokenNetworkLabels, errorSubmittingTransactionToTurbo, SupportedTokenType } from '../../../constants';
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { useTurboConfig } from '../../../hooks/useTurboConfig';
import { useStore } from '../../../store/useStore';
import useAddressState, { TransferTransactionResult } from '../../../hooks/useAddressState';
import useTurboWallets from '../../../hooks/useTurboWallets';
import CopyButton from '../../CopyButton';



interface CryptoManualPaymentPanelProps {
  cryptoTopupValue: number; // Amount in tokens, not quote object
  tokenType: SupportedTokenType; // The selected token type (ethereum, base-eth, etc.)
  onBack: () => void;
  onComplete: () => void;
}

export default function CryptoManualPaymentPanel({
  cryptoTopupValue,
  tokenType,
  onBack,
  onComplete
}: CryptoManualPaymentPanelProps) {
  const address = useAddressState();
  const { data: turboWallets } = useTurboWallets();
  const turboConfig = useTurboConfig();
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);
  const config = getCurrentConfig();

  const [transferTransactionResult, setTransferTransactionResult] = useState<TransferTransactionResult>();
  const [transactionSubmitted, setTransactionSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  const [failedTxId, setFailedTxId] = useState<string>();
  const [signingMessage, setSigningMessage] = useState<string>();
  const [isRetrying, setIsRetrying] = useState(false);

  const turboWallet = address && turboWallets ? turboWallets[tokenType] : undefined;

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
      setSigningMessage('Submitting transaction to ar.io...');
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
        // Try to extract transaction ID from error message
        const errorMessage = e instanceof Error ? e.message : String(e);
        const txIdMatch = errorMessage.match(/turbo\.submitFundTransaction\([^)]*\)['"]:\s*(\S+)/);

        if (txIdMatch && txIdMatch[1]) {
          setFailedTxId(txIdMatch[1]);
          setPaymentError(errorMessage);
        } else {
          setFailedTxId(undefined);
          setPaymentError(errorSubmittingTransactionToTurbo);
        }
      } finally {
        setSigningMessage(undefined);
      }
    }
  };

  // Retry failed transaction
  const retryTransaction = async () => {
    if (!failedTxId) return;

    setIsRetrying(true);
    setPaymentError(undefined);
    setSigningMessage('Retrying transaction submission...');

    try {
      const response = await turboUnauthenticatedClient.submitFundTransaction({
        txId: failedTxId,
      });

      if (response.status === 'failed') {
        setPaymentError('Transaction retry failed. Please contact support.');
      } else {
        setTransactionSubmitted(true);
        setFailedTxId(undefined);
        // Auto-complete after successful submission
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setPaymentError(`Retry failed: ${errorMessage}`);
    } finally {
      setIsRetrying(false);
      setSigningMessage(undefined);
    }
  };

  const formatWalletAddress = (address: string, shownCount = 8) => {
    return `${address.slice(0, shownCount)}...${address.slice(-shownCount)}`;
  };


  return (
    <div className="px-4 sm:px-6 space-y-6">
      {/* Header matching your design system */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Copy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Submit Transactions</h3>
          <p className="text-sm text-foreground/80">Complete your {tokenLabels[tokenType]} payment on {tokenNetworkLabels[tokenType]} to ar.io</p>
        </div>
      </div>

      {/* Amount Summary in your gradient container style */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-border/20 p-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-1">
            {Number(cryptoTopupValue).toFixed(6)} {tokenLabels[tokenType]}
          </div>
          <div className="text-sm text-foreground/80">Payment amount required</div>
        </div>
      </div>

      {/* Step 1 - Send Payment */}
      <div className="bg-card rounded-2xl border border-border/20">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              !transferTransactionResult
                ? 'bg-primary text-primary-foreground'
                : 'bg-success text-white'
            }`}>
              {transferTransactionResult ? '✓' : '1'}
            </div>
            <div>
              <h4 className="font-heading font-medium text-foreground">
                Send {tokenLabels[tokenType]} to ar.io
              </h4>
              <p className="text-sm text-foreground/80">
                Transfer {Number(cryptoTopupValue).toFixed(6)} {tokenLabels[tokenType]} from your wallet
              </p>
            </div>
          </div>

          {!transferTransactionResult ? (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-4 border border-border/20">
                <p className="text-sm text-foreground/80 mb-2">
                  This step sends {tokenLabels[tokenType]} to ar.io.
                  You can verify the recipient is ar.io's wallet address{' '}
                  <a
                    href={`${config.paymentServiceUrl}/info`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline"
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
                className="w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Send Payment
              </button>
            </div>
          ) : (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-success mb-2">Transaction Success</p>
                  <div className="text-sm text-success/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <span>Transaction ID:</span>
                      <a
                        href={transferTransactionResult.explorerURL}
                        className="text-success/80 underline hover:text-success"
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
                        className="underline hover:text-success"
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
        <div className="ml-[.475rem] border-l border-foreground/20"></div>

        {transferTransactionResult && (
          <div className="ml-6 mt-4 rounded bg-card p-4 text-sm text-foreground/60">
            <p className="text-foreground">Transaction success.</p>
            <div className="mt-4 flex gap-2">
              Transaction ID:{' '}
              <a
                href={transferTransactionResult.explorerURL}
                className="text-foreground underline"
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

      {/* Step 2 - Submit to ar.io */}
      {transferTransactionResult && (
        <div className="bg-card rounded-2xl border border-border/20">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                !transactionSubmitted
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-success text-white'
              }`}>
                {transactionSubmitted ? '✓' : '2'}
              </div>
              <div>
                <h4 className="font-heading font-medium text-foreground">Submit Transaction to ar.io</h4>
                <p className="text-sm text-foreground/80">
                  Confirm your transaction with ar.io's payment service
                </p>
              </div>
            </div>

            {!transactionSubmitted ? (
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-4 border border-border/20">
                  <p className="text-sm text-foreground/80">
                    This step submits your transaction to ar.io for processing.
                    Once submitted, your credits will be added to your account.
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    submitTransactionToTurbo();
                  }}
                  className="w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  disabled={!transferTransactionResult}
                >
                  Submit to ar.io
                </button>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="text-success text-sm">
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
        <div className="bg-error/10 border border-error/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-error text-sm">{paymentError}</div>
              {failedTxId && (
                <button
                  onClick={retryTransaction}
                  disabled={isRetrying}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry Transaction'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-border/20">
        <button
          onClick={onBack}
          disabled={transactionSubmitted}
          className="text-sm text-foreground/80 hover:text-foreground disabled:opacity-50"
        >
          Back
        </button>

        {transactionSubmitted && (
          <button
            onClick={onComplete}
            className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90"
          >
            Complete
          </button>
        )}
      </div>
      {signingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span className="text-foreground">{signingMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
