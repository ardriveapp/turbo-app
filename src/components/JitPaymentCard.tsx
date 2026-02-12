import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { SupportedTokenType, tokenLabels } from '../constants';
import {
  calculateRequiredTokenAmount,
  formatTokenAmount,
} from '../utils/jitPayment';
import { useTokenBalance } from '../hooks/useTokenBalance';

interface JitPaymentCardProps {
  creditsNeeded: number;
  totalCost: number;
  currentBalance: number;
  tokenType: SupportedTokenType;
  maxTokenAmount: number; // Human-readable amount (e.g., 0.15 SOL, 200 ARIO)
  onMaxTokenAmountChange: (amount: number) => void;
  walletAddress: string | null;
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  onBalanceValidation?: (hasSufficientBalance: boolean) => void;
  enabled?: boolean; // Only fetch balance when true (when JIT section is expanded)
}

export function JitPaymentCard({
  creditsNeeded,
  totalCost,
  tokenType,
  maxTokenAmount,
  onMaxTokenAmountChange,
  walletAddress,
  walletType,
  onBalanceValidation,
  enabled = true,
}: JitPaymentCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<{
    tokenAmountReadable: number;
    estimatedUSD: number | null;
  } | null>(null);

  const tokenLabel = tokenLabels[tokenType];
  const BUFFER_MULTIPLIER = 1.1; // Fixed 10% buffer for SDK
  const MAX_MULTIPLIER = 1.5; // Max is 1.5x estimated cost

  // Fetch wallet balance for the selected token (only when enabled)
  const {
    balance: tokenBalance,
    loading: balanceLoading,
    error: balanceError,
    isNetworkError,
  } = useTokenBalance(tokenType, walletType, walletAddress, enabled);

  // Calculate estimated cost and auto-set max
  useEffect(() => {
    const calculate = async () => {
      try {
        // Use totalCost if user has sufficient credits (creditsNeeded = 0)
        // Use creditsNeeded if insufficient (creditsNeeded > 0)
        const creditsToConvert = creditsNeeded > 0 ? creditsNeeded : totalCost;

        const cost = await calculateRequiredTokenAmount({
          creditsNeeded: creditsToConvert,
          tokenType,
          bufferMultiplier: BUFFER_MULTIPLIER,
        });

        setEstimatedCost({
          tokenAmountReadable: cost.tokenAmountReadable,
          estimatedUSD: cost.estimatedUSD,
        });

        // Auto-calculate max as 1.5x estimated cost
        const autoMax = cost.tokenAmountReadable * MAX_MULTIPLIER;
        onMaxTokenAmountChange(autoMax);
      } catch (error) {
        console.error('Failed to calculate JIT cost:', error);
        setEstimatedCost(null);
      }
    };

    // Calculate if there's any cost (either insufficient or wanting to pay with crypto)
    // Must check for null explicitly since totalCost can be null while loading
    const hasCost = (typeof creditsNeeded === 'number' && creditsNeeded > 0) ||
                    (typeof totalCost === 'number' && totalCost > 0);

    if (hasCost) {
      calculate();
    }
  }, [creditsNeeded, totalCost, tokenType, onMaxTokenAmountChange]);

  // Validate balance vs. required amount
  useEffect(() => {
    // If we don't have estimated cost yet, we're still calculating - allow proceeding
    if (!estimatedCost) {
      onBalanceValidation?.(true);
      return;
    }

    // Network errors (wrong chain) should BLOCK proceeding
    if (isNetworkError) {
      onBalanceValidation?.(false);
      return;
    }

    // Other errors (RPC issues, etc.) - allow proceeding to not block user
    // This handles temporary RPC errors, rate limiting, etc.
    if (balanceError) {
      onBalanceValidation?.(true);
      return;
    }

    // Check if user has enough tokens (with buffer)
    // Even during loading (refresh), use the last known balance
    const requiredAmount = estimatedCost.tokenAmountReadable;
    const hasSufficientBalance = tokenBalance >= requiredAmount;

    onBalanceValidation?.(hasSufficientBalance);
  }, [tokenBalance, estimatedCost, balanceLoading, balanceError, isNetworkError, onBalanceValidation]);

  // Calculate shortfall if insufficient
  const shortfall = estimatedCost && tokenBalance < estimatedCost.tokenAmountReadable
    ? estimatedCost.tokenAmountReadable - tokenBalance
    : 0;

  const hasSufficientBalance = estimatedCost ? tokenBalance >= estimatedCost.tokenAmountReadable : true;

  // Check if no files selected (no cost to calculate)
  const hasCost = (typeof creditsNeeded === 'number' && creditsNeeded > 0) ||
                  (typeof totalCost === 'number' && totalCost > 0);

  return (
    <div className="bg-card rounded-2xl border border-border/20 p-3">
      {/* Message when no files selected */}
      {!hasCost && (
        <div className="text-center py-4">
          <div className="text-sm text-foreground/80 mb-1">Select files to see cost estimate</div>
          <div className="text-xs text-foreground/70">
            Payment will be processed automatically when uploading
          </div>
        </div>
      )}

      {/* Cost display */}
      {estimatedCost && (
        <>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-foreground/80">Estimated cost:</span>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                ~{formatTokenAmount(estimatedCost.tokenAmountReadable, tokenType)} {tokenLabel}
              </div>
              {estimatedCost.estimatedUSD && estimatedCost.estimatedUSD > 0 && (
                <div className="text-xs text-foreground/80">
                  ≈ ${estimatedCost.estimatedUSD < 0.0001
                    ? estimatedCost.estimatedUSD.toFixed(6)
                    : estimatedCost.estimatedUSD < 0.01
                    ? estimatedCost.estimatedUSD.toFixed(4)
                    : estimatedCost.estimatedUSD.toFixed(2)} USD
                </div>
              )}
            </div>
          </div>

          {/* Balance Display */}
          <div className="mb-3 mt-3">
            {balanceLoading ? (
              <div className="flex items-center gap-2 p-2 bg-card/50 rounded border border-border/20">
                <Loader2 className="w-4 h-4 text-foreground/80 animate-spin" />
                <span className="text-xs text-foreground/80">Checking wallet balance...</span>
              </div>
            ) : balanceError ? (
              <div className="flex items-center gap-2 p-2 bg-warning/10 rounded border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-warning font-medium">Unable to fetch balance</div>
                  <div className="text-xs text-warning/70 mt-0.5">{balanceError}</div>
                </div>
              </div>
            ) : hasSufficientBalance ? (
              <div className="flex items-center gap-2 p-2 bg-success/10 rounded border border-success/20">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-success font-medium">
                    Your Balance: {formatTokenAmount(tokenBalance, tokenType)} {tokenLabel}
                  </div>
                  <div className="text-xs text-success/70">Sufficient funds available</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-error/10 rounded border border-error/20">
                <XCircle className="w-4 h-4 text-error flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-error font-medium">
                    Your Balance: {formatTokenAmount(tokenBalance, tokenType)} {tokenLabel}
                  </div>
                  <div className="text-xs text-error flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>Need {formatTokenAmount(shortfall, tokenType)} {tokenLabel} more</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-foreground/80 mb-2">
            Up to ~{formatTokenAmount(maxTokenAmount, tokenType)} {tokenLabel} with safety margin
          </div>

          {/* Advanced settings - collapsible */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-2 text-xs text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <div>
                <label className="text-xs text-foreground/80 block mb-1">
                  Max {tokenLabel}:
                </label>
                <input
                  type="number"
                  step={tokenType === 'ario' ? '0.1' : '0.001'}
                  min="0"
                  value={maxTokenAmount.toFixed(tokenType === 'ario' ? 2 : 6)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    onMaxTokenAmountChange(value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-card rounded border border-border/20 text-xs text-foreground focus:border-foreground focus:outline-none"
                />
                <div className="text-xs text-foreground/80 mt-0.5">
                  Auto-calculated spending limit (adjustable)
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
