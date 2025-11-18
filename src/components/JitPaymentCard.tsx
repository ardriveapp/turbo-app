import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  maxTokenAmount: number; // Human-readable amount (e.g., 0.15 SOL, 200 ARIO)
  onMaxTokenAmountChange: (amount: number) => void;
}

export function JitPaymentCard({
  creditsNeeded,
  totalCost,
  tokenType,
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
