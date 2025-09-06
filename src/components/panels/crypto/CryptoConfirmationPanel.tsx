import { TurboFactory, ArconnectSigner, ARToTokenAmount, ARIOToTokenAmount, ETHToTokenAmount, SOLToTokenAmount } from '@ardrive/turbo-sdk/web';
import { useState } from 'react';
import { Clock, RefreshCw, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { turboConfig, tokenLabels, tokenNetworkLabels, tokenProcessingTimes, wincPerCredit, SupportedTokenType } from '../../../constants';
import { useWincForAnyToken } from '../../../hooks/useWincForOneGiB';
import useTurboWallets from '../../../hooks/useTurboWallets';

interface CryptoConfirmationPanelProps {
  cryptoAmount: number;
  tokenType: SupportedTokenType;
  onBack: () => void;
  onPaymentComplete: (result: any) => void;
}

export default function CryptoConfirmationPanel({
  cryptoAmount,
  tokenType,
  onBack,
  onPaymentComplete
}: CryptoConfirmationPanelProps) {
  const { address, walletType } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  
  // Use comprehensive hook for all token types
  const { wincForToken, error: pricingError, loading: pricingLoading } = useWincForAnyToken(tokenType, cryptoAmount);
  const { data: turboWallets } = useTurboWallets();
  
  const quote = wincForToken ? {
    tokenAmount: cryptoAmount,
    credits: Number(wincForToken) / wincPerCredit,
    gigabytes: (Number(wincForToken) / wincPerCredit) * 0.000268,
  } : null;
  
  // Get the turbo wallet address for manual payments
  const turboWalletAddress = turboWallets?.[tokenType as keyof typeof turboWallets];



  // Determine if user can pay directly or needs manual payment
  const canPayDirectly = (
    (walletType === 'arweave' && (tokenType === 'arweave' || tokenType === 'ario')) ||
    (walletType === 'ethereum' && (tokenType === 'ethereum' || tokenType === 'base-eth')) ||
    (walletType === 'solana' && tokenType === 'solana')
  );

  const handlePayment = async () => {
    if (!address || !quote) return;

    setIsProcessing(true);
    setPaymentError(undefined);

    try {
      if (canPayDirectly) {
        // Direct payment via Turbo SDK with proper wallet support
        if (walletType === 'arweave' && window.arweaveWallet && (tokenType === 'arweave' || tokenType === 'ario')) {
          const signer = new ArconnectSigner(window.arweaveWallet);
          const turbo = TurboFactory.authenticated({
            signer,
            token: tokenType,
            paymentServiceConfig: {
              url: turboConfig.paymentServiceConfig?.url || 'https://payment.ardrive.io',
            },
          });

          // Use SDK helper functions - returns BigNumber (which SDK expects)
          let tokenAmount;
          if (tokenType === 'arweave') {
            tokenAmount = ARToTokenAmount(cryptoAmount);
          } else if (tokenType === 'ario') {
            tokenAmount = ARIOToTokenAmount(cryptoAmount);
          } else {
            throw new Error(`Unsupported token type for Arweave wallet: ${tokenType}`);
          }

          const result = await turbo.topUpWithTokens({
            tokenAmount,
          });

          onPaymentComplete({
            ...result,
            quote,
            tokenType,
            transactionId: result.id,
          });
        } else if (walletType === 'ethereum' && window.ethereum && (tokenType === 'ethereum' || tokenType === 'base-eth')) {
          // ETH/Base ETH direct payment via Ethereum wallet
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          const turbo = TurboFactory.authenticated({
            token: tokenType,
            walletAdapter: {
              getSigner: () => signer as any,
            },
            paymentServiceConfig: {
              url: turboConfig.paymentServiceConfig?.url || 'https://payment.ardrive.io',
            },
          });

          const tokenAmount = ETHToTokenAmount(cryptoAmount); // Convert to wei

          const result = await turbo.topUpWithTokens({
            tokenAmount,
          });

          onPaymentComplete({
            ...result,
            quote,
            tokenType,
            transactionId: result.id,
          });
        } else if (walletType === 'solana' && window.solana && tokenType === 'solana') {
          // SOL direct payment via Solana wallet
          const { PublicKey } = await import('@solana/web3.js');
          const provider = window.solana;
          const { publicKey } = await provider.connect();
          
          const turbo = TurboFactory.authenticated({
            token: tokenType,
            walletAdapter: {
              publicKey: new PublicKey(publicKey),
              signMessage: async (message: Uint8Array) => {
                const { signature } = await provider.signMessage(message);
                return signature;
              },
            },
            paymentServiceConfig: {
              url: turboConfig.paymentServiceConfig?.url || 'https://payment.ardrive.io',
            },
          });

          const tokenAmount = SOLToTokenAmount(cryptoAmount); // Convert to lamports

          const result = await turbo.topUpWithTokens({
            tokenAmount,
          });

          onPaymentComplete({
            ...result,
            quote,
            tokenType,
            transactionId: result.id,
          });
        } else {
          throw new Error('Wallet not available for direct payment');
        }
      } else {
        // Manual payment flow - user needs to send crypto manually
        onPaymentComplete({ 
          requiresManualPayment: true, 
          quote,
          tokenType,
          turboWalletAddress
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Wallet className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Review Payment</h3>
          <p className="text-sm text-link">Confirm your crypto payment details</p>
        </div>
      </div>

      {/* Quote Display */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6">
        {pricingLoading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-turbo-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-fg-muted mb-2">Getting Live Pricing</p>
            <p className="text-sm text-link">
              Fetching current {tokenLabels[tokenType]} rates...
            </p>
          </div>
        ) : pricingError ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-fg-muted mb-2">Quote Generation Unavailable</p>
            <p className="text-sm text-link mb-4">{pricingError}</p>
            <button
              onClick={onBack}
              className="text-turbo-red hover:text-turbo-red/80 transition-colors"
            >
              Go Back and Try Different Token
            </button>
          </div>
        ) : quote ? (
          <>
            <div className="text-center mb-4 sm:mb-6">
              <div className="text-4xl font-bold text-turbo-red mb-2">
                {quote.tokenAmount.toFixed(tokenType === 'ethereum' || tokenType === 'base-eth' ? 6 : tokenType === 'solana' ? 4 : 8)} {tokenLabels[tokenType]}
              </div>
              <div className="text-sm text-link mb-2">
                on {tokenNetworkLabels[tokenType]}
              </div>
              <div className="text-lg text-fg-muted">
                {quote.credits.toFixed(4)} Credits
              </div>
              <div className="text-sm text-link">
                ≈ {quote.gigabytes.toFixed(2)} GiB storage power
              </div>
            </div>

            {/* Processing Time Info */}
            <div className="flex items-center justify-center bg-surface/50 rounded-lg p-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-link" />
                <span className="text-sm text-link">
                  Expected processing: {tokenProcessingTimes[tokenType]?.time || '5-15 minutes'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-fg-muted mb-2">Quote Generation Failed</p>
            <p className="text-sm text-link mb-4">
              Unable to generate pricing for {tokenLabels[tokenType]}
            </p>
            <button onClick={onBack} className="text-turbo-red hover:text-turbo-red/80">
              Go Back
            </button>
          </div>
        )}
      </div>

      {/* Payment Method Info */}
      <div className="bg-surface rounded-lg p-4 border border-default">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-fg-muted mb-1">Payment Method</h4>
            <p className="text-sm text-link">
              {canPayDirectly 
                ? `Direct payment using your ${tokenLabels[tokenType]} balance on ${tokenNetworkLabels[tokenType]}`
                : `Manual transfer of ${tokenLabels[tokenType]} on ${tokenNetworkLabels[tokenType]} required`
              }
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Clock className={`w-3 h-3 ${
                tokenProcessingTimes[tokenType].speed === 'fast' ? 'text-green-400' :
                tokenProcessingTimes[tokenType].speed === 'medium' ? 'text-yellow-400' :
                'text-orange-400'
              }`} />
              <p className={`text-xs ${
                tokenProcessingTimes[tokenType].speed === 'fast' ? 'text-green-400' :
                tokenProcessingTimes[tokenType].speed === 'medium' ? 'text-yellow-400' :
                'text-orange-400'
              }`}>
                Expected processing: {tokenProcessingTimes[tokenType].time}
              </p>
            </div>
            <p className="text-xs text-link mt-1">
              {tokenProcessingTimes[tokenType].description}
            </p>
            {!canPayDirectly && (
              <p className="text-xs text-link mt-1">
                You'll be guided through the manual payment process
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="text-center bg-surface/30 rounded-lg p-4">
        <p className="text-xs text-link">
          By continuing, you agree to our{' '}
          <a 
            href="https://ardrive.io/tos-and-privacy/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-turbo-red hover:text-turbo-red/80 transition-colors"
          >
            Terms of Service
          </a>
          {' '}and{' '}
          <a 
            href="https://ardrive.io/tos-and-privacy/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-turbo-red hover:text-turbo-red/80 transition-colors"
          >
            Privacy Policy
          </a>
        </p>
      </div>

      {/* Error Message */}
      {paymentError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-400 text-sm">{paymentError}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-default">
        <button
          onClick={onBack}
          className="text-sm text-link hover:text-fg-muted"
        >
          Back
        </button>
        
        <button
          onClick={handlePayment}
          disabled={!quote || isProcessing}
          className="px-6 py-3 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              {canPayDirectly ? 'Pay Now' : 'Continue'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}