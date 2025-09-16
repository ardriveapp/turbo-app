import { useState } from 'react';
import useDebounce from '../../hooks/useDebounce';
import { Globe, Search, CheckCircle, XCircle, Shield, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getARIO } from '../../utils';

export default function ArNSPanel() {
  const { walletType } = useStore();
  const [nameSearch, setNameSearch] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);
  
  const debouncedSearch = useDebounce(nameSearch);

  const checkAvailability = async () => {
    if (!debouncedSearch) return;
    
    setChecking(true);
    try {
      const ario = getARIO();
      
      // Try to resolve the name - if it exists, it's taken
      const record = await ario.resolveArNSName({ name: debouncedSearch });
      
      // If we get a record back, the domain is taken
      if (record) {
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

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Globe className="w-5 h-5 text-turbo-yellow" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Search Domains</h3>
          <p className="text-sm text-link">
            Search available ArNS names and check registration costs
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-yellow/5 to-turbo-yellow/3 rounded-xl border border-turbo-yellow/20 p-4 sm:p-6 mb-4 sm:mb-6">

      {/* Name Search */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium">Search for a name</label>
          <a
            href="https://arns.ar.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-turbo-yellow hover:text-turbo-yellow/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Full ArNS App
          </a>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="flex items-center border border-default rounded-lg bg-canvas focus-within:border-turbo-yellow transition-colors">
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => {
                  let cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  // Remove leading and trailing dashes
                  cleaned = cleaned.replace(/^-+|-+$/g, '');
                  setNameSearch(cleaned);
                  setAvailability(null);
                }}
                className="flex-1 p-3 bg-transparent text-fg-muted font-mono focus:outline-none min-w-0"
                placeholder="my-awesome-app"
              />
              <div className="px-3 text-sm text-link font-mono border-l border-default/30 flex-shrink-0">
                .ar.io
              </div>
            </div>
          </div>
          <button
            onClick={checkAvailability}
            disabled={!nameSearch || checking}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-turbo-yellow text-black font-bold hover:bg-turbo-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {checking ? 'Checking...' : 'Check'}
          </button>
        </div>
        
        {/* Single consolidated availability display */}
        {availability !== null && nameSearch && (
          <div className={`mt-4 p-4 rounded-lg border text-center ${
            availability 
              ? 'bg-turbo-yellow/5 border-turbo-yellow/30' 
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            {availability ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-turbo-yellow" />
                  <span className="font-semibold text-fg-muted">"{nameSearch}.ar.io" is available!</span>
                </div>
                <p className="text-sm text-link mb-4">
                  Complete your registration on the official ArNS app
                </p>
                <a
                  href={`https://arns.ar.io/#/register/${nameSearch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-turbo-yellow text-black font-bold rounded-lg hover:bg-turbo-yellow/90 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  Register on ArNS App
                </a>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="font-semibold text-red-400">"{nameSearch}.ar.io" is already taken</span>
                </div>
                <p className="text-sm text-link">Try a different name</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Solana Wallet Warning */}
      {walletType === 'solana' && availability === true && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">
              ArNS domains require an Arweave or Ethereum wallet. You can search names but need to switch wallets to register.
            </p>
          </div>
        </div>
      )}
      </div>

      {/* ArNS Features */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-turbo-yellow" />
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
            <div className="w-10 h-10 bg-turbo-yellow/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-turbo-yellow" />
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
            <div className="w-10 h-10 bg-turbo-yellow/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-turbo-yellow" />
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
            <div className="w-10 h-10 bg-turbo-yellow/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-turbo-yellow" />
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-turbo-yellow text-black font-medium rounded-lg hover:bg-turbo-yellow/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open ArNS App
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}