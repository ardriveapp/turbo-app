import { SupportedTokenType, tokenLabels } from '../constants';
import { Check } from 'lucide-react';

interface JitTokenSelectorProps {
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  selectedToken: SupportedTokenType;
  onTokenSelect: (token: SupportedTokenType) => void;
}

/**
 * JIT Token Selector Component
 * Allows users to choose between different JIT-supported payment tokens
 * Ethereum wallets can use BASE-USDC (x402), BASE-ETH, or ARIO
 */
export function JitTokenSelector({
  walletType,
  selectedToken,
  onTokenSelect,
}: JitTokenSelectorProps) {
  const getAvailableTokens = (): SupportedTokenType[] => {
    if (walletType === 'ethereum') {
      // Ethereum wallets can hold and pay with ARIO tokens too
      return ['base-usdc', 'base-eth', 'ario'];
    } else if (walletType === 'arweave') {
      return ['ario'];
    } else if (walletType === 'solana') {
      return ['solana'];
    }
    return [];
  };

  const availableTokens = getAvailableTokens();

  // Don't show selector if only one option
  if (availableTokens.length <= 1) {
    return null;
  }

  return (
    <div className="mb-3">
      <label className="text-xs text-link block mb-2">Select payment method:</label>
      <div className="grid grid-cols-3 gap-2">
        {availableTokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => onTokenSelect(token)}
            className={`
              p-3 rounded-lg border transition-all text-left
              ${
                selectedToken === token
                  ? 'border-fg-muted bg-fg-muted/10'
                  : 'border-default hover:border-fg-muted/50 bg-surface'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg-muted truncate">{tokenLabels[token]}</div>
                <div className="text-xs text-link mt-0.5">
                  {token === 'base-usdc' && 'Fast x402'}
                  {token === 'base-eth' && 'Standard'}
                  {token === 'ario' && 'ARIO tokens'}
                </div>
              </div>
              {selectedToken === token && (
                <Check className="w-4 h-4 text-fg-muted flex-shrink-0 ml-1" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
