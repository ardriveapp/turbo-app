import { useState, useEffect } from 'react';
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { turboConfig, wincPerCredit } from '../../constants';
import { useStore } from '../../store/useStore';
import { Search, Wallet, Copy, ExternalLink, Info, Coins, HardDrive, Share2, Users, ArrowDown, ArrowUp } from 'lucide-react';
import { formatWalletAddress } from '../../utils';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useArNSName } from '../../hooks/useArNSName';
import CopyButton from '../CopyButton';

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
  const { address: connectedAddress } = useStore();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const wincForOneGiB = useWincForOneGiB();
  
  // Get ArNS name for the searched address
  const { arnsName, loading: loadingArNS } = useArNSName(balanceResult?.address || null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentBalanceSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches
  const addToRecentSearches = (address: string) => {
    const updated = [address, ...recentSearches.filter(a => a !== address)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentBalanceSearches', JSON.stringify(updated));
  };

  const validateAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Arweave address (43 characters, base64url)
    const arweaveRegex = /^[a-zA-Z0-9_-]{43}$/;
    
    // Ethereum address (42 characters, starts with 0x)
    const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
    
    // Solana address (32-44 characters, base58)
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    return arweaveRegex.test(address) || ethereumRegex.test(address) || solanaRegex.test(address);
  };

  const handleCheckBalance = async (addressToCheck?: string) => {
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
      
      // Fetch balance and shared credits in parallel
      console.log('Fetching balance and shared credits for:', targetAddress);
      const [balance, shareApprovals] = await Promise.allSettled([
        turbo.getBalance(targetAddress),
        turbo.getCreditShareApprovals({ userAddress: targetAddress })
      ]);
      
      console.log('Balance API result:', balance);
      console.log('Share approvals API result:', shareApprovals);
      
      // Process balance data
      if (balance.status === 'rejected') {
        throw new Error('Failed to fetch balance');
      }
      
      const credits = Number(balance.value.winc) / wincPerCredit;
      let gibStorage = 0;
      if (wincForOneGiB) {
        gibStorage = Number(balance.value.winc) / Number(wincForOneGiB);
      }
      
      // Process shared credits data
      let sharedCredits = undefined;
      if (shareApprovals.status === 'fulfilled') {
        const { givenApprovals, receivedApprovals } = shareApprovals.value;
        console.log('Share approvals data:', { givenApprovals, receivedApprovals });
        
        // Calculate totals and format data with NaN protection
        const receivedTotal = receivedApprovals.reduce((sum: number, approval: any) => {
          const winc = Number(approval.winc || 0);
          return sum + (isNaN(winc) ? 0 : winc / wincPerCredit);
        }, 0);
        
        const givenTotal = givenApprovals.reduce((sum: number, approval: any) => {
          const winc = Number(approval.winc || 0);
          return sum + (isNaN(winc) ? 0 : winc / wincPerCredit);
        }, 0);
        
        sharedCredits = {
          received: {
            totalCredits: receivedTotal,
            approvals: receivedApprovals.filter((approval: any) => approval.granterAddress).map((approval: any) => {
              const winc = Number(approval.winc || 0);
              return {
                approvalId: approval.approvalId || 'unknown',
                granterAddress: approval.granterAddress,
                winc: approval.winc || '0',
                credits: isNaN(winc) ? 0 : winc / wincPerCredit,
                dateCreated: approval.dateCreated
              };
            })
          },
          given: {
            totalCredits: givenTotal,
            approvals: givenApprovals.filter((approval: any) => approval.recipientAddress).map((approval: any) => {
              const winc = Number(approval.winc || 0);
              return {
                approvalId: approval.approvalId || 'unknown',
                recipientAddress: approval.recipientAddress,
                winc: approval.winc || '0',
                credits: isNaN(winc) ? 0 : winc / wincPerCredit,
                dateCreated: approval.dateCreated
              };
            })
          }
        };
      } else {
        console.warn('Failed to fetch shared credits:', shareApprovals.reason);
      }

      setBalanceResult({
        address: targetAddress,
        winc: balance.value.winc,
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
  };

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

  return (
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Search className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Balance Checker</h3>
          <p className="text-sm text-link">
            Check the Turbo credit balance of any wallet address (Arweave, Ethereum, or Solana)
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6 mb-6">

      {/* Search Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Wallet Address</label>
        <div className="bg-surface rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fg-disabled" />
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Paste wallet address here..."
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-default bg-canvas text-fg-muted font-mono text-sm focus:border-turbo-red focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => handleCheckBalance()}
              disabled={loading || !walletAddress.trim()}
              className="px-6 py-3 rounded-lg bg-turbo-red text-white font-bold hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Checking...' : 'Check'}
            </button>
          </div>
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
        <div className="mt-6 space-y-4">
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
                  <span className="font-medium text-turbo-red">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Credits Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-turbo-red/10 to-turbo-red/5 border border-turbo-red/20">
              <div className="flex items-center justify-between mb-2">
                <Coins className="w-5 h-5 text-turbo-red" />
                <span className="text-xs text-link uppercase tracking-wider">Credits</span>
              </div>
              <div className="text-2xl font-bold text-fg-muted">
                {(() => {
                  const credits = balanceResult.credits;
                  if (credits >= 1) {
                    // Normal credits display
                    return credits.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    });
                  } else if (credits > 0) {
                    // Very small amounts - show more decimals
                    return credits.toLocaleString('en-US', {
                      minimumFractionDigits: 6,
                      maximumFractionDigits: 8
                    });
                  } else {
                    return '0';
                  }
                })()}
              </div>
              {balanceResult.credits < 1 && balanceResult.credits > 0 && (
                <div className="text-xs text-yellow-500 mt-1">
                  Very small amount - needs top-up
                </div>
              )}
            </div>

            {/* Storage Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-turbo-blue/10 to-turbo-blue/5 border border-turbo-blue/20">
              <div className="flex items-center justify-between mb-2">
                <HardDrive className="w-5 h-5 text-turbo-blue" />
                <span className="text-xs text-link uppercase tracking-wider">Storage</span>
              </div>
              <div className="text-2xl font-bold text-fg-muted">
                {balanceResult.gibStorage.toFixed(2)} GiB
              </div>
            </div>

            {/* Shared Credits Card */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <Share2 className="w-5 h-5 text-purple-500" />
                <span className="text-xs text-link uppercase tracking-wider">Shared</span>
              </div>
              <div className="text-lg font-bold text-fg-muted">
                {(() => {
                  const total = balanceResult.sharedCredits?.received.totalCredits || 0;
                  if (isNaN(total)) return '0';
                  return total.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  });
                })()}
              </div>
              <div className="text-xs text-purple-500 mt-1">
                Credits others shared with you
              </div>
            </div>
          </div>

          {/* Shared Credits Details */}
          {balanceResult.sharedCredits && (balanceResult.sharedCredits.received.approvals.length > 0 || balanceResult.sharedCredits.given.approvals.length > 0) && (
            <div className="p-4 rounded-lg bg-surface border border-default">
              <h4 className="font-bold text-fg-muted mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Credit Sharing Details
              </h4>
              
              <div className="space-y-4">
                {/* Received Credits */}
                {balanceResult.sharedCredits.received.approvals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowDown className="w-4 h-4 text-turbo-green" />
                      <span className="text-sm font-medium text-fg-muted">
                        Credits Available From Others ({isNaN(balanceResult.sharedCredits.received.totalCredits) ? '0.00' : balanceResult.sharedCredits.received.totalCredits.toFixed(2)} total)
                      </span>
                    </div>
                    <p className="text-xs text-link mb-2">These users have shared their credits with this wallet:</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {balanceResult.sharedCredits.received.approvals.map((approval, idx) => (
                        <div key={approval.approvalId} className="flex items-center justify-between bg-canvas rounded p-3 text-sm">
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Given Credits */}
                {balanceResult.sharedCredits.given.approvals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowUp className="w-4 h-4 text-turbo-red" />
                      <span className="text-sm font-medium text-fg-muted">
                        Credits This Wallet Shared Out ({isNaN(balanceResult.sharedCredits.given.totalCredits) ? '0.00' : balanceResult.sharedCredits.given.totalCredits.toFixed(2)} total)
                      </span>
                    </div>
                    <p className="text-xs text-link mb-2">This wallet has shared credits with these recipients:</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {balanceResult.sharedCredits.given.approvals.map((approval, idx) => (
                        <div key={approval.approvalId} className="flex items-center justify-between bg-canvas rounded p-3 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-xs text-link">
                              {formatWalletAddress(approval.recipientAddress, 8)}
                            </div>
                            <CopyButton textToCopy={approval.recipientAddress} />
                          </div>
                          <div className="text-turbo-red font-medium">
                            -{isNaN(approval.credits) ? '0.00' : approval.credits.toFixed(2)} Credits
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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