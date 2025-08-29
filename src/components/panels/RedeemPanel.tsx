import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { defaultPaymentServiceUrl } from '../../constants';
import { Gift, Ticket, Mail, Wallet, CheckCircle, Shield } from 'lucide-react';

export default function RedeemPanel() {
  const { address } = useStore();
  const [redemptionCode, setRedemptionCode] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Pre-fill destination address if wallet is connected
    if (address) {
      setDestinationAddress(address);
    }
  }, [address]);

  const handleRedeem = async () => {
    if (!destinationAddress || !recipientEmail || !redemptionCode) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${defaultPaymentServiceUrl}/v1/redeem/?email=${encodeURIComponent(recipientEmail)}&id=${encodeURIComponent(redemptionCode)}&destinationAddress=${encodeURIComponent(destinationAddress)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to redeem gift code');
      }
      
      setSuccess(true);
      // Clear form
      setRedemptionCode('');
      setRecipientEmail('');
      
      // Show success message
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redeem gift');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canSubmit = destinationAddress && recipientEmail && isValidEmail(recipientEmail) && redemptionCode && !loading;

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-turbo-red/20 rounded-xl mb-6">
          <CheckCircle className="w-8 h-8 text-turbo-red" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-fg-muted">Gift Redeemed Successfully!</h3>
        <p className="text-link">Credits have been added to your account and are ready to use</p>
      </div>
    );
  }

  return (
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Ticket className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Redeem Gift Code</h3>
          <p className="text-sm text-link">
            Enter your gift code details to add credits to your wallet
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6 mb-6">

      {/* Wallet Address */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Wallet Address</label>
        <div className="relative">
          <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fg-disabled" />
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            className="w-full p-3 pl-11 rounded-lg border border-default bg-canvas text-fg-muted font-mono text-sm focus:border-turbo-red focus:outline-none transition-colors"
            placeholder="Your wallet address"
          />
        </div>
        {!address && (
          <p className="text-xs text-link mt-2">
            Connect your wallet to auto-fill this field
          </p>
        )}
      </div>

      {/* Gift Code */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Gift Code</label>
        <div className="relative">
          <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fg-disabled" />
          <input
            type="text"
            value={redemptionCode}
            onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
            className="w-full p-3 pl-11 rounded-lg border border-default bg-canvas text-fg-muted font-mono focus:border-turbo-red focus:outline-none transition-colors"
            placeholder="XXXX-XXXX-XXXX"
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fg-disabled" />
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full p-3 pl-11 rounded-lg border border-default bg-canvas text-fg-muted focus:border-turbo-red focus:outline-none transition-colors"
            placeholder="Confirm your email address"
          />
        </div>
        <p className="text-xs text-link mt-2">
          Must match the email the gift was sent to
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-error text-sm mb-4 p-3 bg-error/10 rounded">
          {error}
        </div>
      )}

      {/* Redeem Button */}
      <button
        onClick={handleRedeem}
        className="w-full py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={!canSubmit}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Redeeming Gift...
          </>
        ) : (
          <>
            <Gift className="w-5 h-5" />
            Redeem Gift Code
          </>
        )}
      </button>
      </div>

      {/* Redemption Process */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Gift Code Required</h4>
              <p className="text-xs text-link">
                Enter the unique code from your gift notification email.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Secure Verification</h4>
              <p className="text-xs text-link">
                Email verification ensures only the intended recipient can redeem.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Instant Credit</h4>
              <p className="text-xs text-link">
                Credits are immediately available in your account after redemption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}