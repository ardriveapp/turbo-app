import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { getPaymentServiceConfig } from '../../services/paymentService';
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { turboConfig, wincPerCredit } from '../../constants';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { Gift, Ticket, Mail, Wallet, CheckCircle, Shield, Upload, Globe, ArrowRight } from 'lucide-react';

export default function RedeemPanel() {
  const { address } = useStore();
  const wincForOneGiB = useWincForOneGiB();
  const [redemptionCode, setRedemptionCode] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [redemptionDetails, setRedemptionDetails] = useState<{
    creditsReceived: number;
    newBalance: number;
    targetAddress: string;
  } | null>(null);
  

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
      const config = getPaymentServiceConfig();
      // Use exact same pattern as reference app
      const response = await fetch(
        `${config.paymentServiceUrl}/v1/redeem?destinationAddress=${encodeURIComponent(destinationAddress)}&id=${encodeURIComponent(redemptionCode)}&email=${encodeURIComponent(recipientEmail)}`,
        {
          headers: {
            'accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to redeem gift code');
      }

      const redemptionData = await response.json();
      console.log('Redemption API response:', redemptionData); // Debug log
      
      // Fetch the balance of the destination address to show updated info
      try {
        const turbo = TurboFactory.unauthenticated(turboConfig);
        const balance = await turbo.getBalance(destinationAddress);
        const creditsBalance = Number(balance.winc) / 1e12;
        
        // Extract credits from API response (userBalance is in winc format)
        const creditsReceived = redemptionData.userBalance 
          ? Number(redemptionData.userBalance) / 1e12  // Convert winc to credits
          : 0;
        
        console.log('Credits received from API:', creditsReceived); // Debug log
        console.log('New balance from API:', creditsBalance); // Debug log
        
        setRedemptionDetails({
          creditsReceived,
          newBalance: creditsBalance,
          targetAddress: destinationAddress,
        });
      } catch (balanceError) {
        // If balance fetch fails, still show success but without balance info
        console.warn('Could not fetch updated balance:', balanceError);
        const creditsReceived = redemptionData.userBalance 
          ? Number(redemptionData.userBalance) / 1e12  // Convert winc to credits
          : 0;
          
        setRedemptionDetails({
          creditsReceived,
          newBalance: 0,
          targetAddress: destinationAddress,
        });
      }
      
      setSuccess(true);
      
      // Clear form
      setRedemptionCode('');
      setRecipientEmail('');
      
      // If redeemed to connected wallet, trigger balance refresh
      if (address === destinationAddress) {
        window.dispatchEvent(new CustomEvent('refresh-balance'));
      }
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
      <div>
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-turbo-green/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <CheckCircle className="w-5 h-5 text-turbo-green" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-fg-muted mb-1">Gift Redeemed Successfully!</h3>
            <p className="text-sm text-link">
              Credits have been added to your wallet and are ready to use
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gradient-to-br from-turbo-green/5 to-turbo-green/3 rounded-xl border border-default p-6 mb-6">
          
          {/* Success Message */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-turbo-green/20 rounded-xl mb-4">
              <Gift className="w-8 h-8 text-turbo-green" />
            </div>
            <h4 className="text-xl font-bold text-fg-muted mb-2">
              Gift Successfully Redeemed!
            </h4>
          </div>

          {/* Balance Information */}
          {redemptionDetails && (
            <div className="bg-surface rounded-lg p-6 mb-6">
              <h5 className="font-bold text-fg-muted mb-4">Updated Wallet Balance</h5>
              
              <div className="space-y-4">
                {/* Credits Received */}
                <div className="bg-canvas border-2 border-turbo-green rounded-lg p-4">
                  <div className="text-sm text-link mb-1">Credits Received</div>
                  <div className="text-3xl font-bold text-turbo-green">
                    {redemptionDetails.creditsReceived.toLocaleString()} Credits
                  </div>
                  {wincForOneGiB && redemptionDetails.creditsReceived > 0 && (
                    <div className="text-sm text-link mt-1">
                      = ~{((redemptionDetails.creditsReceived * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB storage capacity
                    </div>
                  )}
                </div>

                {/* Current Balance */}
                {redemptionDetails.newBalance > 0 && (
                  <div className="bg-canvas rounded-lg p-4 border border-default">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-link">Wallet Balance</span>
                      <div className="text-right">
                        <div className="font-bold text-fg-muted text-lg">
                          {redemptionDetails.newBalance.toLocaleString()} Credits
                        </div>
                        {wincForOneGiB && (
                          <div className="text-xs text-link">
                            ~{((redemptionDetails.newBalance * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB capacity
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-link">
                      Address: {redemptionDetails.targetAddress.slice(0, 8)}...{redemptionDetails.targetAddress.slice(-6)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="text-center">
            <h5 className="font-bold text-fg-muted mb-3">What would you like to do next?</h5>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/upload"
                className="inline-flex items-center justify-center gap-2 bg-turbo-red text-white px-6 py-3 rounded-lg font-bold hover:bg-turbo-red/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Files
              </a>
              <a
                href="/domains"
                className="inline-flex items-center justify-center gap-2 bg-turbo-red text-white px-6 py-3 rounded-lg font-bold hover:bg-turbo-red/90 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Search Domains
              </a>
              <a
                href="/topup"
                className="inline-flex items-center justify-center gap-2 border border-default text-link hover:text-fg-muted hover:border-turbo-red/50 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Add More Credits
              </a>
            </div>
          </div>
        </div>
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
        <p className="text-xs text-link/70 mt-1">
          Example: vLRHFqCw1uHu75xqB4fCDW-QxpkpJxBtFD9g4QYUbfw
        </p>
      </div>

      {/* Gift Code */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Gift Code</label>
        <div className="relative">
          <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fg-disabled" />
          <input
            type="text"
            value={redemptionCode}
            onChange={(e) => setRedemptionCode(e.target.value)}
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