import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFolderUpload } from '../../hooks/useFolderUpload';
import { useFreeUploadLimit, isFileFree } from '../../hooks/useFreeUploadLimit';
import { useX402Pricing } from '../../hooks/useX402Pricing';
import { wincPerCredit, SupportedTokenType, tokenLabels } from '../../constants';
import { useStore } from '../../store/useStore';
import { Globe, XCircle, Loader2, RefreshCw, Info, Receipt, ChevronDown, ChevronUp, CheckCircle, Folder, File, FileText, Image, Code, ExternalLink, Home, AlertTriangle, Archive, Clock, HelpCircle, MoreVertical, Zap, ArrowRight, Copy, X, Wallet, CreditCard, Sparkles, Package } from 'lucide-react';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { supportsJitPayment, calculateRequiredTokenAmount, formatTokenAmount, getTokenConverter } from '../../utils/jitPayment';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import CopyButton from '../CopyButton';
import { getArweaveUrl, getArweaveRawUrl } from '../../utils';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import { useOwnedArNSNames } from '../../hooks/useOwnedArNSNames';
import { useNavigate } from 'react-router-dom';
import ReceiptModal from '../modals/ReceiptModal';
import ArNSAssociationPanel from '../ArNSAssociationPanel';
import AssignDomainModal from '../modals/AssignDomainModal';
import BaseModal from '../modals/BaseModal';
import UploadProgressSummary from '../UploadProgressSummary';
import { JitTokenSelector } from '../JitTokenSelector';
import X402OnlyBanner from '../X402OnlyBanner';

// Helper function moved outside component to prevent recreation on every render
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return FileText;
    case 'css':
    case 'scss':
    case 'sass':
      return Code;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return Code;
    case 'json':
      return FileText;
    case 'md':
    case 'txt':
      return FileText;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return Image;
    default:
      return File;
  }
}

// Memoized App Details Fields Component - prevents parent re-renders from causing lag
interface AppDetailsFieldsProps {
  appName: string;
  appVersion: string;
  onAppNameChange: (value: string) => void;
  onAppVersionChange: (value: string) => void;
  deployedApps: Record<string, { appVersion: string; lastDeployed: number }>;
}

const AppDetailsFields = React.memo(function AppDetailsFields({
  appName,
  appVersion,
  onAppNameChange,
  onAppVersionChange,
  deployedApps,
}: AppDetailsFieldsProps) {
  // Local state for instant typing - syncs to parent on blur
  const [localName, setLocalName] = useState(appName);
  const [localVersion, setLocalVersion] = useState(appVersion);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync from parent when props change (e.g., folder selection pre-fill)
  useEffect(() => {
    setLocalName(appName);
  }, [appName]);

  useEffect(() => {
    setLocalVersion(appVersion);
  }, [appVersion]);

  // Compute recent app names from data
  const recentAppNames = useMemo(() => {
    return Object.entries(deployedApps)
      .sort(([, a], [, b]) => b.lastDeployed - a.lastDeployed)
      .slice(0, 5)
      .map(([name]) => name);
  }, [deployedApps]);

  // Filter suggestions based on LOCAL input (no parent re-render)
  const filteredSuggestions = useMemo(() => {
    if (!localName.trim()) return recentAppNames;
    const lowerInput = localName.toLowerCase();
    return recentAppNames.filter(name =>
      name.toLowerCase().includes(lowerInput) && name.toLowerCase() !== lowerInput
    );
  }, [localName, recentAppNames]);

  const handleSelect = (name: string) => {
    setLocalName(name);
    onAppNameChange(name); // Sync immediately on selection
    const app = deployedApps[name];
    if (app) {
      setLocalVersion(app.appVersion);
      onAppVersionChange(app.appVersion);
    }
    setShowSuggestions(false);
  };

  const currentApp = localName ? deployedApps[localName] : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 mb-3 border-b border-border/20">
      {/* App Name Field */}
      <div className="relative">
        <label className="block text-xs text-foreground/80 mb-1">App Name</label>
        <input
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value.slice(0, 100))}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            onAppNameChange(localName); // Sync to parent on blur
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder="My Awesome App"
          maxLength={100}
          className="w-full px-3 py-2 bg-card border border-border/20 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
        />
        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border/20 rounded-lg shadow-lg overflow-hidden">
            <div className="px-3 py-1.5 text-xs text-foreground/80 border-b border-border/10">Recent Apps</div>
            {filteredSuggestions.map((name) => {
              const app = deployedApps[name];
              return (
                <button
                  key={name}
                  onClick={() => handleSelect(name)}
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-card transition-colors flex items-center justify-between"
                >
                  <span>{name}</span>
                  {app && <span className="text-xs text-foreground/80">v{app.appVersion}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* Version Field */}
      <div>
        <label className="block text-xs text-foreground/80 mb-1">Version</label>
        <input
          type="text"
          value={localVersion}
          onChange={(e) => setLocalVersion(e.target.value.slice(0, 50))}
          onBlur={() => onAppVersionChange(localVersion)} // Sync to parent on blur
          placeholder="1.0.0"
          maxLength={50}
          className="w-full px-3 py-2 bg-card border border-border/20 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
        />
        {currentApp && localVersion !== currentApp.appVersion && (
          <p className="mt-1 text-xs text-foreground/80">Last: v{currentApp.appVersion}</p>
        )}
      </div>
    </div>
  );
});

// Unified Crypto Payment Details Component (matches Upload modal)
interface CryptoPaymentDetailsProps {
  creditsNeeded: number;
  totalCost: number;
  tokenType: SupportedTokenType;
  walletAddress: string | null;
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  onBalanceValidation: (hasSufficientBalance: boolean) => void;
  onShortageUpdate: (shortage: { amount: number; tokenType: SupportedTokenType } | null) => void;
  localJitMax: number;
  onMaxTokenAmountChange: (amount: number) => void;
  x402Pricing?: {
    usdcAmount: number;
    usdcAmountSmallestUnit: string;
    loading: boolean;
    error: string | null;
  };
}

const CryptoPaymentDetails = React.memo(function CryptoPaymentDetails({
  creditsNeeded,
  totalCost,
  tokenType,
  walletAddress,
  walletType,
  onBalanceValidation,
  onShortageUpdate,
  localJitMax: _localJitMax, // eslint-disable-line @typescript-eslint/no-unused-vars
  onMaxTokenAmountChange,
  x402Pricing,
}: CryptoPaymentDetailsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<{
    tokenAmountReadable: number;
    estimatedUSD: number | null;
  } | null>(null);
  const [bufferPercentage, setBufferPercentage] = useState(1); // Default 1% buffer

  const tokenLabel = tokenLabels[tokenType];
  const BUFFER_MULTIPLIER = 1 + (bufferPercentage / 100); // Adjustable buffer

  // Fetch wallet balance
  const {
    balance: tokenBalance,
    loading: balanceLoading,
    error: balanceError,
    isNetworkError,
  } = useTokenBalance(tokenType, walletType, walletAddress, true);

  // Calculate estimated cost
  useEffect(() => {
    const calculate = async () => {
      try {
        // For base-usdc, use x402 pricing directly
        if (tokenType === 'base-usdc' && x402Pricing) {
          // Don't set cost while loading to avoid showing "FREE" flash
          if (x402Pricing.loading) {
            setEstimatedCost(null); // Show "Calculating..."
            return;
          }

          if (!x402Pricing.error) {
            setEstimatedCost({
              tokenAmountReadable: x402Pricing.usdcAmount, // Can be 0 for free deployments
              estimatedUSD: x402Pricing.usdcAmount, // USDC is 1:1 with USD
            });

            // For Crypto tab, max is just the buffered cost
            onMaxTokenAmountChange(x402Pricing.usdcAmount);
          }
          return;
        }

        // For other tokens, calculate using regular pricing
        // Always use totalCost for Crypto tab - user is choosing to pay full amount with crypto
        const cost = await calculateRequiredTokenAmount({
          creditsNeeded: totalCost,
          tokenType,
          bufferMultiplier: BUFFER_MULTIPLIER,
        });

        setEstimatedCost({
          tokenAmountReadable: cost.tokenAmountReadable,
          estimatedUSD: cost.estimatedUSD,
        });

        // For Crypto tab, max is just the buffered cost (already includes buffer from BUFFER_MULTIPLIER)
        onMaxTokenAmountChange(cost.tokenAmountReadable);
      } catch (error) {
        console.error('Failed to calculate crypto cost:', error);
        setEstimatedCost(null);
      }
    };

    const hasCost = (creditsNeeded > 0) || (totalCost > 0);
    if (hasCost) {
      calculate();
    } else {
      // Free deployment - set cost to 0 immediately
      setEstimatedCost({ tokenAmountReadable: 0, estimatedUSD: 0 });
      onMaxTokenAmountChange(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditsNeeded, totalCost, tokenType, bufferPercentage, x402Pricing?.usdcAmount, x402Pricing?.loading, x402Pricing?.error]);

  // Validate balance and update shortage info
  useEffect(() => {
    // Keep button disabled while pricing is loading (estimatedCost not yet available)
    if (!estimatedCost) {
      onBalanceValidation(false);
      onShortageUpdate(null);
      return;
    }

    // Keep button disabled while balance is loading
    if (balanceLoading) {
      onBalanceValidation(false);
      onShortageUpdate(null);
      return;
    }

    if (isNetworkError) {
      onBalanceValidation(false);
      onShortageUpdate(null);
      return;
    }

    // If there's a balance error but we have pricing, allow proceeding
    // (user may still have sufficient balance, we just can't verify)
    if (balanceError) {
      onBalanceValidation(true);
      onShortageUpdate(null);
      return;
    }

    const hasSufficientBalance = tokenBalance >= estimatedCost.tokenAmountReadable;
    onBalanceValidation(hasSufficientBalance);

    // Update shortage info for parent component warning
    if (!hasSufficientBalance) {
      const shortage = estimatedCost.tokenAmountReadable - tokenBalance;
      onShortageUpdate({ amount: shortage, tokenType });
    } else {
      onShortageUpdate(null);
    }
  }, [tokenBalance, estimatedCost, balanceError, isNetworkError, balanceLoading, tokenType, onBalanceValidation, onShortageUpdate]);

  const afterDeployment = estimatedCost ? Math.max(0, tokenBalance - estimatedCost.tokenAmountReadable) : tokenBalance;

  return (
    <div className="mb-4">
      <div className="bg-card rounded-lg border border-border/20 p-4">
        <div className="space-y-2.5">
          {/* Cost */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-foreground/80">Cost:</span>
            <span className="text-sm text-foreground font-medium">
              {estimatedCost ? (
                estimatedCost.tokenAmountReadable === 0 ? (
                  <span className="text-success font-medium">FREE</span>
                ) : (
                  <>
                    ~{formatTokenAmount(estimatedCost.tokenAmountReadable, tokenType)} {tokenLabel}
                    {estimatedCost.estimatedUSD && estimatedCost.estimatedUSD > 0 && (
                      <span className="text-xs text-foreground/80 ml-2">
                        (≈ ${estimatedCost.estimatedUSD < 0.01
                          ? estimatedCost.estimatedUSD.toFixed(4)
                          : estimatedCost.estimatedUSD.toFixed(2)})
                      </span>
                    )}
                  </>
                )
              ) : (
                'Calculating...'
              )}
            </span>
          </div>

          {/* Current Balance */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-foreground/80">Current Balance:</span>
            <span className="text-sm text-foreground font-medium">
              {balanceLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking...
                </span>
              ) : balanceError ? (
                <span className="text-warning">Unable to fetch</span>
              ) : (
                `${formatTokenAmount(tokenBalance, tokenType)} ${tokenLabel}`
              )}
            </span>
          </div>

          {/* After Deployment */}
          {estimatedCost && !balanceLoading && !balanceError && (
            <div className="flex justify-between items-center pt-2 border-t border-border/10">
              <span className="text-xs text-foreground/80">After Deployment:</span>
              <span className="text-sm text-foreground font-medium">
                {formatTokenAmount(afterDeployment, tokenType)} {tokenLabel}
              </span>
            </div>
          )}

          {/* Network Error Warning */}
          {isNetworkError && (
            <div className="pt-3 mt-3 border-t border-border/10">
              <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-warning font-medium mb-1">
                    {balanceError}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings - hidden for base-usdc since x402 pricing is authoritative */}
        {estimatedCost && tokenType !== 'base-usdc' && (
          <div className="mt-4 pt-4 border-t border-border/10">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-foreground/80 hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="mt-3">
                <label className="text-xs text-foreground/80 block mb-2">
                  Safety Buffer (0-20%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={bufferPercentage}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 20) {
                        setBufferPercentage(value);
                      }
                    }}
                    className="w-20 px-2 py-1.5 text-xs rounded border border-border/20 bg-card text-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-xs text-foreground/80">%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Enhanced Deploy Confirmation Modal (matches Upload modal UX)
interface DeployConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  folderName: string;
  fileCount: number;
  files: FileList;
  totalSize: number;
  totalCost: number;
  indexFile: string;
  fallbackFile: string;
  // ArNS specific props
  arnsEnabled: boolean;
  arnsName: string;
  undername: string;
  // Payment props
  currentBalance: number;
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  walletAddress: string | null;
  selectedJitToken: SupportedTokenType;
  onSelectedJitTokenChange: (token: SupportedTokenType) => void;
  jitBalanceSufficient: boolean;
  onJitBalanceValidation: (sufficient: boolean) => void;
  localJitMax: number;
  onMaxTokenAmountChange: (amount: number) => void;
  paymentTab: 'credits' | 'crypto';
  onPaymentTabChange: (tab: 'credits' | 'crypto') => void;
  cryptoShortage: { amount: number; tokenType: SupportedTokenType } | null;
  onCryptoShortageUpdate: (shortage: { amount: number; tokenType: SupportedTokenType } | null) => void;
  // X402 mode props
  x402OnlyMode: boolean;
  isPaymentServiceAvailable: () => boolean;
  // Smart Deploy props
  smartDeployEnabled: boolean;
  cachedFilesCount: number;
  billableSize: number;
  // App Details props
  appName?: string;
  appVersion?: string;
}

const DeployConfirmationModal = React.memo(function DeployConfirmationModal({
  onClose,
  onConfirm,
  folderName,
  fileCount,
  files,
  totalSize,
  totalCost,
  indexFile,
  fallbackFile,
  arnsEnabled,
  arnsName,
  undername,
  currentBalance,
  walletType,
  walletAddress,
  selectedJitToken,
  onSelectedJitTokenChange,
  jitBalanceSufficient,
  onJitBalanceValidation,
  localJitMax,
  onMaxTokenAmountChange,
  paymentTab,
  onPaymentTabChange,
  cryptoShortage,
  onCryptoShortageUpdate,
  x402OnlyMode,
  isPaymentServiceAvailable,
  smartDeployEnabled,
  cachedFilesCount,
  billableSize,
  appName,
  appVersion,
}: DeployConfirmationModalProps) {
  const creditsNeeded = Math.max(0, totalCost - currentBalance);
  const hasSufficientCredits = creditsNeeded === 0;
  const canUseJit = selectedJitToken && supportsJitPayment(selectedJitToken);

  // Get free upload limit to count free files
  const freeUploadLimitBytes = useFreeUploadLimit();

  // Check if deployment is completely free (all files under free limit)
  const isFreeDeployment = totalCost === 0;
  // Calculate billable file size for x402 (total size for deployments)
  const billableFileSize = totalSize;

  // x402 pricing - only when user is on Crypto tab with BASE-USDC selected
  // In x402-only mode, always use x402 pricing since there's no credits option
  const shouldUseX402 =
    walletType === 'ethereum' &&
    selectedJitToken === 'base-usdc' &&
    (paymentTab === 'crypto' || x402OnlyMode);
  const x402Pricing = useX402Pricing(shouldUseX402 ? billableFileSize : 0);

  // Tab click handlers
  const handleCreditsTabClick = () => {
    onPaymentTabChange('credits');
    // Reset to base-eth when switching to Credits tab (unless x402-only mode)
    if (walletType === 'ethereum' && !x402OnlyMode) {
      onSelectedJitTokenChange('base-eth');
    }
  };

  const handleCryptoTabClick = () => {
    onPaymentTabChange('crypto');
    // Keep current selection (default is base-ario for Ethereum wallets)
    // User can change via JitTokenSelector if needed
  };
  return (
    <BaseModal onClose={onClose}>
      <div className="p-4 sm:p-5 w-full max-w-2xl mx-auto min-w-[90vw] sm:min-w-[500px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-foreground">Ready to Deploy</h3>
            <p className="text-xs text-foreground/80">Confirm your deployment details</p>
          </div>
        </div>

        {/* X402-Only Mode Banner */}
        {x402OnlyMode && <X402OnlyBanner />}

        {/* Deployment Summary */}
        <div className="mb-4">
          <div className="bg-card rounded-lg p-3">
            <div className="space-y-2">
              {/* App Name/Version at top if provided */}
              {appName && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-foreground/80">App:</span>
                  <span className="text-xs text-foreground font-medium">
                    {appName}{appVersion && <span className="text-foreground/80 font-normal ml-1">v{appVersion}</span>}
                  </span>
                </div>
              )}

              {/* ArNS Domain */}
              {arnsEnabled && arnsName && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-foreground/80">Domain:</span>
                  <span className="text-xs text-foreground">
                    {undername ? undername + '_' : ''}{arnsName}.ar.io
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/80">Folder:</span>
                <span className="text-xs text-foreground">{folderName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/80">Files:</span>
                <span className="text-xs text-foreground">
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                  {(() => {
                    const freeFilesCount = Array.from(files).filter(file => isFileFree(file.size, freeUploadLimitBytes)).length;
                    const parts: React.ReactNode[] = [];
                    if (smartDeployEnabled && cachedFilesCount > 0) {
                      parts.push(<span key="cached">{cachedFilesCount} cached</span>);
                    }
                    if (freeFilesCount > 0) {
                      parts.push(<span key="free">{freeFilesCount} free</span>);
                    }
                    return parts.length > 0 ? (
                      <span className="text-success"> ({parts.reduce<React.ReactNode[]>((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [])})</span>
                    ) : null;
                  })()}
                </span>
              </div>

              {/* Auto-detected files */}
              {(indexFile || fallbackFile) && (
                <>
                  {indexFile && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-foreground/80">Homepage:</span>
                      <span className="text-xs text-foreground">{indexFile}</span>
                    </div>
                  )}
                  {fallbackFile && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-foreground/80">Error page:</span>
                      <span className="text-xs text-foreground">{fallbackFile}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/80">Total Size:</span>
                <span className="text-xs text-foreground">
                  {(totalSize / 1024 / 1024).toFixed(2)} MB
                  {(() => {
                    // Savings = totalSize - billableSize (what we WON'T pay for)
                    // billableSize already accounts for both cached files (skipped) and free files
                    const savings = totalSize - billableSize;
                    if (savings > 0) {
                      const savingsMB = savings / 1024 / 1024;
                      return (
                        <span className="text-success">
                          {' '}(saving {savingsMB < 1 ? `${(savings / 1024).toFixed(1)}KB` : `${savingsMB.toFixed(1)}MB`})
                        </span>
                      );
                    }
                    return null;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Section */}
        {(() => {
          return (
            <>
              {/* Payment Method Tabs - Only show for wallets that support JIT, non-free deployments, payment service available, and not x402-only mode */}
              {canUseJit && !isFreeDeployment && isPaymentServiceAvailable() && !x402OnlyMode && (
                <div className="mb-4">
                  <div className="inline-flex bg-card rounded-lg p-1 border border-border/20 w-full">
                    <button
                      type="button"
                      onClick={handleCreditsTabClick}
                      className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        paymentTab === 'credits'
                          ? 'bg-foreground text-card'
                          : 'text-foreground/80 hover:text-foreground'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Credits
                    </button>
                    <button
                      type="button"
                      onClick={handleCryptoTabClick}
                      className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        paymentTab === 'crypto'
                          ? 'bg-foreground text-card'
                          : 'text-foreground/80 hover:text-foreground'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      Crypto
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Details Section - Credits Tab (hide in x402-only mode) */}
              {paymentTab === 'credits' && canUseJit && !isFreeDeployment && isPaymentServiceAvailable() && !x402OnlyMode && (
                <div className="mb-4">
                  <div className="bg-card rounded-lg border border-border/20 p-4">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-foreground/80">Cost:</span>
                        <span className="text-sm text-foreground font-medium">
                          {totalCost === 0 ? (
                            <span className="text-success font-medium">FREE</span>
                          ) : typeof totalCost === 'number' ? (
                            <>{totalCost.toFixed(6)} Credits</>
                          ) : (
                            'Calculating...'
                          )}
                        </span>
                      </div>

                      {/* Only show balance info for non-free deployments */}
                      {!isFreeDeployment && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-foreground/80">Current Balance:</span>
                            <span className="text-sm text-foreground font-medium">
                              {currentBalance.toFixed(6)} Credits
                            </span>
                          </div>
                          {typeof totalCost === 'number' && (
                            <div className="flex justify-between items-center pt-2 border-t border-border/10">
                              <span className="text-xs text-foreground/80">After Deployment:</span>
                              <span className="text-sm text-foreground font-medium">
                                {Math.max(0, currentBalance - totalCost).toFixed(6)} Credits
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Insufficient Credits Warning */}
                      {!isFreeDeployment && !hasSufficientCredits && typeof totalCost === 'number' && (
                        <div className="pt-3 mt-3 border-t border-border/10">
                          <div className="flex items-start gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
                            <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-error font-medium mb-1">
                                Need {creditsNeeded.toFixed(6)} more credits
                              </div>
                              <div className="text-xs text-error/80">
                                {canUseJit && (
                                  <>
                                    • Switch to <button onClick={handleCryptoTabClick} className="underline hover:text-error/80">Crypto tab</button> to pay with crypto<br />
                                  </>
                                )}
                                • <a href="/topup" className="underline hover:text-error/80">Top up credits</a> to continue
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Details Section - Crypto Tab (always show in x402-only mode) */}
              {(paymentTab === 'crypto' || x402OnlyMode) && canUseJit && !isFreeDeployment && (
                <>
                  {/* X402-only mode: Non-Ethereum wallet warning */}
                  {x402OnlyMode && walletType !== 'ethereum' && (
                    <div className="mb-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-warning text-sm mb-1">Ethereum Wallet Required</div>
                          <div className="text-xs text-warning/80">
                            X402 payments only support Ethereum wallets with BASE-USDC. Please connect an Ethereum wallet or disable x402-only mode in Developer Resources.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* JIT Token Selector - shown for Ethereum wallets */}
                  {walletType === 'ethereum' && (
                    <div className="mb-3">
                      <JitTokenSelector
                        walletType={walletType}
                        selectedToken={selectedJitToken}
                        onTokenSelect={onSelectedJitTokenChange}
                        x402OnlyMode={x402OnlyMode}
                      />
                    </div>
                  )}

                  {/* Unified Crypto Payment Display - Only show for Ethereum in x402-only mode */}
                  {(!x402OnlyMode || walletType === 'ethereum') && (
                    <CryptoPaymentDetails
                      creditsNeeded={creditsNeeded}
                      totalCost={typeof totalCost === 'number' ? totalCost : 0}
                      tokenType={selectedJitToken}
                      walletAddress={walletAddress}
                      walletType={walletType}
                      onBalanceValidation={onJitBalanceValidation}
                      onShortageUpdate={onCryptoShortageUpdate}
                      localJitMax={localJitMax}
                      onMaxTokenAmountChange={onMaxTokenAmountChange}
                      x402Pricing={x402Pricing}
                    />
                  )}
                </>
              )}

              {/* Credits-Only Payment (for wallets without JIT support or free deployments) */}
              {(!canUseJit || isFreeDeployment) && (
                <div className="mb-4">
                  <div className="bg-card rounded-lg border border-border/20 p-4">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-foreground/80">Cost:</span>
                        <span className="text-sm text-foreground font-medium">
                          {totalCost === 0 ? (
                            <span className="text-success font-medium">FREE</span>
                          ) : typeof totalCost === 'number' ? (
                            <>{totalCost.toFixed(6)} Credits</>
                          ) : (
                            'Calculating...'
                          )}
                        </span>
                      </div>

                      {/* Only show balance info for non-free deployments */}
                      {!isFreeDeployment && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-foreground/80">Current Balance:</span>
                            <span className="text-sm text-foreground font-medium">
                              {currentBalance.toFixed(6)} Credits
                            </span>
                          </div>
                          {typeof totalCost === 'number' && (
                            <div className="flex justify-between items-center pt-2 border-t border-border/10">
                              <span className="text-xs text-foreground/80">After Deployment:</span>
                              <span className="text-sm text-foreground font-medium">
                                {Math.max(0, currentBalance - totalCost).toFixed(6)} Credits
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Insufficient Credits Warning */}
                      {!isFreeDeployment && !hasSufficientCredits && typeof totalCost === 'number' && (
                        <div className="pt-3 mt-3 border-t border-border/10">
                          <div className="flex items-start gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
                            <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-error font-medium mb-1">
                                Need {creditsNeeded.toFixed(6)} more credits
                              </div>
                              <div className="text-xs text-error/80">
                                • <a href="/topup" className="underline hover:text-error/80">Top up credits</a> to continue
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto Shortage Warning (when on Crypto tab with insufficient balance) */}
              {paymentTab === 'crypto' && cryptoShortage && !jitBalanceSufficient && (
                <div className="mb-4">
                  <div className="flex items-start gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
                    <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-error font-medium mb-1">
                        Insufficient {tokenLabels[cryptoShortage.tokenType]} balance
                      </div>
                      <div className="text-xs text-error/80">
                        • Switch to <button onClick={handleCreditsTabClick} className="underline hover:text-error/80">Credits tab</button> to use credits<br />
                        • Add {formatTokenAmount(cryptoShortage.amount, cryptoShortage.tokenType)} {tokenLabels[cryptoShortage.tokenType]} to your wallet<br />
                        • <a href="/topup" className="underline hover:text-error/80">Buy credits</a> instead
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Terms and Conditions */}
        <div className="bg-card/30 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-foreground/80 text-center">
            By deploying, you agree to our{' '}
            <a
              href="https://ardrive.io/tos-and-privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors underline"
            >
              Terms of Service
            </a>
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-lg border border-border/20 text-foreground/80 hover:text-foreground hover:border-border/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={
              // Disable if on Credits tab and insufficient credits
              (paymentTab === 'credits' && creditsNeeded > 0) ||
              // Disable if on Crypto tab and insufficient crypto balance
              (paymentTab === 'crypto' && !jitBalanceSufficient && creditsNeeded > 0) ||
              // Disable if in x402-only mode with non-Ethereum wallet for billable deployments
              (x402OnlyMode && creditsNeeded > 0 && walletType !== 'ethereum')
            }
            className="flex-1 py-3 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-foreground/80"
          >
            {paymentTab === 'crypto' && creditsNeeded > 0 ? 'Deploy & Auto-Pay' : 'Deploy Now'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
});

export default function DeploySitePanel() {
  const navigate = useNavigate();
  const {
    address,
    walletType,
    creditBalance,
    deployHistory,
    addDeployResults,
    clearDeployHistory,
    setJitMaxTokenAmount,
    x402OnlyMode,
    isPaymentServiceAvailable,
    smartDeployEnabled,
    setSmartDeployEnabled,
    // App Details
    saveDeployedApp,
    deployedApps,
    lastDeployedAppName,
  } = useStore();

  // Fetch and track the bundler's free upload limit
  const freeUploadLimitBytes = useFreeUploadLimit();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileList | null>(null);
  const [deployMessage, setDeployMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showFolderContents, setShowFolderContents] = useState(false);
  const [indexFile, setIndexFile] = useState<string>('');
  const [fallbackFile, setFallbackFile] = useState<string>('');
  // ArNS state
  const [arnsEnabled, setArnsEnabled] = useState(false);
  const [selectedArnsName, setSelectedArnsName] = useState('');
  const [selectedUndername, setSelectedUndername] = useState('');
  const [customTTL, setCustomTTL] = useState<number | undefined>(undefined);
  const [showUndername, setShowUndername] = useState(false);
  const [arnsUpdateCancelled, setArnsUpdateCancelled] = useState(false);

  // App Details state
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [showDeployResults, setShowDeployResults] = useState(true);
  const [deploySuccessInfo, setDeploySuccessInfo] = useState<{manifestId: string; arnsConfigured: boolean; arnsName?: string; undername?: string; arnsTransactionId?: string} | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentDeployResult, setCurrentDeployResult] = useState<any>(null);
  const [postDeployArNSName, setPostDeployArNSName] = useState('');
  const [postDeployUndername, setPostDeployUndername] = useState('');
  const [postDeployShowUndername, setPostDeployShowUndername] = useState(false);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [postDeployArNSUpdating, setPostDeployArNSUpdating] = useState(false);
  // Post-deployment ArNS enabled state (disabled by default, user can enable)
  const [postDeployArNSEnabled, setPostDeployArNSEnabled] = useState(false);
  const [postDeployCustomTTL, setPostDeployCustomTTL] = useState<number | undefined>(undefined);
  // Domain assignment modal state
  const [showAssignDomainModal, setShowAssignDomainModal] = useState<string | null>(null);

  // Payment method state (Credits/Crypto tabs)
  const [paymentTab, setPaymentTab] = useState<'credits' | 'crypto'>('credits');

  // JIT payment local state for this deployment
  const [localJitMax, setLocalJitMax] = useState(0);

  // Selected JIT token - will be set when user opens "Pay with Crypto"
  // NOT set by default to avoid triggering x402 pricing before user interaction
  const [selectedJitToken, setSelectedJitToken] = useState<SupportedTokenType>(() => {
    if (walletType === 'arweave') return 'ario';
    if (walletType === 'solana') return 'solana';
    // In x402-only mode, only base-usdc is available
    if (x402OnlyMode) return 'base-usdc';
    return 'base-eth'; // Default for Ethereum - will switch to base-usdc when Crypto tab selected
  });

  // Switch to base-usdc when x402-only mode is enabled (only option for ETH wallets)
  useEffect(() => {
    if (x402OnlyMode && walletType === 'ethereum') {
      setSelectedJitToken('base-usdc');
    }
  }, [x402OnlyMode, walletType]);

  // Track if user has sufficient crypto balance for JIT payment
  const [jitBalanceSufficient, setJitBalanceSufficient] = useState(true);

  // Track crypto shortage details for combined warning
  const [cryptoShortage, setCryptoShortage] = useState<{
    amount: number;
    tokenType: SupportedTokenType;
  } | null>(null);

  // Reset payment tab when modal opens
  // In x402-only mode, start on Crypto tab (no credits available)
  // In normal mode, start on Credits tab
  useEffect(() => {
    if (showConfirmModal) {
      setPaymentTab(x402OnlyMode ? 'crypto' : 'credits');
    }
  }, [showConfirmModal, x402OnlyMode]);

  const wincForOneGiB = useWincForOneGiB();
  const {
    deployFolder,
    deploying,
    deployProgress,
    deployStage,
    currentFile,
    updateDeployStage,
    uploadedCount,
    totalFilesCount,
    failedCount,
    activeUploads,
    recentFiles,
    uploadErrors,
    totalSize,
    uploadedSize,
    retryFailedFiles,
    cancelUploads,
    // Smart Deploy
    analyzeFolder,
    hashingProgress,
    hashingStage,
    deduplicationStats,
    resetAnalysis
  } = useFolderUpload();
  const { 
    checkUploadStatus, 
    checkMultipleStatuses, 
    statusChecking, 
    uploadStatuses, 
    getStatusIcon,
    initializeFromCache
  } = useUploadStatus();
  const { updateArNSRecord, refreshSpecificName, names: userArnsNames } = useOwnedArNSNames();

  // Smart Deploy: Analyze folder when selected (hash files for deduplication)
  // Always analyze to show potential savings - toggle only affects actual deploy
  useEffect(() => {
    if (selectedFolder && selectedFolder.length > 0) {
      analyzeFolder(Array.from(selectedFolder));
    } else {
      resetAnalysis();
    }
  }, [selectedFolder, analyzeFolder, resetAnalysis]);

  // App Details: Pre-fill from last deployment when folder is selected
  useEffect(() => {
    if (selectedFolder && selectedFolder.length > 0) {
      if (lastDeployedAppName && deployedApps[lastDeployedAppName]) {
        setAppName(lastDeployedAppName);
        setAppVersion(deployedApps[lastDeployedAppName].appVersion);
      }
    } else {
      // Reset app details when folder is cleared
      setAppName('');
      setAppVersion('');
    }
  }, [selectedFolder, lastDeployedAppName, deployedApps]);

  // Image preview management for folder files
  const MAX_FOLDER_PREVIEWS = 30; // Lower limit for folders since they can have many files
  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  const isPreviewableImage = useCallback((fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'];
    return imageExtensions.includes(ext);
  }, []);

  // Generate preview URLs for image files in the folder
  const imagePreviewUrls = useMemo(() => {
    // Revoke old URLs first
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();

    if (!selectedFolder) return new Map<string, string>();

    const newUrls = new Map<string, string>();
    let imageCount = 0;

    Array.from(selectedFolder).forEach(file => {
      if (imageCount >= MAX_FOLDER_PREVIEWS) return;

      const path = file.webkitRelativePath || file.name;
      if (isPreviewableImage(file.name)) {
        const url = URL.createObjectURL(file);
        newUrls.set(path, url);
        previewUrlsRef.current.set(path, url);
        imageCount++;
      }
    });

    return newUrls;
  }, [selectedFolder, isPreviewableImage]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  // Handle successful domain assignment from modal
  const handleAssignDomainSuccess = (manifestId: string, arnsName: string, undername?: string, transactionId?: string) => {
    // Add ArNS update to deploy history
    const arnsUpdateRecord = {
      type: 'arns-update' as const,
      id: transactionId || '',
      manifestId: manifestId,
      arnsName: arnsName,
      undername: undername,
      targetId: manifestId,
      timestamp: Date.now(),
      arnsStatus: 'success' as const,
      arnsError: undefined
    };
    
    addDeployResults([arnsUpdateRecord]);
    
    // Refresh the specific ArNS name state
    setTimeout(() => {
      refreshSpecificName(arnsName);
    }, 3000);
    
    // Close modal and show success message
    setShowAssignDomainModal(null);
    const existingAssociation = getArNSAssociation(manifestId);
    const isUpdate = existingAssociation && existingAssociation.arnsName;
    setDeployMessage({
      type: 'success',
      text: `Domain ${undername ? undername + '_' : ''}${arnsName}.ar.io ${isUpdate ? 'updated' : 'assigned'} successfully!`
    });
  };

  // Memoize deployment grouping to prevent lag
  const deploymentGroups = useMemo(() => {
    const groups: { [manifestId: string]: { manifest?: any, files?: any } } = {};
    
    deployHistory.forEach(result => {
      const manifestId = result.manifestId || result.id;
      if (!manifestId) return;
      
      if (!groups[manifestId]) {
        groups[manifestId] = {};
      }
      
      if (result.type === 'manifest') {
        groups[manifestId].manifest = result;
      } else if (result.type === 'files') {
        groups[manifestId].files = result;
      }
    });
    
    return groups;
  }, [deployHistory]);

  // Limit recent deployments to 5 for this page  
  const recentDeploymentEntries = useMemo(() => {
    return Object.entries(deploymentGroups).slice(0, 5);
  }, [deploymentGroups]);

  // Helper to find ArNS association for a manifest
  const getArNSAssociation = useCallback((manifestId: string) => {
    return deployHistory.find(record => 
      record.type === 'arns-update' && 
      record.manifestId === manifestId
    );
  }, [deployHistory]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = Array.from(e.dataTransfer.items);

    // Look for a folder in the dropped items
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();

      if (entry?.isDirectory) {
        const rootFolderName = entry.name;
        console.log('Folder dropped:', rootFolderName);

        // Read all files from the directory recursively
        const files: File[] = [];

        const readDirectory = async (dirEntry: any, path = '') => {
          const dirReader = dirEntry.createReader();

          return new Promise<void>((resolve, reject) => {
            const readEntries = () => {
              dirReader.readEntries(async (entries: any[]) => {
                if (entries.length === 0) {
                  resolve();
                  return;
                }

                for (const entry of entries) {
                  if (entry.isFile) {
                    await new Promise<void>((resolveFile) => {
                      entry.file((file: File) => {
                        // Preserve the original file but store path in name and webkitRelativePath
                        const fullPath = path ? `${path}/${file.name}` : file.name;
                        const webkitPath = `${rootFolderName}/${fullPath}`;

                        // Set both name and webkitRelativePath to match native file input behavior
                        Object.defineProperty(file, 'name', {
                          writable: true,
                          value: fullPath
                        });
                        Object.defineProperty(file, 'webkitRelativePath', {
                          writable: true,
                          value: webkitPath
                        });
                        files.push(file);
                        resolveFile();
                      });
                    });
                  } else if (entry.isDirectory) {
                    const newPath = path ? `${path}/${entry.name}` : entry.name;
                    await readDirectory(entry, newPath);
                  }
                }

                // Continue reading if there might be more entries
                readEntries();
              }, reject);
            };

            readEntries();
          });
        };

        try {
          await readDirectory(entry);

          if (files.length > 0) {
            // Convert files array to FileList-like structure
            const fileList = files as any;
            fileList.item = (index: number) => files[index];

            setSelectedFolder(fileList);
            setDeployMessage(null);

            // Auto-detect index and fallback files - call directly since it's defined below
            const htmlFiles = files.filter(file => {
              const name = file.name.toLowerCase();
              return name.endsWith('.html') || name.endsWith('.htm');
            });

            // Look for common index files
            const indexFile = htmlFiles.find(file => {
              const name = file.name.toLowerCase();
              return name === 'index.html' || name === 'index.htm' || name.endsWith('/index.html') || name.endsWith('/index.htm');
            });

            // Look for common error/404 pages
            const fallbackFile = htmlFiles.find(file => {
              const name = file.name.toLowerCase();
              return name === '404.html' || name === 'error.html' || name.endsWith('/404.html') || name.endsWith('/error.html');
            });

            if (indexFile) {
              setIndexFile(indexFile.name);
            }

            if (fallbackFile) {
              setFallbackFile(fallbackFile.name);
            }
          }
        } catch (error) {
          console.error('Error reading dropped folder:', error);
          setDeployMessage({ type: 'error', text: 'Failed to read folder contents. Please try using the browse button.' });
        }

        break; // Only process the first folder
      }
    }
  }, []);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFolder(e.target.files);
      setDeployMessage(null);
      
      // Auto-detect index and fallback files
      const files = Array.from(e.target.files);
      autoDetectManifestFiles(files);
    }
  };

  // Smart detection for index and fallback files
  const autoDetectManifestFiles = (files: File[]) => {
    const htmlFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.html') || name.endsWith('.htm');
    });

    // Auto-detect index file
    let detectedIndex = '';
    const indexCandidates = ['index.html', 'index.htm', 'home.html', 'main.html'];
    for (const candidate of indexCandidates) {
      const found = htmlFiles.find(file => 
        file.webkitRelativePath.toLowerCase().endsWith(candidate) ||
        file.name.toLowerCase() === candidate
      );
      if (found) {
        detectedIndex = found.webkitRelativePath || found.name;
        break;
      }
    }

    // Auto-detect fallback file  
    let detectedFallback = '';
    const fallbackCandidates = ['404.html', 'fallback.html', 'error.html', 'not-found.html'];
    for (const candidate of fallbackCandidates) {
      const found = htmlFiles.find(file => 
        file.webkitRelativePath.toLowerCase().endsWith(candidate) ||
        file.name.toLowerCase() === candidate
      );
      if (found) {
        detectedFallback = found.webkitRelativePath || found.name;
        break;
      }
    }
    
    // If no dedicated fallback found and this looks like a SPA, suggest index.html
    if (!detectedFallback && detectedIndex) {
      // Check for common SPA indicators (React, Vue, Angular build artifacts)
      const hasBuildArtifacts = files.some(file => {
        const name = file.name.toLowerCase();
        const path = file.webkitRelativePath?.toLowerCase() || '';
        return name.includes('chunk') || name.includes('bundle') || 
               path.includes('assets/') || path.includes('static/') ||
               name.endsWith('.js') && name.includes('app');
      });
      
      if (hasBuildArtifacts) {
        detectedFallback = detectedIndex; // Suggest same as index for SPA routing
      }
    }

    setIndexFile(detectedIndex);
    setFallbackFile(detectedFallback);
    
  };

  const calculateTotalSize = (): number => {
    if (!selectedFolder) return 0;
    return Array.from(selectedFolder).reduce((total, file) => total + file.size, 0);
  };


  const calculateTotalCost = (): number => {
    if (!wincForOneGiB || !selectedFolder) return 0;

    // If Smart Deploy is enabled and we have stats, use pre-calculated billableSize
    // This accounts for cached files being skipped
    if (smartDeployEnabled && deduplicationStats) {
      const gibSize = deduplicationStats.billableSize / (1024 ** 3);
      const totalWinc = gibSize * Number(wincForOneGiB);
      return totalWinc / wincPerCredit;
    }

    // Smart Deploy disabled OR no stats yet: charge for ALL files (minus free tier)
    let totalWinc = 0;
    Array.from(selectedFolder).forEach(file => {
      if (isFileFree(file.size, freeUploadLimitBytes)) {
        return; // FREE - under free limit
      }
      const gibSize = file.size / (1024 ** 3);
      const fileWinc = gibSize * Number(wincForOneGiB);
      totalWinc += fileWinc;
    });

    return totalWinc / wincPerCredit;
  };

  // Calculate billable size when Smart Deploy is OFF (all files minus free tier)
  const calculateBillableSizeWithoutSmartDeploy = (): number => {
    if (!selectedFolder) return 0;
    return Array.from(selectedFolder)
      .filter(file => !isFileFree(file.size, freeUploadLimitBytes))
      .reduce((sum, file) => sum + file.size, 0);
  };

  // Organize files into folder structure
  const organizeFolderStructure = () => {
    if (!selectedFolder) return {};
    
    const structure: Record<string, Array<{ file: File; path: string }>> = {};
    
    Array.from(selectedFolder).forEach(file => {
      const fullPath = file.webkitRelativePath || file.name;
      const pathParts = fullPath.split('/');
      const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
      
      if (!structure[folderPath]) {
        structure[folderPath] = [];
      }
      
      structure[folderPath].push({
        file,
        path: fullPath
      });
    });
    
    return structure;
  };

  // Convert status icon strings to JSX components
  const renderStatusIcon = (iconName: string) => {
    switch (iconName) {
      case 'check-circle':
        return <CheckCircle className="w-3 h-3 text-success" />;
      case 'clock':
        return <Clock className="w-3 h-3 text-warning" />;
      case 'archive':
        return <Archive className="w-3 h-3 text-info" />;
      case 'x-circle':
        return <XCircle className="w-3 h-3 text-error" />;
      case 'help-circle':
        return <HelpCircle className="w-3 h-3 text-foreground/80" />;
      default:
        return <Clock className="w-3 h-3 text-warning" />;
    }
  };

  // Smart content type detection for display (same logic as useFolderUpload)
  const getDisplayContentType = (filePath: string, storedContentType?: string): string => {
    // If stored type is valid and not generic, use it
    if (storedContentType && storedContentType !== 'application/octet-stream') {
      return storedContentType;
    }
    
    // Apply smart detection based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg', 
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      
      // Documents
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'txt': 'text/plain',
      'md': 'text/markdown',
      
      // Fonts
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      
      // Other
      'pdf': 'application/pdf',
    };
    
    return mimeTypes[extension || ''] || storedContentType || 'application/octet-stream';
  };

  const exportDeployToCSV = () => {
    if (deployHistory.length === 0) return;

    // Group deployments by manifest ID like we do in the UI
    const deploymentGroups: { [manifestId: string]: { manifest?: any, files?: any } } = {};
    
    deployHistory.forEach(result => {
      const manifestId = result.manifestId || result.id;
      if (!manifestId) return;
      
      if (!deploymentGroups[manifestId]) {
        deploymentGroups[manifestId] = {};
      }
      
      if (result.type === 'manifest') {
        deploymentGroups[manifestId].manifest = result;
      } else if (result.type === 'files') {
        deploymentGroups[manifestId].files = result;
      }
    });

    const headers = [
      'Deployment Type',
      'Manifest ID', 
      'Site URL',
      'Deployment Date',
      'File Path',
      'File Transaction ID',
      'File Size (Bytes)',
      'File Size (Human)',
      'Content Type',
      'Owner Address',
      'Total Files in Site',
      'Total Site Size'
    ];

    const rows: string[][] = [];

    Object.entries(deploymentGroups).forEach(([manifestId, group]) => {
      const deployDate = group.manifest?.timestamp ? 
        new Date(group.manifest.timestamp).toLocaleString() : 
        'Unknown';
      
      const siteUrl = getArweaveUrl(manifestId, group.manifest?.receipt?.dataCaches);
      const totalFiles = group.files?.files?.length || 0;
      const totalSize = group.files?.files?.reduce((sum: number, file: any) => sum + file.size, 0) || 0;
      const totalSizeHuman = totalSize > 0 ? (
        totalSize < 1024 ? `${totalSize}B` :
        totalSize < 1024 * 1024 ? `${(totalSize / 1024).toFixed(1)}KB` :
        `${(totalSize / 1024 / 1024).toFixed(1)}MB`
      ) : '0B';

      // Add manifest row
      rows.push([
        'Manifest',
        manifestId,
        siteUrl,
        deployDate,
        'manifest.json',
        manifestId,
        'Unknown',
        'Unknown', 
        'application/x.arweave-manifest+json',
        group.manifest?.receipt?.owner || 'Unknown',
        totalFiles.toString(),
        `${totalSize} (${totalSizeHuman})`
      ]);

      // Add individual file rows  
      if (group.files?.files) {
        group.files.files.forEach((file: any) => {
          const fileSizeHuman = file.size < 1024 ? `${file.size}B` :
            file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)}KB` :
            `${(file.size / 1024 / 1024).toFixed(1)}MB`;
          
          const contentType = file.receipt?.tags?.find((tag: any) => tag.name === 'Content-Type')?.value || 
                              'application/octet-stream';

          rows.push([
            'File',
            manifestId,
            siteUrl,
            deployDate,
            file.path,
            file.id,
            file.size.toString(),
            fileSizeHuman,
            contentType,
            file.receipt?.owner || 'Unknown',
            totalFiles.toString(),
            `${totalSize} (${totalSizeHuman})`
          ]);
        });
      }
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ario-deployments-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initialize status from cache (no API calls) when component loads
  useEffect(() => {
    if (deployHistory.length > 0) {
      const allIds = recentDeploymentEntries.flatMap(([manifestId, group]) => {
        const ids = [];
        if (manifestId) ids.push(manifestId);
        if (group.files?.files) ids.push(...group.files.files.map((f: any) => f.id));
        return ids;
      });
      
      // Initialize from cache only (no API calls)
      initializeFromCache(allIds);
    }
  }, [deployHistory, recentDeploymentEntries, initializeFromCache]);

  // ArNS names are fetched automatically when user connects (in useOwnedArNSNames hook)

  const handleConfirmDeploy = async () => {
    setShowConfirmModal(false);
    if (!selectedFolder || selectedFolder.length === 0) {
      setDeployMessage({ type: 'error', text: 'Please select a folder to deploy' });
      return;
    }

    if (!address) {
      setDeployMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    // Calculate credits needed (0 if user has sufficient credits)
    const creditsNeeded = Math.max(0, (totalCost || 0) - creditBalance);

    // Prevent deployment in x402-only mode for non-Ethereum wallets on billable deployments
    if (x402OnlyMode && creditsNeeded > 0 && walletType !== 'ethereum') {
      setDeployMessage({
        type: 'error',
        text: 'X402 payments require an Ethereum wallet. Please connect an Ethereum wallet or disable x402-only mode in Developer Resources.'
      });
      return;
    }

    // Save max token amount to store for future use (using selected token)
    if (selectedJitToken) {
      setJitMaxTokenAmount(selectedJitToken, localJitMax);
    }

    // Enable JIT if user has explicitly selected crypto payment tab
    // This allows forcing crypto payment even when credits are sufficient
    const shouldEnableJit = paymentTab === 'crypto';

    // Convert max token amount to smallest unit for SDK/x402
    let jitMaxTokenAmountSmallest = 0;
    if (shouldEnableJit && selectedJitToken && supportsJitPayment(selectedJitToken)) {
      const converter = getTokenConverter(selectedJitToken);
      jitMaxTokenAmountSmallest = converter ? converter(localJitMax) : 0;
    }

    try {
      setDeployMessage(null);
      setDeploySuccessInfo(null); // Clear any previous success info
      setArnsUpdateCancelled(false); // Reset cancel state for new deployment
      // Pre-topup flow for crypto payments (one payment for all files)
      const result = await deployFolder(Array.from(selectedFolder), {
        indexFile: indexFile || undefined,
        fallbackFile: fallbackFile || undefined,
        cryptoPayment: shouldEnableJit,
        tokenAmount: jitMaxTokenAmountSmallest,
        selectedToken: selectedJitToken,
        appName: appName.trim() || undefined,
        appVersion: appVersion.trim() || undefined,
      }, smartDeployEnabled);

      // Save app details to store for future pre-fill
      if (appName.trim()) {
        saveDeployedApp(appName.trim(), appVersion.trim());
      }
      
      if (result.manifestId) {
        // Add results to store for persistence
        addDeployResults(result.results || []);
        
        // Store current deployment result for cancel button access
        setCurrentDeployResult(result);
        
        // Handle ArNS update if enabled and not cancelled
        if (arnsEnabled && selectedArnsName && !arnsUpdateCancelled) {
          try {
            // Keep deployment progress visible and update stage to show ArNS update
            updateDeployStage('updating-arns');
            console.log('Updating ArNS record:', { name: selectedArnsName, manifestId: result.manifestId, undername: selectedUndername });
            
            const arnsResult = await updateArNSRecord(
              selectedArnsName,
              result.manifestId,
              selectedUndername || undefined,
              customTTL
            );
            
            // Add ArNS update to deploy history
            const arnsUpdateRecord = {
              type: 'arns-update' as const,
              id: arnsResult.transactionId || '',
              manifestId: result.manifestId,
              arnsName: selectedArnsName,
              undername: selectedUndername || undefined,
              targetId: result.manifestId,
              timestamp: Date.now(),
              arnsStatus: arnsResult.success ? 'success' as const : 'failed' as const,
              arnsError: arnsResult.error
            };
            
            addDeployResults([arnsUpdateRecord]);
            
            if (arnsResult.success) {
              // Mark deployment as complete and store success info
              updateDeployStage('complete');
              setDeploySuccessInfo({
                manifestId: result.manifestId,
                arnsConfigured: true,
                arnsName: selectedArnsName,
                undername: selectedUndername || undefined,
                arnsTransactionId: arnsResult.transactionId
              });
              
              // Refresh the specific ArNS name to get latest state
              setTimeout(() => {
                refreshSpecificName(selectedArnsName);
              }, 3000); // Wait 3 seconds for propagation
            } else {
              // Mark deployment as complete even if ArNS failed
              updateDeployStage('complete');
              // Site deployed successfully but ArNS failed - still show success with error info
              setDeploySuccessInfo({
                manifestId: result.manifestId,
                arnsConfigured: false // Failed ArNS = show enhancement option
              });
              setDeployMessage({
                type: 'error',
                text: `ArNS update failed: ${arnsResult.error}. Site is deployed successfully.`
              });
            }
          } catch (arnsError) {
            console.error('ArNS update failed:', arnsError);
            // Mark deployment as complete even if ArNS failed
            updateDeployStage('complete');
            // Still show success since site deployed, just note ArNS failed
            setDeploySuccessInfo({
              manifestId: result.manifestId,
              arnsConfigured: false
            });
            setDeployMessage({
              type: 'error',
              text: 'ArNS update failed. Site is deployed successfully.'
            });
          }
        } else {
          // No ArNS update - mark deployment complete and store success info
          updateDeployStage('complete');
          setDeploySuccessInfo({
            manifestId: result.manifestId,
            arnsConfigured: false
          });
        }
        
        // Clear the folder selection since deployment is complete
        setSelectedFolder(null);
        setShowFolderContents(false);
        setIndexFile('');
        setFallbackFile('');
        // Clear ArNS state
        setArnsEnabled(false);
        setSelectedArnsName('');
        setSelectedUndername('');
        // Reset post-deploy ArNS state for fresh start
        setPostDeployArNSName('');
        setPostDeployUndername('');
        setPostDeployArNSEnabled(false);
        
        // Trigger balance refresh after successful deployment
        window.dispatchEvent(new CustomEvent('refresh-balance'));
      }
    } catch (error) {
      console.error('Deploy failed:', error);
      setDeployMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Deploy failed' 
      });
    }
  };

  if (!address) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-heading font-bold mb-4">Connect Wallet Required</h3>
        <p className="text-foreground/80">Connect your wallet to deploy sites</p>
      </div>
    );
  }

  const totalFileSize = calculateTotalSize();
  const totalCost = calculateTotalCost();
  const folderName = selectedFolder?.[0]?.webkitRelativePath?.split('/')[0] || '';

  return (
    <div className="px-4 sm:px-6">
      {/* Success-focused header when deployment is complete */}
      {deploySuccessInfo ? (
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-success/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border border-border/20">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground mb-1">
              {deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ?
                'Site Deployed with Domain' :
                'Site Deployed'
              }
            </h3>
            <p className="text-sm text-foreground/80">
              Success! Your site is live on the permanent cloud.
            </p>
          </div>
        </div>
      ) : (
        /* Normal deploy header when not showing success */
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 border border-border/20">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Deploy Site</h3>
            <p className="text-sm text-foreground/80">
              Deploy NFT collections, static sites and apps to the permanent cloud
            </p>
          </div>
        </div>
      )}

      {/* Main Content Container with Red Gradient - Hide during success and deployment */}
      {!deploySuccessInfo && !deploying && (
        <div className="bg-card rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Dynamic Zone: Drop Zone OR Selected Folder */}
        {!selectedFolder || selectedFolder.length === 0 ? (
          /* Drop Zone when no folder selected */
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-primary/30 bg-card/80 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4">
              <Zap className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-lg font-medium mb-2">
                Drop site folder here or click to browse
              </p>
              <p className="text-sm text-foreground/80">
                Select your site folder (HTML, CSS, JS, assets) for deployment
              </p>
            </div>
            <input
              type="file"
              {...({ webkitdirectory: 'true', directory: 'true' } as any)}
              multiple
              onChange={handleFolderSelect}
              className="hidden"
              id="folder-upload"
            />
            <label
              htmlFor="folder-upload"
              className="inline-block px-4 py-2 rounded-full bg-foreground text-card font-medium cursor-pointer hover:bg-foreground/90 transition-colors"
            >
              Select Site Folder
            </label>
          </div>
        ) : (
          /* Selected Folder Card - replaces drop zone */
          <div className="bg-card rounded-xl border border-primary/20 p-4">
              {/* Folder Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Folder className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{folderName}</span>
                    <span className="text-xs text-foreground/80 ml-2">
                      · {selectedFolder?.length} files · {
                        totalFileSize < 1024 ? `${totalFileSize} B` :
                        totalFileSize < 1024 * 1024 ? `${(totalFileSize / 1024).toFixed(1)} KB` :
                        totalFileSize < 1024 * 1024 * 1024 ? `${(totalFileSize / 1024 / 1024).toFixed(1)} MB` :
                        `${(totalFileSize / 1024 / 1024 / 1024).toFixed(2)} GB`
                      }
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowFolderContents(!showFolderContents)}
                    className="p-1.5 text-foreground/80 hover:text-foreground transition-colors rounded hover:bg-card/50"
                    title={showFolderContents ? 'Hide folder contents' : 'Show folder contents'}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFolderContents ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFolder(null);
                      setDeployMessage(null);
                      setShowFolderContents(false);
                      setIndexFile('');
                      setFallbackFile('');
                      setAppName('');
                      setAppVersion('');
                      const fileInput = document.getElementById('folder-upload') as HTMLInputElement;
                      if (fileInput) {
                        fileInput.value = '';
                      }
                    }}
                    className="p-1.5 text-foreground/80 hover:text-error transition-colors"
                    title="Clear folder selection"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Hashing Progress - inline below header */}
              {hashingStage === 'hashing' && (
                <div className="mt-3 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  <div className="flex-1 bg-card rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${hashingProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-foreground/80 flex-shrink-0">{hashingProgress}%</span>
                </div>
              )}

              {/* Expandable Content: App Details + Smart Deploy + File Tree */}
              {showFolderContents && (
                  <div className="mt-3 p-3 bg-card rounded-lg border border-border/20 max-h-96 overflow-y-auto">
                    {/* App Details Fields - Memoized for performance */}
                    <AppDetailsFields
                      appName={appName}
                      appVersion={appVersion}
                      onAppNameChange={setAppName}
                      onAppVersionChange={setAppVersion}
                      deployedApps={deployedApps}
                    />

                    {/* Smart Deploy Row - inside expanded area */}
                    {deduplicationStats && deduplicationStats.cachedFiles > 0 && hashingStage === 'complete' && (
                      <div className="flex items-center justify-between py-2 mb-3 border-b border-border/20 pb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Sparkles className="w-4 h-4 text-foreground" />
                          <span className="text-foreground/80">
                            {smartDeployEnabled
                              ? <>
                                  <span>{deduplicationStats.cachedFiles} cached</span>
                                  <span className="text-foreground/60 ml-1">
                                    ({deduplicationStats.cachedSize < 1024 * 1024
                                      ? `${(deduplicationStats.cachedSize / 1024).toFixed(1)}KB`
                                      : `${(deduplicationStats.cachedSize / 1024 / 1024).toFixed(1)}MB`})
                                  </span>
                                  <span className="mx-1">·</span>
                                  {deduplicationStats.newFiles} new
                                  <span className="text-foreground/60 ml-1">
                                    ({deduplicationStats.newSize < 1024 * 1024
                                      ? `${(deduplicationStats.newSize / 1024).toFixed(1)}KB`
                                      : `${(deduplicationStats.newSize / 1024 / 1024).toFixed(1)}MB`})
                                  </span>
                                </>
                              : <span className="text-foreground/60">Smart Deploy off — all {deduplicationStats.cachedFiles + deduplicationStats.newFiles} files will upload</span>
                            }
                          </span>
                        </div>
                        <button
                          onClick={() => setSmartDeployEnabled(!smartDeployEnabled)}
                          className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                            smartDeployEnabled ? 'bg-success' : 'bg-card border border-border/10'
                          }`}
                          title={smartDeployEnabled ? 'Disable Smart Deploy' : 'Enable Smart Deploy'}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${
                              smartDeployEnabled ? 'translate-x-4 bg-background' : 'translate-x-0.5 bg-foreground'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                    <div className="space-y-1 text-xs font-mono">
                      {(() => {
                        const structure = organizeFolderStructure();
                        const sortedFolders = Object.keys(structure).sort();
                        
                        return sortedFolders.map(folderPath => (
                          <div key={folderPath}>
                            {/* Folder Header */}
                            {folderPath !== 'root' && (
                              <div className="flex items-center gap-2 text-foreground font-medium mb-1">
                                <Folder className="w-3 h-3 text-foreground" />
                                <span>{folderPath}/</span>
                              </div>
                            )}
                            
                            {/* Files in Folder */}
                            <div className={folderPath !== 'root' ? 'ml-4 space-y-0.5' : 'space-y-0.5'}>
                              {structure[folderPath]
                                .sort((a, b) => a.file.name.localeCompare(b.file.name))
                                .map(({ file, path }, index) => {
                                  const FileIcon = getFileIcon(file.name);
                                  const fileName = path.split('/').pop() || file.name;
                                  const fileSize = file.size < 1024
                                    ? `${file.size}B`
                                    : file.size < 1024 * 1024
                                    ? `${(file.size / 1024).toFixed(1)}KB`
                                    : `${(file.size / 1024 / 1024).toFixed(1)}MB`;

                                  const fullPath = file.webkitRelativePath || file.name;
                                  const isHtml = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm');
                                  const isIndex = indexFile === fullPath;
                                  const isFallback = fallbackFile === fullPath;
                                  const previewUrl = imagePreviewUrls.get(fullPath);
                                  const isImage = isPreviewableImage(file.name);

                                  return (
                                    <div key={index} className="flex items-center justify-between text-foreground/80 hover:text-foreground transition-colors py-1 px-1 rounded">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {/* Thumbnail for images, icon for others */}
                                        {isImage && previewUrl ? (
                                          <div className="w-6 h-6 rounded overflow-hidden bg-card border border-border/20 flex-shrink-0">
                                            <img
                                              src={previewUrl}
                                              alt={fileName}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <FileIcon className="w-3 h-3 text-foreground/80 flex-shrink-0" />
                                        )}
                                        <span className="truncate">{fileName}</span>
                                        
                                        {/* Badges for selected files */}
                                        {isIndex && (
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-success/20 text-success rounded text-xs font-medium">
                                            <Home className="w-3 h-3" />
                                            INDEX
                                          </div>
                                        )}
                                        {isFallback && (
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/20 text-warning rounded text-xs font-medium">
                                            <AlertTriangle className="w-3 h-3" />
                                            FALLBACK
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 flex-shrink-0">

                                        {/* Action buttons for HTML files */}
                                        {isHtml && (
                                          <div className="flex items-center gap-1">
                                            {!isIndex && (
                                              <button
                                                onClick={() => setIndexFile(fullPath)}
                                                className="px-2 py-0.5 text-xs bg-success/10 text-success rounded hover:bg-success/20 transition-colors"
                                                title="Set as Index"
                                              >
                                                Set Index
                                              </button>
                                            )}
                                            {!isFallback && (
                                              <button
                                                onClick={() => setFallbackFile(fullPath)}
                                                className="px-2 py-0.5 text-xs bg-warning/10 text-warning rounded hover:bg-warning/20 transition-colors"
                                                title="Set as Fallback"
                                              >
                                                Set Fallback
                                              </button>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Clear buttons for selected files */}
                                        {isIndex && (
                                          <button
                                            onClick={() => setIndexFile('')}
                                            className="px-2 py-0.5 text-xs text-foreground/80 hover:text-error rounded transition-colors"
                                            title="Clear Index"
                                          >
                                            Clear
                                          </button>
                                        )}
                                        {isFallback && (
                                          <button
                                            onClick={() => setFallbackFile('')}
                                            className="px-2 py-0.5 text-xs text-foreground/80 hover:text-error rounded transition-colors"
                                            title="Clear Fallback"
                                          >
                                            Clear
                                          </button>
                                        )}

                                        <span className="text-foreground/60 text-xs">
                                          {fileSize}
                                          {isFileFree(file.size, freeUploadLimitBytes) && <span className="ml-1 text-success">• FREE</span>}
                                        </span>
                                        
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

            {/* SPA Routing Info - Only show when we couldn't auto-detect proper fallback */}
            {(!indexFile || !fallbackFile || fallbackFile !== indexFile) && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground/80">
                    <strong className="text-foreground">SPA Routing Configuration:</strong> We couldn't automatically detect your fallback file. For React/Vue/Angular apps, set the <strong>Fallback</strong> to your main HTML file (usually{' '}
                    <code className="px-1 py-0.5 bg-primary/20 rounded text-primary font-mono text-xs">index.html</code>
                    ) to enable client-side routing. This ensures URLs like{' '}
                    <code className="px-1 py-0.5 bg-primary/20 rounded text-primary font-mono text-xs">/topup</code>
                    {' '}work correctly instead of showing 404 errors.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {/* ArNS Association Panel - Show for all users, but only Arweave wallets can actually update records */}
      {selectedFolder && selectedFolder.length > 0 && (walletType === 'arweave' || walletType === 'ethereum') && !deploySuccessInfo && !deploying && (
        <ArNSAssociationPanel
          enabled={arnsEnabled}
          onEnabledChange={setArnsEnabled}
          selectedName={selectedArnsName}
          onNameChange={setSelectedArnsName}
          selectedUndername={selectedUndername}
          onUndernameChange={setSelectedUndername}
          customTTL={customTTL}
          onCustomTTLChange={setCustomTTL}
          showUndername={showUndername}
          onShowUndernameChange={setShowUndername}
        />
      )}

      {/* Summary Panel - After ArNS configuration, hide during success and deployment */}
      {selectedFolder && selectedFolder.length > 0 && !deploySuccessInfo && !deploying && (
        <div className="mt-4 p-4 bg-card rounded-lg border border-primary/20">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-foreground/80">Total Size:</span>
              <span className="text-xs text-foreground">{(totalFileSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-foreground/80">Estimated Cost:</span>
              <span className="text-xs text-foreground">
                {totalCost === 0 ? (
                  <span className="text-success font-medium">FREE</span>
                ) : (
                  <span>{totalCost.toFixed(6)} Credits</span>
                )}
              </span>
            </div>
          </div>
      )}


      {/* Deploy Button - Hide during success display and deployment */}
      {selectedFolder && selectedFolder.length > 0 && !deploySuccessInfo && !deploying && (
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={deploying || hashingStage === 'hashing' || (arnsEnabled && !selectedArnsName) || (arnsEnabled && showUndername && !selectedUndername)}
          className="w-full mt-4 py-4 px-6 rounded-lg bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {deploying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Deploying Site...
            </>
          ) : (
            <>
              <Globe className="w-5 h-5" />
              Confirm Deployment
            </>
          )}
        </button>
      )}

      {/* Deploy Progress with New Summary Component */}
      {deploying && selectedFolder && deployStage === 'uploading' && (
        <div className="mt-4">
          <UploadProgressSummary
            uploadedCount={uploadedCount}
            totalCount={totalFilesCount}
            failedCount={failedCount}
            activeUploads={activeUploads}
            recentFiles={recentFiles}
            errors={uploadErrors}
            totalSize={totalSize}
            uploadedSize={uploadedSize}
            onRetryFailed={retryFailedFiles}
            onCancel={cancelUploads}
          />
        </div>
      )}

      {/* Non-upload stages (manifest, ArNS update) */}
      {deploying && selectedFolder && deployStage !== 'uploading' && (
        <div className="mt-4 p-4 bg-card rounded-lg border border-primary/20">
          <div className="space-y-4">
            {/* Stage Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="font-medium text-foreground">
                  {deployStage === 'manifest' && 'Creating Manifest'}
                  {deployStage === 'updating-arns' && 'Updating ArNS Name'}
                  {deployStage === 'complete' && 'Complete'}
                </span>
              </div>
              <span className="text-sm text-foreground/80">
                {deployStage === 'manifest' && 'Finalizing deployment...'}
                {deployStage === 'updating-arns' && `Updating ${selectedUndername ? selectedUndername + '_' : ''}${selectedArnsName}.ar.io`}
                {deployStage === 'complete' && 'Deployment complete!'}
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full bg-card-elevated rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${deployProgress}%` }}
              />
            </div>

            {/* Current File/Stage Info */}
            {(currentFile || deployStage === 'updating-arns') && (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                {deployStage === 'manifest' && (
                  <>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span>{currentFile}</span>
                  </>
                )}
                {deployStage === 'updating-arns' && (
                  <>
                    <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                    <span>Connecting {selectedUndername ? selectedUndername + '_' : ''}{selectedArnsName}.ar.io to your site...</span>
                  </>
                )}
              </div>
            )}

            {/* Cancel ArNS Update Button */}
            {deployStage === 'updating-arns' && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setArnsUpdateCancelled(true);
                    updateDeployStage('complete');
                    // Show success info since deployment was successful
                    setDeploySuccessInfo({
                      manifestId: currentDeployResult?.manifestId || '',
                      arnsConfigured: false
                    });
                    setDeployMessage({
                      type: 'info',
                      text: 'Site deployed successfully! ArNS update was cancelled.'
                    });
                  }}
                  className="px-4 py-2 text-sm bg-card border border-border/20 rounded-lg text-foreground/80 hover:text-foreground hover:border-border/10 transition-colors"
                >
                  Skip ArNS Update
                </button>
              </div>
            )}

            {/* File progress details are now handled by UploadProgressSummary */}
          </div>
        </div>
      )}

      {/* Rich Success Display */}
      {deploySuccessInfo && (
        <div className="border border-success rounded-xl p-6 bg-card">


          {/* Site Details */}
          <div className="bg-card rounded-lg p-4 mb-4 space-y-3">
            <div>
              <div className="text-sm text-foreground/80 mb-2">Your site URL:</div>
              <div className="flex items-center gap-2 p-3 bg-card rounded border border-border/10">
                <span className="font-mono text-sm text-foreground flex-1 min-w-0 truncate">
                  {deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ? 
                    `https://${deploySuccessInfo.undername ? deploySuccessInfo.undername + '_' : ''}${deploySuccessInfo.arnsName}.ar.io` :
                    `https://arweave.net/${deploySuccessInfo.manifestId}`
                  }
                </span>
                <CopyButton textToCopy={
                  deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ? 
                    `https://${deploySuccessInfo.undername ? deploySuccessInfo.undername + '_' : ''}${deploySuccessInfo.arnsName}.ar.io` :
                    `https://arweave.net/${deploySuccessInfo.manifestId}`
                } />
              </div>
            </div>

            {/* Permanent ID */}
            <div>
              <div className="text-sm text-foreground/80 mb-2">Deployment Transaction ID:</div>
              <div className="flex items-center gap-2 p-3 bg-card rounded border border-border/10">
                <span className="font-mono text-sm text-foreground flex-1 min-w-0 truncate">
                  {deploySuccessInfo.manifestId}
                </span>
                <CopyButton textToCopy={deploySuccessInfo.manifestId} />
              </div>
            </div>

            {/* ArNS Transaction ID - Only show if ArNS was configured */}
            {deploySuccessInfo.arnsTransactionId && (
              <div>
                <div className="text-sm text-foreground/80 mb-2">Domain Update Transaction ID:</div>
                <div className="flex items-center gap-2 p-3 bg-card rounded border border-border/10">
                  <span className="font-mono text-sm text-foreground flex-1 min-w-0 truncate">
                    {deploySuccessInfo.arnsTransactionId}
                  </span>
                  <CopyButton textToCopy={deploySuccessInfo.arnsTransactionId} />
                </div>
              </div>
            )}
          </div>

          {/* Primary Actions */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => window.open(
                deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ? 
                  `https://${deploySuccessInfo.undername ? deploySuccessInfo.undername + '_' : ''}${deploySuccessInfo.arnsName}.ar.io` :
                  `https://arweave.net/${deploySuccessInfo.manifestId}`,
                '_blank'
              )}
              className="flex-1 py-3 px-4 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors"
            >
              Visit Your Site
            </button>
            <button
              onClick={() => {
                setDeploySuccessInfo(null);
                setDeployMessage(null);
                // Reset post-deploy ArNS state
                setPostDeployArNSName('');
                setPostDeployUndername('');
                setPostDeployShowUndername(false);
                setPostDeployArNSEnabled(false);
              }}
              className="flex-1 py-3 px-4 bg-card border border-border/20 rounded-lg text-foreground hover:bg-card hover:border-primary/50 transition-colors"
            >
              Deploy Another Site
            </button>
          </div>

        </div>
      )}

      {/* ArNS Discovery Section - Only for users without ArNS names */}
      {deploySuccessInfo && !deploySuccessInfo.arnsConfigured && 
       ((walletType !== 'arweave' && walletType !== 'ethereum') || userArnsNames.length === 0) && (
        <div className="mt-6">
          <div className="bg-gradient-to-br from-warning/5 to-warning/5 rounded-xl border border-warning/20 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Globe className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground mb-1">Want a Friendly Domain Name?</h4>
                <p className="text-sm text-foreground/80">
                  Your site is live, but you can make it even better with an ArNS domain name
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                <span className="text-foreground/80">Human-readable URLs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                <span className="text-foreground/80">Lease or Permanently own</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                <span className="text-foreground/80">Global propagation across the AR.IO Network</span>
              </div>
            </div>
            
            <div className="bg-card/50 rounded-lg p-4 mb-4">
              <div className="text-sm text-foreground/80 mb-2">Instead of:</div>
              <div className="font-mono text-xs text-foreground/60 mb-3 break-all">
                https://arweave.net/{deploySuccessInfo.manifestId}
              </div>
              
              <div className="text-sm text-foreground/80 mb-2">Get something like:</div>
              <div className="font-mono text-sm text-warning font-medium">
                https://mysite.ar.io
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.href = '/domains'}
                className="flex-1 py-3 px-4 bg-warning text-foreground rounded-lg font-medium hover:bg-warning/90 transition-colors"
              >
                Search for Your Name
              </button>
              <button
                onClick={() => window.open('https://docs.ar.io/arns', '_blank')}
                className="flex-1 py-3 px-4 bg-card border border-border/20 rounded-lg text-foreground hover:bg-card transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Deploy ArNS Enhancement - Show ArNS panel for users who have ArNS names */}
      {deploySuccessInfo && !deploySuccessInfo.arnsConfigured && 
       (walletType === 'arweave' || walletType === 'ethereum') && userArnsNames.length > 0 && (
        <div className="mt-6">
          <ArNSAssociationPanel
            enabled={postDeployArNSEnabled}
            onEnabledChange={setPostDeployArNSEnabled}
            selectedName={postDeployArNSName}
            onNameChange={setPostDeployArNSName}
            selectedUndername={postDeployUndername}
            onUndernameChange={setPostDeployUndername}
            showUndername={postDeployShowUndername}
            onShowUndernameChange={setPostDeployShowUndername}
            customTTL={postDeployCustomTTL}
            onCustomTTLChange={setPostDeployCustomTTL}
          />
          
          {/* Connect Domain Action - Only show when enabled and name selected */}
          {postDeployArNSEnabled && postDeployArNSName && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  if (!postDeployArNSName || !deploySuccessInfo?.manifestId) return;
                  
                  setPostDeployArNSUpdating(true);
                  try {
                    console.log('Starting post-deployment ArNS update:', { 
                      arnsName: postDeployArNSName, 
                      manifestId: deploySuccessInfo.manifestId, 
                      undername: postDeployUndername 
                    });
                    
                    const result = await updateArNSRecord(postDeployArNSName, deploySuccessInfo.manifestId, postDeployUndername || undefined, postDeployCustomTTL);
                    console.log('Post-deployment ArNS update result:', result);
                    
                    if (result.success) {
                      // Add ArNS update to deploy history for Recent Deployments to show
                      const arnsUpdateRecord = {
                        type: 'arns-update' as const,
                        id: result.transactionId || '',
                        manifestId: deploySuccessInfo.manifestId,
                        arnsName: postDeployArNSName,
                        undername: postDeployUndername || undefined,
                        targetId: deploySuccessInfo.manifestId,
                        timestamp: Date.now(),
                        arnsStatus: 'success' as const,
                        arnsError: undefined
                      };
                      
                      addDeployResults([arnsUpdateRecord]);
                      
                      // Update success info to show ArNS was configured
                      setDeploySuccessInfo(prev => prev ? {
                        ...prev,
                        arnsConfigured: true,
                        arnsName: postDeployArNSName,
                        undername: postDeployUndername || undefined,
                        arnsTransactionId: result.transactionId
                      } : prev);
                      
                      // Refresh the specific ArNS name to get latest state
                      setTimeout(() => {
                        refreshSpecificName(postDeployArNSName);
                      }, 3000); // Wait 3 seconds for propagation
                      
                      // Reset ArNS panel state
                      setPostDeployArNSName('');
                      setPostDeployUndername('');
                      setPostDeployShowUndername(false);
                      setPostDeployArNSEnabled(false);
                      
                      // Clear any existing messages since the success card will show the domain
                      setDeployMessage(null);
                    } else {
                      setDeployMessage({
                        type: 'error',
                        text: `Domain update failed: ${result.error}`
                      });
                    }
                  } catch (error) {
                    console.error('Post-deployment ArNS update error:', error);
                    setDeployMessage({
                      type: 'error',
                      text: `Domain update failed: ${error instanceof Error ? error.message : 'Please try again.'}`
                    });
                  }
                  setPostDeployArNSUpdating(false);
                }}
                disabled={!postDeployArNSName || postDeployArNSUpdating || (postDeployShowUndername && !postDeployUndername)}
                className="w-full py-3 px-4 bg-warning text-foreground rounded-lg hover:bg-warning/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {postDeployArNSUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting Domain...
                  </>
                ) : (
                  'Connect Domain'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Deploy Message */}
      {deployMessage && (
        <div className={`mt-4 p-3 rounded-lg ${
          deployMessage.type === 'error' 
            ? 'bg-error/10 border border-error/20 text-error'
            : deployMessage.type === 'success'
            ? 'bg-success/10 border border-success/20 text-success' 
            : 'bg-info/10 border border-info/20 text-info'
        }`}>
          <div className="flex items-center justify-between">
            <span>{deployMessage.text}</span>
            <button
              onClick={() => setDeployMessage(null)}
              className="ml-4 p-1 hover:opacity-70 transition-opacity flex-shrink-0"
              title="Close message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Deploy Results - Unified Design with Recent Deployments Page */}
      {deployHistory.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-gradient-to-br from-primary/5 to-primary/3 border border-primary/20 rounded-xl">
          {/* Collapsible Header with Actions on Same Row */}
          <div className={`flex items-center justify-between p-4 ${showDeployResults ? 'pb-0 mb-4' : 'pb-4'}`}>
            <button
              onClick={() => setShowDeployResults(!showDeployResults)}
              className="flex items-start gap-2 hover:text-success transition-colors text-left"
              type="button"
            >
              <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-bold text-foreground">Recent</span>
                <span className="text-xs text-foreground/80">({recentDeploymentEntries.length}{Object.keys(deploymentGroups).length > 5 ? ' of ' + Object.keys(deploymentGroups).length : ''})</span>
              </div>
              {showDeployResults ? (
                <ChevronUp className="w-4 h-4 text-foreground/80 flex-shrink-0 mt-0.5" />
              ) : (
                <ChevronDown className="w-4 h-4 text-foreground/80 flex-shrink-0 mt-0.5" />
              )}
            </button>
            
            {/* Actions only show when expanded */}
            {showDeployResults && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportDeployToCSV}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-card border border-border/20 rounded text-foreground hover:bg-card hover:text-foreground transition-colors"
                  title="Export deployment history to CSV"
                >
                  <Archive className="w-3 h-3" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    // Check status for recent deployed items (manifest + files)
                    const allIds = recentDeploymentEntries.flatMap(([, group]) => {
                      const ids = [];
                      if (group.manifest?.id) ids.push(group.manifest.id);
                      if (group.files?.files) ids.push(...group.files.files.map((f: any) => f.id));
                      return ids;
                    });
                    checkMultipleStatuses(allIds, true);
                  }}
                  disabled={Object.values(statusChecking).some(checking => checking)}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-card border border-border/20 rounded text-foreground hover:bg-card hover:text-foreground transition-colors disabled:opacity-50"
                  title="Check status for recent deployed files"
                >
                  <RefreshCw className={`w-3 h-3 ${Object.values(statusChecking).some(checking => checking) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Check Status</span>
                </button>
                <button
                  onClick={clearDeployHistory}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-foreground/80 hover:text-error border border-border/10 rounded hover:border-error/50 transition-colors"
                  title="Clear all deployment history"
                >
                  <XCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear History</span>
                </button>
              </div>
            )}
          </div>
          
          {showDeployResults && (
            <>              
              {/* Option 3: Single unified cards */}
              <div className="space-y-4 max-h-[700px] overflow-y-auto px-4">
                {recentDeploymentEntries.map(([manifestId, group]) => {
                  const arnsAssociation = getArNSAssociation(manifestId);
                  
                  return (
                    <div key={manifestId} className="bg-card border border-border/20 rounded-lg p-4">
                      {/* Unified Header Row - Manifest Info + Actions */}
                      {group.manifest && (
                        <div className="flex items-center justify-between gap-2 mb-3">
                          {/* Main Info Row */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Package Icon if app name exists, Globe otherwise */}
                            {group.manifest.appName ? (
                              <Package className="w-4 h-4 text-primary" />
                            ) : (
                              <Globe className="w-4 h-4 text-foreground" />
                            )}

                            {/* App Name with Version if available, else ArNS Name or Transaction ID */}
                            {group.manifest.appName ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {group.manifest.appName}
                                </span>
                                {group.manifest.appVersion && (
                                  <span className="text-xs text-foreground/80">v{group.manifest.appVersion}</span>
                                )}
                                {arnsAssociation && arnsAssociation.arnsName && (
                                  <a
                                    href={`https://${arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}${arnsAssociation.arnsName}.ar.io`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-foreground/80 hover:text-success transition-colors"
                                  >
                                    {arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}{arnsAssociation.arnsName}.ar.io
                                  </a>
                                )}
                              </div>
                            ) : arnsAssociation && arnsAssociation.arnsName ? (
                              <div className="flex items-center gap-2">
                                <a 
                                  href={`https://${arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}${arnsAssociation.arnsName}.ar.io`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-foreground hover:text-success hover:underline transition-colors"
                                >
                                  {arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}{arnsAssociation.arnsName}
                                </a>
                                {arnsAssociation.arnsStatus === 'failed' && (
                                  <span className="text-xs text-error">(failed)</span>
                                )}
                                {arnsAssociation.arnsStatus === 'pending' && (
                                  <span className="text-xs text-warning">(updating...)</span>
                                )}
                              </div>
                            ) : (
                              <div className="font-mono text-sm text-foreground">
                                {manifestId.substring(0, 6)}...
                              </div>
                            )}
                            
                            {/* Timestamp - Desktop only */}
                            {group.manifest.timestamp && (
                              <span className="text-xs text-foreground/80 hidden sm:inline">
                                {new Date(group.manifest.timestamp).toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Desktop: Show all actions */}
                          <div className="hidden sm:flex items-center gap-1">
                            {/* Status Icon as part of actions - only show if we have real status */}
                            {uploadStatuses[manifestId] && (
                              <div className="p-1.5" title={`Status: ${uploadStatuses[manifestId].status}`}>
                                {(() => {
                                  const iconType = getStatusIcon(uploadStatuses[manifestId].status, uploadStatuses[manifestId].info);
                                  return renderStatusIcon(iconType);
                                })()}
                              </div>
                            )}
                            <CopyButton textToCopy={manifestId} />
                            <button
                              onClick={() => setShowReceiptModal(manifestId)}
                              className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                              title="View Receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => checkUploadStatus(manifestId, true)}
                              disabled={!!statusChecking[manifestId]}
                              className="p-1.5 text-foreground/80 hover:text-foreground transition-colors disabled:opacity-50"
                              title="Check Status"
                            >
                              <RefreshCw className={`w-4 h-4 ${statusChecking[manifestId] ? 'animate-spin' : ''}`} />
                            </button>
                            <a
                              href={getArweaveRawUrl(manifestId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                              title="View Raw Manifest JSON"
                            >
                              <Code className="w-4 h-4" />
                            </a>
                            <a
                              href={getArweaveUrl(manifestId, group.manifest?.receipt?.dataCaches)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                              title="Visit Deployed Site"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            {/* Assign Domain Button - Always show for compatible wallets */}
                            {(walletType === 'arweave' || walletType === 'ethereum') && (
                              <button
                                onClick={() => setShowAssignDomainModal(manifestId)}
                                className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                                title={arnsAssociation ? "Change Domain" : "Assign Domain"}
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Mobile: Status + 3-dot menu */}
                          <div className="sm:hidden flex items-center gap-1">
                            {/* Status Icon - visible on mobile, only show if we have real status */}
                            {uploadStatuses[manifestId] && (
                              <div className="p-1.5" title={`Status: ${uploadStatuses[manifestId].status}`}>
                                {(() => {
                                  const iconType = getStatusIcon(uploadStatuses[manifestId].status, uploadStatuses[manifestId].info);
                                  return renderStatusIcon(iconType);
                                })()}
                              </div>
                            )}
                            
                            <Popover className="relative">
                              <PopoverButton className="p-1.5 text-foreground/80 hover:text-foreground transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </PopoverButton>
                              <PopoverPanel anchor="bottom end" className="w-48 bg-card border border-border/20 rounded-lg shadow-lg z-[9999] py-1 mt-1">
                                {({ close }) => (
                                  <>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(manifestId);
                                        setCopiedItems(prev => new Set([...prev, manifestId]));
                                        // Show feedback for 1 second before closing menu
                                        setTimeout(() => {
                                          close();
                                          // Clear copied state after menu closes
                                          setTimeout(() => {
                                            setCopiedItems(prev => {
                                              const newSet = new Set(prev);
                                              newSet.delete(manifestId);
                                              return newSet;
                                            });
                                          }, 500);
                                        }, 1000);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                    >
                                      {copiedItems.has(manifestId) ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 text-success" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-4 h-4" />
                                          Copy Deployment ID
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowReceiptModal(manifestId);
                                        close();
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                    >
                                      <Receipt className="w-4 h-4" />
                                      View Receipt
                                    </button>
                                    <button
                                      onClick={() => {
                                        checkUploadStatus(manifestId, true);
                                        close();
                                      }}
                                      disabled={!!statusChecking[manifestId]}
                                      className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <RefreshCw className={`w-4 h-4 ${statusChecking[manifestId] ? 'animate-spin' : ''}`} />
                                      Check Status
                                    </button>
                                    <a
                                      href={getArweaveRawUrl(manifestId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => close()}
                                      className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                    >
                                      <Code className="w-4 h-4" />
                                      View Raw JSON
                                    </a>
                                    <a
                                      href={getArweaveUrl(manifestId, group.manifest?.receipt?.dataCaches)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => close()}
                                      className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      Visit Deployed Site
                                    </a>
                                    {/* Assign/Change Domain - Mobile Menu */}
                                    {(walletType === 'arweave' || walletType === 'ethereum') && (
                                      <button
                                        onClick={() => {
                                          setShowAssignDomainModal(manifestId);
                                          close();
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                      >
                                        <Globe className="w-4 h-4" />
                                        {arnsAssociation ? "Change Domain" : "Assign Domain"}
                                      </button>
                                    )}
                                  </>
                                )}
                              </PopoverPanel>
                            </Popover>
                          </div>
                        </div>
                      )}
                      
                      {/* Mobile Timestamp Row */}
                      {group.manifest && group.manifest.timestamp && (
                        <div className="text-xs text-foreground/80 sm:hidden mb-3">
                          {new Date(group.manifest.timestamp).toLocaleString()}
                        </div>
                      )}

                      {/* Files Section - Integrated into same card */}
                      {group.files && group.files.files && (
                        <details className="border-t border-border/10 pt-3">
                          <summary className="cursor-pointer text-sm text-foreground/80 flex items-center gap-2 hover:text-foreground transition-colors">
                            <Folder className="w-4 h-4" />
                            Files ({group.files.files.length})
                            <ChevronDown className="w-3 h-3 text-foreground/80 ml-auto" />
                          </summary>
                          <div className="pt-3 space-y-2 max-h-60 overflow-y-auto pl-1">
                            {group.files.files.map((file: any, fileIndex: number) => {
                              const status = uploadStatuses[file.id];
                              const isChecking = statusChecking[file.id];
                              
                              return (
                                <div key={fileIndex} className="bg-card border border-border/20 rounded p-3">
                                  <div className="space-y-2">
                                    {/* Row 1: Status Icon + Shortened TxID + File Path + Actions */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {/* Shortened Transaction ID */}
                                        <div className="font-mono text-sm text-foreground">
                                          {file.id.substring(0, 6)}...
                                        </div>
                                        
                                        {/* File Path */}
                                        <div className="text-sm text-foreground truncate" title={file.path}>
                                          {file.path.split('/').pop() || file.path}
                                        </div>
                                      </div>
                                      
                                      {/* Desktop: Show all actions */}
                                      <div className="hidden sm:flex items-center gap-1">
                                        {/* Status Icon as part of actions - only show if we have real status */}
                                        {status && (
                                          <div className="p-1.5" title={`Status: ${status.status}`}>
                                            {(() => {
                                              const iconType = getStatusIcon(status.status, status.info);
                                              return renderStatusIcon(iconType);
                                            })()}
                                          </div>
                                        )}
                                        <CopyButton textToCopy={file.id} />
                                        <button
                                          onClick={() => setShowReceiptModal(file.id)}
                                          className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                                          title="View Receipt"
                                        >
                                          <Receipt className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => checkUploadStatus(file.id, true)}
                                          disabled={isChecking}
                                          className="p-1.5 text-foreground/80 hover:text-foreground transition-colors disabled:opacity-50"
                                          title="Check Status"
                                        >
                                          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                        </button>
                                        <a
                                          href={getArweaveUrl(file.id, file.receipt?.dataCaches)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                                          title="View File"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      </div>

                                      {/* Mobile: Status icon + 3-dot menu */}
                                      <div className="sm:hidden flex items-center gap-1">
                                        {/* Status Icon for mobile */}
                                        {status && (
                                          <div className="p-1.5" title={`Status: ${status.status}`}>
                                            {(() => {
                                              const iconType = getStatusIcon(status.status, status.info);
                                              return renderStatusIcon(iconType);
                                            })()}
                                          </div>
                                        )}
                                        <Popover className="relative">
                                          <PopoverButton className="p-1.5 text-foreground/80 hover:text-foreground transition-colors">
                                            <MoreVertical className="w-4 h-4" />
                                          </PopoverButton>
                                          <PopoverPanel anchor="bottom end" className="w-40 bg-card border border-border/20 rounded-lg shadow-lg z-[9999] py-1 mt-1">
                                            {({ close }) => (
                                              <>
                                                <button
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(file.id);
                                                    setCopiedItems(prev => new Set([...prev, file.id]));
                                                    // Show feedback for 1 second before closing menu
                                                    setTimeout(() => {
                                                      close();
                                                      // Clear copied state after menu closes
                                                      setTimeout(() => {
                                                        setCopiedItems(prev => {
                                                          const newSet = new Set(prev);
                                                          newSet.delete(file.id);
                                                          return newSet;
                                                        });
                                                      }, 500);
                                                    }, 1000);
                                                  }}
                                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                                >
                                                  {copiedItems.has(file.id) ? (
                                                    <>
                                                      <CheckCircle className="w-4 h-4 text-success" />
                                                      Copied!
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Copy className="w-4 h-4" />
                                                      Copy File ID
                                                    </>
                                                  )}
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setShowReceiptModal(file.id);
                                                    close();
                                                  }}
                                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                                >
                                                  <Receipt className="w-4 h-4" />
                                                  View Receipt
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    checkUploadStatus(file.id, true);
                                                    close();
                                                  }}
                                                  disabled={isChecking}
                                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2 disabled:opacity-50"
                                                >
                                                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                                  Check Status
                                                </button>
                                                <a
                                                  href={getArweaveUrl(file.id, file.receipt?.dataCaches)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={() => close()}
                                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                                >
                                                  <ExternalLink className="w-4 h-4" />
                                                  View File
                                                </a>
                                              </>
                                            )}
                                          </PopoverPanel>
                                        </Popover>
                                      </div>
                                    </div>

                                    {/* Row 2: Content Type + File Size */}
                                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                                      <span>
                                        {getDisplayContentType(
                                          file.path,
                                          file.receipt?.tags?.find((tag: any) => tag.name === 'Content-Type')?.value
                                        )}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {file.size < 1024 
                                          ? `${file.size} B` 
                                          : file.size < 1024 * 1024 
                                          ? `${(file.size / 1024).toFixed(2)} KB`
                                          : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                      </span>
                                    </div>

                                    {/* Row 3: Cost + Deploy Timestamp */}
                                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                                      <span>
                                        {isFileFree(file.size, freeUploadLimitBytes) ? (
                                          <span className="text-success">FREE</span>
                                        ) : wincForOneGiB ? (
                                          `${((file.size / (1024 ** 3)) * Number(wincForOneGiB) / wincPerCredit).toFixed(6)} Credits`
                                        ) : (
                                          'Unknown Cost'
                                        )}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {group.files.timestamp 
                                          ? new Date(group.files.timestamp).toLocaleString()
                                          : 'Unknown Time'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {/* View All Button at Bottom - only show when expanded and there are deployments */}
          {showDeployResults && Object.keys(deploymentGroups).length > 0 && (
            <div className="border-t border-border/20 mt-4">
              <div className="p-4">
                <button
                  onClick={() => {
                    navigate('/deployments');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-foreground hover:text-foreground/80 transition-colors font-medium"
                >
                  View All Deployments <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          onClose={() => setShowReceiptModal(null)}
          receipt={deployHistory.find(r => 
            (r.type === 'manifest' && r.id === showReceiptModal) || 
            (r.type === 'files' && r.files?.find(f => f.id === showReceiptModal))
          )}
          uploadId={showReceiptModal}
        />
      )}

      {/* Deploy Confirmation Modal */}
      {showConfirmModal && selectedFolder && (
        <DeployConfirmationModal
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmDeploy}
          folderName={folderName}
          fileCount={selectedFolder.length}
          files={selectedFolder}
          totalSize={totalFileSize}
          totalCost={totalCost}
          indexFile={indexFile}
          fallbackFile={fallbackFile}
          arnsEnabled={arnsEnabled}
          arnsName={selectedArnsName}
          undername={selectedUndername}
          currentBalance={creditBalance}
          walletType={walletType}
          walletAddress={address}
          selectedJitToken={selectedJitToken}
          onSelectedJitTokenChange={setSelectedJitToken}
          jitBalanceSufficient={jitBalanceSufficient}
          onJitBalanceValidation={setJitBalanceSufficient}
          localJitMax={localJitMax}
          onMaxTokenAmountChange={setLocalJitMax}
          paymentTab={paymentTab}
          onPaymentTabChange={setPaymentTab}
          cryptoShortage={cryptoShortage}
          onCryptoShortageUpdate={setCryptoShortage}
          x402OnlyMode={x402OnlyMode}
          isPaymentServiceAvailable={isPaymentServiceAvailable}
          smartDeployEnabled={smartDeployEnabled}
          cachedFilesCount={deduplicationStats?.cachedFiles ?? 0}
          billableSize={smartDeployEnabled ? (deduplicationStats?.billableSize ?? 0) : calculateBillableSizeWithoutSmartDeploy()}
          appName={appName.trim() || undefined}
          appVersion={appVersion.trim() || undefined}
        />
      )}

      {/* Assign Domain Modal */}
      {showAssignDomainModal && (
        <AssignDomainModal
          onClose={() => setShowAssignDomainModal(null)}
          manifestId={showAssignDomainModal}
          existingArnsName={getArNSAssociation(showAssignDomainModal)?.arnsName}
          existingUndername={getArNSAssociation(showAssignDomainModal)?.undername}
          onSuccess={(arnsName, undername, transactionId) => 
            handleAssignDomainSuccess(showAssignDomainModal, arnsName, undername, transactionId)
          }
        />
      )}
    </div>
  );
}