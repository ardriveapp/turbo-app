import { useState } from 'react';
import { Calculator, HardDrive, DollarSign, Info, Check } from 'lucide-react';
import { useWincForOneGiB } from '../hooks/useWincForOneGiB';
import { useCreditsForFiat } from '../hooks/useCreditsForFiat';
import { useFreeUploadLimit, formatFreeLimit } from '../hooks/useFreeUploadLimit';

export default function PricingCalculator() {
  const freeUploadLimitBytes = useFreeUploadLimit();
  const [inputType, setInputType] = useState<'storage' | 'dollars'>('storage');
  const [storageAmount, setStorageAmount] = useState(1);
  const [storageUnit, setStorageUnit] = useState<'MB' | 'GB' | 'TB'>('GB');
  const [dollarAmount, setDollarAmount] = useState(10);

  // Get conversion rates
  const wincForOneGiB = useWincForOneGiB();
  const [creditsForOneUSD] = useCreditsForFiat(1, () => {});
  const wincLoading = !wincForOneGiB;
  const creditsLoading = !creditsForOneUSD;

  // Calculate storage in GB
  const getStorageInGB = () => {
    switch (storageUnit) {
      case 'MB':
        return storageAmount / 1024;
      case 'TB':
        return storageAmount * 1024;
      default:
        return storageAmount;
    }
  };

  // Calculate storage in bytes for display
  const getStorageInBytes = () => {
    const gb = getStorageInGB();
    return gb * 1024 * 1024 * 1024;
  };

  // Calculate cost in dollars for storage
  const calculateStorageCost = () => {
    if (!wincForOneGiB || !creditsForOneUSD) return 0;
    const storageInGiB = getStorageInGB();
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
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${formatNumber(bytes)} B`;
    if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${formatNumber(bytes / (1024 * 1024))} MB`;
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${formatNumber(bytes / (1024 * 1024 * 1024))} GB`;
    return `${formatNumber(bytes / (1024 * 1024 * 1024 * 1024))} TB`;
  };

  const isLoading = wincLoading || creditsLoading;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/3 rounded-2xl border border-border/20 p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-lg mb-4">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Pricing Calculator</h2>
        <p className="text-foreground/80 text-sm max-w-2xl mx-auto">
          Calculate storage costs or see how much storage your budget gets you.
          {freeUploadLimitBytes > 0 && ` Files under ${formatFreeLimit(freeUploadLimitBytes)} are always FREE!`}
        </p>
      </div>

      {/* Calculator Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-card rounded-2xl p-1 border border-border/20">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              inputType === 'storage'
                ? 'bg-primary text-white'
                : 'text-foreground/80 hover:text-foreground'
            }`}
            onClick={() => setInputType('storage')}
          >
            <HardDrive className="w-4 h-4 inline mr-2" />
            Storage → Cost
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              inputType === 'dollars'
                ? 'bg-primary text-white'
                : 'text-foreground/80 hover:text-foreground'
            }`}
            onClick={() => setInputType('dollars')}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Budget → Storage
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-foreground/80">Loading current prices...</div>
        </div>
      ) : (
        <>
          {inputType === 'storage' ? (
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Left: Storage Input */}
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4">Enter Storage Amount</h3>
                  <div className="bg-card rounded-2xl p-6">
                    <label className="block text-sm font-medium text-foreground/80 mb-3">
                      How much data do you need to store?
                    </label>
                    <div className="flex gap-3 mb-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={storageAmount}
                        onChange={(e) => setStorageAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="flex-1 rounded-2xl border border-border/20 bg-card px-4 py-2 text-foreground focus:border-primary focus:outline-none"
                      />
                      <select
                        value={storageUnit}
                        onChange={(e) => setStorageUnit(e.target.value as 'MB' | 'GB' | 'TB')}
                        className="rounded-2xl border border-border/20 bg-card px-4 py-2 text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                        <option value="TB">TB</option>
                      </select>
                    </div>

                    {/* Quick select buttons */}
                    <div className="space-y-2">
                      <div className="text-xs text-foreground/80 mb-2">Quick select:</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { amount: 100, unit: 'MB' as const },
                          { amount: 500, unit: 'MB' as const },
                          { amount: 1, unit: 'GB' as const },
                          { amount: 10, unit: 'GB' as const },
                          { amount: 100, unit: 'GB' as const },
                          { amount: 1, unit: 'TB' as const },
                        ].map(({ amount, unit }) => (
                          <button
                            key={`${amount}${unit}`}
                            onClick={() => {
                              setStorageAmount(amount);
                              setStorageUnit(unit);
                            }}
                            className="px-3 py-2 text-xs rounded border border-border/20 text-foreground/80 hover:bg-card hover:text-foreground transition-colors"
                          >
                            {amount} {unit}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Cost Breakdown */}
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4">Cost Breakdown</h3>
                  <div className="space-y-3">
                    <div className="bg-card border border-border/20 rounded-2xl p-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-foreground/80">Total Storage</span>
                        <span className="text-xl font-bold text-foreground">
                          {formatBytes(getStorageInBytes())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-foreground/80">Cost in USD</span>
                        <span className="text-2xl font-bold text-primary">
                          ${formatNumber(calculateStorageCost())}
                        </span>
                      </div>
                    </div>

                    <div className="bg-card/50 rounded-2xl p-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-foreground/80">Credits Needed</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatNumber((getStorageInGB() * Number(wincForOneGiB)) / 1e12)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {/* Dollar Input */}
              <div className="bg-card rounded-2xl p-6 mb-4">
                <label className="block text-sm font-medium text-foreground/80 mb-3">
                  What's your budget?
                </label>
                <div className="flex gap-3 items-center">
                  <span className="text-foreground text-lg">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={dollarAmount}
                    onChange={(e) => setDollarAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="flex-1 rounded-2xl border border-border/20 bg-card px-4 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                  <span className="text-foreground/80 text-sm">USD</span>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2 mt-3">
                  {[5, 10, 25, 50, 100, 250].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setDollarAmount(amount)}
                      className="px-3 py-1 text-xs rounded border border-border/20 text-foreground/80 hover:bg-card hover:text-foreground transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className="space-y-3">
                <div className="bg-card border border-border/20 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-foreground/80">Budget</span>
                    <span className="text-xl font-bold text-foreground">
                      ${formatNumber(dollarAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground/80">Storage You Get</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatNumber(calculateStorageForDollars())} GB
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 rounded-2xl p-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/80">Credits You'll Receive</span>
                    <span className="text-foreground font-medium">
                      {formatNumber(dollarAmount * creditsForOneUSD)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-card/30 rounded-2xl p-4 max-w-2xl mx-auto">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-foreground/80 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/80">
                <p className="mb-2">
                  <strong className="text-foreground">Good to know:</strong>
                </p>
                <ul className="space-y-1">
                  {freeUploadLimitBytes > 0 && (
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Files under {formatFreeLimit(freeUploadLimitBytes)} are completely FREE</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Storage is permanent - pay once, store forever</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Prices update in real-time based on network rates</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
