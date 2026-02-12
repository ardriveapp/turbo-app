import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Listbox, Transition } from '@headlessui/react';
import { Calculator, HardDrive, DollarSign, ArrowRight, Zap, Upload, Globe, CreditCard, Database, Rss, ChevronDown, Check } from 'lucide-react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useCreditsForFiat } from '../../hooks/useCreditsForFiat';
import { useArNSPricing } from '../../hooks/useArNSPricing';
import { useStore } from '../../store/useStore';
import WalletSelectionModal from '../modals/WalletSelectionModal';

export default function ServicesCalculatorPanel() {
  const { address, creditBalance } = useStore();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [inputType, setInputType] = useState<'storage' | 'dollars'>('dollars'); // Default to dollars for services
  const [storageAmount, setStorageAmount] = useState(1);
  const [storageAmountInput, setStorageAmountInput] = useState('1'); // String for display
  const [storageUnit, setStorageUnit] = useState<'MiB' | 'GiB' | 'TiB'>('GiB');

  const storageUnits = [
    { value: 'MiB', label: 'MiB' },
    { value: 'GiB', label: 'GiB' },
    { value: 'TiB', label: 'TiB' },
  ] as const;
  const [dollarAmount, setDollarAmount] = useState(50);
  const [dollarAmountInput, setDollarAmountInput] = useState('50'); // String for display

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
        <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Services Calculator</h3>
          <p className="text-sm text-foreground/80">
            See what you can get: credits for storage + ARIO tokens for domains
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/3 rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Services Notice */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-2">
            <Zap className="w-4 h-4" />
            One budget, multiple services: Storage + ArNS Domains
          </div>
          <div className="text-xs text-foreground/80">
            Pricing shown in USD. Crypto payments (AR, ETH, SOL, etc.) available in Top Up
          </div>
        </div>

        {/* Calculator Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex w-full max-w-sm sm:w-auto bg-card rounded-2xl p-1 border border-border/20">
            <button
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputType === 'storage'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:text-foreground'
              }`}
              onClick={() => setInputType('storage')}
            >
              <HardDrive className="w-4 h-4" />
              <span className="hidden sm:inline">Storage to Cost</span>
              <span className="sm:hidden">Storage</span>
            </button>
            <button
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputType === 'dollars'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:text-foreground'
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
            <div className="text-foreground/80 text-lg">Loading current network prices...</div>
          </div>
        ) : (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
            {/* Input Side */}
            <div>
              {inputType === 'storage' ? (
                <>
                  <h4 className="text-lg font-bold font-heading text-foreground mb-4">Enter Storage Amount</h4>
                  <div className="bg-card rounded-2xl p-6">
                    <label className="block text-sm font-medium text-foreground/80 mb-3">
                      How much data do you need to store?
                    </label>
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 mb-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={storageAmountInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStorageAmountInput(value);

                          // Update numeric value for calculations
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setStorageAmount(numValue);
                          } else if (value === '' || value === '0') {
                            setStorageAmount(0);
                          }
                        }}
                        onBlur={(e) => {
                          // Clean up input on blur
                          const numValue = parseFloat(e.target.value);
                          if (isNaN(numValue) || numValue < 0) {
                            setStorageAmountInput('1');
                            setStorageAmount(1);
                          } else {
                            // Remove leading zeros but keep the number
                            const cleanValue = numValue.toString();
                            setStorageAmountInput(cleanValue);
                            setStorageAmount(numValue);
                          }
                        }}
                        className="w-full sm:flex-1 rounded-2xl border border-border/20 bg-card px-4 py-3 sm:py-4 text-lg font-medium text-foreground focus:border-primary focus:outline-none"
                        placeholder="Enter amount"
                      />
                      <Listbox
                        value={storageUnits.find(unit => unit.value === storageUnit)}
                        onChange={(unit) => setStorageUnit(unit.value)}
                      >
                        <div className="relative w-full sm:w-auto">
                          <Listbox.Button className="relative w-full sm:w-auto rounded-2xl border border-border/20 bg-card pl-4 pr-12 py-3 sm:py-4 text-lg font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer text-left">
                            <span className="block truncate">{storageUnits.find(unit => unit.value === storageUnit)?.label}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                              <ChevronDown className="h-5 w-5 text-foreground/80" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 w-full rounded-2xl bg-card border border-border/20 shadow-lg focus:outline-none">
                              {storageUnits.map((unit) => (
                                <Listbox.Option
                                  key={unit.value}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-3 pl-4 pr-10 ${
                                      active ? 'bg-card text-foreground' : 'text-foreground/80'
                                    }`
                                  }
                                  value={unit}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span className={`block truncate text-lg font-medium ${selected ? 'font-bold text-foreground' : 'font-medium'}`}>
                                        {unit.label}
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary">
                                          <Check className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>

                    {/* Common storage sizes */}
                    <div className="text-xs text-foreground/80 mb-2">Quick select:</div>
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
                          className="px-3 py-2 sm:py-3 text-xs rounded-2xl border border-border/20 text-foreground/80 hover:bg-card hover:text-foreground transition-colors min-h-[44px] flex items-center justify-center"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-bold font-heading text-foreground mb-4">Enter Your Budget</h4>
                  <div className="bg-card rounded-2xl p-6 min-h-[300px] flex flex-col">
                    <label className="block text-sm font-medium text-foreground/80 mb-3">
                      How much do you want to spend on services?
                    </label>
                    <div className="flex gap-3 items-center mb-4">
                      <span className="text-foreground text-2xl font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dollarAmountInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDollarAmountInput(value);

                          // Update numeric value for calculations
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setDollarAmount(numValue);
                          } else if (value === '' || value === '0') {
                            setDollarAmount(0);
                          }
                        }}
                        onBlur={(e) => {
                          // Clean up input on blur
                          const numValue = parseFloat(e.target.value);
                          if (isNaN(numValue) || numValue < 0) {
                            setDollarAmountInput('50');
                            setDollarAmount(50);
                          } else {
                            // Remove leading zeros but keep the number
                            const cleanValue = numValue.toString();
                            setDollarAmountInput(cleanValue);
                            setDollarAmount(numValue);
                          }
                        }}
                        className="flex-1 rounded-2xl border border-border/20 bg-card px-4 py-3 sm:py-4 text-lg font-medium text-foreground focus:border-primary focus:outline-none"
                        placeholder="Enter amount"
                      />
                      <span className="text-foreground/80 text-lg">USD</span>
                    </div>

                    {/* Quick amounts */}
                    <div className="text-xs text-foreground/80 mb-2">Quick select:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-auto">
                      {[10, 25, 50, 100, 250, 500].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setDollarAmount(amount)}
                          className="px-3 py-2 sm:py-3 text-xs rounded-2xl border border-border/20 text-foreground/80 hover:bg-card hover:text-foreground transition-colors min-h-[44px] flex items-center justify-center"
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
              <h4 className="text-lg font-bold font-heading text-foreground mb-4">
                {inputType === 'storage' ? 'Cost Breakdown' : 'What You Can Get'}
              </h4>

              {inputType === 'storage' ? (
                <div className="space-y-4">
                  {/* Primary Result */}
                  <div className="bg-card border-2 border-primary rounded-2xl p-6">
                    <div className="text-sm text-foreground/80 mb-1">Total Cost</div>
                    <div className="text-4xl font-bold text-primary">
                      ${formatNumber(calculateStorageCost())}
                    </div>
                    <div className="text-sm text-foreground/80 mt-2">USD</div>
                  </div>

                  {/* Secondary Info */}
                  <div className="bg-card rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground/80">Storage Size</span>
                      <span className="text-lg font-medium text-foreground">
                        {formatBytes(getStorageInBytes())}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground/80">Credits Needed</span>
                      <span className="text-lg font-medium text-foreground">
                        {formatNumber((getStorageInGiB() * Number(wincForOneGiB)) / 1e12)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Credits Available */}
                  <div className="bg-card border-2 border-primary rounded-2xl p-6">
                    <div className="text-sm text-foreground/80 mb-1">Credits Available</div>
                    <div className="text-4xl font-bold text-primary">
                      {formatNumber(calculateCreditsForDollars())}
                    </div>
                    <div className="text-sm text-foreground/80 mt-2">Credits</div>
                  </div>

                  {/* Storage Option */}
                  <div className="bg-card rounded-2xl p-4 min-h-[120px] flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Permanent Storage</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground mb-1">
                      {formatNumber(calculateStorageForDollars())} GiB
                    </div>
                    <div className="text-xs text-foreground/80 mt-auto">
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
                        <div className="bg-card rounded-2xl p-4 min-h-[120px] flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">ArNS Domains</span>
                          </div>
                          <div className="text-lg font-bold text-foreground mb-1">
                            {bestDomain.tier.displayName} for {bestDomain.maxYears} year{bestDomain.maxYears > 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-foreground/80 mb-2">
                            e.g. {bestDomain.recommendedName}.ar.io
                          </div>
                          {affordableOptions.length > 1 && (
                            <div className="text-xs text-foreground/80 mb-2">
                              + {affordableOptions.length - 1} other option{affordableOptions.length > 2 ? 's' : ''}
                            </div>
                          )}
                          <div className="text-xs text-foreground/80 mt-auto">
                            {formatNumber(bestDomain.totalCostCredits)} credits (${formatNumber(bestDomain.totalCostUSD)})
                          </div>
                        </div>
                      );
                    } else {
                      // Show progress toward cheapest domain
                      return (
                        <div className="bg-card rounded-2xl p-4 min-h-[120px] flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-foreground/80" />
                            <span className="text-sm font-medium text-foreground/80">ArNS Domains</span>
                          </div>
                          {cheapestTier ? (
                            <>
                              <div className="text-sm text-foreground/80 mb-1">
                                Cheapest domain: ${formatNumber(cheapestTier.pricesInUSD.year1)}
                              </div>
                              <div className="text-xs text-foreground/80 mb-2">
                                13+ characters, 1 year (paid in ARIO tokens)
                              </div>
                              <div className="text-xs text-foreground/80 mt-auto">
                                Increase budget to ${formatNumber(cheapestTier.pricesInUSD.year1)} to afford
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-foreground/80 flex-1 flex items-center justify-center">
                              Loading domain pricing...
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}

                  {/* Budget Breakdown */}
                  <div className="bg-card rounded-2xl p-4 space-y-2 border border-border/20">
                    <div className="text-xs font-medium text-foreground/80 uppercase tracking-wider">Your Budget</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground/80">Total Budget</span>
                      <span className="text-lg font-medium text-foreground">
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
        <div className="mt-8 text-center bg-primary/10 rounded-2xl border border-primary/20 p-6">
          {!address ? (
            // Not logged in - show connect wallet CTA
            <>
              <h4 className="text-lg font-bold font-heading text-foreground mb-3">Ready to use services?</h4>
              <p className="text-foreground/80 mb-4">Connect your wallet to top up credits and access storage + domains.</p>
              <button
                onClick={() => setShowWalletModal(true)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors"
              >
                Connect Wallet <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : creditBalance > 0 ? (
            // Logged in with credits - show service CTAs
            <>
              <h4 className="text-lg font-bold font-heading text-foreground mb-3">You have {creditBalance.toFixed(2)} credits ready to use!</h4>
              <p className="text-foreground/80 mb-4">Start using your credits for permanent storage or register ArNS domain names.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/upload"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Link>
                <Link
                  to="/domains"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Search Domains
                </Link>
              </div>
            </>
          ) : (
            // Logged in but no credits - show top up CTA
            <>
              <h4 className="text-lg font-bold font-heading text-foreground mb-3">You need credits to use services</h4>
              <p className="text-foreground/80 mb-4">Top up your account with credits to access permanent storage and ArNS domains.</p>
              <Link
                to="/topup"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Top Up Credits
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Coming Soon Services Teaser */}
      <div className="mt-4 sm:mt-6 p-4 bg-card rounded-2xl border border-border/20">
        <div className="text-xs text-foreground/80 mb-3 text-center font-medium uppercase tracking-wider">More services coming soon</div>
        <div className="flex justify-center gap-8 text-xs">
          <div className="text-center">
            <Database className="w-5 h-5 text-foreground/80 mx-auto mb-2" />
            <div className="text-foreground font-medium">Data Indexer</div>
            <div className="text-foreground/80 mt-1">Custom indexes</div>
          </div>
          <div className="text-center">
            <Zap className="w-5 h-5 text-foreground/80 mx-auto mb-2" />
            <div className="text-foreground font-medium">Priority Access</div>
            <div className="text-foreground/80 mt-1">Faster processing</div>
          </div>
          <div className="text-center">
            <Rss className="w-5 h-5 text-foreground/80 mx-auto mb-2" />
            <div className="text-foreground font-medium">Data Feeds</div>
            <div className="text-foreground/80 mt-1">Real-time updates</div>
          </div>
        </div>
      </div>

      {showWalletModal && (
        <WalletSelectionModal
          onClose={() => setShowWalletModal(false)}
        />
      )}
    </div>
  );
}
