import { useState, useEffect } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useTurboCapture } from '../../hooks/useTurboCapture';
import { useFreeUploadLimit, isFileFree } from '../../hooks/useFreeUploadLimit';
import { wincPerCredit, APP_NAME, APP_VERSION } from '../../constants';
import { useStore } from '../../store/useStore';
import { Camera, CheckCircle, XCircle, Shield, ExternalLink, RefreshCw, Receipt, ChevronDown, ChevronUp, Archive, Clock, HelpCircle, MoreVertical, ArrowRight, Copy, Globe, AlertTriangle, Link } from 'lucide-react';
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
import { JitPaymentCard } from '../JitPaymentCard';
import { JitTokenSelector } from '../JitTokenSelector';
import { supportsJitPayment, getTokenConverter } from '../../utils/jitPayment';
import { SupportedTokenType } from '../../constants';

export default function CapturePanel() {
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

  // JIT payment local state
  const [localJitEnabled, setLocalJitEnabled] = useState(jitPaymentEnabled);
  const [localJitMax, setLocalJitMax] = useState(0);
  const FIXED_BUFFER_MULTIPLIER = 1.1;

  // Selected JIT token (default based on wallet type)
  const [selectedJitToken, setSelectedJitToken] = useState<SupportedTokenType>(() => {
    if (walletType === 'ethereum') return 'base-usdc'; // BASE-USDC with x402 default
    if (walletType === 'arweave') return 'ario';
    if (walletType === 'solana') return 'solana';
    return 'base-eth'; // Fallback
  });

  // Update selectedJitToken when wallet type changes
  useEffect(() => {
    if (walletType === 'ethereum') setSelectedJitToken('base-usdc');
    else if (walletType === 'arweave') setSelectedJitToken('ario');
    else if (walletType === 'solana') setSelectedJitToken('solana');
  }, [walletType]);

  // Track if JIT section is expanded (for users with sufficient credits)
  const [jitSectionExpanded, setJitSectionExpanded] = useState(false);

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
        getArweaveUrl(result.id)
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
    setCaptureMessage(null);

    // Save JIT preferences
    setJitPaymentEnabled(localJitEnabled);

    // Save max token amount to store for future use (using selected token)
    if (selectedJitToken) {
      setJitMaxTokenAmount(selectedJitToken, localJitMax);
    }

    const totalCost = calculateUploadCost(captureFile.size);
    const shouldEnableJit = localJitEnabled && totalCost !== null && totalCost > 0;

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
        jitBufferMultiplier: FIXED_BUFFER_MULTIPLIER,
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
                              href={getArweaveUrl(result.id)}
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
                                      href={getArweaveUrl(result.id)}
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
        <BaseModal onClose={() => setShowConfirmModal(false)}>
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
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-link">Cost:</span>
                    <span className="text-xs text-fg-muted">
                      {totalCost === 0 ? (
                        <span className="text-turbo-green font-medium">FREE</span>
                      ) : typeof totalCost === 'number' ? (
                        `${totalCost.toFixed(6)} Credits`
                      ) : (
                        'Calculating...'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-default/30">
                    <span className="text-xs text-link">Current Balance:</span>
                    <span className="text-xs text-fg-muted">
                      {creditBalance.toFixed(6)} Credits
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* JIT Payment Card */}
            {(() => {
              const creditsNeeded = typeof totalCost === 'number' ? Math.max(0, totalCost - creditBalance) : 0;
              const hasSufficientCredits = creditsNeeded === 0;
              const canUseJit = selectedJitToken && supportsJitPayment(selectedJitToken);
              const showJitOption = creditsNeeded > 0 && canUseJit;

              // Auto-expand if insufficient credits, otherwise respect user's toggle
              const isExpanded = hasSufficientCredits ? jitSectionExpanded : true;

              return (
                <>
                  {/* JIT Payment Section - Collapsible for users with sufficient credits */}
                  {hasSufficientCredits && canUseJit && (
                    <button
                      onClick={() => setJitSectionExpanded(!jitSectionExpanded)}
                      className="w-full mb-3 p-2.5 bg-surface/30 rounded-lg border border-default/30 text-xs text-link hover:text-fg-muted transition-colors flex items-center justify-between"
                    >
                      <span>Pay with crypto instead?</span>
                      {jitSectionExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {/* Show JIT options when expanded or when insufficient credits */}
                  {isExpanded && canUseJit && (
                    <div className="mb-4">
                      {/* JIT Token Selector - shown for Ethereum wallets */}
                      {walletType === 'ethereum' && (
                        <div className="mb-3">
                          <JitTokenSelector
                            walletType={walletType}
                            selectedToken={selectedJitToken}
                            onTokenSelect={setSelectedJitToken}
                          />
                        </div>
                      )}

                      {/* JIT Payment Card */}
                      <JitPaymentCard
                        creditsNeeded={creditsNeeded}
                        totalCost={typeof totalCost === 'number' ? totalCost : 0}
                        currentBalance={creditBalance}
                        tokenType={selectedJitToken}
                        maxTokenAmount={localJitMax}
                        onMaxTokenAmountChange={setLocalJitMax}
                        walletAddress={address}
                        walletType={walletType}
                        onBalanceValidation={setJitBalanceSufficient}
                      />

                      {/* Enable JIT toggle */}
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localJitEnabled}
                          onChange={(e) => setLocalJitEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-default bg-canvas text-turbo-red focus:ring-turbo-red focus:ring-offset-0"
                        />
                        <span className="text-xs text-link">
                          Enable automatic crypto top-up for this capture
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Insufficient credits warning - when NOT using JIT */}
                  {creditsNeeded > 0 && !localJitEnabled && (
                    <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Insufficient credits. You need {creditsNeeded.toFixed(6)} more credits.
                          {!canUseJit && (
                            <>
                              {' '}
                              <a href="/topup" className="underline hover:text-red-300 transition-colors">
                                Buy credits
                              </a>{' '}
                              to continue.
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Insufficient crypto balance warning - when using JIT */}
                  {localJitEnabled && creditsNeeded > 0 && !jitBalanceSufficient && (
                    <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Insufficient crypto balance in your wallet.
                          Please add funds to your wallet or{' '}
                          <a href="/topup" className="underline hover:text-red-300 transition-colors">
                            buy credits
                          </a>{' '}
                          instead.
                        </span>
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

                  <div className="flex flex-col sm:flex-row gap-3">
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
                      {localJitEnabled && creditsNeeded > 0 ? 'Upload & Auto-Pay' : 'Upload Now'}
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
