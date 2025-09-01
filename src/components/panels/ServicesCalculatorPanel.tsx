import { useState } from 'react';
import { Calculator, HardDrive, DollarSign, ArrowRight, Zap, Upload, Globe, CreditCard } from 'lucide-react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useCreditsForFiat } from '../../hooks/useCreditsForFiat';
import { useArNSPricing } from '../../hooks/useArNSPricing';
import { useStore } from '../../store/useStore';
import WalletSelectionModal from '../modals/WalletSelectionModal';

interface ServicesCalculatorPanelProps {
  navigateToService?: (service?: 'topup' | 'upload' | 'domains') => void;
}

export default function ServicesCalculatorPanel({ navigateToService }: ServicesCalculatorPanelProps = {}) {
  const { address, creditBalance } = useStore();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [inputType, setInputType] = useState<'storage' | 'dollars'>('dollars'); // Default to dollars for services
  const [storageAmount, setStorageAmount] = useState(1);
  const [storageUnit, setStorageUnit] = useState<'MiB' | 'GiB' | 'TiB'>('GiB');
  const [dollarAmount, setDollarAmount] = useState(50);
  
  // Get conversion rates
  const wincForOneGiB = useWincForOneGiB();
  const [creditsForOneUSD] = useCreditsForFiat(1, () => {});
  const { pricingTiers, getAffordableOptions, getBestDomainForBudget, loading: arnsLoading } = useArNSPricing();
  
  const wincLoading = !wincForOneGiB;
  const creditsLoading = !creditsForOneUSD;
  
  // Calculate storage in GiB
  const getStorageInGiB = () => {
    switch (storageUnit) {
      case 'MiB':
        return storageAmount / 1024;
      case 'TiB':
        return storageAmount * 1024;
      default:
        return storageAmount;
    }
  };
  
  // Calculate storage in bytes for display
  const getStorageInBytes = () => {
    const gib = getStorageInGiB();
    return gib * 1024 * 1024 * 1024; // 1 GiB = 1024^3 bytes
  };
  
  // Calculate cost in dollars for storage
  const calculateStorageCost = () => {
    if (!wincForOneGiB || !creditsForOneUSD) return 0;
    const storageInGiB = getStorageInGiB();
    const wincNeeded = storageInGiB * Number(wincForOneGiB);
    const creditsNeeded = wincNeeded / 1e12; // Convert winc to credits
    const dollarsNeeded = creditsNeeded / creditsForOneUSD;
    return dollarsNeeded;
  };
  
  // Calculate storage for dollar amount
  const calculateStorageForDollars = () => {
    if (!wincForOneGiB || !creditsForOneUSD) return 0;
    const credits = dollarAmount * creditsForOneUSD;
    const winc = credits * 1e12;
    const gib = winc / Number(wincForOneGiB);
    return gib;
  };
  
  // Calculate credits from dollar amount
  const calculateCreditsForDollars = () => {
    if (!creditsForOneUSD) return 0;
    return dollarAmount * creditsForOneUSD;
  };
  
  // Format number with commas
  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(num);
  };
  
  // Format bytes to human readable using binary units
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${formatNumber(bytes, 0)} B`;
    const kib = bytes / 1024;
    if (kib < 1024) return `${formatNumber(kib)} KiB`;
    const mib = kib / 1024;
    if (mib < 1024) return `${formatNumber(mib)} MiB`;
    const gib = mib / 1024;
    if (gib < 1024) return `${formatNumber(gib)} GiB`;
    const tib = gib / 1024;
    return `${formatNumber(tib)} TiB`;
  };

  const isLoading = wincLoading || creditsLoading || arnsLoading;

  return (
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Calculator className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Services Calculator</h3>
          <p className="text-sm text-link">
            See what you can get: Turbo credits for storage + ARIO tokens for domains
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6 mb-6">
        
        {/* Services Notice */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-turbo-red/10 text-turbo-red px-4 py-2 rounded-lg text-sm font-medium mb-2">
            <Zap className="w-4 h-4" />
            One budget, multiple services: Storage + ArNS Domains
          </div>
          <div className="text-xs text-link">
            Pricing shown in USD. Crypto payments (AR, ETH, SOL, etc.) available in Top Up
          </div>
        </div>

        {/* Calculator Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex w-full max-w-sm sm:w-auto bg-surface rounded-lg p-1 border border-default">
            <button
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputType === 'storage'
                  ? 'bg-turbo-red text-white'
                  : 'text-link hover:text-fg-muted'
              }`}
              onClick={() => setInputType('storage')}
            >
              <HardDrive className="w-4 h-4" />
              <span className="hidden sm:inline">Storage to Cost</span>
              <span className="sm:hidden">Storage</span>
            </button>
            <button
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputType === 'dollars'
                  ? 'bg-turbo-red text-white'
                  : 'text-link hover:text-fg-muted'
              }`}
              onClick={() => setInputType('dollars')}
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Budget to Services</span>
              <span className="sm:hidden">Budget</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-link text-lg">Loading current network prices...</div>
          </div>
        ) : (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
            {/* Input Side */}
            <div>
              {inputType === 'storage' ? (
                <>
                  <h4 className="text-lg font-bold text-fg-muted mb-4">Enter Storage Amount</h4>
                  <div className="bg-surface rounded-lg p-6">
                    <label className="block text-sm font-medium text-link mb-3">
                      How much data do you need to store?
                    </label>
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 mb-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={storageAmount}
                        onChange={(e) => setStorageAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full sm:flex-1 rounded-lg border border-default bg-canvas px-4 py-3 sm:py-4 text-lg font-medium text-fg-muted focus:border-turbo-red focus:outline-none"
                        placeholder="Enter amount"
                      />
                      <select
                        value={storageUnit}
                        onChange={(e) => setStorageUnit(e.target.value as 'MiB' | 'GiB' | 'TiB')}
                        className="w-full sm:w-auto rounded-lg border border-default bg-canvas pl-4 pr-10 py-3 sm:py-4 text-lg font-medium text-fg-muted focus:border-turbo-red focus:outline-none"
                      >
                        <option value="MiB">MiB</option>
                        <option value="GiB">GiB</option>
                        <option value="TiB">TiB</option>
                      </select>
                    </div>
                    
                    {/* Common storage sizes */}
                    <div className="text-xs text-link mb-2">Quick select:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { amount: 100, unit: 'MiB', label: '100 MiB' },
                        { amount: 500, unit: 'MiB', label: '500 MiB' },
                        { amount: 1, unit: 'GiB', label: '1 GiB' },
                        { amount: 10, unit: 'GiB', label: '10 GiB' },
                        { amount: 100, unit: 'GiB', label: '100 GiB' },
                        { amount: 1, unit: 'TiB', label: '1 TiB' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setStorageAmount(preset.amount);
                            setStorageUnit(preset.unit as 'MiB' | 'GiB' | 'TiB');
                          }}
                          className="px-3 py-2 sm:py-3 text-xs rounded border border-default text-link hover:bg-canvas hover:text-fg-muted transition-colors min-h-[44px] flex items-center justify-center"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-bold text-fg-muted mb-4">Enter Your Budget</h4>
                  <div className="bg-surface rounded-lg p-6 min-h-[300px] flex flex-col">
                    <label className="block text-sm font-medium text-link mb-3">
                      How much do you want to spend on Turbo services?
                    </label>
                    <div className="flex gap-3 items-center mb-4">
                      <span className="text-fg-muted text-2xl font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dollarAmount}
                        onChange={(e) => setDollarAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="flex-1 rounded-lg border border-default bg-canvas px-4 py-3 sm:py-4 text-lg font-medium text-fg-muted focus:border-turbo-red focus:outline-none"
                        placeholder="Enter amount"
                      />
                      <span className="text-link text-lg">USD</span>
                    </div>
                    
                    {/* Quick amounts */}
                    <div className="text-xs text-link mb-2">Quick select:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-auto">
                      {[10, 25, 50, 100, 250, 500].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setDollarAmount(amount)}
                          className="px-3 py-2 sm:py-3 text-xs rounded border border-default text-link hover:bg-canvas hover:text-fg-muted transition-colors min-h-[44px] flex items-center justify-center"
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Results Side */}
            <div>
              <h4 className="text-lg font-bold text-fg-muted mb-4">
                {inputType === 'storage' ? 'Cost Breakdown' : 'What You Can Get'}
              </h4>
              
              {inputType === 'storage' ? (
                <div className="space-y-4">
                  {/* Primary Result */}
                  <div className="bg-canvas border-2 border-turbo-red rounded-lg p-6">
                    <div className="text-sm text-link mb-1">Total Cost</div>
                    <div className="text-4xl font-bold text-turbo-red">
                      ${formatNumber(calculateStorageCost())}
                    </div>
                    <div className="text-sm text-link mt-2">USD</div>
                  </div>

                  {/* Secondary Info */}
                  <div className="bg-surface rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-link">Storage Size</span>
                      <span className="text-lg font-medium text-fg-muted">
                        {formatBytes(getStorageInBytes())}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-link">Credits Needed</span>
                      <span className="text-lg font-medium text-fg-muted">
                        {formatNumber((getStorageInGiB() * Number(wincForOneGiB)) / 1e12)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Credits Available */}
                  <div className="bg-canvas border-2 border-turbo-red rounded-lg p-6">
                    <div className="text-sm text-link mb-1">Credits Available</div>
                    <div className="text-4xl font-bold text-turbo-red">
                      {formatNumber(calculateCreditsForDollars())}
                    </div>
                    <div className="text-sm text-link mt-2">Turbo Credits</div>
                  </div>

                  {/* Storage Option */}
                  <div className="bg-surface rounded-lg p-4 min-h-[120px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-turbo-red" />
                      <span className="text-sm font-medium text-fg-muted">Permanent Storage</span>
                    </div>
                    <div className="text-2xl font-bold text-fg-muted mb-1">
                      {formatNumber(calculateStorageForDollars())} GiB
                    </div>
                    <div className="text-xs text-link mt-auto">
                      = {formatBytes(calculateStorageForDollars() * 1024 * 1024 * 1024)}
                    </div>
                  </div>

                  {/* ArNS Domain Options */}
                  {(() => {
                    const credits = calculateCreditsForDollars();
                    const bestDomain = getBestDomainForBudget(credits);
                    const affordableOptions = getAffordableOptions(credits);
                    const cheapestTier = pricingTiers.find((tier) => tier.characterLength === 13); // 13+ chars are cheapest
                    
                    if (bestDomain) {
                      return (
                        <div className="bg-surface rounded-lg p-4 min-h-[120px] flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-turbo-red" />
                            <span className="text-sm font-medium text-fg-muted">ArNS Domains</span>
                          </div>
                          <div className="text-lg font-bold text-fg-muted mb-1">
                            {bestDomain.tier.displayName} for {bestDomain.maxYears} year{bestDomain.maxYears > 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-link mb-2">
                            e.g. {bestDomain.recommendedName}.ar.io
                          </div>
                          {affordableOptions.length > 1 && (
                            <div className="text-xs text-link mb-2">
                              + {affordableOptions.length - 1} other option{affordableOptions.length > 2 ? 's' : ''}
                            </div>
                          )}
                          <div className="text-xs text-link mt-auto">
                            {formatNumber(bestDomain.totalCostCredits)} credits (${formatNumber(bestDomain.totalCostUSD)})
                          </div>
                        </div>
                      );
                    } else {
                      // Show progress toward cheapest domain
                      return (
                        <div className="bg-surface rounded-lg p-4 min-h-[120px] flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-link" />
                            <span className="text-sm font-medium text-link">ArNS Domains</span>
                          </div>
                          {cheapestTier ? (
                            <>
                              <div className="text-sm text-link mb-1">
                                Cheapest domain: ${formatNumber(cheapestTier.pricesInUSD.year1)}
                              </div>
                              <div className="text-xs text-link mb-2">
                                13+ characters, 1 year (paid in ARIO tokens)
                              </div>
                              <div className="text-xs text-link mt-auto">
                                Increase budget to ${formatNumber(cheapestTier.pricesInUSD.year1)} to afford
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-link flex-1 flex items-center justify-center">
                              Loading domain pricing...
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}

                  {/* Budget Breakdown */}
                  <div className="bg-canvas rounded-lg p-4 space-y-2 border border-default">
                    <div className="text-xs font-medium text-link uppercase tracking-wider">Your Budget</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-link">Total Budget</span>
                      <span className="text-lg font-medium text-fg-muted">
                        ${formatNumber(dollarAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* CTA Section */}
        <div className="mt-8 text-center bg-turbo-red/10 rounded-lg border border-turbo-red/20 p-6">
          {!address ? (
            // Not logged in - show connect wallet CTA
            <>
              <h4 className="text-lg font-bold text-fg-muted mb-3">Ready to use Turbo services?</h4>
              <p className="text-link mb-4">Connect your wallet to top up credits and access storage + domains.</p>
              <button
                onClick={() => setShowWalletModal(true)}
                className="inline-flex items-center gap-2 bg-turbo-red text-white px-6 py-3 rounded-lg font-bold hover:bg-turbo-red/90 transition-colors"
              >
                Connect Wallet <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : creditBalance > 0 ? (
            // Logged in with credits - show service CTAs
            <>
              <h4 className="text-lg font-bold text-fg-muted mb-3">You have {creditBalance.toFixed(2)} credits ready to use!</h4>
              <p className="text-link mb-4">Start using your credits for permanent storage or register ArNS domain names.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigateToService?.('upload')}
                  className="inline-flex items-center justify-center gap-2 bg-turbo-red text-white px-4 py-3 rounded-lg font-bold hover:bg-turbo-red/90 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </button>
                <button
                  onClick={() => navigateToService?.('domains')}
                  className="inline-flex items-center justify-center gap-2 bg-turbo-red text-white px-4 py-3 rounded-lg font-bold hover:bg-turbo-red/90 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Search Domains
                </button>
              </div>
            </>
          ) : (
            // Logged in but no credits - show top up CTA
            <>
              <h4 className="text-lg font-bold text-fg-muted mb-3">You need credits to use Turbo services</h4>
              <p className="text-link mb-4">Top up your account with credits to access permanent storage and ArNS domains.</p>
              <button
                onClick={() => navigateToService?.('topup')}
                className="inline-flex items-center gap-2 bg-turbo-red text-white px-6 py-3 rounded-lg font-bold hover:bg-turbo-red/90 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Top Up Credits
              </button>
            </>
          )}
        </div>
      </div>

      {showWalletModal && (
        <WalletSelectionModal
          onClose={() => setShowWalletModal(false)}
          message={''}
        />
      )}
    </div>
  );
}