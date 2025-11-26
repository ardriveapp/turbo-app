import { useState, useEffect } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useTurboCapture } from '../../hooks/useTurboCapture';
import { useFreeUploadLimit, isFileFree } from '../../hooks/useFreeUploadLimit';
import { wincPerCredit, APP_NAME, APP_VERSION } from '../../constants';
import { useStore } from '../../store/useStore';
import { Camera, CheckCircle, XCircle, Shield, ExternalLink, RefreshCw, Receipt, ChevronDown, ChevronUp, Archive, Clock, HelpCircle, MoreVertical, ArrowRight, Copy, Globe, AlertTriangle, Link, CreditCard, Wallet } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import CopyButton from '../CopyButton';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import { useOwnedArNSNames } from '../../hooks/useOwnedArNSNames';
import ReceiptModal from '../modals/ReceiptModal';
import AssignDomainModal from '../modals/AssignDomainModal';
import ArNSAssociationPanel from '../ArNSAssociationPanel';
import BaseModal from '../modals/BaseModal';
import { getArweaveUrl } from '../../utils';
import UploadProgressSummary from '../UploadProgressSummary';
import { CryptoPaymentDetails } from '../CryptoPaymentDetails';
import { JitTokenSelector } from '../JitTokenSelector';
import { supportsJitPayment, getTokenConverter, formatTokenAmount } from '../../utils/jitPayment';
import { SupportedTokenType, tokenLabels } from '../../constants';
import { useX402Pricing } from '../../hooks/useX402Pricing';
import X402OnlyBanner from '../X402OnlyBanner';

export default function CapturePanel() {
  const {
    address,
    walletType,
    creditBalance,
    uploadHistory,
    addUploadResults,
    updateUploadWithArNS,
    clearUploadHistory,
    x402OnlyMode,
    isPaymentServiceAvailable,
  } = useStore();

  // Fetch and track the bundler's free upload limit
  const freeUploadLimitBytes = useFreeUploadLimit();

  // Capture state
  const [urlInput, setUrlInput] = useState('');
  const [captureMessage, setCaptureMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const { capture, isCapturing, error: captureError, result: captureResult, captureFile } = useTurboCapture();

  // ArNS assignment state
  const [arnsEnabled, setArnsEnabled] = useState(false);
  const [selectedArnsName, setSelectedArnsName] = useState<string>('');
  const [selectedUndername, setSelectedUndername] = useState<string>('');
  const [showUndername, setShowUndername] = useState(false);
  const [customTTL, setCustomTTL] = useState<number | undefined>(undefined);
  const { updateArNSRecord } = useOwnedArNSNames();

  // Upload state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showAssignDomainModal, setShowAssignDomainModal] = useState<string | null>(null);
  const [showUploadResults, setShowUploadResults] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [uploadsToShow, setUploadsToShow] = useState(20);
  const [isUpdatingArNS, setIsUpdatingArNS] = useState(false);

  // Payment method state (Credits vs Crypto tabs)
  const [paymentTab, setPaymentTab] = useState<'credits' | 'crypto'>('credits');

  // Track crypto shortage details for combined warning
  const [cryptoShortage, setCryptoShortage] = useState<{
    amount: number;
    tokenType: SupportedTokenType;
  } | null>(null);

  // JIT payment local state
  const [localJitMax, setLocalJitMax] = useState(0);
  const [localJitEnabled, setLocalJitEnabled] = useState(false);

  // Track if JIT section is expanded (for users with sufficient credits)
  const [jitSectionExpanded, setJitSectionExpanded] = useState(false);

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
      setLocalJitEnabled(x402OnlyMode); // Auto-enable JIT in x402-only mode
    }
  }, [showConfirmModal, x402OnlyMode]);

  // Auto-select base-usdc (x402) ONLY when user explicitly opens "Pay with Crypto" section
  // Reset to base-eth when they close it (unless x402-only mode is active)
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

  const wincForOneGiB = useWincForOneGiB();
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

  // Calculate billable file size for x402 pricing (exclude free files)
  const billableFileSize = captureFile && !isFileFree(captureFile.size, freeUploadLimitBytes)
    ? captureFile.size
    : 0;

  // Determine if we should use x402 for pricing
  // In x402-only mode, always use x402 pricing since there's no credits option
  const shouldUseX402 =
    walletType === 'ethereum' &&
    selectedJitToken === 'base-usdc' &&
    showConfirmModal &&  // Modal must be open
    (jitSectionExpanded || x402OnlyMode);  // "Pay with Crypto" section expanded OR x402-only mode
  const x402Pricing = useX402Pricing(shouldUseX402 ? billableFileSize : 0);

  // Initialize status from cache when page loads
  useEffect(() => {
    if (uploadHistory.length > 0) {
      const uploadIds = uploadHistory.slice(0, uploadsToShow).map(upload => upload.id);
      initializeFromCache(uploadIds);
    }
  }, [uploadHistory, uploadsToShow, initializeFromCache]);

  // Show capture error as message
  useEffect(() => {
    if (captureError) {
      setCaptureMessage({ type: 'error', text: captureError });
    }
  }, [captureError]);

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
      'App Name',
      'Original URL',
      'Data Caches',
      'Fast Finality Indexes',
      'Arweave URL'
    ];

    const rows = uploadHistory.map(result => {
      const fileName = result.fileName ||
                       result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value ||
                       'Unknown';

      const contentType = result.contentType ||
                          result.receipt?.tags?.find((tag: any) => tag.name === 'Content-Type')?.value ||
                          'application/octet-stream';

      const appName = result.receipt?.tags?.find((tag: any) => tag.name === 'App-Name')?.value || 'Turbo-Gateway';
      const capturedUrl = result.receipt?.tags?.find((tag: any) => tag.name === 'Original-URL')?.value || '';

      const fileSizeBytes = result.fileSize || 'Unknown';
      const fileSizeHuman = typeof fileSizeBytes === 'number' ? formatFileSize(fileSizeBytes) : 'Unknown';

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
        appName,
        capturedUrl,
        result.dataCaches.join('; '),
        result.fastFinalityIndexes.join('; '),
        getArweaveUrl(result.id, result.dataCaches)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `turbo-captures-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateUploadCost = (bytes: number) => {
    if (isFileFree(bytes, freeUploadLimitBytes)) return 0; // Free tier
    if (!wincForOneGiB) return null;

    const gibSize = bytes / (1024 * 1024 * 1024);
    const wincCost = gibSize * Number(wincForOneGiB);
    const creditCost = wincCost / wincPerCredit;
    return creditCost;
  };

  const handleCapture = async () => {
    if (!address) {
      setCaptureMessage({ type: 'error', text: 'Please connect your wallet to capture screenshots' });
      return;
    }

    if (!urlInput.trim()) {
      setCaptureMessage({ type: 'error', text: 'Please enter a URL to capture' });
      return;
    }

    // Clear any previous messages (button text shows "Capturing...")
    setCaptureMessage(null);

    try {
      await capture(urlInput);
      setShowConfirmModal(true);
      setCaptureMessage(null);
    } catch {
      // Error already set by hook
    }
  };

  const handleConfirmUpload = async () => {
    if (!captureFile || !captureResult) {
      setCaptureMessage({ type: 'error', text: 'No screenshot to upload' });
      return;
    }

    setShowConfirmModal(false);
    setJitSectionExpanded(false); // Reset for next capture
    setCaptureMessage(null);

    // Only enable JIT if the user has insufficient credits to cover the cost
    // Calculate credits needed (0 if user has sufficient credits)
    const totalCost = calculateUploadCost(captureFile.size);
    const creditsNeeded = Math.max(0, (totalCost || 0) - creditBalance);

    // Prevent upload in x402-only mode for non-Ethereum wallets on billable captures
    if (x402OnlyMode && creditsNeeded > 0 && walletType !== 'ethereum') {
      setCaptureMessage({
        type: 'error',
        text: 'X402 payments require an Ethereum wallet. Please connect an Ethereum wallet or disable x402-only mode in Developer Resources.'
      });
      return;
    }

    const shouldEnableJit = localJitEnabled && creditsNeeded > 0;

    let jitMaxTokenAmountSmallest = 0;
    if (shouldEnableJit && selectedJitToken && supportsJitPayment(selectedJitToken)) {
      const converter = getTokenConverter(selectedJitToken);
      jitMaxTokenAmountSmallest = converter ? converter(localJitMax) : 0;
    }

    try {
      // Build capture-specific tags to be set during upload
      const customTags = [
        { name: 'App-Name', value: APP_NAME },
        { name: 'App-Feature', value: 'Capture' },
        { name: 'App-Version', value: APP_VERSION },
        { name: 'Original-URL', value: captureResult.finalUrl },
        { name: 'Title', value: captureResult.title },
        { name: 'Viewport-Width', value: captureResult.viewport.width.toString() },
        { name: 'Viewport-Height', value: captureResult.viewport.height.toString() },
        { name: 'Captured-At', value: captureResult.capturedAt },
      ];

      // Upload with special Turbo Capture tags
      const { results, failedFiles } = await uploadMultipleFiles([captureFile], {
        jitEnabled: shouldEnableJit,
        jitMaxTokenAmount: jitMaxTokenAmountSmallest,
        selectedJitToken: selectedJitToken, // Pass selected token for x402
        customTags,
      });

      if (results.length > 0) {
        // Results already have correct tags from upload
        addUploadResults(results);

        // Handle ArNS assignment if enabled - actually update the ArNS record on-chain
        if (arnsEnabled && selectedArnsName && results[0]) {
          setIsUpdatingArNS(true);
          try {
            const arnsResult = await updateArNSRecord(
              selectedArnsName,
              results[0].id,
              selectedUndername || undefined,
              customTTL
            );

            if (arnsResult.success) {
              // Store the ArNS association locally after successful on-chain update
              updateUploadWithArNS(
                results[0].id,
                selectedArnsName,
                selectedUndername || undefined,
                arnsResult.transactionId
              );

              if (failedFiles.length === 0) {
                setCaptureMessage({
                  type: 'success',
                  text: `Screenshot captured and uploaded! Assigned to ${selectedUndername ? selectedUndername + '_' : ''}${selectedArnsName}.ar.io`
                });
              }
            } else {
              // ArNS update failed, but upload succeeded
              setCaptureMessage({
                type: 'error',
                text: `Upload successful but ArNS update failed: ${arnsResult.error}`
              });
            }
          } catch (arnsError) {
            console.error('ArNS update failed:', arnsError);
            setCaptureMessage({
              type: 'error',
              text: 'Upload successful but ArNS update failed. You can assign a domain later from the history.'
            });
          } finally {
            setIsUpdatingArNS(false);
          }
        } else if (failedFiles.length === 0) {
          // No ArNS assignment or no results
          setCaptureMessage({
            type: 'success',
            text: 'Screenshot captured and uploaded successfully!'
          });
        }

        // Reset form after successful upload
        if (failedFiles.length === 0) {
          setUrlInput('');
          setArnsEnabled(false);
          setSelectedArnsName('');
          setSelectedUndername('');
        }
      }

      if (failedFiles.length > 0) {
        setCaptureMessage({
          type: 'error',
          text: 'Failed to upload screenshot. Please try again.'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setCaptureMessage({ type: 'error', text: errorMessage });
    }
  };

  const totalCost = captureFile ? calculateUploadCost(captureFile.size) : null;

  // USD equivalent for credit pricing
  const [usdEquivalent, setUsdEquivalent] = useState<number | null>(null);

  // Fetch USD equivalent for credit pricing (only for billable bytes)
  useEffect(() => {
    const fetchUsdPrice = async () => {
      if (!billableFileSize || billableFileSize <= 0 || !showConfirmModal) {
        setUsdEquivalent(null);
        return;
      }

      try {
        const { getCurrentConfig } = useStore.getState();
        const turboConfig = getCurrentConfig();

        const { TurboFactory } = await import('@ardrive/turbo-sdk/web');
        const turbo = TurboFactory.unauthenticated({
          paymentServiceConfig: { url: turboConfig.paymentServiceUrl },
        });

        const fiatRates = await turbo.getFiatRates();
        const usdPerGiB = fiatRates.fiat?.usd;

        if (usdPerGiB) {
          // Calculate USD for billable file size only (excluding free files)
          const gib = billableFileSize / (1024 * 1024 * 1024);
          const usdPrice = gib * usdPerGiB;
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

  // Check if URL is valid
  const isValidUrl = (url: string) => {
    if (!url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const hasValidUrl = isValidUrl(urlInput);

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Camera className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Capture Page</h3>
          <p className="text-sm text-link">Capture and permanently archive any webpage to Arweave</p>
        </div>
      </div>

      {/* Connection Warning */}
      {!address && (
        <div className="mb-4 sm:mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-yellow-500">Connect your wallet to capture pages</span>
          </div>
        </div>
      )}

      {/* Capture Message */}
      {captureMessage && (
        <div className={`mb-4 sm:mb-6 p-4 rounded-lg border ${
          captureMessage.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-500'
            : captureMessage.type === 'success'
            ? 'bg-turbo-green/10 border-turbo-green/20 text-turbo-green'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {captureMessage.type === 'error' && <XCircle className="w-5 h-5" />}
              {captureMessage.type === 'success' && <CheckCircle className="w-5 h-5" />}
              <span className="text-sm">{captureMessage.text}</span>
            </div>
            <button
              onClick={() => setCaptureMessage(null)}
              className="text-sm hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container - Hide during upload */}
      {!uploading && (
        <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-turbo-red/20 p-4 sm:p-6 mb-4 sm:mb-6">
          {/* URL Input */}
          <div className="mb-4">
            <label htmlFor="url-input" className="block text-sm font-medium text-fg-muted mb-2">
              Website URL
            </label>
            <input
              id="url-input"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-surface border border-default rounded-lg text-fg-muted placeholder-link/50 focus:outline-none focus:border-turbo-red/50 transition-colors"
              disabled={isCapturing}
            />
            <p className="mt-2 text-xs text-link">
              Enter any public website URL
            </p>
          </div>
        </div>
      )}

      {/* ArNS Association Panel - Show for Arweave/Ethereum wallets when not uploading and URL is valid */}
      {!uploading && hasValidUrl && (walletType === 'arweave' || walletType === 'ethereum') && (
        <ArNSAssociationPanel
          enabled={arnsEnabled}
          onEnabledChange={setArnsEnabled}
          selectedName={selectedArnsName}
          onNameChange={setSelectedArnsName}
          selectedUndername={selectedUndername}
          onUndernameChange={setSelectedUndername}
          showUndername={showUndername}
          onShowUndernameChange={setShowUndername}
          customTTL={customTTL}
          onCustomTTLChange={setCustomTTL}
        />
      )}

      {/* Capture Button - After ArNS config, only show when URL is valid */}
      {!uploading && hasValidUrl && (
        <button
          onClick={handleCapture}
          disabled={isCapturing || !address || (arnsEnabled && !selectedArnsName) || (arnsEnabled && showUndername && !selectedUndername)}
          className="w-full py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          {isCapturing ? 'Capturing...' : 'Capture & Upload'}
        </button>
      )}

      {/* Upload Progress Summary */}
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

      {/* ArNS Update Progress */}
      {isUpdatingArNS && (
        <div className="mt-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl border border-yellow-500/20 p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />
            <div>
              <div className="text-sm font-medium text-fg-muted">Updating ArNS Record</div>
              <div className="text-xs text-link">
                Assigning {selectedUndername ? selectedUndername + '_' : ''}{selectedArnsName}.ar.io to your capture...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results - Filter to show only Turbo-Capture items or all */}
      {uploadHistory.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-turbo-red/20">
          {/* Collapsible Header with Actions */}
          <div className={`flex items-center justify-between p-4 ${showUploadResults ? 'pb-0 mb-4' : 'pb-4'}`}>
            <button
              onClick={() => setShowUploadResults(!showUploadResults)}
              className="flex items-center gap-2 hover:text-turbo-green transition-colors text-left"
              type="button"
            >
              <Camera className="w-5 h-5 text-turbo-red" />
              <span className="font-bold text-fg-muted">Recent</span>
              <span className="text-xs text-link">({uploadHistory.length})</span>
              {showUploadResults ? (
                <ChevronUp className="w-4 h-4 text-link" />
              ) : (
                <ChevronDown className="w-4 h-4 text-link" />
              )}
            </button>

            {showUploadResults && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-surface border border-default rounded text-fg-muted hover:bg-canvas hover:text-fg-muted transition-colors"
                  title="Export history to CSV"
                >
                  <Archive className="w-3 h-3" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => checkMultipleStatuses(uploadHistory.map(r => r.id), true)}
                  disabled={Object.values(statusChecking).some(checking => checking)}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-surface border border-default rounded text-fg-muted hover:bg-canvas hover:text-fg-muted transition-colors disabled:opacity-50"
                  title="Check status for all items"
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
                  title="Clear all history"
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
                  const isCapture = result.receipt?.tags?.find((tag: any) => tag.name === 'App-Feature')?.value === 'Capture';

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
                        {/* Row 1: ArNS Name/Transaction ID + Badge + Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isCapture && (
                              <div title="Webpage Capture">
                                <Camera className="w-4 h-4 text-fg-muted flex-shrink-0" />
                              </div>
                            )}
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
                                        setTimeout(() => {
                                          close();
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

                        {/* Row 2: File Name */}
                        {(result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value) && (
                          <div className="text-sm text-fg-muted truncate" title={result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value}>
                            {!isCapture && '📄 '}{result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value}
                          </div>
                        )}

                        {/* Row 3: Original URL (for captures only) */}
                        {isCapture && result.receipt?.tags?.find((tag: any) => tag.name === 'Original-URL')?.value && (
                          <div className="text-xs text-link truncate flex items-center gap-1">
                            <Link className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{result.receipt?.tags?.find((tag: any) => tag.name === 'Original-URL')?.value}</span>
                          </div>
                        )}

                        {/* Row 4: Content Type + File Size */}
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

                        {/* Row 5: Cost + Upload Timestamp */}
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

          {/* View More Button */}
          {showUploadResults && uploadHistory.length > uploadsToShow && (
            <div className="border-t border-default mt-4">
              <div className="p-4">
                <button
                  onClick={() => setUploadsToShow(prev => prev + 20)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-fg-muted hover:text-fg-muted/80 transition-colors font-medium"
                >
                  View More <ArrowRight className="w-4 h-4" />
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
            updateUploadWithArNS(showAssignDomainModal, arnsName, undername, transactionId);
            setShowAssignDomainModal(null);
            setCaptureMessage({
              type: 'success',
              text: `Successfully assigned ${undername ? undername + '_' : ''}${arnsName}.ar.io!`
            });
          }}
        />
      )}

      {/* Upload Confirmation Modal */}
      {showConfirmModal && captureFile && captureResult && (
        <BaseModal onClose={() => {
          setShowConfirmModal(false);
          setJitSectionExpanded(false); // Reset JIT section when modal closes
        }}>
          <div className="p-4 sm:p-5 w-full max-w-2xl mx-auto min-w-[90vw] sm:min-w-[500px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5 text-turbo-red" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-fg-muted">Ready to Upload</h3>
                <p className="text-xs text-link">Confirm screenshot upload details</p>
              </div>
            </div>

            {/* X402-Only Mode Banner */}
            {x402OnlyMode && <X402OnlyBanner />}

            {/* Upload Summary - Capture-specific info only */}
            <div className="mb-4">
              <div className="bg-surface rounded-lg p-3">
                <div className="space-y-2">
                  {/* ArNS Domain - Show when enabled and selected */}
                  {arnsEnabled && selectedArnsName && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-link">Domain:</span>
                      <span className="text-xs text-fg-muted">
                        {selectedUndername ? selectedUndername + '_' : ''}{selectedArnsName}.ar.io
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-link">Screenshot:</span>
                    <span className="text-xs text-fg-muted">{captureFile.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-link">Page Title:</span>
                    <span className="text-xs text-fg-muted truncate max-w-[200px]" title={captureResult.title}>
                      {captureResult.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-link">File Size:</span>
                    <span className="text-xs text-fg-muted">
                      {formatFileSize(captureFile.size)}
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

              // Check if capture is completely free
              const isFreeCapture = typeof totalCost === 'number' && totalCost === 0;

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
                  {/* Payment Method Tabs - Only show for wallets that support JIT, non-free captures, and payment service available */}
                  {canUseJit && !isFreeCapture && isPaymentServiceAvailable() && (
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
                  {paymentTab === 'credits' && canUseJit && !isFreeCapture && isPaymentServiceAvailable() && (
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

                          {/* Only show balance info for non-free captures */}
                          {!isFreeCapture && (
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
                          {!isFreeCapture && !hasSufficientCredits && (
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
                  {(paymentTab === 'crypto' || x402OnlyMode) && canUseJit && !isFreeCapture && (
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

                  {/* Credits-Only Payment (for wallets without JIT support or free captures) */}
                  {(!canUseJit || isFreeCapture) && (
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

                          {/* Only show balance info for non-free captures */}
                          {!isFreeCapture && (
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
                          {!isFreeCapture && !hasSufficientCredits && (
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
                        (localJitEnabled && creditsNeeded > 0 && !jitBalanceSufficient) ||
                        // Disable if in x402-only mode with non-Ethereum wallet for billable captures
                        (x402OnlyMode && creditsNeeded > 0 && walletType !== 'ethereum')
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
