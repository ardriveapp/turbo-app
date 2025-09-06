import { useState } from 'react';
import useDebounce from '../../hooks/useDebounce';
import { Globe, Search, CheckCircle, XCircle, Clock, Shield, Zap, ExternalLink, AlertCircle, Wallet } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ARIO } from '@ar.io/sdk';

export default function ArNSPanel() {
  const { walletType } = useStore();
  const [nameSearch, setNameSearch] = useState('');
  const [duration, setDuration] = useState(1); // years
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);
  
  const debouncedSearch = useDebounce(nameSearch);

  const checkAvailability = async () => {
    if (!debouncedSearch) return;
    
    setChecking(true);
    try {
      const ario = ARIO.mainnet();
      
      // Try to resolve the name - if it exists, it's taken
      const record = await ario.resolveArNSName({ name: debouncedSearch });
      
      // If we get a record back, the domain is taken
      if (record) {
        console.log('Domain is taken:', record);
        setAvailability(false);
      }
    } catch (error) {
      // If resolveArNSName throws an error, the domain is likely available
      console.log('Domain appears to be available:', error);
      setAvailability(true);
    } finally {
      setChecking(false);
    }
  };

  const basePrice = 10; // Credits per year
  const totalPrice = basePrice * duration;

  return (
    <div>
      {/* Solana Wallet Warning */}
      {walletType === 'solana' && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-500 mb-2">Solana Wallet Limitation</div>
              <p className="text-sm text-link mb-3">
                ArNS domain registration requires an Arweave wallet (Wander) or Ethereum wallet (MetaMask). 
                Solana wallets cannot currently purchase or own ArNS names.
              </p>
              <p className="text-xs text-link">
                You can search for available names, but to register you'll need to connect a compatible wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Globe className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Search Domains</h3>
          <p className="text-sm text-link">
            Search available ArNS names and check registration costs
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">

      {/* Name Search */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium">Search for a name</label>
          <a
            href="https://arns.ar.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-turbo-red hover:text-turbo-red/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Full ArNS App
          </a>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="flex items-center border border-default rounded-lg bg-canvas focus-within:border-turbo-red transition-colors">
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => {
                  setNameSearch(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  setAvailability(null);
                }}
                className="flex-1 p-3 bg-transparent text-fg-muted font-mono focus:outline-none"
                placeholder="my-awesome-app"
              />
              <div className="px-3 text-sm text-link font-mono border-l border-default/30">
                .ar.io
              </div>
            </div>
          </div>
          <button
            onClick={checkAvailability}
            disabled={!nameSearch || checking}
            className="px-6 py-3 rounded-lg bg-turbo-red text-white font-bold hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {checking ? 'Checking...' : 'Check'}
          </button>
        </div>
        
        {availability !== null && nameSearch && (
          <div className={`mt-3 p-3 rounded-lg border flex items-center gap-2 ${
            availability 
              ? 'bg-turbo-red/10 border-turbo-red/20 text-turbo-red' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {availability ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Available!</span>
                <span className="text-sm opacity-80">Ready to register</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Already taken</span>
                <span className="text-sm opacity-80">Try a different name</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Registration Options */}
      {availability === true && (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Registration Period</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-3 rounded-lg border border-default bg-canvas text-fg-muted focus:border-turbo-red focus:outline-none transition-colors"
            >
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={5}>5 Years</option>
              <option value={10}>10 Years</option>
            </select>
          </div>

          {/* Price Summary */}
          <div className="bg-canvas border-2 border-turbo-red rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="text-sm text-link mb-1">Registration Summary</div>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-link">Domain Name</span>
                <span className="font-mono text-turbo-red font-medium">{nameSearch}.ar.io</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-link">Duration</span>
                <span className="font-medium">{duration} year{duration > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-link">Rate</span>
                <span>{basePrice} Credits/year</span>
              </div>
            </div>
            <div className="h-px bg-default my-4"></div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-fg-muted">Total Cost</span>
              <span className="text-2xl font-bold text-turbo-red">{totalPrice} Credits</span>
            </div>
          </div>

          {/* Register Button */}
          <button 
            className="w-full py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={walletType === 'solana'}
          >
            {walletType === 'solana' ? (
              <>
                <Wallet className="w-5 h-5" />
                Switch to Arweave/Ethereum Wallet
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                Register Domain
              </>
            )}
          </button>
        </>
      )}
      </div>

      {/* ArNS Features */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Human-Readable Names</h4>
              <p className="text-xs text-link">
                Replace complex transaction IDs with memorable domain names for your apps.
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
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Permanent Ownership</h4>
              <p className="text-xs text-link">
                Domain ownership is permanently recorded on the Arweave blockchain.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Global Propagation</h4>
              <p className="text-xs text-link">
                Instant propagation across the AR.IO gateway network worldwide.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Update Anytime</h4>
              <p className="text-xs text-link">
                Change where your domain points without losing ownership.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ArNS App Integration */}
      <div className="bg-surface rounded-lg p-6 border border-default">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-fg-muted mb-2">Ready to Register?</h4>
            <p className="text-sm text-link mb-4">
              For the complete ArNS experience including domain registration, management, and advanced features, 
              visit the full ArNS application.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://arns.ar.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-turbo-red text-white font-medium rounded-lg hover:bg-turbo-red/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open ArNS App
              </a>
              <div className="flex items-center gap-2 text-xs text-link">
                <Clock className="w-3 h-3" />
                <span>Direct Turbo Credit purchases coming soon to this page</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}