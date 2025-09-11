import { useState, useEffect, useCallback } from 'react';
import { Users, ArrowDown, ArrowUp, ChevronDown, X, Check } from 'lucide-react';
import { TurboFactory, TurboAuthenticatedClient, ArconnectSigner, SolanaWalletAdapter } from '@ardrive/turbo-sdk/web';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { useStore } from '../../store/useStore';
import { useTurboConfig } from '../../hooks/useTurboConfig';
import { formatWalletAddress } from '../../utils';
import { wincPerCredit } from '../../constants';
import CopyButton from '../CopyButton';

interface SharedCredits {
  received: {
    totalCredits: number;
    approvals: Array<{
      approvalId: string;
      granterAddress: string;
      winc: string;
      credits: number;
      dateCreated?: string;
      expirationDate?: string;
      usedWincAmount?: string;
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
      expirationDate?: string;
      usedWincAmount?: string;
    }>;
  };
}

export default function CreditSharingSection() {
  const { address, walletType } = useStore();
  const turboConfig = useTurboConfig();
  const [sharedCredits, setSharedCredits] = useState<SharedCredits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokedApprovals, setRevokedApprovals] = useState<Set<string>>(new Set());

  // Create Turbo client (same pattern as BalanceCheckerPanel)
  const createTurboClient = useCallback(async (): Promise<TurboAuthenticatedClient> => {
    if (!address || !walletType) {
      throw new Error('Wallet not connected');
    }
    
    switch (walletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet extension not found');
        }
        const signer = new ArconnectSigner(window.arweaveWallet);
        return TurboFactory.authenticated({ 
          ...turboConfig,
          signer 
        });
        
      case 'ethereum':
        if (!window.ethereum) {
          throw new Error('Ethereum wallet extension not found');
        }
        const ethersProvider = new ethers.BrowserProvider(window.ethereum);
        const ethersSigner = await ethersProvider.getSigner();
        
        return TurboFactory.authenticated({
          token: "ethereum",
          walletAdapter: {
            getSigner: () => ethersSigner as any,
          },
          ...turboConfig,
        });
        
      case 'solana':
        if (!window.solana) {
          throw new Error('Solana wallet extension not found');
        }
        const provider = window.solana;
        const publicKey = new PublicKey((await provider.connect()).publicKey);

        const walletAdapter: SolanaWalletAdapter = {
          publicKey,
          signMessage: async (message: Uint8Array) => {
            const { signature } = await provider.signMessage(message);
            return signature;
          },
        };

        return TurboFactory.authenticated({
          token: "solana",
          walletAdapter,
          ...turboConfig,
        });
        
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [address, walletType, turboConfig]);

  // Fetch shared credits data
  useEffect(() => {
    const fetchSharedCredits = async () => {
      if (!address) return;
      
      setLoading(true);
      setError('');
      
      try {
        const turbo = TurboFactory.unauthenticated(turboConfig);
        const balance = await turbo.getBalance(address);
        
        const {
          winc,
          controlledWinc,
          effectiveBalance,
          givenApprovals,
          receivedApprovals,
        } = balance;
        
        // Calculate shared credits using same formulas as BalanceCheckerPanel
        const sharedCreditsOut = controlledWinc ? (Number(controlledWinc) - Number(winc)) / wincPerCredit : 0;
        const receivedCreditsTotal = effectiveBalance ? (Number(effectiveBalance) - Number(winc)) / wincPerCredit : 0;
        
        const sharedCreditsData: SharedCredits = {
          received: {
            totalCredits: receivedCreditsTotal,
            approvals: receivedApprovals ? receivedApprovals.map((approval: any) => ({
              approvalId: approval.approvalDataItemId || approval.id || 'unknown',
              granterAddress: approval.granterAddress || approval.payingAddress || approval.fromAddress || 'Invalid Address',
              winc: approval.approvedWincAmount || approval.winc || '0',
              credits: Number(approval.approvedWincAmount || approval.winc || 0) / wincPerCredit,
              dateCreated: approval.creationDate || approval.dateCreated,
              expirationDate: approval.expirationDate,
              usedWincAmount: approval.usedWincAmount,
            })) : []
          },
          given: {
            totalCredits: sharedCreditsOut,
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
        
        setSharedCredits(sharedCreditsData);
      } catch (error) {
        console.error('Failed to fetch shared credits:', error);
        setError('Failed to load credit sharing details');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedCredits();
  }, [address, turboConfig]);

  // Revoke functionality (same as BalanceCheckerPanel)
  const handleRevokeApproval = async (approvalId: string, revokedAddress: string) => {
    setRevoking(approvalId);
    setError('');
    
    try {
      const turbo = await createTurboClient();
      
      const revokedApprovals = await turbo.revokeCredits({
        revokedAddress: revokedAddress,
      });
      
      console.log('Revoke result:', revokedApprovals);
      
      // Mark as revoked and refresh after delay
      setRevokedApprovals(prev => new Set([...prev, approvalId]));
      
      setTimeout(async () => {
        // Refresh the data
        const turbo = TurboFactory.unauthenticated(turboConfig);
        const balance = await turbo.getBalance(address!);
        
        const {
          winc,
          controlledWinc,
          effectiveBalance,
          givenApprovals,
          receivedApprovals,
        } = balance;
        
        const sharedCreditsOut = controlledWinc ? (Number(controlledWinc) - Number(winc)) / wincPerCredit : 0;
        const receivedCreditsTotal = effectiveBalance ? (Number(effectiveBalance) - Number(winc)) / wincPerCredit : 0;
        
        const updatedData: SharedCredits = {
          received: {
            totalCredits: receivedCreditsTotal,
            approvals: receivedApprovals ? receivedApprovals.map((approval: any) => ({
              approvalId: approval.approvalDataItemId || approval.id || 'unknown',
              granterAddress: approval.granterAddress || approval.payingAddress || approval.fromAddress || 'Invalid Address',
              winc: approval.approvedWincAmount || approval.winc || '0',
              credits: Number(approval.approvedWincAmount || approval.winc || 0) / wincPerCredit,
              dateCreated: approval.creationDate || approval.dateCreated,
              expirationDate: approval.expirationDate,
              usedWincAmount: approval.usedWincAmount,
            })) : []
          },
          given: {
            totalCredits: sharedCreditsOut,
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
        
        setSharedCredits(updatedData);
        setRevokedApprovals(prev => {
          const newSet = new Set(prev);
          newSet.delete(approvalId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to revoke approval:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke approval';
      setError(`Revoke failed: ${errorMessage}`);
    } finally {
      setRevoking(null);
    }
  };

  if (!sharedCredits && !loading) {
    return null;
  }

  const hasSharedCredits = sharedCredits && (
    sharedCredits.received.approvals.length > 0 || 
    sharedCredits.given.approvals.length > 0
  );

  return (
    <div className="bg-surface rounded-lg border border-default">
      {/* Header */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 text-left hover:bg-canvas/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-link" />
          <h3 className="font-bold text-fg-muted">Credit Sharing Details</h3>
          {loading && <span className="text-xs text-link">(Loading...)</span>}
        </div>
        <ChevronDown className={`w-5 h-5 text-link transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
          {error}
        </div>
      )}
      
      {/* Expandable Details */}
      {showDetails && hasSharedCredits && (
        <div className="px-4 pb-4 border-t border-default/30 space-y-6">
          {/* Received Credits */}
          {sharedCredits.received.approvals.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDown className="w-4 h-4 text-turbo-green" />
                <span className="text-sm font-medium text-fg-muted">
                  Credits Available From Others ({isNaN(sharedCredits.received.totalCredits) ? '0.00' : sharedCredits.received.totalCredits.toFixed(2)} total)
                </span>
              </div>
              <p className="text-xs text-link mb-2">These users have shared their credits with your wallet:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sharedCredits.received.approvals.map((approval) => (
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
                            {approval.expirationDate 
                              ? new Date(approval.expirationDate).toLocaleString()
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
                        {approval.usedWincAmount && Number(approval.usedWincAmount) > 0 && (
                          <div className="col-span-2">
                            <span className="text-link">Used:</span>
                            <span className="ml-1 text-fg-muted">
                              {(Number(approval.usedWincAmount) / 1e12).toFixed(4)} Credits
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
          {sharedCredits.given.approvals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowUp className="w-4 h-4 text-fg-muted" />
                <span className="text-sm font-medium text-fg-muted">
                  Credits This Wallet Shared Out ({isNaN(sharedCredits.given.totalCredits) ? '0.00' : sharedCredits.given.totalCredits.toFixed(2)} total)
                </span>
              </div>
              <p className="text-xs text-link mb-2">You have shared credits with these recipients:</p>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {sharedCredits.given.approvals.map((approval) => (
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
                        {/* Revoke Button - only show for your own wallet */}
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
                            {approval.expirationDate 
                              ? new Date(approval.expirationDate).toLocaleString()
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
                        {approval.usedWincAmount && Number(approval.usedWincAmount) > 0 && (
                          <div className="col-span-2">
                            <span className="text-link">Used:</span>
                            <span className="ml-1 text-fg-muted">
                              {(Number(approval.usedWincAmount) / 1e12).toFixed(4)} Credits
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
      
      {/* Empty State */}
      {showDetails && !loading && sharedCredits && !hasSharedCredits && (
        <div className="px-4 pb-4 border-t border-default/30">
          <div className="text-center py-6">
            <Users className="w-12 h-12 text-link mx-auto mb-3" />
            <p className="text-fg-muted mb-2">No Credit Sharing Activity</p>
            <p className="text-sm text-link">You haven't shared or received any credits yet</p>
          </div>
        </div>
      )}
    </div>
  );
}