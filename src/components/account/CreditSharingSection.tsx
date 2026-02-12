import { useState, useEffect, useCallback } from 'react';
import { Users, ArrowDown, ArrowUp, ChevronDown, X, Check } from 'lucide-react';
import { TurboFactory, TurboAuthenticatedClient, ArconnectSigner } from '@ardrive/turbo-sdk/web';
import { useStore } from '../../store/useStore';
import { useTurboConfig } from '../../hooks/useTurboConfig';
import { formatWalletAddress } from '../../utils';
import { wincPerCredit } from '../../constants';
import CopyButton from '../CopyButton';
import { useEthereumTurboClient } from '../../hooks/useEthereumTurboClient';

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
  const { createEthereumTurboClient } = useEthereumTurboClient(); // Shared Ethereum client with custom connect message
  const [sharedCredits, setSharedCredits] = useState<SharedCredits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokedApprovals, setRevokedApprovals] = useState<Set<string>>(new Set());

  // Create Turbo client
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
        // Use the shared Ethereum Turbo client with custom connect message
        return createEthereumTurboClient('ethereum');

      case 'solana':
        if (!window.solana) {
          throw new Error('Solana wallet extension not found');
        }

        return TurboFactory.authenticated({
          token: "solana",
          walletAdapter: window.solana,
          ...turboConfig,
        });

      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }, [address, walletType, turboConfig, createEthereumTurboClient]);

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
    <div className="bg-card rounded-2xl border border-border/20">
      {/* Header */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 sm:p-6 text-left hover:bg-card/30 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-foreground/20 rounded-lg flex items-center justify-center border border-border/20">
            <Users className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Credit Sharing Details</h3>
            <p className="text-sm text-foreground/80">
              {loading ? 'Loading...' : hasSharedCredits ? 'View your sharing activity' : 'No sharing activity yet'}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-foreground transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </button>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-error/10 border border-error/20 rounded text-sm text-error">
          {error}
        </div>
      )}

      {/* Expandable Details */}
      {showDetails && hasSharedCredits && (
        <div className="px-4 pb-4 border-t border-border/20 space-y-6">
          {/* Received Credits */}
          {sharedCredits.received.approvals.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDown className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-foreground">
                  Credits Available From Others ({isNaN(sharedCredits.received.totalCredits) ? '0.00' : sharedCredits.received.totalCredits.toFixed(2)} total)
                </span>
              </div>
              <p className="text-xs text-foreground/80 mb-2">These users have shared their credits with your wallet:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sharedCredits.received.approvals.map((approval) => (
                  <div key={approval.approvalId} className="bg-card rounded-2xl p-4 border border-border/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-xs text-foreground/80">
                          {formatWalletAddress(approval.granterAddress, 8)}
                        </div>
                        <CopyButton textToCopy={approval.granterAddress} />
                      </div>
                      <div className="text-success font-medium">
                        +{isNaN(approval.credits) ? '0.00' : approval.credits.toFixed(2)} Credits
                      </div>
                    </div>

                    {/* Enhanced Details */}
                    <div className="text-xs text-foreground/80 space-y-1 pl-2 border-l border-border/20">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {approval.dateCreated && (
                          <div>
                            <span className="text-foreground/80">Shared:</span>
                            <span className="ml-1 text-foreground">
                              {new Date(approval.dateCreated).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-foreground/80">Expires:</span>
                          <span className="ml-1 text-foreground">
                            {approval.expirationDate
                              ? new Date(approval.expirationDate).toLocaleString()
                              : 'Never'
                            }
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-foreground/80">Approval ID:</span>
                          <span className="ml-1 text-foreground font-mono text-xs">
                            {approval.approvalId.substring(0, 8)}...
                          </span>
                          <span className="ml-1">
                            <CopyButton textToCopy={approval.approvalId} />
                          </span>
                        </div>
                        {approval.usedWincAmount && Number(approval.usedWincAmount) > 0 && (
                          <div className="col-span-2">
                            <span className="text-foreground/80">Used:</span>
                            <span className="ml-1 text-foreground">
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
                <ArrowUp className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Credits This Wallet Shared Out ({isNaN(sharedCredits.given.totalCredits) ? '0.00' : sharedCredits.given.totalCredits.toFixed(2)} total)
                </span>
              </div>
              <p className="text-xs text-foreground/80 mb-2">You have shared credits with these recipients:</p>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {sharedCredits.given.approvals.map((approval) => (
                  <div key={approval.approvalId} className="bg-card rounded-2xl p-4 border border-border/20">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-xs text-foreground/80">
                          {formatWalletAddress(approval.recipientAddress, 8)}
                        </div>
                        <CopyButton textToCopy={approval.recipientAddress} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-foreground font-medium">
                          -{isNaN(approval.credits) ? '0.00' : approval.credits.toFixed(2)} Credits
                        </div>
                        {/* Revoke Button - only show for your own wallet */}
                        <button
                          onClick={() => handleRevokeApproval(approval.approvalId, approval.recipientAddress)}
                          disabled={revoking === approval.approvalId || revokedApprovals.has(approval.approvalId)}
                          className={`p-1.5 rounded transition-colors ${
                            revokedApprovals.has(approval.approvalId)
                              ? 'text-success bg-success/10 cursor-default'
                              : 'text-error hover:text-error/80 hover:bg-error/10 disabled:opacity-50'
                          }`}
                          title={
                            revokedApprovals.has(approval.approvalId)
                              ? 'Successfully revoked - refreshing data...'
                              : `Revoke all credits shared with ${formatWalletAddress(approval.recipientAddress, 8)}`
                          }
                        >
                          {revoking === approval.approvalId ? (
                            <div className="w-3 h-3 border border-error border-t-transparent rounded-full animate-spin" />
                          ) : revokedApprovals.has(approval.approvalId) ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Details */}
                    <div className="text-xs text-foreground/80 space-y-1 pl-2 border-l border-border/20">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {approval.dateCreated && (
                          <div>
                            <span className="text-foreground/80">Created:</span>
                            <span className="ml-1 text-foreground">
                              {new Date(approval.dateCreated).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-foreground/80">Expires:</span>
                          <span className="ml-1 text-foreground">
                            {approval.expirationDate
                              ? new Date(approval.expirationDate).toLocaleString()
                              : 'Never'
                            }
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-foreground/80">Approval ID:</span>
                          <span className="ml-1 text-foreground font-mono text-xs">
                            {approval.approvalId.substring(0, 8)}...
                          </span>
                          <span className="ml-1">
                            <CopyButton textToCopy={approval.approvalId} />
                          </span>
                        </div>
                        {approval.usedWincAmount && Number(approval.usedWincAmount) > 0 && (
                          <div className="col-span-2">
                            <span className="text-foreground/80">Used:</span>
                            <span className="ml-1 text-foreground">
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
        <div className="px-4 pb-4 border-t border-border/20">
          <div className="text-center py-6">
            <Users className="w-12 h-12 text-foreground/80 mx-auto mb-3" />
            <p className="text-foreground mb-2">No Credit Sharing Activity</p>
            <p className="text-sm text-foreground/80">You haven't shared or received any credits yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
