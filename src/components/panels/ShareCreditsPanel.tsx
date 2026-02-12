import { useState, useMemo } from 'react';
import {
  TurboFactory,
  TurboAuthenticatedClient,
  ArconnectSigner
} from '@ardrive/turbo-sdk/web';
import { useStore } from '../../store/useStore';
import { wincPerCredit } from '../../constants';
import { useTurboConfig } from '../../hooks/useTurboConfig';
import { ExternalLink, Shield, ArrowRight, Share2, Book, Lightbulb, Code, CheckCircle } from 'lucide-react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { validateWalletAddress, getWalletTypeLabel } from '../../utils/addressValidation';
import { useEthereumTurboClient } from '../../hooks/useEthereumTurboClient';

interface Approval {
  approvedAddress: string;
  approvedWincAmount: string;
  expirationDate?: string;
}

export default function ShareCreditsPanel() {
  const { address, walletType, creditBalance } = useStore();
  const wincForOneGiB = useWincForOneGiB();
  const turboConfig = useTurboConfig();
  const { createEthereumTurboClient } = useEthereumTurboClient(); // Shared Ethereum client with custom connect message

  // Create authenticated turbo client based on wallet type
  const createTurboClient = async (): Promise<TurboAuthenticatedClient> => {
    if (!address || !walletType) {
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
  };
  const [creditAmount, setCreditAmount] = useState(1);
  const [creditAmountInput, setCreditAmountInput] = useState('1');
  const [approvedAddress, setApprovedAddress] = useState('');
  const [approvedAddressInput, setApprovedAddressInput] = useState('');
  const [recipientWalletType, setRecipientWalletType] = useState<'arweave' | 'ethereum' | 'solana' | 'unknown' | null>(null);
  const [expiresBySeconds, setExpiresBySeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Revoke state
  const [revokeAddress, setRevokeAddress] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Use creditBalance from store instead of fetching separately
  const balance = useMemo(() => {
    if (creditBalance > 0) {
      return { winc: String(creditBalance * wincPerCredit) };
    }
    return null;
  }, [creditBalance]);

  const handleShare = async () => {
    if (!address || !approvedAddress || creditAmount < 0.01) {
      setError('Please fill in all required fields (minimum 0.01 credits)');
      return;
    }

    setSending(true);
    setError('');
    
    try {
      const turbo = await createTurboClient();
      const approvedWincAmount = (creditAmount * wincPerCredit).toFixed();
      
      await turbo.shareCredits({
        approvedAddress,
        approvedWincAmount,
        expiresBySeconds: expiresBySeconds > 0 ? expiresBySeconds : undefined,
      });
      
      setSuccess(true);

      // Refresh balance in header
      window.dispatchEvent(new CustomEvent('refresh-balance'));

      // Clear form
      setApprovedAddress('');
      setApprovedAddressInput('');
      setRecipientWalletType(null);
      setCreditAmount(0);
      setCreditAmountInput('0');
      setExpiresBySeconds(0);
      
      setTimeout(() => {
        setSuccess(false);
      }, 10000);
    } catch (err) {
      console.error('Share credits error details:', err);
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      setError(err instanceof Error ? err.message : 'Failed to share credits');
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async () => {
    if (!address || !revokeAddress) {
      setError('Please enter an address to revoke');
      return;
    }

    setRevoking(true);
    setError('');
    
    try {
      const turbo = await createTurboClient();
      await turbo.revokeCredits({ revokedAddress: revokeAddress });
      
      // Refresh balance in header
      window.dispatchEvent(new CustomEvent('refresh-balance'));
      
      setRevokeAddress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke credits');
    } finally {
      setRevoking(false);
    }
  };

  if (!address) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-heading font-bold mb-4">Connect Wallet Required</h3>
        <p className="text-foreground/80">Connect your wallet to share credits</p>
      </div>
    );
  }

  const spendPower = creditBalance > 0 ? creditBalance.toFixed(4) : '0';
  // For now, we don't have shared credits info without authenticated client
  const sharedCredits = '0';
  const givenApprovals: Approval[] = [];

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border border-border/20">
          <Share2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Share Credits</h3>
          <p className="text-sm text-foreground/80">
            Delegate credits to other wallets for collaborative uploads and distributed payments
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-card rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">
      
      {/* Current Balance */}
      {balance && (
        <div className="bg-card rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-foreground/80">Available to Share:</span>
            <div className="text-right">
              <span className="font-bold text-foreground">{spendPower} Credits</span>
              {wincForOneGiB && (
                <div className="text-xs text-foreground/80">
                  ~{((creditBalance * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB capacity
                </div>
              )}
            </div>
          </div>
          {+sharedCredits > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-foreground/80">Already Shared:</span>
              <span>{sharedCredits} Credits</span>
            </div>
          )}
        </div>
      )}

      {/* Share Form */}
      <div className="space-y-6">
        {/* Credits and Recipient on same row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-3">Credits to Share</label>
            <input
              type="text"
              value={creditAmountInput}
              onChange={(e) => {
                const inputValue = e.target.value;
                setCreditAmountInput(inputValue);
                
                // Parse the numeric value
                const amount = Number(inputValue);
                if (!isNaN(amount) && amount >= 0) {
                  setCreditAmount(amount);
                }
              }}
              onBlur={() => {
                // Clean up on blur
                let finalAmount = creditAmount;
                if (creditAmount < 0.01) {
                  finalAmount = 0.01;
                } else if (creditAmount > creditBalance) {
                  finalAmount = creditBalance;
                }
                setCreditAmount(finalAmount);
                setCreditAmountInput(String(finalAmount));
              }}
              className="w-full p-3 rounded-2xl border border-border/20 bg-card text-foreground focus:border-foreground focus:outline-none transition-colors"
              placeholder="Minimum 0.01 credits"
              inputMode="decimal"
            />
            {creditAmount >= 0.01 && wincForOneGiB && (
              <div className="mt-2 text-xs text-foreground/80">
                ~{((creditAmount * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB storage
              </div>
            )}
            {creditAmount > 0 && creditAmount < 0.01 && (
              <div className="mt-2 text-xs text-warning">
                Minimum share amount is 0.01 credits
              </div>
            )}
            {creditAmount > creditBalance && (
              <div className="mt-2 text-xs text-error">
                Exceeds available balance ({creditBalance.toFixed(2)} credits)
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Recipient Wallet Address</label>
            <input
              type="text"
              value={approvedAddressInput}
              onChange={(e) => {
                setApprovedAddressInput(e.target.value);
                // Clear validation state on change
                if (approvedAddress) {
                  setApprovedAddress('');
                  setRecipientWalletType(null);
                }
              }}
              onBlur={() => {
                const trimmed = approvedAddressInput.trim();
                if (trimmed) {
                  const validation = validateWalletAddress(trimmed);
                  if (validation.isValid && validation.type !== 'unknown') {
                    setApprovedAddress(trimmed);
                    setRecipientWalletType(validation.type);
                  } else {
                    setRecipientWalletType('unknown');
                  }
                } else {
                  setApprovedAddress('');
                  setRecipientWalletType(null);
                }
              }}
              className="w-full p-3 rounded-2xl border border-border/20 bg-card text-foreground font-mono text-sm focus:border-foreground focus:outline-none transition-colors"
              placeholder="Arweave, Ethereum, or Solana address"
            />
            {recipientWalletType && recipientWalletType !== 'unknown' && (
              <div className="mt-2 text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Valid {getWalletTypeLabel(recipientWalletType)} address
              </div>
            )}
            {recipientWalletType === 'unknown' && (
              <div className="mt-2 text-xs text-error">
                Invalid wallet address format
              </div>
            )}
            {!recipientWalletType && (
              <div className="mt-2 text-xs text-foreground/80">
                e.g., 1seRanklLU_1VTGkEk7P0x...
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Expiration (Optional)</label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => setExpiresBySeconds(3600)}
              className={`py-2 px-3 rounded-2xl border text-sm transition-all ${
                expiresBySeconds === 3600
                  ? 'border-foreground bg-foreground/10 text-foreground'
                  : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
              }`}
            >
              1 hour
            </button>
            <button
              onClick={() => setExpiresBySeconds(86400)}
              className={`py-2 px-3 rounded-2xl border text-sm transition-all ${
                expiresBySeconds === 86400
                  ? 'border-foreground bg-foreground/10 text-foreground'
                  : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
              }`}
            >
              1 day
            </button>
            <button
              onClick={() => setExpiresBySeconds(604800)}
              className={`py-2 px-3 rounded-2xl border text-sm transition-all ${
                expiresBySeconds === 604800
                  ? 'border-foreground bg-foreground/10 text-foreground'
                  : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
              }`}
            >
              1 week
            </button>
            <button
              onClick={() => setExpiresBySeconds(0)}
              className={`py-2 px-3 rounded-2xl border text-sm transition-all ${
                expiresBySeconds === 0
                  ? 'border-foreground bg-foreground/10 text-foreground'
                  : 'border-border/20 text-foreground/80 hover:bg-card hover:text-foreground'
              }`}
            >
              Never
            </button>
          </div>
          <input
            type="number"
            value={expiresBySeconds}
            onChange={(e) => setExpiresBySeconds(Number(e.target.value))}
            className="w-full p-3 rounded-2xl border border-border/20 bg-card text-foreground focus:border-foreground focus:outline-none transition-colors"
            placeholder="Custom time in seconds (0 = no expiration)"
            min="0"
          />
          {expiresBySeconds > 0 && (
            <p className="text-xs text-foreground/80 mt-1">
              Expires in {expiresBySeconds < 3600
                ? `${expiresBySeconds} seconds`
                : expiresBySeconds < 86400
                ? `${(expiresBySeconds / 3600).toFixed(1)} hours`
                : `${(expiresBySeconds / 86400).toFixed(1)} days`
              }
            </p>
          )}
        </div>

        {error && (
          <div className="text-error text-sm p-3 bg-error/10 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-success text-sm p-4 bg-success/10 rounded-2xl border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" />
              <span className="font-medium">Credits shared successfully!</span>
            </div>
            <p className="text-xs text-foreground/80">
              {creditAmount} credits are now available for the recipient to use. Your balance has been updated.
            </p>
          </div>
        )}

        <button
          onClick={handleShare}
          disabled={sending || !address || creditAmount < 0.01 || creditAmount > creditBalance || !approvedAddress}
          className="w-full py-4 px-6 rounded-full bg-foreground text-card font-bold text-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <ArrowRight className="w-5 h-5 animate-pulse" />
              Sharing Credits...
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              Share Credits
            </>
          )}
        </button>
      </div>
      </div>

      {/* Active Approvals */}
      {givenApprovals.length > 0 && (
        <div className="mt-8 pt-8 border-t border-border/20">
          <h4 className="font-semibold mb-4">Active Approvals</h4>
          <div className="space-y-3">
            {givenApprovals.map((approval: Approval) => (
              <div key={approval.approvedAddress} className="bg-card rounded-2xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-sm">{approval.approvedAddress}</p>
                    <p className="text-sm text-foreground/80">
                      {(+approval.approvedWincAmount / wincPerCredit).toFixed(4)} Credits
                      {approval.expirationDate && (
                        <span className="ml-2">
                          • Expires {new Date(approval.expirationDate).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setRevokeAddress(approval.approvedAddress)}
                    className="text-error hover:text-error/80 text-sm"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Revoke Form */}
          {revokeAddress && (
            <div className="mt-4 p-4 bg-card rounded-2xl">
              <p className="text-sm mb-3">Revoke credits from: {revokeAddress}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="px-4 py-2 rounded-full bg-error text-white font-medium disabled:opacity-50"
                >
                  {revoking ? 'Revoking...' : 'Confirm Revoke'}
                </button>
                <button
                  onClick={() => setRevokeAddress('')}
                  className="px-4 py-2 rounded-full border border-border/20 text-foreground/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resource Links */}
      <div className="mt-8">
        <h4 className="font-semibold mb-4">Learn More</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Documentation */}
          <a
            href="https://docs.ardrive.io/docs/turbo/credit-sharing.html"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Book className="w-5 h-5 text-foreground" />
              <span className="font-medium">Documentation</span>
            </div>
            <p className="text-xs text-foreground/80">
              Complete guide to credit sharing features and API
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-foreground/80 group-hover:text-foreground">
              <span>Read guide</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          {/* Use Cases */}
          <a
            href="https://docs.ardrive.io/docs/turbo/credit-sharing.html#use-cases"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Lightbulb className="w-5 h-5 text-foreground" />
              <span className="font-medium">Use Cases</span>
            </div>
            <p className="text-xs text-foreground/80">
              Examples and scenarios for credit sharing
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-foreground/80 group-hover:text-foreground">
              <span>View examples</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          {/* SDK Reference */}
          <a
            href="https://github.com/ardriveapp/turbo-sdk?tab=readme-ov-file#sharecredits-approvedaddress-approvedwincamount-expiresbyseconds-"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Code className="w-5 h-5 text-foreground" />
              <span className="font-medium">SDK Reference</span>
            </div>
            <p className="text-xs text-foreground/80">
              Technical implementation details on GitHub
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-foreground/80 group-hover:text-foreground">
              <span>View code</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}