import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Listbox, Transition } from '@headlessui/react';
import { Calculator, HardDrive, DollarSign, ArrowRight, Zap, Upload, Globe, CreditCard, ChevronDown, Check } from 'lucide-react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useCreditsForFiat } from '../../hooks/useCreditsForFiat';
import { useStore } from '../../store/useStore';
import WalletSelectionModal from '../modals/WalletSelectionModal';

export default function PricingCalculatorPanel() {
  const { address, creditBalance } = useStore();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [inputType, setInputType] = useState<'storage' | 'dollars'>('storage');
  const [storageAmount, setStorageAmount] = useState(1);
  const [storageAmountInput, setStorageAmountInput] = useState('1'); // String for display
  const [storageUnit, setStorageUnit] = useState<'MiB' | 'GiB' | 'TiB'>('GiB');

  const storageUnits = [
    { value: 'MiB', label: 'MiB' },
    { value: 'GiB', label: 'GiB' },
    { value: 'TiB', label: 'TiB' },
  ] as const;
  const [dollarAmount, setDollarAmount] = useState(10);
  const [dollarAmountInput, setDollarAmountInput] = useState('10'); // String for display
  
  // Get conversion rates
  const wincForOneGiB = useWincForOneGiB();
  const [creditsForOneUSD] = useCreditsForFiat(1, () => {});
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

  const isLoading = wincLoading || creditsLoading;

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-fg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Calculator className="w-5 h-5 text-fg-muted" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Storage Pricing Calculator</h3>
          <p className="text-sm text-link">
            Calculate exactly how much permanent storage you get for your budget
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-fg-muted/5 to-fg-muted/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        
        {/* Free Tier Notice */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-fg-muted/10 text-fg-muted px-4 py-2 rounded-lg text-sm font-medium">
            <Zap className="w-4 h-4" />
            Files under 100 KiB are FREE!
          </div>
        </div>

        {/* Calculator Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex w-full max-w-sm sm:w-auto bg-surface rounded-lg p-1 border border-default">
            <button
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputType === 'storage'
                  ? 'bg-fg-muted text-black'
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
                  ? 'bg-fg-muted text-black'
                  : 'text-link hover:text-fg-muted'
              }`}
              onClick={() => setInputType('dollars')}
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Budget to Storage</span>
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
                        className="w-full sm:flex-1 rounded-lg border border-default bg-canvas px-4 py-3 sm:py-4 text-lg font-medium text-fg-muted focus:border-fg-muted focus:outline-none"
                        placeholder="Enter amount"
                      />
                      <Listbox 
                        value={storageUnits.find(unit => unit.value === storageUnit)} 
                        onChange={(unit) => setStorageUnit(unit.value)}
                      >
                        <div className="relative w-full sm:w-auto">
                          <Listbox.Button className="relative w-full sm:w-auto rounded-lg border border-default bg-canvas pl-4 pr-12 py-3 sm:py-4 text-lg font-medium text-fg-muted focus:border-fg-muted focus:outline-none cursor-pointer text-left">
                            <span className="block truncate">{storageUnits.find(unit => unit.value === storageUnit)?.label}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                              <ChevronDown className="h-5 w-5 text-link" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface border border-default shadow-lg focus:outline-none">
                              {storageUnits.map((unit) => (
                                <Listbox.Option
                                  key={unit.value}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-3 pl-4 pr-10 ${
                                      active ? 'bg-canvas text-fg-muted' : 'text-link'
                                    }`
                                  }
                                  value={unit}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span className={`block truncate text-lg font-medium ${selected ? 'font-bold text-fg-muted' : 'font-medium'}`}>
                                        {unit.label}
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-fg-muted">
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
                  <div className="bg-surface rounded-lg p-6">
                    <label className="block text-sm font-medium text-link mb-3">
                      How much do you want to spend?
                    </label>
                    <div className="flex gap-3 items-center mb-4">
                      <span className="text-fg-muted text-2xl font-bold">$</span>
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
                            setDollarAmountInput('10');
                            setDollarAmount(10);
                          } else {
                            // Remove leading zeros but keep the number
                            const cleanValue = numValue.toString();
                            setDollarAmountInput(cleanValue);
                            setDollarAmount(numValue);
                          }
                        }}
                        className="flex-1 rounded-lg border border-default bg-canvas px-4 py-3 sm:py-4 text-lg font-medium text-fg-muted focus:border-fg-muted focus:outline-none"
                        placeholder="Enter amount"
                      />
                      <span className="text-link text-lg">USD</span>
                    </div>
                    
                    {/* Quick amounts */}
                    <div className="text-xs text-link mb-2">Quick select:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[5, 10, 25, 50, 100, 250].map((amount) => (
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
                {inputType === 'storage' ? 'Cost Breakdown' : 'Storage Breakdown'}
              </h4>
              
              {inputType === 'storage' ? (
                <div className="space-y-4">
                  {/* Primary Result */}
                  <div className="bg-canvas border-2 border-fg-muted rounded-lg p-6">
                    <div className="text-sm text-link mb-1">Total Cost</div>
                    <div className="text-4xl font-bold text-fg-muted">
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
                  {/* Primary Result */}
                  <div className="bg-canvas border-2 border-fg-muted rounded-lg p-6">
                    <div className="text-sm text-link mb-1">Storage You Get</div>
                    <div className="text-4xl font-bold text-fg-muted">
                      {formatNumber(calculateStorageForDollars())} GiB
                    </div>
                    <div className="text-sm text-link mt-2">
                      = {formatBytes(calculateStorageForDollars() * 1024 * 1024 * 1024)}
                    </div>
                  </div>

                  {/* Secondary Info */}
                  <div className="bg-surface rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-link">Your Budget</span>
                      <span className="text-lg font-medium text-fg-muted">
                        ${formatNumber(dollarAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-link">Credits You'll Get</span>
                      <span className="text-lg font-medium text-fg-muted">
                        {formatNumber(dollarAmount * creditsForOneUSD)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* CTA Section */}
        <div className="mt-8 text-center bg-canvas rounded-lg border border-fg-muted/20 p-6">
          {!address ? (
            // Not logged in - show connect wallet CTA
            <>
              <h4 className="text-lg font-bold text-fg-muted mb-3">Ready to store your data permanently?</h4>
              <p className="text-link mb-4">Connect your wallet to top up credits and start uploading.</p>
              <button
                onClick={() => setShowWalletModal(true)}
                className="inline-flex items-center gap-2 bg-fg-muted text-black px-6 py-3 rounded-lg font-bold hover:bg-fg-muted/90 transition-colors"
              >
                Connect Wallet <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : creditBalance > 0 ? (
            // Logged in with credits - show upload/ArNS CTAs
            <>
              <h4 className="text-lg font-bold text-fg-muted mb-3">You have {creditBalance.toFixed(2)} credits ready to use!</h4>
              <p className="text-link mb-4">Start uploading files or register an ArNS domain name to use your credits.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/upload"
                  className="inline-flex items-center justify-center gap-2 bg-turbo-red text-white px-4 py-3 rounded-lg font-bold hover:bg-turbo-red/90 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Link>
                <Link
                  to="/domains"
                  className="inline-flex items-center justify-center gap-2 bg-turbo-yellow text-black px-4 py-3 rounded-lg font-bold hover:bg-turbo-yellow/90 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Search for a Domain
                </Link>
              </div>
            </>
          ) : (
            // Logged in but no credits - show top up CTA
            <>
              <h4 className="text-lg font-bold text-fg-muted mb-3">You need credits to store data permanently</h4>
              <p className="text-link mb-4">Top up your account with credits to start uploading files or registering ArNS names.</p>
              <Link
                to="/topup"
                className="inline-flex items-center gap-2 bg-fg-muted text-black px-6 py-3 rounded-lg font-bold hover:bg-fg-muted/90 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Top Up Credits
              </Link>
            </>
          )}
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