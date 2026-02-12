import { SupportedTokenType, tokenLabels } from '../constants';
import { Check } from 'lucide-react';

interface JitTokenSelectorProps {
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  selectedToken: SupportedTokenType;
  onTokenSelect: (token: SupportedTokenType) => void;
  x402OnlyMode?: boolean;
}

/**
 * JIT Token Selector Component
 * Allows users to choose between different payment tokens for crypto top-up
 * - Regular Mode:
 *   - Ethereum wallets: BASE-ARIO, BASE-USDC, or BASE-ETH
 *   - Arweave wallets: ARIO only
 *   - Solana wallets: SOL only
 */
export function JitTokenSelector({
  walletType,
  selectedToken,
  onTokenSelect,
  x402OnlyMode = false,
}: JitTokenSelectorProps) {
  const getAvailableTokens = (): SupportedTokenType[] => {
    // In x402-only mode, ONLY base-usdc is available (and only for ETH wallets)
    if (x402OnlyMode) {
      return walletType === 'ethereum' ? ['base-usdc'] : [];
    }

    // Regular mode
    if (walletType === 'ethereum') {
      // Ethereum wallets: BASE-ARIO, ARIO (AO), BASE-USDC, and BASE-ETH
      return ['base-ario', 'ario', 'base-usdc', 'base-eth'];
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

  // Get shorter display label for compact layout
  const getShortLabel = (token: SupportedTokenType): string => {
    switch (token) {
      case 'base-usdc': return 'USDC';
      case 'base-ario': return 'ARIO';
      case 'base-eth': return 'ETH';
      case 'ario': return 'ARIO';
      case 'solana': return 'SOL';
      default: return tokenLabels[token];
    }
  };

  // Get network suffix
  const getNetworkLabel = (token: SupportedTokenType): string => {
    switch (token) {
      case 'base-usdc': return 'Base';
      case 'base-ario': return 'Base';
      case 'base-eth': return 'Base';
      case 'ario': return 'AO';
      default: return '';
    }
  };

  return (
    <div className="mb-3">
      <label className="text-xs text-foreground/80 block mb-2">Select payment method:</label>
      <div className={`grid gap-1.5 ${availableTokens.length === 2 ? 'grid-cols-2' : availableTokens.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {availableTokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => onTokenSelect(token)}
            className={`
              p-2 rounded-2xl border transition-all text-left
              ${
                selectedToken === token
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border/20 hover:border-foreground/50 bg-card'
              }
            `}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-foreground">{getShortLabel(token)}</span>
                  {getNetworkLabel(token) && (
                    <span className="text-[10px] text-foreground/80">({getNetworkLabel(token)})</span>
                  )}
                </div>
                {(token === 'base-ario' || token === 'ario') && (
                  <span className="text-[9px] text-info font-medium">No Fees</span>
                )}
              </div>
              {selectedToken === token && (
                <Check className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
