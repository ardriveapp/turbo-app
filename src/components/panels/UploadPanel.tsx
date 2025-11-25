import { useState, useCallback, useEffect } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useFreeUploadLimit, isFileFree, formatFreeLimit } from '../../hooks/useFreeUploadLimit';
import { useX402Pricing } from '../../hooks/useX402Pricing';
import { wincPerCredit, SupportedTokenType } from '../../constants';
import { useStore } from '../../store/useStore';
import { CheckCircle, XCircle, Upload, ExternalLink, Shield, RefreshCw, Receipt, ChevronDown, ChevronUp, Archive, Clock, HelpCircle, MoreVertical, ArrowRight, Copy, Globe, AlertTriangle, CreditCard, Wallet } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import CopyButton from '../CopyButton';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import ReceiptModal from '../modals/ReceiptModal';
import AssignDomainModal from '../modals/AssignDomainModal';
import BaseModal from '../modals/BaseModal';
import { getArweaveUrl } from '../../utils';
import UploadProgressSummary from '../UploadProgressSummary';
import { JitTokenSelector } from '../JitTokenSelector';
import { supportsJitPayment, getTokenConverter, calculateRequiredTokenAmount, formatTokenAmount } from '../../utils/jitPayment';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { tokenLabels } from '../../constants';
import { Loader2 } from 'lucide-react';
import X402OnlyBanner from '../X402OnlyBanner';

// Unified Crypto Payment Details Component (matches Credits layout)
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

function CryptoPaymentDetails({
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
              tokenAmountReadable: x402Pricing.usdcAmount, // Can be 0 for free uploads
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditsNeeded, totalCost, tokenType, bufferPercentage, x402Pricing?.usdcAmount, x402Pricing?.loading, x402Pricing?.error]);

  // Validate balance and update shortage info
  useEffect(() => {
    if (!estimatedCost) {
      onBalanceValidation(true);
      onShortageUpdate(null);
      return;
    }

    if (isNetworkError) {
      onBalanceValidation(false);
      onShortageUpdate(null);
      return;
    }

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
  }, [tokenBalance, estimatedCost, balanceError, isNetworkError, tokenType, onBalanceValidation, onShortageUpdate]);

  const afterUpload = estimatedCost ? Math.max(0, tokenBalance - estimatedCost.tokenAmountReadable) : tokenBalance;

  return (
    <div className="mb-4">
      <div className="bg-surface rounded-lg border border-default p-4">
        <div className="space-y-2.5">
          {/* Cost */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-link">Cost:</span>
            <span className="text-sm text-fg-muted font-medium">
              {estimatedCost ? (
                estimatedCost.tokenAmountReadable === 0 ? (
                  <span className="text-turbo-green font-medium">FREE</span>
                ) : (
                  <>
                    ~{formatTokenAmount(estimatedCost.tokenAmountReadable, tokenType)} {tokenLabel}
                    {estimatedCost.estimatedUSD && estimatedCost.estimatedUSD > 0 && (
                      <span className="text-xs text-link ml-2">
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
            <span className="text-xs text-link">Current Balance:</span>
            <span className="text-sm text-fg-muted font-medium">
              {balanceLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking...
                </span>
              ) : balanceError ? (
                <span className="text-amber-400">Unable to fetch</span>
              ) : (
                `${formatTokenAmount(tokenBalance, tokenType)} ${tokenLabel}`
              )}
            </span>
          </div>

          {/* After Upload */}
          {estimatedCost && !balanceLoading && !balanceError && (
            <div className="flex justify-between items-center pt-2 border-t border-default/30">
              <span className="text-xs text-link">After Upload:</span>
              <span className="text-sm text-fg-muted font-medium">
                {formatTokenAmount(afterUpload, tokenType)} {tokenLabel}
              </span>
            </div>
          )}

          {/* Network Error Warning */}
          {isNetworkError && (
            <div className="pt-3 mt-3 border-t border-default/30">
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-amber-400 font-medium mb-1">
                    {balanceError}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        {estimatedCost && (
          <div className="mt-4 pt-4 border-t border-default/30">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-link hover:text-fg-muted transition-colors flex items-center gap-1"
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
                <label className="text-xs text-link block mb-2">
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
                    className="w-20 px-2 py-1.5 text-xs rounded border border-default bg-canvas text-fg-muted focus:outline-none focus:border-fg-muted"
                  />
                  <span className="text-xs text-link">%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadPanel() {
  const {
    address,
    walletType,
    creditBalance,
    uploadHistory,
    addUploadResults,
    updateUploadWithArNS,
    clearUploadHistory,
    jitPaymentEnabled,
    setJitPaymentEnabled,
    setJitMaxTokenAmount,
    x402OnlyMode,
    isPaymentServiceAvailable,
  } = useStore();

  // Fetch and track the bundler's free upload limit
  const freeUploadLimitBytes = useFreeUploadLimit();

  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showAssignDomainModal, setShowAssignDomainModal] = useState<string | null>(null);
  const [showUploadResults, setShowUploadResults] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [uploadsToShow, setUploadsToShow] = useState(20); // Start with 20 uploads
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // JIT payment local state for this upload
  const [localJitEnabled, setLocalJitEnabled] = useState(jitPaymentEnabled);

  // Max will be auto-calculated by JitPaymentCard based on estimated cost
  const [localJitMax, setLocalJitMax] = useState(0);

  // Track if JIT section is expanded (for users with sufficient credits)
  const [jitSectionExpanded, setJitSectionExpanded] = useState(false);

  // Payment method tab - 'credits' or 'crypto'
  const [paymentTab, setPaymentTab] = useState<'credits' | 'crypto'>('credits');

  // Track crypto shortage details for combined warning
  const [cryptoShortage, setCryptoShortage] = useState<{
    amount: number;
    tokenType: SupportedTokenType;
  } | null>(null);

  // Selected JIT token - will be set when user opens "Pay with Crypto"
  // NOT set by default to avoid triggering x402 pricing before user interaction
  const [selectedJitToken, setSelectedJitToken] = useState<SupportedTokenType>(() => {
    if (walletType === 'arweave') return 'ario';
    if (walletType === 'solana') return 'solana';
    return 'base-eth'; // Default for Ethereum - will switch to base-usdc when JIT opens
  });

  // Switch to base-usdc when x402-only mode is enabled (only option for ETH wallets)
  useEffect(() => {
    if (x402OnlyMode && walletType === 'ethereum') {
      setSelectedJitToken('base-usdc');
    }
  }, [x402OnlyMode, walletType]);

  // Reset payment tab when modal opens
  // In x402-only mode, start on Crypto tab (no credits available)
  // In normal mode, start on Credits tab
  useEffect(() => {
    if (showConfirmModal) {
      setPaymentTab(x402OnlyMode ? 'crypto' : 'credits');
      setJitSectionExpanded(x402OnlyMode); // Auto-expand in x402-only mode
    }
  }, [showConfirmModal, x402OnlyMode]);

  // Auto-select base-usdc (x402) ONLY when user explicitly opens "Pay with Crypto" section
  // Reset to base-eth when they close it (unless x402-only mode is active)
  // Do NOT switch based on localJitEnabled - that's just a preference, not a UI action
  useEffect(() => {
    if (walletType === 'ethereum') {
      if (jitSectionExpanded) {
        setSelectedJitToken('base-usdc'); // Switch to x402 when section expands
      } else if (!x402OnlyMode) {
        setSelectedJitToken('base-eth'); // Reset when section collapses (unless x402-only)
      }
    }
  }, [walletType, jitSectionExpanded, x402OnlyMode]); // Added x402OnlyMode to dependencies

  // Track if user has sufficient crypto balance for JIT payment
  const [jitBalanceSufficient, setJitBalanceSufficient] = useState(true);

  // USD equivalent for credit pricing
  const [usdEquivalent, setUsdEquivalent] = useState<number | null>(null);

  // Fixed 10% buffer for SDK (not exposed to user)
  const FIXED_BUFFER_MULTIPLIER = 1.1;
  const wincForOneGiB = useWincForOneGiB();

  // Calculate total file size and billable size (excluding free files)
  const totalFileSize = files.reduce((acc, file) => acc + file.size, 0);
  const billableFileSize = files.reduce((acc, file) => {
    return isFileFree(file.size, freeUploadLimitBytes) ? acc : acc + file.size;
  }, 0);

  // Get x402 pricing ONLY when user has opened the "Pay with Crypto" section
  // This ensures we show CREDITS by default and only fetch x402 pricing when user clicks "Pay with Crypto"
  // In x402-only mode, always use x402 pricing since there's no credits option
  // Use billableFileSize (excluding free files) for accurate x402 pricing
  const shouldUseX402 =
    walletType === 'ethereum' &&
    selectedJitToken === 'base-usdc' &&
    showConfirmModal &&  // Modal must be open
    (jitSectionExpanded || x402OnlyMode);  // "Pay with Crypto" section expanded OR x402-only mode
  const x402Pricing = useX402Pricing(shouldUseX402 ? billableFileSize : 0);

  // Fetch USD equivalent for credit pricing (only for billable bytes)
  useEffect(() => {
    const fetchUsdPrice = async () => {
      if (billableFileSize <= 0 || !showConfirmModal) {
        setUsdEquivalent(null);
        return;
      }

      try {
        const { getCurrentConfig } = useStore.getState();
        const config = getCurrentConfig();
        const { TurboFactory } = await import('@ardrive/turbo-sdk/web');

        const turbo = TurboFactory.unauthenticated({
          paymentServiceConfig: { url: config.paymentServiceUrl },
        });

        // Get USD price per GiB
        const fiatRates = await turbo.getFiatRates();
        const usdPerGiB = fiatRates.fiat?.usd || 0;

        console.log('[Credits USD Pricing] getFiatRates response:', fiatRates);
        console.log('[Credits USD Pricing] USD per GiB:', usdPerGiB);

        if (usdPerGiB > 0) {
          // Calculate USD for billable file size only (excluding free files)
          const gib = billableFileSize / (1024 * 1024 * 1024);
          const usdPrice = gib * usdPerGiB;
          console.log('[Credits USD Pricing] Billable GiB:', gib);
          console.log('[Credits USD Pricing] Total USD price:', usdPrice);
          setUsdEquivalent(usdPrice);
        } else {
          setUsdEquivalent(null);
        }
      } catch (error) {
        console.error('[USD Pricing] Error fetching USD price:', error);
        setUsdEquivalent(null);
      }
    };

    fetchUsdPrice();
  }, [billableFileSize, showConfirmModal]);

  const {
    uploadMultipleFiles,
    uploading,
    reset: resetFileUpload,
    uploadedCount,
    totalFilesCount,
    failedCount,
    activeUploads,
    recentFiles,
    uploadErrors,
    totalSize,
    uploadedSize,
    retryFailedFiles,
    cancelUploads
  } = useFileUpload();
  const { 
    checkUploadStatus, 
    checkMultipleStatuses, 
    statusChecking, 
    uploadStatuses, 
    formatFileSize,
    getStatusIcon,
    initializeFromCache
  } = useUploadStatus();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      // Reset input value after processing to allow re-selecting the same file
      setTimeout(() => {
        e.target.value = '';
      }, 0);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Initialize status from cache only (no API calls) when page loads
  useEffect(() => {
    if (uploadHistory.length > 0) {
      const uploadIds = uploadHistory.slice(0, uploadsToShow).map(upload => upload.id);
      // Initialize from cache only (no API calls)
      initializeFromCache(uploadIds);
    }
  }, [uploadHistory, uploadsToShow, initializeFromCache]);

  const exportToCSV = () => {
    if (uploadHistory.length === 0) return;

    const headers = [
      'Transaction ID',
      'File Name', 
      'Upload Date',
      'File Size (Bytes)',
      'File Size (Human)',
      'Cost (Credits)',
      'WINC Amount',
      'Owner Address',
      'Content Type',
      'Data Caches',
      'Fast Finality Indexes',
      'Arweave URL'
    ];

    const rows = uploadHistory.map(result => {
      // Use stored file metadata (preferred) or fallback to receipt tags
      const fileName = result.fileName || 
                       result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value || 
                       'Unknown';
      
      const contentType = result.contentType || 
                          result.receipt?.tags?.find((tag: any) => tag.name === 'Content-Type')?.value || 
                          'application/octet-stream';
      
      const fileSizeBytes = result.fileSize || 'Unknown';
      const fileSizeHuman = typeof fileSizeBytes === 'number' ? formatFileSize(fileSizeBytes) : 'Unknown';
      
      // Calculate credits from WINC
      const wincAmount = Number(result.winc || '0');
      const credits = wincForOneGiB && wincAmount > 0 ? (wincAmount / wincPerCredit) : 0;
      
      return [
        result.id,
        fileName,
        result.timestamp ? new Date(result.timestamp).toLocaleString() : new Date().toLocaleString(),
        fileSizeBytes,
        fileSizeHuman,
        typeof credits === 'number' ? credits.toFixed(6) : credits,
        result.winc,
        result.owner,
        contentType,
        result.dataCaches.join('; '),
        result.fastFinalityIndexes.join('; '),
        getArweaveUrl(result.id, result.dataCaches)
      ];
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
    link.setAttribute('download', `turbo-uploads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const calculateUploadCost = (bytes: number) => {
    if (isFileFree(bytes, freeUploadLimitBytes)) return 0; // Free tier: Files under bundler's free limit

    // Always return credit-based pricing for file list display
    // x402 pricing is only used in the payment modal for USDC payment option
    if (!wincForOneGiB) return null;

    const gibSize = bytes / (1024 * 1024 * 1024);
    const wincCost = gibSize * Number(wincForOneGiB);
    const creditCost = wincCost / wincPerCredit;
    return creditCost;
  };

  // Use billableFileSize (sum of non-free files) to respect per-file free tiers
  const totalCost = calculateUploadCost(billableFileSize);

  // Auto-enable JIT when user has insufficient credits
  useEffect(() => {
    if (showConfirmModal && totalCost !== null) {
      const creditsNeeded = Math.max(0, totalCost - creditBalance);
      if (creditsNeeded > 0) {
        setLocalJitEnabled(true); // Auto-enable for insufficient credits
      }
    }
  }, [showConfirmModal, totalCost, creditBalance]);

  const handleUpload = () => {
    if (!address) {
      setUploadMessage({ type: 'error', text: 'Please connect your wallet to upload files' });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmUpload = async () => {
    setShowConfirmModal(false);
    setJitSectionExpanded(false); // Reset for next upload
    setUploadMessage(null);

    // Save JIT preferences to store
    setJitPaymentEnabled(localJitEnabled);

    // Save max token amount to store for future use (using selected token)
    if (selectedJitToken) {
      setJitMaxTokenAmount(selectedJitToken, localJitMax);
    }

    // Only enable JIT if the user has insufficient credits to cover the cost
    // Calculate credits needed (0 if user has sufficient credits)
    const creditsNeeded = Math.max(0, (totalCost || 0) - creditBalance);
    const shouldEnableJit = localJitEnabled && creditsNeeded > 0;

    // Convert max token amount to smallest unit for SDK/x402
    let jitMaxTokenAmountSmallest = 0;
    if (shouldEnableJit && selectedJitToken && supportsJitPayment(selectedJitToken)) {
      const converter = getTokenConverter(selectedJitToken);
      jitMaxTokenAmountSmallest = converter ? converter(localJitMax) : 0;
    }

    try {
      const { results, failedFiles } = await uploadMultipleFiles(files, {
        jitEnabled: shouldEnableJit,
        jitMaxTokenAmount: jitMaxTokenAmountSmallest,
        jitBufferMultiplier: FIXED_BUFFER_MULTIPLIER,
        selectedJitToken: selectedJitToken, // Pass selected token for x402
      });
      
      if (results.length > 0) {
        // Add to persistent upload history
        addUploadResults(results);

        // Clear successfully uploaded files from selection
        // Clear all files if upload was successful (simpler approach)
        if (failedFiles.length === 0) {
          setFiles([]);
          // Reset the file input to allow re-selecting the same files
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
        }

        // Upload successful

        if (failedFiles.length === 0) {
          setUploadMessage({
            type: 'success',
            text: `Successfully uploaded ${results.length} file${results.length !== 1 ? 's' : ''}!`
          });
        }
      }
      
      if (failedFiles.length > 0) {
        // Failed to upload some files
        setUploadMessage({ 
          type: 'error', 
          text: `Failed to upload ${failedFiles.length} file${failedFiles.length !== 1 ? 's' : ''}: ${failedFiles.join(', ')}` 
        });
      }
    } catch (error) {
      // Upload error occurred
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadMessage({ type: 'error', text: errorMessage });
    }
  };

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Upload className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Upload Files</h3>
          <p className="text-sm text-link">Store your files permanently on the Arweave network</p>
        </div>
      </div>

      {/* Connection Warning */}
      {!address && (
        <div className="mb-4 sm:mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-yellow-500">Connect your wallet to upload files</span>
          </div>
        </div>
      )}

      {/* Upload Message */}
      {uploadMessage && (
        <div className={`mb-4 sm:mb-6 p-4 rounded-lg border ${
          uploadMessage.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-500'
            : uploadMessage.type === 'success'
            ? 'bg-turbo-green/10 border-turbo-green/20 text-turbo-green'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {uploadMessage.type === 'error' && <XCircle className="w-5 h-5" />}
              {uploadMessage.type === 'success' && <CheckCircle className="w-5 h-5" />}
              <span className="text-sm">{uploadMessage.text}</span>
            </div>
            <button
              onClick={() => setUploadMessage(null)}
              className="text-sm hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container with Gradient - Hide during upload */}
      {!uploading && (
        <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-turbo-red/20 p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Upload Area - Show when no files selected */}
          {files.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging
                  ? 'border-turbo-red bg-turbo-red/10'
                  : 'border-link/30 hover:border-turbo-red/50'
              }`}
            >
              <div className="mb-4">
                <Upload className="w-12 h-12 text-turbo-red mx-auto mb-2" />
                <p className="text-lg font-medium mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-link">
                  {freeUploadLimitBytes > 0 ? (
                    <>Files under {formatFreeLimit(freeUploadLimitBytes)} are <span className="text-turbo-green font-semibold">FREE</span> • </>
                  ) : null}
                  Max 10GiB per file
                </p>
              </div>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-4 py-2 rounded bg-fg-muted text-black font-medium cursor-pointer hover:bg-fg-muted/90 transition-colors"
              >
                Select Files
              </label>
            </div>
          )}

          {/* File List - Show when files selected */}
          {files.length > 0 && (
            <div>
              <div className="mb-3 flex justify-between items-center">
                <h4 className="font-medium">Selected Files ({files.length})</h4>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="file-upload-add"
                    className="text-link hover:text-fg-muted text-sm flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Add More
                  </label>
                  <button
                    onClick={() => {
                      setFiles([]);
                      setUploadMessage(null);
                      // Reset the file input to allow re-selecting the same files
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if (fileInput) {
                        fileInput.value = '';
                      }
                      const addInput = document.getElementById('file-upload-add') as HTMLInputElement;
                      if (addInput) {
                        addInput.value = '';
                      }
                    }}
                    className="text-link hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Clear all
                  </button>
                </div>
              </div>

              {/* Hidden input for adding more files */}
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-add"
              />

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, index) => {
                  const cost = calculateUploadCost(file.size);
                  const isFree = isFileFree(file.size, freeUploadLimitBytes);

                  return (
                    <div key={index} className="bg-surface/50 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-fg-muted truncate">{file.name}</div>
                          <div className="text-xs text-link">
                            {formatFileSize(file.size)}
                            {isFree && <span className="ml-2 text-turbo-green font-medium">• FREE</span>}
                            {cost !== null && cost > 0 && (
                              <span className="ml-2">
                                • {cost.toFixed(6)} Credits
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-link hover:text-red-400 ml-4 transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 bg-surface/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-link">Total Size:</span>
                  <span className="text-xs text-fg-muted">{formatFileSize(totalFileSize)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-link">Files:</span>
                  <span className="text-xs text-fg-muted">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={files.length === 0}
                className="w-full mt-4 py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload {files.length} File{files.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Progress Summary - Show during upload */}
      {uploading && totalFilesCount > 0 && (
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

      {/* Upload Results - Activity theme */}
      {uploadHistory.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-turbo-red/20">
          {/* Collapsible Header with Actions */}
          <div className={`flex items-center justify-between p-4 ${showUploadResults ? 'pb-0 mb-4' : 'pb-4'}`}>
            <button
              onClick={() => setShowUploadResults(!showUploadResults)}
              className="flex items-center gap-2 hover:text-turbo-green transition-colors text-left"
              type="button"
            >
              <Upload className="w-5 h-5 text-turbo-red" />
              <span className="font-bold text-fg-muted">Recent</span>
              <span className="text-xs text-link">({uploadHistory.length})</span>
              {showUploadResults ? (
                <ChevronUp className="w-4 h-4 text-link" />
              ) : (
                <ChevronDown className="w-4 h-4 text-link" />
              )}
            </button>
            
            {/* Actions only show when expanded */}
            {showUploadResults && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-surface border border-default rounded text-fg-muted hover:bg-canvas hover:text-fg-muted transition-colors"
                  title="Export upload history to CSV"
                >
                  <Archive className="w-3 h-3" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => checkMultipleStatuses(uploadHistory.map(r => r.id), true)}
                  disabled={Object.values(statusChecking).some(checking => checking)}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-surface border border-default rounded text-fg-muted hover:bg-canvas hover:text-fg-muted transition-colors disabled:opacity-50"
                  title="Check status for all uploaded files"
                >
                  <RefreshCw className={`w-3 h-3 ${Object.values(statusChecking).some(checking => checking) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Check Status</span>
                </button>
                <button
                  onClick={() => {
                    clearUploadHistory();
                    resetFileUpload();
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-link hover:text-red-400 border border-default/30 rounded hover:border-red-400/50 transition-colors"
                  title="Clear all upload history"
                >
                  <XCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear History</span>
                </button>
              </div>
            )}
          </div>
          
          {showUploadResults && (
            <>
              <div className="space-y-4 max-h-[700px] overflow-y-auto px-4 pb-4">
                {uploadHistory.slice(0, uploadsToShow).map((result, index) => {
                  const status = uploadStatuses[result.id];
                  const isChecking = statusChecking[result.id];
                  
                  // Create a unified status icon renderer to match deployment results
                  const renderStatusIcon = (iconName: string) => {
                    switch (iconName) {
                      case 'check-circle':
                        return <CheckCircle className="w-4 h-4 text-turbo-green" />;
                      case 'clock':
                        return <Clock className="w-4 h-4 text-yellow-500" />;
                      case 'archive':
                        return <Archive className="w-4 h-4 text-turbo-blue" />;
                      case 'x-circle':
                        return <XCircle className="w-4 h-4 text-red-400" />;
                      case 'help-circle':
                        return <HelpCircle className="w-4 h-4 text-link" />;
                      default:
                        return <Clock className="w-4 h-4 text-yellow-500" />;
                    }
                  };
                  
                  return (
                    <div key={index} className="bg-[#090909] border border-turbo-red/20 rounded-lg p-4">
                      <div className="space-y-2">
                        {/* Row 1: ArNS Name/Transaction ID + Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* ArNS Name or Shortened Transaction ID */}
                            {result.arnsName ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <Globe className="w-4 h-4 text-fg-muted flex-shrink-0" />
                                <a 
                                  href={`https://${result.undername ? result.undername + '_' : ''}${result.arnsName}.ar.io`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-fg-muted hover:text-fg-muted/80 hover:underline transition-colors truncate"
                                >
                                  {result.undername ? result.undername + '_' : ''}{result.arnsName}
                                </a>
                              </div>
                            ) : (
                              <div className="font-mono text-sm text-fg-muted">
                                {result.id.substring(0, 6)}...
                              </div>
                            )}
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
                            <CopyButton textToCopy={result.id} />
                        <button
                          onClick={() => setShowReceiptModal(result.id)}
                          className="p-1.5 text-link hover:text-fg-muted transition-colors"
                          title="View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => checkUploadStatus(result.id)}
                          disabled={isChecking}
                          className="p-1.5 text-link hover:text-fg-muted transition-colors disabled:opacity-50"
                          title="Check Status"
                        >
                          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                        </button>
                        {/* Only show Assign Domain for Arweave and Ethereum wallets */}
                        {(walletType === 'arweave' || walletType === 'ethereum') && (
                          <button
                            onClick={() => setShowAssignDomainModal(result.id)}
                            className="p-1.5 text-link hover:text-fg-muted transition-colors"
                            title="Assign Domain"
                          >
                            <Globe className="w-4 h-4" />
                          </button>
                        )}
                        <a
                          href={getArweaveUrl(result.id, result.dataCaches)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-link hover:text-fg-muted transition-colors"
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
                              <PopoverButton className="p-1.5 text-link hover:text-fg-muted transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </PopoverButton>
                              <PopoverPanel 
                                anchor="bottom end"
                                className="w-40 bg-surface border border-default rounded-lg shadow-lg z-[200] py-1 mt-1"
                              >
                                {({ close }) => (
                              <>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(result.id);
                                    setCopiedItems(prev => new Set([...prev, result.id]));
                                    // Show feedback for 1 second before closing menu
                                    setTimeout(() => {
                                      close();
                                      // Clear copied state after menu closes
                                      setTimeout(() => {
                                        setCopiedItems(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(result.id);
                                          return newSet;
                                        });
                                      }, 500);
                                    }, 1000);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                >
                                  {copiedItems.has(result.id) ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      Copy Tx ID
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowReceiptModal(result.id);
                                    close();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                >
                                  <Receipt className="w-4 h-4" />
                                  View Receipt
                                </button>
                                <button
                                  onClick={() => {
                                    checkUploadStatus(result.id);
                                    close();
                                  }}
                                  disabled={isChecking}
                                  className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                  Check Status
                                </button>
                                {/* Only show Assign Domain for Arweave and Ethereum wallets */}
                                {(walletType === 'arweave' || walletType === 'ethereum') && (
                                  <button
                                    onClick={() => {
                                      setShowAssignDomainModal(result.id);
                                      close();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                  >
                                    <Globe className="w-4 h-4" />
                                    Assign Domain
                                  </button>
                                )}
                                <a
                                  href={getArweaveUrl(result.id, result.dataCaches)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => close()}
                                  className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
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

                    {/* Row 2: File Name (if available) */}
                    {(result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value) && (
                      <div className="text-sm text-fg-muted truncate" title={result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value}>
                        📄 {result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value}
                      </div>
                    )}

                    {/* Row 3: Content Type + File Size */}
                    <div className="flex items-center gap-2 text-sm text-link">
                      <span>
                        {result.contentType || 
                         result.receipt?.tags?.find((tag: any) => tag.name === 'Content-Type')?.value || 
                         'Unknown Type'}
                      </span>
                      <span>•</span>
                      <span>
                        {result.fileSize ? formatFileSize(result.fileSize) : 'Unknown Size'}
                      </span>
                    </div>

                    {/* Row 3: Cost + Upload Timestamp */}
                    <div className="flex items-center gap-2 text-sm text-link">
                      <span>
                        {(() => {
                          if (result.fileSize && isFileFree(result.fileSize, freeUploadLimitBytes)) {
                            return <span className="text-turbo-green">FREE</span>;
                          } else if (wincForOneGiB && result.winc) {
                            const credits = Number(result.winc) / wincPerCredit;
                            return `${credits.toFixed(6)} Credits`;
                          } else {
                            return 'Unknown Cost';
                          }
                        })()}
                      </span>
                      <span>•</span>
                      <span>
                        {result.timestamp 
                          ? new Date(result.timestamp).toLocaleString()
                          : 'Unknown Time'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                  );
                })}
              </div>
            </>
          )}
          
          {/* View More Button - only show when there are more uploads to load */}
          {showUploadResults && uploadHistory.length > uploadsToShow && (
            <div className="border-t border-default mt-4">
              <div className="p-4">
                <button
                  onClick={() => setUploadsToShow(prev => prev + 20)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-fg-muted hover:text-fg-muted/80 transition-colors font-medium"
                >
                  View More Uploads <ArrowRight className="w-4 h-4" />
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
          receipt={uploadHistory.find(r => r.id === showReceiptModal)?.receipt}
          uploadId={showReceiptModal}
          initialStatus={uploadStatuses[showReceiptModal]}
        />
      )}

      {/* Assign Domain Modal */}
      {showAssignDomainModal && (
        <AssignDomainModal
          onClose={() => setShowAssignDomainModal(null)}
          manifestId={showAssignDomainModal}
          onSuccess={(arnsName: string, undername?: string, transactionId?: string) => {
            // Update the upload item with ArNS assignment
            updateUploadWithArNS(showAssignDomainModal, arnsName, undername, transactionId);

            setShowAssignDomainModal(null);

            // Show success message
            setUploadMessage({
              type: 'success',
              text: `Successfully assigned ${undername ? undername + '_' : ''}${arnsName}.ar.io to your file!`
            });
          }}
        />
      )}

      {/* Upload Confirmation Modal */}
      {showConfirmModal && files.length > 0 && (
        <BaseModal onClose={() => {
          setShowConfirmModal(false);
          setJitSectionExpanded(false); // Reset JIT section when modal closes
        }}>
          <div className="p-4 sm:p-5 w-full max-w-2xl mx-auto min-w-[90vw] sm:min-w-[500px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Upload className="w-5 h-5 text-turbo-red" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-fg-muted">Ready to Upload</h3>
                <p className="text-xs text-link">Confirm your upload details</p>
              </div>
            </div>

            {/* X402-Only Mode Banner */}
            {x402OnlyMode && <X402OnlyBanner />}

            {/* Upload Summary - Files and Size only */}
            <div className="mb-4">
              <div className="bg-surface rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-link">Files:</span>
                    <span className="text-xs text-fg-muted">
                      {files.length} file{files.length !== 1 ? 's' : ''}
                      {(() => {
                        const freeFilesCount = files.filter(file => isFileFree(file.size, freeUploadLimitBytes)).length;
                        return freeFilesCount > 0 ? (
                          <span className="text-turbo-green"> ({freeFilesCount} free)</span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-link">Total Size:</span>
                    <span className="text-xs text-fg-muted">
                      {formatFileSize(totalFileSize)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            {(() => {
              const creditsNeeded = typeof totalCost === 'number' ? Math.max(0, totalCost - creditBalance) : 0;
              const hasSufficientCredits = creditsNeeded === 0;
              const canUseJit = selectedJitToken && supportsJitPayment(selectedJitToken);

              // Check if upload is completely free (all files under free limit)
              const isFreeUpload = typeof totalCost === 'number' && totalCost === 0;

              // When switching to crypto tab, expand the section and enable JIT
              const handleCryptoTabClick = () => {
                setPaymentTab('crypto');
                setJitSectionExpanded(true);
                setLocalJitEnabled(true);
                // Immediately set token for Ethereum wallets to avoid base-eth flash
                if (walletType === 'ethereum') {
                  setSelectedJitToken('base-usdc');
                }
              };

              // When switching to credits tab, collapse crypto section
              const handleCreditsTabClick = () => {
                setPaymentTab('credits');
                setJitSectionExpanded(false);
                setLocalJitEnabled(false);
              };

              return (
                <>
                  {/* Payment Method Tabs - Only show for wallets that support JIT, non-free uploads, and payment service available */}
                  {canUseJit && !isFreeUpload && isPaymentServiceAvailable() && (
                    <div className="mb-4">
                      <div className="inline-flex bg-surface rounded-lg p-1 border border-default w-full">
                        <button
                          type="button"
                          onClick={handleCreditsTabClick}
                          className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            paymentTab === 'credits'
                              ? 'bg-fg-muted text-black'
                              : 'text-link hover:text-fg-muted'
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
                              ? 'bg-fg-muted text-black'
                              : 'text-link hover:text-fg-muted'
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          Crypto
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment Details Section - Credits Tab (hide in x402-only mode) */}
                  {paymentTab === 'credits' && canUseJit && !isFreeUpload && isPaymentServiceAvailable() && (
                    <div className="mb-4">
                      <div className="bg-surface rounded-lg border border-default p-4">
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-link">Cost:</span>
                            <span className="text-sm text-fg-muted font-medium">
                              {totalCost === 0 ? (
                                <span className="text-turbo-green font-medium">FREE</span>
                              ) : typeof totalCost === 'number' ? (
                                <>
                                  {totalCost.toFixed(6)} Credits
                                  {usdEquivalent !== null && usdEquivalent > 0 && (
                                    <span className="text-xs text-link ml-2">
                                      (≈ ${usdEquivalent < 0.01
                                        ? usdEquivalent.toFixed(4)
                                        : usdEquivalent.toFixed(2)})
                                    </span>
                                  )}
                                </>
                              ) : (
                                'Calculating...'
                              )}
                            </span>
                          </div>

                          {/* Only show balance info for non-free uploads */}
                          {!isFreeUpload && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-link">Current Balance:</span>
                                <span className="text-sm text-fg-muted font-medium">
                                  {creditBalance.toFixed(6)} Credits
                                </span>
                              </div>
                              {typeof totalCost === 'number' && (
                                <div className="flex justify-between items-center pt-2 border-t border-default/30">
                                  <span className="text-xs text-link">After Upload:</span>
                                  <span className="text-sm text-fg-muted font-medium">
                                    {Math.max(0, creditBalance - totalCost).toFixed(6)} Credits
                                  </span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Insufficient Credits Warning */}
                          {!isFreeUpload && !hasSufficientCredits && (
                            <div className="pt-3 mt-3 border-t border-default/30">
                              <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-red-400 font-medium mb-1">
                                    Need {creditsNeeded.toFixed(6)} more credits
                                  </div>
                                  <div className="text-xs text-red-400/80">
                                    {canUseJit && (
                                      <>
                                        • Switch to <button onClick={handleCryptoTabClick} className="underline hover:text-red-300">Crypto tab</button> to pay directly
                                        <br />
                                      </>
                                    )}
                                    • <a href="/topup" className="underline hover:text-red-300">Top up credits</a>
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
                  {(paymentTab === 'crypto' || x402OnlyMode) && canUseJit && !isFreeUpload && (
                    <>
                      {/* X402-only mode: Non-Ethereum wallet warning */}
                      {x402OnlyMode && walletType !== 'ethereum' && (
                        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-yellow-400 text-sm mb-1">Ethereum Wallet Required</div>
                              <div className="text-xs text-yellow-400/80">
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
                            onTokenSelect={setSelectedJitToken}
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
                          walletAddress={address}
                          walletType={walletType}
                          onBalanceValidation={setJitBalanceSufficient}
                          onShortageUpdate={setCryptoShortage}
                          localJitMax={localJitMax}
                          onMaxTokenAmountChange={setLocalJitMax}
                          x402Pricing={x402Pricing}
                        />
                      )}
                    </>
                  )}

                  {/* Credits-Only Payment (for wallets without JIT support or free uploads) */}
                  {(!canUseJit || isFreeUpload) && (
                    <div className="mb-4">
                      <div className="bg-surface rounded-lg border border-default p-4">
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-link">Cost:</span>
                            <span className="text-sm text-fg-muted font-medium">
                              {totalCost === 0 ? (
                                <span className="text-turbo-green font-medium">FREE</span>
                              ) : typeof totalCost === 'number' ? (
                                <>
                                  {totalCost.toFixed(6)} Credits
                                  {usdEquivalent !== null && usdEquivalent > 0 && (
                                    <span className="text-xs text-link ml-2">
                                      (≈ ${usdEquivalent < 0.01
                                        ? usdEquivalent.toFixed(4)
                                        : usdEquivalent.toFixed(2)})
                                    </span>
                                  )}
                                </>
                              ) : (
                                'Calculating...'
                              )}
                            </span>
                          </div>

                          {/* Only show balance info for non-free uploads */}
                          {!isFreeUpload && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-link">Current Balance:</span>
                                <span className="text-sm text-fg-muted font-medium">
                                  {creditBalance.toFixed(6)} Credits
                                </span>
                              </div>
                              {typeof totalCost === 'number' && (
                                <div className="flex justify-between items-center pt-2 border-t border-default/30">
                                  <span className="text-xs text-link">After Upload:</span>
                                  <span className="text-sm text-fg-muted font-medium">
                                    {Math.max(0, creditBalance - totalCost).toFixed(6)} Credits
                                  </span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Insufficient Credits Warning */}
                          {!isFreeUpload && !hasSufficientCredits && (
                            <div className="pt-3 mt-3 border-t border-default/30">
                              <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-red-400 font-medium mb-1">
                                    Need {creditsNeeded.toFixed(6)} more credits
                                  </div>
                                  <div className="text-xs text-red-400/80">
                                    • <a href="/topup" className="underline hover:text-red-300">Top up credits</a> to continue
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insufficient crypto balance warning - when using JIT */}
                  {localJitEnabled && creditsNeeded > 0 && !jitBalanceSufficient && cryptoShortage && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-red-400 font-medium mb-1">
                            Need {formatTokenAmount(cryptoShortage.amount, cryptoShortage.tokenType)} {tokenLabels[cryptoShortage.tokenType]} more
                          </div>
                          <div className="text-xs text-red-400/80">
                            Add funds to your wallet or{' '}
                            <a href="/topup" className="underline hover:text-red-300 transition-colors">
                              buy credits
                            </a>{' '}
                            instead.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terms */}
                  <div className="bg-surface/30 rounded-lg px-3 py-2 mb-4">
                    <p className="text-xs text-link text-center">
                      By uploading, you agree to our{' '}
                      <a
                        href="https://ardrive.io/tos-and-privacy/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-turbo-red hover:text-turbo-red/80 transition-colors underline"
                      >
                        Terms of Service
                      </a>
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="flex-1 py-3 px-4 rounded-lg border border-default text-link hover:text-fg-muted hover:border-default/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmUpload}
                      disabled={
                        (creditsNeeded > 0 && !localJitEnabled) ||
                        (localJitEnabled && creditsNeeded > 0 && !jitBalanceSufficient)
                      }
                      className="flex-1 py-3 px-4 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-link"
                    >
                      {localJitEnabled && creditsNeeded > 0 ? 'Pay & Upload' : 'Upload'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </BaseModal>
      )}

    </div>
  );
}