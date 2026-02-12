import { useState, useEffect } from 'react';
import { SupportedTokenType, tokenLabels } from '../constants';
import { formatTokenAmount, calculateRequiredTokenAmount } from '../utils/jitPayment';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export interface CryptoPaymentDetailsProps {
  creditsNeeded: number;
  totalCost: number;
  tokenType: SupportedTokenType;
  walletAddress: string | null;
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  onBalanceValidation: (hasSufficientBalance: boolean) => void;
  onShortageUpdate: (shortage: { amount: number; tokenType: SupportedTokenType } | null) => void;
  localJitMax: number;
  onMaxTokenAmountChange: (amount: number) => void;
  x402Pricing?: {
    usdcAmount: number;
    usdcAmountSmallestUnit: string;
    loading: boolean;
    error: string | null;
  };
}

export function CryptoPaymentDetails({
  creditsNeeded,
  totalCost,
  tokenType,
  walletAddress,
  walletType,
  onBalanceValidation,
  onShortageUpdate,
  localJitMax: _localJitMax, // eslint-disable-line @typescript-eslint/no-unused-vars
  onMaxTokenAmountChange,
  x402Pricing,
}: CryptoPaymentDetailsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<{
    tokenAmountReadable: number;
    estimatedUSD: number | null;
  } | null>(null);
  const [bufferPercentage, setBufferPercentage] = useState(1); // Default 1% buffer

  const tokenLabel = tokenLabels[tokenType];
  const BUFFER_MULTIPLIER = 1 + (bufferPercentage / 100); // Adjustable buffer

  // Fetch wallet balance
  const {
    balance: tokenBalance,
    loading: balanceLoading,
    error: balanceError,
    isNetworkError,
  } = useTokenBalance(tokenType, walletType, walletAddress, true);

  // Calculate estimated cost
  useEffect(() => {
    const calculate = async () => {
      try {
        // For base-usdc, use x402 pricing directly
        if (tokenType === 'base-usdc' && x402Pricing) {
          // Don't set cost while loading to avoid showing "FREE" flash
          if (x402Pricing.loading) {
            setEstimatedCost(null); // Show "Calculating..."
            return;
          }

          if (!x402Pricing.error) {
            setEstimatedCost({
              tokenAmountReadable: x402Pricing.usdcAmount, // Can be 0 for free uploads
              estimatedUSD: x402Pricing.usdcAmount, // USDC is 1:1 with USD
            });

            // For Crypto tab, max is just the buffered cost
            onMaxTokenAmountChange(x402Pricing.usdcAmount);
          }
          return;
        }

        // For other tokens, calculate using regular pricing
        // Always use totalCost for Crypto tab - user is choosing to pay full amount with crypto
        const cost = await calculateRequiredTokenAmount({
          creditsNeeded: totalCost,
          tokenType,
          bufferMultiplier: BUFFER_MULTIPLIER,
        });

        setEstimatedCost({
          tokenAmountReadable: cost.tokenAmountReadable,
          estimatedUSD: cost.estimatedUSD,
        });

        // For Crypto tab, max is just the buffered cost (already includes buffer from BUFFER_MULTIPLIER)
        onMaxTokenAmountChange(cost.tokenAmountReadable);
      } catch (error) {
        console.error('Failed to calculate crypto cost:', error);
        setEstimatedCost(null);
      }
    };

    const hasCost = (creditsNeeded > 0) || (totalCost > 0);
    if (hasCost) {
      calculate();
    } else {
      // Free upload/deployment - set cost to 0 immediately
      setEstimatedCost({ tokenAmountReadable: 0, estimatedUSD: 0 });
      onMaxTokenAmountChange(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditsNeeded, totalCost, tokenType, bufferPercentage, x402Pricing?.usdcAmount, x402Pricing?.loading, x402Pricing?.error]);

  // Validate balance and update shortage info
  useEffect(() => {
    if (!estimatedCost) {
      onBalanceValidation(true);
      onShortageUpdate(null);
      return;
    }

    if (isNetworkError) {
      onBalanceValidation(false);
      onShortageUpdate(null);
      return;
    }

    if (balanceError) {
      onBalanceValidation(true);
      onShortageUpdate(null);
      return;
    }

    const hasSufficientBalance = tokenBalance >= estimatedCost.tokenAmountReadable;
    onBalanceValidation(hasSufficientBalance);

    // Update shortage info for parent component warning
    if (!hasSufficientBalance) {
      const shortage = estimatedCost.tokenAmountReadable - tokenBalance;
      onShortageUpdate({ amount: shortage, tokenType });
    } else {
      onShortageUpdate(null);
    }
  }, [tokenBalance, estimatedCost, balanceError, isNetworkError, tokenType, onBalanceValidation, onShortageUpdate]);

  const afterUpload = estimatedCost ? Math.max(0, tokenBalance - estimatedCost.tokenAmountReadable) : tokenBalance;

  return (
    <div className="mb-4">
      <div className="bg-card rounded-2xl border border-border/20 p-4">
        <div className="space-y-2.5">
          {/* Cost */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-foreground/80">Cost:</span>
            <span className="text-sm text-foreground font-medium">
              {estimatedCost ? (
                estimatedCost.tokenAmountReadable === 0 ? (
                  <span className="text-success font-medium">FREE</span>
                ) : (
                  <>
                    ~{formatTokenAmount(estimatedCost.tokenAmountReadable, tokenType)} {tokenLabel}
                    {estimatedCost.estimatedUSD && estimatedCost.estimatedUSD > 0 && (
                      <span className="text-xs text-foreground/80 ml-2">
                        (≈ ${estimatedCost.estimatedUSD < 0.01
                          ? estimatedCost.estimatedUSD.toFixed(4)
                          : estimatedCost.estimatedUSD.toFixed(2)})
                      </span>
                    )}
                  </>
                )
              ) : (
                'Calculating...'
              )}
            </span>
          </div>

          {/* Current Balance */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-foreground/80">Current Balance:</span>
            <span className="text-sm text-foreground font-medium">
              {balanceLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking...
                </span>
              ) : balanceError ? (
                <span className="text-warning">Unable to fetch</span>
              ) : (
                `${formatTokenAmount(tokenBalance, tokenType)} ${tokenLabel}`
              )}
            </span>
          </div>

          {/* After Upload */}
          {estimatedCost && !balanceLoading && !balanceError && (
            <div className="flex justify-between items-center pt-2 border-t border-border/20">
              <span className="text-xs text-foreground/80">After Upload:</span>
              <span className="text-sm text-foreground font-medium">
                {formatTokenAmount(afterUpload, tokenType)} {tokenLabel}
              </span>
            </div>
          )}

          {/* Network Error Warning */}
          {isNetworkError && (
            <div className="pt-3 mt-3 border-t border-border/20">
              <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-2xl border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-warning font-medium mb-1">
                    {balanceError}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        {estimatedCost && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="mt-3">
                <label className="text-xs text-foreground/80 block mb-2">
                  Safety Buffer (0-20%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={bufferPercentage}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 20) {
                        setBufferPercentage(value);
                      }
                    }}
                    className="w-20 px-2 py-1.5 text-xs rounded border border-border/20 bg-card text-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-xs text-foreground/80">%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
