import { useState, useEffect, useCallback } from 'react';
import { TurboFactory, TurboAuthenticatedClient, ArconnectSigner } from '@ardrive/turbo-sdk/web';
import { wincPerCredit } from '../../constants';
import { useTurboConfig } from '../../hooks/useTurboConfig';
import { useStore } from '../../store/useStore';
import { Search, Wallet, ExternalLink, Info, Coins, HardDrive, Share2, Users, ArrowDown, ArrowUp, ChevronDown, X, Check } from 'lucide-react';
import { formatWalletAddress } from '../../utils';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { usePrimaryArNSName } from '../../hooks/usePrimaryArNSName';
import CopyButton from '../CopyButton';
import { useEthereumTurboClient } from '../../hooks/useEthereumTurboClient';

interface BalanceResult {
  address: string;
  winc: string;
  credits: number;
  gibStorage: number;
  arnsName?: string;
  sharedCredits?: {
    received: {
      totalCredits: number;
      approvals: Array<{
        approvalId: string;
        granterAddress: string;
        winc: string;
        credits: number;
        dateCreated?: string;
      }>;
    };
    given: {
      totalCredits: number;
      approvals: Array<{
        approvalId: string;
        recipientAddress: string;
        winc: string;
        credits: number;
        dateCreated?: string;
      }>;
    };
  };
}

export default function BalanceCheckerPanel() {
  const { address: connectedAddress, walletType } = useStore();
  const turboConfig = useTurboConfig();
  const { createEthereumTurboClient } = useEthereumTurboClient(); // Shared Ethereum client with custom connect message
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSharingDetails, setShowSharingDetails] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokedApprovals, setRevokedApprovals] = useState<Set<string>>(new Set());
  const wincForOneGiB = useWincForOneGiB();

  // Get ArNS name for the searched address
  const { arnsName, loading: loadingArNS } = usePrimaryArNSName(balanceResult?.address || null);

  // Create Turbo client with proper wallet support
  const createTurboClient = useCallback(async (): Promise<TurboAuthenticatedClient> => {
    if (!connectedAddress || !walletType) {
      throw new Error('Wallet not connected');
    }

    switch (walletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet extension not found. Please install from https://wander.app');
        }
        const signer = new ArconnectSigner(window.arweaveWallet);
        return TurboFactory.authenticated({
          ...turboConfig,
          signer
        });

      case 'ethereum':
        // Use the shared Ethereum Turbo client with custom connect message
        return createEthereumTurboClient('ethereum');

      case 'solana':
        if (!window.solana) {
          throw new Error('Solana wallet extension not found. Please install Phantom or Solflare');
        }

        return TurboFactory.authenticated({
          token: "solana",
          walletAdapter: window.solana,
          ...turboConfig,
        });

      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [connectedAddress, walletType, turboConfig, createEthereumTurboClient]);

  // Load recent searches from localStorage and check for pre-filled address
  useEffect(() => {
    const saved = localStorage.getItem('recentBalanceSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }

    // Check for pre-filled address from profile dropdown click
    const preFilledAddress = localStorage.getItem('balances-address');
    if (preFilledAddress) {
      setWalletAddress(preFilledAddress);
      // Auto-search the pre-filled address
      setTimeout(() => {
        handleCheckBalance(preFilledAddress);
      }, 100);
      // Clear the localStorage item after using it
      localStorage.removeItem('balances-address');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save recent searches
  const addToRecentSearches = useCallback((address: string) => {
    const updated = [address, ...recentSearches.filter(a => a !== address)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentBalanceSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const validateAddress = useCallback((address: string): boolean => {
    if (!address) return false;
    
    // Arweave address (43 characters, base64url)
    const arweaveRegex = /^[a-zA-Z0-9_-]{43}$/;
    
    // Ethereum address (42 characters, starts with 0x)
    const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
    
    // Solana address (32-44 characters, base58)
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    return arweaveRegex.test(address) || ethereumRegex.test(address) || solanaRegex.test(address);
  }, []);

  const handleCheckBalance = useCallback(async (addressToCheck?: string) => {
    const targetAddress = addressToCheck || walletAddress.trim();
    
    if (!targetAddress) {
      setError('Please enter a wallet address');
      return;
    }

    if (!validateAddress(targetAddress)) {
      setError('Invalid wallet address format. Please enter a valid Arweave, Ethereum, or Solana address.');
      return;
    }

    setLoading(true);
    setError('');
    setBalanceResult(null);

    try {
      const turbo = TurboFactory.unauthenticated(turboConfig);
      
      // Fetch balance (includes all shared credits data like reference app)
      const balance = await turbo.getBalance(targetAddress);
            
      // Process balance data using reference app pattern
      const {
        winc,
        controlledWinc,
        effectiveBalance,
        givenApprovals,
        receivedApprovals,
      } = balance;
      
      const credits = Number(winc) / wincPerCredit;
      let gibStorage = 0;
      if (wincForOneGiB) {
        gibStorage = Number(winc) / Number(wincForOneGiB);
      }
            
      // Calculate shared credits using reference app formulas
      const sharedCreditsOut = controlledWinc ? (Number(controlledWinc) - Number(winc)) / wincPerCredit : 0;
      const receivedCreditsTotal = effectiveBalance ? (Number(effectiveBalance) - Number(winc)) / wincPerCredit : 0;
      
      // Process shared credits using balance data (like reference app)
      const sharedCredits = {
        received: {
          totalCredits: receivedCreditsTotal, // Use reference app calculation
          approvals: receivedApprovals ? receivedApprovals.map((approval: any) => {
            return {
              approvalId: approval.approvalDataItemId || approval.id || 'unknown',
              granterAddress: approval.granterAddress || approval.payingAddress || approval.fromAddress || 'Invalid Address',
              winc: approval.approvedWincAmount || approval.winc || '0',
              credits: Number(approval.approvedWincAmount || approval.winc || 0) / wincPerCredit,
              dateCreated: approval.creationDate || approval.dateCreated,
              expirationDate: approval.expirationDate,
              usedWincAmount: approval.usedWincAmount,
            };
          }) : []
        },
        given: {
          totalCredits: sharedCreditsOut, // Use reference app calculation
          approvals: givenApprovals ? givenApprovals.map((approval: any) => ({
            approvalId: approval.approvalDataItemId || approval.id || 'unknown',
            recipientAddress: approval.approvedAddress,
            winc: approval.approvedWincAmount || approval.winc || '0',
            credits: Number(approval.approvedWincAmount || approval.winc || 0) / wincPerCredit,
            dateCreated: approval.creationDate || approval.dateCreated,
            expirationDate: approval.expirationDate,
            usedWincAmount: approval.usedWincAmount,
          })) : []
        }
      };

      setBalanceResult({
        address: targetAddress,
        winc: winc,
        credits: credits,
        gibStorage: gibStorage,
        sharedCredits: sharedCredits
      });

      // Add to recent searches
      addToRecentSearches(targetAddress);
      
      // If checking a different address, update the input
      if (addressToCheck) {
        setWalletAddress(addressToCheck);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError('Failed to fetch balance. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, turboConfig, wincForOneGiB, validateAddress, addToRecentSearches]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheckBalance();
    }
  };

  const handleQuickCheck = (type: 'connected' | 'recent', address?: string) => {
    if (type === 'connected' && connectedAddress) {
      setWalletAddress(connectedAddress);
      handleCheckBalance(connectedAddress);
    } else if (type === 'recent' && address) {
      setWalletAddress(address);
      handleCheckBalance(address);
    }
  };

  const handleRevokeApproval = async (approvalId: string, revokedAddress: string) => {
    if (!connectedAddress || connectedAddress !== balanceResult?.address) {
      setError('You can only revoke approvals from your own connected wallet');
      return;
    }

    if (!walletType) {
      setError('Wallet type not detected. Please reconnect your wallet.');
      return;
    }

    setRevoking(approvalId);
    setError('');
    
    try {
      // Create Turbo client using exact same pattern as file uploads
      const turbo = await createTurboClient();
      
      // Revoke all credits shared with this address
      await turbo.revokeCredits({
        revokedAddress: revokedAddress,
      });
      
      
      // Immediately mark this approval as revoked for UI feedback
      setRevokedApprovals(prev => new Set([...prev, approvalId]));
      
      // Auto-refresh data after 2 seconds to show updated state
      setTimeout(async () => {
        if (balanceResult?.address) {
          await handleCheckBalance(balanceResult.address);
          // Clear the revoked state after refresh
          setRevokedApprovals(prev => {
            const newSet = new Set(prev);
            newSet.delete(approvalId);
            return newSet;
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to revoke approval:', error);
      
      let errorMessage = 'Failed to revoke approval';
      if (error instanceof Error) {
        if (error.message.includes('Unable to revoke delegated payment approval')) {
          errorMessage = 'This approval may already be revoked or expired, or you may not have permission to revoke it.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid revoke request. The approval may no longer exist or be revokable.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(`Revoke failed: ${errorMessage}`);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-fg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Search className="w-5 h-5 text-fg-muted" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Check Balance</h3>
          <p className="text-sm text-link">
            Check the Turbo credit balance of any wallet address (Arweave, Ethereum, or Solana)
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-fg-muted/5 to-fg-muted/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">

      {/* Search Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Wallet Address</label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fg-disabled" />
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Paste wallet address here..."
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-default bg-canvas text-fg-muted font-mono text-sm focus:border-fg-muted focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => handleCheckBalance()}
              disabled={loading || !walletAddress.trim()}
              className="px-6 py-3 rounded-lg bg-fg-muted text-black font-bold hover:bg-fg-muted/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Checking...' : 'Check'}
            </button>
          </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 space-y-3">
        {connectedAddress && (
          <button
            onClick={() => handleQuickCheck('connected')}
            className="w-full p-3 rounded border border-default bg-surface hover:bg-surface/80 transition-colors text-left flex items-center justify-between group"
            disabled={loading}
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-link" />
              <div>
                <span className="text-sm font-medium">Check Connected Wallet</span>
                <div className="text-xs text-link">{formatWalletAddress(connectedAddress)}</div>
              </div>
            </div>
            <span className="text-xs text-link group-hover:text-fg-muted">Quick check →</span>
          </button>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div>
            <p className="text-xs text-link mb-2 uppercase tracking-wider">Recent Searches</p>
            <div className="space-y-2">
              {recentSearches.map((address) => (
                <button
                  key={address}
                  onClick={() => handleQuickCheck('recent', address)}
                  className="w-full p-2 rounded border border-default bg-canvas hover:bg-surface transition-colors text-left flex items-center justify-between group"
                  disabled={loading}
                >
                  <span className="text-sm font-mono text-link truncate">
                    {formatWalletAddress(address, 10)}
                  </span>
                  <span className="text-xs text-link opacity-0 group-hover:opacity-100 transition-opacity">
                    Check →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Balance Result */}
      {balanceResult && (
        <div className="mt-4 sm:mt-6 space-y-4">
          {/* Address Info */}
          <div className="p-4 rounded-lg bg-surface border border-default">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-fg-muted flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Details
              </h4>
              <div className="flex items-center gap-2">
                <CopyButton textToCopy={balanceResult.address} />
                <button
                  onClick={() => {
                    // Determine which explorer to use based on address format
                    const isEthereum = balanceResult.address.startsWith('0x');
                    const isSolana = !balanceResult.address.startsWith('0x') && balanceResult.address.length >= 32 && balanceResult.address.length <= 44 && !/[_-]/.test(balanceResult.address);
                    
                    let explorerUrl = '';
                    if (isEthereum) {
                      explorerUrl = `https://etherscan.io/address/${balanceResult.address}`;
                    } else if (isSolana) {
                      explorerUrl = `https://explorer.solana.com/address/${balanceResult.address}`;
                    } else {
                      explorerUrl = `https://viewblock.io/arweave/address/${balanceResult.address}`;
                    }
                    
                    window.open(explorerUrl, '_blank');
                  }}
                  className="p-1.5 rounded hover:bg-canvas transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-4 h-4 text-link hover:text-fg-muted" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {(arnsName || loadingArNS) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-link">ArNS Name:</span>
                  <span className="font-medium text-fg-muted">
                    {loadingArNS ? 'Loading...' : arnsName || 'None'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-link">Address:</span>
                <span className="font-mono text-xs">{formatWalletAddress(balanceResult.address, 12)}</span>
              </div>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Credits Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 border border-fg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-fg-muted" />
                <span className="font-medium text-fg-muted">Credits</span>
              </div>
              
              <div className="text-2xl font-bold text-fg-muted mb-1">
                {(() => {
                  const credits = balanceResult.credits;
                  if (credits >= 1) {
                    return credits.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    });
                  } else if (credits > 0) {
                    return credits.toLocaleString('en-US', {
                      minimumFractionDigits: 6,
                      maximumFractionDigits: 8
                    });
                  } else {
                    return '0';
                  }
                })()}
              </div>
              
              <div className="text-xs text-link">
                {balanceResult.credits < 1 && balanceResult.credits > 0 
                  ? 'Very small amount - needs top-up'
                  : 'Spendable balance'
                }
              </div>
            </div>

            {/* Storage Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-turbo-blue/10 to-turbo-blue/5 border border-turbo-blue/20">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-5 h-5 text-turbo-blue" />
                <span className="font-medium text-fg-muted">Storage</span>
              </div>
              
              <div className="text-2xl font-bold text-fg-muted mb-1">
                {balanceResult.gibStorage.toFixed(2)} GiB
              </div>
              
              <div className="text-xs text-link">
                Available storage capacity
              </div>
            </div>

            {/* Shared Out Credits Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-fg-muted">Credits Shared</span>
              </div>
              
              <div className="text-2xl font-bold text-fg-muted mb-1">
                {(() => {
                  const total = balanceResult.sharedCredits?.given.totalCredits || 0;
                  if (isNaN(total)) return '0';
                  return total.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  });
                })()}
              </div>
              
              <div className="text-xs text-link">
                Credits shared with others
              </div>
            </div>

            {/* Credits Available from Others Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDown className="w-5 h-5 text-green-500" />
                <span className="font-medium text-fg-muted">Credits Available</span>
              </div>
              
              <div className="text-2xl font-bold text-fg-muted mb-1">
                {(() => {
                  const total = balanceResult.sharedCredits?.received.totalCredits || 0;
                  if (isNaN(total)) return '0';
                  return total.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  });
                })()}
              </div>
              
              <div className="text-xs text-link">
                Shared by others for use
              </div>
            </div>
          </div>

          {/* Shared Credits Details - Expandable */}
          {balanceResult.sharedCredits && (balanceResult.sharedCredits.received.approvals.length > 0 || balanceResult.sharedCredits.given.approvals.length > 0) && (
            <div className="rounded-lg bg-surface border border-default">
              <button
                onClick={() => setShowSharingDetails(!showSharingDetails)}
                className="w-full p-4 text-left hover:bg-canvas/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-link" />
                  <h4 className="font-bold text-fg-muted">Credit Sharing Details</h4>
                </div>
                <ChevronDown className={`w-5 h-5 text-link transition-transform ${showSharingDetails ? 'rotate-180' : ''}`} />
              </button>
              
              {showSharingDetails && (
                <div className="px-4 pb-4 border-t border-default/30 space-y-6">
                  {/* Received Credits */}
                  {balanceResult.sharedCredits.received.approvals.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowDown className="w-4 h-4 text-turbo-green" />
                        <span className="text-sm font-medium text-fg-muted">
                          Credits Available From Others ({isNaN(balanceResult.sharedCredits.received.totalCredits) ? '0.00' : balanceResult.sharedCredits.received.totalCredits.toFixed(2)} total)
                        </span>
                      </div>
                      <p className="text-xs text-link mb-2">These users have shared their credits with this wallet:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {balanceResult.sharedCredits.received.approvals.map((approval) => (
                          <div key={approval.approvalId} className="bg-canvas rounded-lg p-4 border border-default/30">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="font-mono text-xs text-link">
                                  {formatWalletAddress(approval.granterAddress, 8)}
                                </div>
                                <CopyButton textToCopy={approval.granterAddress} />
                              </div>
                              <div className="text-turbo-green font-medium">
                                +{isNaN(approval.credits) ? '0.00' : approval.credits.toFixed(2)} Credits
                              </div>
                            </div>
                            
                            {/* Enhanced Details */}
                            <div className="text-xs text-link space-y-1 pl-2 border-l border-default/30">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {approval.dateCreated && (
                                  <div>
                                    <span className="text-link">Shared:</span>
                                    <span className="ml-1 text-fg-muted">
                                      {new Date(approval.dateCreated).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-link">Expires:</span>
                                  <span className="ml-1 text-fg-muted">
                                    {(approval as any).expirationDate 
                                      ? new Date((approval as any).expirationDate).toLocaleString()
                                      : 'Never'
                                    }
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-link">Approval ID:</span>
                                  <span className="ml-1 text-fg-muted font-mono text-xs">
                                    {approval.approvalId.substring(0, 8)}...
                                  </span>
                                  <span className="ml-1">
                                    <CopyButton textToCopy={approval.approvalId} />
                                  </span>
                                </div>
                                {(approval as any).usedWincAmount && Number((approval as any).usedWincAmount) > 0 && (
                                  <div className="col-span-2">
                                    <span className="text-link">Used:</span>
                                    <span className="ml-1 text-fg-muted">
                                      {(Number((approval as any).usedWincAmount) / 1e12).toFixed(4)} Credits
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Given Credits */}
                  {balanceResult.sharedCredits.given.approvals.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowUp className="w-4 h-4 text-fg-muted" />
                        <span className="text-sm font-medium text-fg-muted">
                          Credits Shared Out ({isNaN(balanceResult.sharedCredits.given.totalCredits) ? '0.00' : balanceResult.sharedCredits.given.totalCredits.toFixed(2)} total)
                        </span>
                      </div>
                      <p className="text-xs text-link mb-2">This wallet has shared credits with these recipients:</p>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {balanceResult.sharedCredits.given.approvals.map((approval) => (
                          <div key={approval.approvalId} className="bg-canvas rounded-lg p-4 border border-default/30">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="font-mono text-xs text-link">
                                  {formatWalletAddress(approval.recipientAddress, 8)}
                                </div>
                                <CopyButton textToCopy={approval.recipientAddress} />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-fg-muted font-medium">
                                  -{isNaN(approval.credits) ? '0.00' : approval.credits.toFixed(2)} Credits
                                </div>
                                {/* Revoke Button - only show if viewing your own connected wallet */}
                                {connectedAddress && connectedAddress === balanceResult.address && (
                                  <button
                                    onClick={() => handleRevokeApproval(approval.approvalId, approval.recipientAddress)}
                                    disabled={revoking === approval.approvalId || revokedApprovals.has(approval.approvalId)}
                                    className={`p-1.5 rounded transition-colors ${
                                      revokedApprovals.has(approval.approvalId)
                                        ? 'text-turbo-green bg-turbo-green/10 cursor-default'
                                        : 'text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50'
                                    }`}
                                    title={
                                      revokedApprovals.has(approval.approvalId)
                                        ? 'Successfully revoked - refreshing data...'
                                        : `Revoke all credits shared with ${formatWalletAddress(approval.recipientAddress, 8)}`
                                    }
                                  >
                                    {revoking === approval.approvalId ? (
                                      <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                    ) : revokedApprovals.has(approval.approvalId) ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <X className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Enhanced Details */}
                            <div className="text-xs text-link space-y-1 pl-2 border-l border-default/30">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {approval.dateCreated && (
                                  <div>
                                    <span className="text-link">Created:</span>
                                    <span className="ml-1 text-fg-muted">
                                      {new Date(approval.dateCreated).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-link">Expires:</span>
                                  <span className="ml-1 text-fg-muted">
                                    {(approval as any).expirationDate 
                                      ? new Date((approval as any).expirationDate).toLocaleString()
                                      : 'Never'
                                    }
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-link">Approval ID:</span>
                                  <span className="ml-1 text-fg-muted font-mono text-xs">
                                    {approval.approvalId.substring(0, 8)}...
                                  </span>
                                  <span className="ml-1">
                                    <CopyButton textToCopy={approval.approvalId} />
                                  </span>
                                </div>
                                {(approval as any).usedWincAmount && Number((approval as any).usedWincAmount) > 0 && (
                                  <div className="col-span-2">
                                    <span className="text-link">Used:</span>
                                    <span className="ml-1 text-fg-muted">
                                      {(Number((approval as any).usedWincAmount) / 1e12).toFixed(4)} Credits
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info Note */}
          <div className="p-3 rounded bg-surface/50 border border-default flex items-start gap-2">
            <Info className="w-4 h-4 text-link mt-0.5 flex-shrink-0" />
            <div className="text-xs text-link">
              <p>This balance represents the credits available for uploads and transactions on the Turbo network.</p>
              <p className="mt-1">Small amounts are displayed with additional decimal places for accuracy.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}