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
}: JitPaymentCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<{
    tokenAmountReadable: number;
    estimatedUSD: number | null;
  } | null>(null);

  const tokenLabel = tokenLabels[tokenType];
  const BUFFER_MULTIPLIER = 1.1; // Fixed 10% buffer for SDK
  const MAX_MULTIPLIER = 1.5; // Max is 1.5x estimated cost

  // Fetch wallet balance for the selected token
  const {
    balance: tokenBalance,
    loading: balanceLoading,
    error: balanceError,
    isNetworkError,
  } = useTokenBalance(tokenType, walletType, walletAddress);

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

  return (
    <div className="bg-gradient-to-br from-fg-muted/5 to-fg-muted/3 rounded-lg border border-default p-3">
      {/* Cost display */}
      {estimatedCost && (
        <>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-link">Estimated cost:</span>
            <div className="text-right">
              <div className="text-sm font-medium text-fg-muted">
                ~{formatTokenAmount(estimatedCost.tokenAmountReadable, tokenType)} {tokenLabel}
              </div>
              {estimatedCost.estimatedUSD && estimatedCost.estimatedUSD > 0 && (
                <div className="text-xs text-link">
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
              <div className="flex items-center gap-2 p-2 bg-surface/50 rounded border border-default">
                <Loader2 className="w-4 h-4 text-link animate-spin" />
                <span className="text-xs text-link">Checking wallet balance...</span>
              </div>
            ) : balanceError ? (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-amber-400 font-medium">Unable to fetch balance</div>
                  <div className="text-xs text-amber-400/70 mt-0.5">{balanceError}</div>
                </div>
              </div>
            ) : hasSufficientBalance ? (
              <div className="flex items-center gap-2 p-2 bg-turbo-green/10 rounded border border-turbo-green/20">
                <CheckCircle className="w-4 h-4 text-turbo-green flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-turbo-green font-medium">
                    Your Balance: {formatTokenAmount(tokenBalance, tokenType)} {tokenLabel}
                  </div>
                  <div className="text-xs text-turbo-green/70">Sufficient funds available</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-red-400 font-medium">
                    Your Balance: {formatTokenAmount(tokenBalance, tokenType)} {tokenLabel}
                  </div>
                  <div className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>Need {formatTokenAmount(shortfall, tokenType)} {tokenLabel} more</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-link mb-2">
            Up to ~{formatTokenAmount(maxTokenAmount, tokenType)} {tokenLabel} with safety margin
          </div>

          {/* Advanced settings - collapsible */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-2 text-xs text-link hover:text-fg-muted transition-colors flex items-center gap-1"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="mt-2 pt-2 border-t border-default/30">
              <div>
                <label className="text-xs text-link block mb-1">
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
                  className="w-full px-2.5 py-1.5 bg-canvas rounded border border-default text-xs text-fg-muted focus:border-fg-muted focus:outline-none"
                />
                <div className="text-xs text-link mt-0.5">
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
