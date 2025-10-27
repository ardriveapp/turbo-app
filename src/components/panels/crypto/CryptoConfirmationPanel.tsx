import { TurboFactory, ArconnectSigner, ARToTokenAmount, ARIOToTokenAmount, ETHToTokenAmount, SOLToTokenAmount, POLToTokenAmount } from '@ardrive/turbo-sdk/web';
import { useState } from 'react';
import { Clock, RefreshCw, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import {  tokenLabels, tokenNetworkLabels, tokenProcessingTimes, wincPerCredit, SupportedTokenType } from '../../../constants';
import { useWincForAnyToken, useWincForOneGiB } from '../../../hooks/useWincForOneGiB';
import useTurboWallets from '../../../hooks/useTurboWallets';
import TurboLogo from '../../TurboLogo';
import { useWallets } from '@privy-io/react-auth';

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
  const { wallets } = useWallets(); // Get Privy wallets
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();

  const turboConfig = useStore((state) => state.getCurrentConfig());
  
  // Use comprehensive hook for all token types
  const { wincForToken, error: pricingError, loading: pricingLoading } = useWincForAnyToken(tokenType, cryptoAmount);
  const { data: turboWallets } = useTurboWallets();
  const wincForOneGiB = useWincForOneGiB();
  
  const quote = wincForToken ? {
    tokenAmount: cryptoAmount,
    credits: Number(wincForToken) / wincPerCredit,
    // Calculate storage correctly using actual GiB rate
    gigabytes: wincForOneGiB ? Number(wincForToken) / Number(wincForOneGiB) : 0,
  } : null;
  
  // Get the turbo wallet address for manual payments
  const turboWalletAddress = turboWallets?.[tokenType as keyof typeof turboWallets];

  // Smart storage display - show in appropriate units
  const formatStorage = (gigabytes: number): string => {
    if (gigabytes >= 1) {
      return `${gigabytes.toFixed(2)} GiB`;
    } else if (gigabytes >= 0.001) {
      const mebibytes = gigabytes * 1024;
      return `${mebibytes.toFixed(1)} MiB`;
    } else if (gigabytes > 0) {
      const kibibytes = gigabytes * 1024 * 1024;
      return `${kibibytes.toFixed(0)} KiB`;
    } else {
      return '0 storage';
    }
  };

  // Determine if user can pay directly or needs manual payment
  const canPayDirectly = (
    (walletType === 'arweave' && (tokenType === 'arweave' || tokenType === 'ario')) ||
    (walletType === 'ethereum' && (tokenType === 'ethereum' || tokenType === 'base-eth' || tokenType === 'pol')) ||
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
              url: turboConfig.paymentServiceUrl || 'https://payment.ardrive.io',
            },
            gatewayUrl: turboConfig.tokenMap[tokenType] // Dev mode uses testnet RPC URLs
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
        } else if (walletType === 'ethereum' && (tokenType === 'ethereum' || tokenType === 'base-eth' || tokenType === 'pol')) {
          // ETH L1/Base ETH/POL direct payment via Ethereum wallet
          const { ethers } = await import('ethers');

          // Check if this is a Privy embedded wallet
          const privyWallet = wallets.find(w => w.walletClientType === 'privy');

          let provider;
          let signer;

          if (privyWallet) {
            // Use Privy embedded wallet
            const privyProvider = await privyWallet.getEthereumProvider();
            provider = new ethers.BrowserProvider(privyProvider);
            signer = await provider.getSigner();
          } else if (window.ethereum) {
            // Fallback to regular Ethereum wallet (MetaMask, WalletConnect)
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
          } else {
            throw new Error('No Ethereum wallet available');
          }

          // Network validation and auto-switching
          const network = await provider.getNetwork();
          // Dev mode uses testnets: Holesky (17000) for ETH, Base Sepolia (84532) for Base, Amoy (80002) for POL
          // POL is the native token on Polygon network (like ETH on Ethereum)
          const isDevMode = turboConfig.paymentServiceUrl?.includes('.dev');
          const expectedChainId = tokenType === 'ethereum'
            ? (isDevMode ? 17000 : 1)  // Holesky testnet : Ethereum mainnet
            : tokenType === 'base-eth'
            ? (isDevMode ? 84532 : 8453) // Base Sepolia : Base mainnet
            : tokenType === 'pol'
            ? (isDevMode ? 80002 : 137) // Amoy testnet : Polygon mainnet
            : 1; // Default to Ethereum mainnet


          // Auto-switch network if needed
          if (Number(network.chainId) !== expectedChainId) {
            if (privyWallet) {
              // Privy wallets use their own switchChain method
              try {
                await privyWallet.switchChain(expectedChainId);
                // Wait for switch to complete
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Re-create provider and signer after switch
                const newPrivyProvider = await privyWallet.getEthereumProvider();
                provider = new ethers.BrowserProvider(newPrivyProvider);
                signer = await provider.getSigner();
              } catch {
                const networkName = tokenType === 'base-eth'
                  ? (isDevMode ? 'Base Sepolia testnet' : 'Base network')
                  : tokenType === 'pol'
                  ? (isDevMode ? 'Polygon Amoy testnet' : 'Polygon Mainnet')
                  : (isDevMode ? 'Ethereum Holesky testnet' : 'Ethereum Mainnet');
                throw new Error(`Failed to switch to ${networkName}. Please try again.`);
              }
            } else if (window.ethereum) {
              // Only attempt auto-switching for regular wallets
              if (tokenType === 'base-eth') {
                try {
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${expectedChainId.toString(16)}` }], // Dynamic: Base Sepolia (0x14A34) or Base Mainnet (0x2105)
                  });
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  // Create fresh provider after switch
                  provider = new ethers.BrowserProvider(window.ethereum);
                  signer = await provider.getSigner();
                } catch (switchError: any) {
                  // Error 4902 means the network doesn't exist in MetaMask - add it first
                  if (switchError.code === 4902) {
                    try {
                      const networkParams = isDevMode ? {
                        chainId: '0x14a34', // 84532
                        chainName: 'Base Sepolia',
                        nativeCurrency: {
                          name: 'Sepolia Ether',
                          symbol: 'ETH',
                          decimals: 18,
                        },
                        rpcUrls: ['https://sepolia.base.org'],
                        blockExplorerUrls: ['https://sepolia.basescan.org'],
                      } : {
                        chainId: '0x2105', // 8453
                        chainName: 'Base',
                        nativeCurrency: {
                          name: 'Ether',
                          symbol: 'ETH',
                          decimals: 18,
                        },
                        rpcUrls: ['https://mainnet.base.org'],
                        blockExplorerUrls: ['https://basescan.org'],
                      };

                      await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [networkParams],
                      });

                      // Wait for network to be added and switched
                      await new Promise(resolve => setTimeout(resolve, 1000));

                      // Create fresh provider after adding network
                      provider = new ethers.BrowserProvider(window.ethereum);
                      signer = await provider.getSigner();
                    } catch {
                      const networkName = isDevMode ? 'Base Sepolia testnet' : 'Base Network';
                      throw new Error(`Failed to add ${networkName} to MetaMask. Please add it manually.`);
                    }
                  } else {
                    const networkName = isDevMode ? 'Base Sepolia testnet' : 'Base Network';
                    throw new Error(`Please switch to ${networkName} in your wallet for Base ETH payments.`);
                  }
                }
              } else if (tokenType === 'pol') {
                // POL: Switch to Polygon network (Amoy testnet or Polygon mainnet)
                try {
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${expectedChainId.toString(16)}` }], // Amoy (0x13882) or Polygon Mainnet (0x89)
                  });
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  // Create fresh provider after switch
                  provider = new ethers.BrowserProvider(window.ethereum);
                  signer = await provider.getSigner();
                } catch (switchError: any) {
                  // Error 4902 means the network doesn't exist in MetaMask - add it first
                  if (switchError.code === 4902) {
                    try {
                      const networkParams = isDevMode ? {
                        chainId: '0x13882', // 80002
                        chainName: 'Polygon Amoy Testnet',
                        nativeCurrency: {
                          name: 'POL',
                          symbol: 'POL',
                          decimals: 18,
                        },
                        rpcUrls: ['https://rpc-amoy.polygon.technology'],
                        blockExplorerUrls: ['https://amoy.polygonscan.com'],
                      } : {
                        chainId: '0x89', // 137
                        chainName: 'Polygon Mainnet',
                        nativeCurrency: {
                          name: 'POL',
                          symbol: 'POL',
                          decimals: 18,
                        },
                        rpcUrls: ['https://polygon-rpc.com'],
                        blockExplorerUrls: ['https://polygonscan.com'],
                      };

                      await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [networkParams],
                      });

                      // Wait for network to be added and switched
                      await new Promise(resolve => setTimeout(resolve, 1000));

                      // Create fresh provider after adding network
                      provider = new ethers.BrowserProvider(window.ethereum);
                      signer = await provider.getSigner();
                    } catch {
                      const networkName = isDevMode ? 'Polygon Amoy testnet' : 'Polygon Mainnet';
                      throw new Error(`Failed to add ${networkName} to MetaMask. Please add it manually.`);
                    }
                  } else {
                    const networkName = isDevMode ? 'Polygon Amoy testnet' : 'Polygon Mainnet';
                    throw new Error(`Please switch to ${networkName} in your wallet for POL payments.`);
                  }
                }
              } else if (tokenType === 'ethereum') {
                // ETH: Switch to Ethereum network (Holesky testnet or Ethereum mainnet)
                try {
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${expectedChainId.toString(16)}` }], // Dynamic: Holesky (0x4268) or Ethereum Mainnet (0x1)
                  });
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  // Create fresh provider after switch
                  provider = new ethers.BrowserProvider(window.ethereum);
                  signer = await provider.getSigner();
                } catch {
                  const networkName = isDevMode ? 'Ethereum Holesky testnet' : 'Ethereum Mainnet';
                  throw new Error(`Please switch to ${networkName} in your wallet for ETH payments.`);
                }
              }
            }
          }


          // ETH/Base ETH/POL payment using walletAdapter
          // POL is the native token on Polygon network
          const turboConfig_forSDK: any = {
            token: tokenType, // 'ethereum', 'base-eth', or 'pol'
            walletAdapter: {
              getSigner: () => signer as any,
            },
            paymentServiceConfig: {
              url: turboConfig.paymentServiceUrl || 'https://payment.ardrive.io',
            }
          };

          // Add gatewayUrl for all tokens EXCEPT POL mainnet (SDK defaults to https://polygon-rpc.com/ for POL)
          if (tokenType === 'pol' && !isDevMode) {
            // POL mainnet: Don't pass gatewayUrl - SDK uses https://polygon-rpc.com/ by default
            // (POL is the native token on Polygon Mainnet, like ETH on Ethereum)
          } else {
            // All other tokens: Pass their respective RPC URLs
            turboConfig_forSDK.gatewayUrl = turboConfig.tokenMap[tokenType];
          }

          const turbo = TurboFactory.authenticated(turboConfig_forSDK);

          // Convert to smallest unit (wei for ETH/Base, POL for Polygon)
          const tokenAmount = tokenType === 'pol'
            ? POLToTokenAmount(cryptoAmount)
            : ETHToTokenAmount(cryptoAmount);

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
          const turboAuthenticated = TurboFactory.authenticated({ 
            token: 'solana',
            paymentServiceConfig: {
              url: turboConfig.paymentServiceUrl || 'https://payment.ardrive.io',
            },
            walletAdapter: window.solana,
            gatewayUrl: turboConfig.tokenMap.solana
          });
          
          const result = await turboAuthenticated.topUpWithTokens({ 
            tokenAmount: SOLToTokenAmount(cryptoAmount) // Convert to lamports

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
      
      // Handle SDK compatibility issues for Base ETH
      if (error instanceof Error && error.message.includes('EthereumSigner') && tokenType === 'base-eth') {
        console.log('Base ETH direct payment failed, falling back to manual payment');
        // Fall back to manual payment for Base ETH
        onPaymentComplete({ 
          requiresManualPayment: true, 
          quote,
          tokenType,
          turboWalletAddress
        });
        return;
      }
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds') || (error as any).code === 'INSUFFICIENT_FUNDS') {
          setPaymentError(`Insufficient ${tokenLabels[tokenType]} balance. You need enough to cover both the payment amount and gas fees. Current transaction requires approximately ${cryptoAmount} ${tokenLabels[tokenType]} + gas fees.`);
        } else if (error.message.includes('user rejected') || error.message.includes('denied')) {
          setPaymentError('Transaction was cancelled. Please try again if you want to proceed.');
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          setPaymentError('Network connection issue. Please check your connection and try again.');
        } else if (error.message.includes('gas')) {
          setPaymentError('Transaction gas estimation failed. Please try again or check your wallet settings.');
        } else {
          setPaymentError(`Payment failed: ${error.message}`);
        }
      } else {
        setPaymentError('Payment failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-fg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Wallet className="w-5 h-5 text-fg-muted" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Review Payment</h3>
          <p className="text-sm text-link">Confirm your crypto payment details</p>
        </div>
      </div>

      {/* Single Main Container - All elements inside like Stripe */}
      <div className="bg-gradient-to-br from-fg-muted/5 to-fg-muted/3 rounded-xl border border-default p-6">
        {pricingLoading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-fg-muted border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
              className="text-fg-muted hover:text-fg-muted/80 transition-colors"
            >
              Go Back and Try Different Token
            </button>
          </div>
        ) : quote ? (
          <>
            {/* Order Summary */}
            <div className="bg-canvas p-6 rounded-lg mb-6">
              <div className="flex items-center gap-3 mb-4">
                <TurboLogo />
              </div>
              
              <div className="flex flex-col items-center py-4 mb-4">
                <div className="text-4xl font-bold text-fg-muted mb-1">
                  {quote.credits.toFixed(4)}
                </div>
                <div className="text-sm text-link">Credits</div>
                {quote.gigabytes > 0 && (
                  <div className="text-xs text-link mt-1">
                    ≈ {formatStorage(quote.gigabytes)} storage power
                  </div>
                )}
              </div>

              {/* Token Amount Breakdown */}
              <div className="flex justify-between py-2 text-sm text-link border-t border-default">
                <div>Token Amount:</div>
                <div>{quote.tokenAmount.toFixed(
                  tokenType === 'ethereum' || tokenType === 'base-eth' ? 6
                  : tokenType === 'solana' ? 4
                  : tokenType === 'pol' ? 2
                  : 8
                )} {tokenLabels[tokenType]}</div>
              </div>
              <div className="flex justify-between py-2 text-sm text-link">
                <div>Network:</div>
                <div>{tokenNetworkLabels[tokenType]}</div>
              </div>
            </div>

            {/* Payment Method Info */}
            <div className="bg-surface rounded-lg p-4 border border-default mb-6">
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
            <div className="text-center bg-surface/30 rounded-lg p-4 mb-6">
              <p className="text-xs text-link">
                By continuing, you agree to our{' '}
                <a 
                  href="https://ardrive.io/tos-and-privacy/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-fg-muted hover:text-fg-muted/80 transition-colors"
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a 
                  href="https://ardrive.io/tos-and-privacy/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-fg-muted hover:text-fg-muted/80 transition-colors"
                >
                  Privacy Policy
                </a>
              </p>
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
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
                className="px-6 py-3 rounded-lg bg-fg-muted text-black font-medium hover:bg-fg-muted/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-fg-muted mb-2">Quote Generation Failed</p>
            <p className="text-sm text-link mb-4">
              Unable to generate pricing for {tokenLabels[tokenType]}
            </p>
            <button onClick={onBack} className="text-fg-muted hover:text-fg-muted/80">
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}