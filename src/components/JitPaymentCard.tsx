import { useState, useEffect } from 'react';
import { Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { SupportedTokenType, tokenLabels } from '../constants';
import {
  calculateRequiredTokenAmount,
  formatTokenAmount,
} from '../utils/jitPayment';

interface JitPaymentCardProps {
  creditsNeeded: number;
  totalCost: number;
  currentBalance: number;
  tokenType: SupportedTokenType;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  maxTokenAmount: number; // Human-readable amount (e.g., 0.15 SOL, 200 ARIO)
  onMaxTokenAmountChange: (amount: number) => void;
}

export function JitPaymentCard({
  creditsNeeded,
  tokenType,
  enabled,
  onEnabledChange,
  maxTokenAmount,
  onMaxTokenAmountChange,
}: JitPaymentCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<{
    tokenAmountReadable: number;
    estimatedUSD: number | null;
  } | null>(null);

  const tokenLabel = tokenLabels[tokenType];
  const BUFFER_MULTIPLIER = 1.1; // Fixed 10% buffer for SDK
  const MAX_MULTIPLIER = 1.5; // Max is 1.5x estimated cost

  // Calculate estimated cost and auto-set max
  useEffect(() => {
    const calculate = async () => {
      try {
        const cost = await calculateRequiredTokenAmount({
          creditsNeeded,
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

    if (creditsNeeded > 0) {
      calculate();
    }
  }, [creditsNeeded, tokenType, onMaxTokenAmountChange]);

  return (
    <div className="bg-gradient-to-br from-turbo-red/10 to-turbo-red/5 rounded-lg border border-turbo-red/30 p-3">
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="w-7 h-7 bg-turbo-red/20 rounded flex items-center justify-center flex-shrink-0">
          <Coins className="w-3.5 h-3.5 text-turbo-red" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-fg-muted mb-0.5">Insufficient Credits</div>
          <div className="text-xs text-link">
            You need{' '}
            <span className="text-fg-muted font-medium">
              {creditsNeeded.toFixed(6)} more credits
            </span>{' '}
            to complete this upload.
          </div>
        </div>
      </div>

      {/* Toggle */}
      <label className="flex items-center gap-2.5 p-2.5 bg-surface/50 rounded-lg cursor-pointer hover:bg-surface transition-colors">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="w-4 h-4 rounded border-default text-turbo-green focus:ring-turbo-green focus:ring-offset-0"
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-fg-muted">
            Auto-pay with {tokenLabel}
          </div>
          <div className="text-xs text-link mt-0.5">
            Automatically top up using crypto if credits run out
          </div>
        </div>
      </label>

      {/* Cost display when enabled */}
      {enabled && estimatedCost && (
        <div className="mt-2.5 p-2.5 bg-surface rounded-lg border border-default/30">
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

          <div className="text-xs text-link">
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
        </div>
      )}
    </div>
  );
}
