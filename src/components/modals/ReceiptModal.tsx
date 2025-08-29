import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Receipt, FileText, User, Clock, Coins, RefreshCw, Package, Activity, CheckCircle, Archive, XCircle, HelpCircle } from 'lucide-react';
import BaseModal from './BaseModal';
import CopyButton from '../CopyButton';
import { useUploadStatus, UploadStatus } from '../../hooks/useUploadStatus';

interface ReceiptModalProps {
  onClose: () => void;
  receipt: any;
  uploadId: string;
  initialStatus?: UploadStatus;
}

const ReceiptModal = ({ onClose, receipt, uploadId, initialStatus }: ReceiptModalProps) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'receipt' | 'status'>('summary');
  const { 
    checkUploadStatus, 
    statusChecking, 
    uploadStatuses,
    formatFileSize,
    formatWinc,
    getStatusColor,
    getStatusIcon,
    getStatusDescription 
  } = useUploadStatus();
  
  // Current status (either from initial prop or fetched)
  const currentStatus = uploadStatuses[uploadId] || initialStatus;
  const isLoadingStatus = statusChecking[uploadId];
  
  // Auto-fetch status when modal opens
  useEffect(() => {
    if (!currentStatus && uploadId) {
      checkUploadStatus(uploadId);
    }
  }, [uploadId, currentStatus, checkUploadStatus]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Helper to render status icon
  const renderStatusIcon = (iconType: string, colorClass: string) => {
    switch (iconType) {
      case 'check-circle':
        return <CheckCircle className={`w-4 h-4 ${colorClass}`} />;
      case 'clock':
        return <Clock className={`w-4 h-4 ${colorClass}`} />;
      case 'archive':
        return <Archive className={`w-4 h-4 ${colorClass}`} />;
      case 'x-circle':
        return <XCircle className={`w-4 h-4 ${colorClass}`} />;
      case 'help-circle':
        return <HelpCircle className={`w-4 h-4 ${colorClass}`} />;
      default:
        return <Clock className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  // formatFileSize and formatWinc are imported from useUploadStatus hook

  return (
    <BaseModal onClose={onClose} showCloseButton={false}>
      <div className="w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col text-fg-muted mx-4 sm:mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-default/30">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-turbo-red" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold">Upload Receipt</h3>
              <p className="text-xs sm:text-sm text-link">Transaction details and metadata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Mobile responsive with consistent styling */}
        <div className="flex border-b border-default/30 overflow-x-auto">
          {[
            { id: 'summary', icon: FileText, label: 'Summary' },
            { id: 'receipt', icon: Receipt, label: 'Receipt' },
            { id: 'status', icon: Activity, label: 'Status' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'text-turbo-red border-b-2 border-turbo-red bg-turbo-red/5'
                  : 'text-link hover:text-fg-muted hover:bg-surface/50'
              }`}
            >
              <Icon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'summary' ? (
            /* Summary Tab - Quick overview and key actions */
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Success Card - Option A: Simple & Clean */}
              <div className="bg-gradient-to-r from-turbo-green/10 to-turbo-green/5 rounded-lg p-4 border border-turbo-green/20">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-turbo-green" />
                  <span className="font-medium text-fg-muted">Upload Successful!</span>
                </div>
                
                {/* Data Item ID */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-link mb-2">📄 Data Item ID:</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm text-link break-all flex-1">{uploadId}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <CopyButton textToCopy={uploadId} />
                        <a
                          href={`https://arweave.net/${uploadId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-turbo-green/10 text-turbo-green rounded hover:bg-turbo-green/20 transition-colors"
                          title="View on Arweave"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">View</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Bundle ID */}
                  {currentStatus?.bundleId && (
                    <div>
                      <div className="text-xs text-link mb-2">📦 Bundle ID:</div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-mono text-xs text-link break-all flex-1">{currentStatus.bundleId}</span>
                        <CopyButton textToCopy={currentStatus.bundleId} />
                      </div>
                    </div>
                  )}

                  {/* Status - Just visual cue */}
                  {currentStatus && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-link">Status:</div>
                      <div className="flex items-center">
                        {renderStatusIcon(getStatusIcon(currentStatus.status, currentStatus.info), getStatusColor(currentStatus.status, currentStatus.info))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-fg-muted">Upload Information</h4>
                
                {(currentStatus?.winc || receipt?.winc) && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-link">Upload Cost:</span>
                    <span className="text-sm font-bold text-fg-muted">
                      {formatWinc(currentStatus?.winc || receipt?.winc)}
                    </span>
                  </div>
                )}

                {currentStatus?.rawContentLength && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-link">File Size:</span>
                    <span className="text-sm font-bold text-fg-muted">
                      {formatFileSize(currentStatus.rawContentLength)}
                    </span>
                  </div>
                )}
                
                {receipt?.timestamp && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-link">Upload Time:</span>
                    <span className="text-sm text-fg-muted">{formatTimestamp(receipt.timestamp)}</span>
                  </div>
                )}
                
                {currentStatus?.payloadContentType && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-link">File Type:</span>
                    <span className="text-sm text-fg-muted font-mono">{currentStatus.payloadContentType}</span>
                  </div>
                )}

                {receipt?.data?.owner && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-link">Owner:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-link">
                        {receipt.data.owner.substring(0, 8)}...{receipt.data.owner.substring(receipt.data.owner.length - 6)}
                      </span>
                      <CopyButton textToCopy={receipt.data.owner} />
                    </div>
                  </div>
                )}
              </div>

              {/* What's Next */}
              <div className="bg-canvas rounded-lg p-4 border border-default">
                <h4 className="text-sm font-medium text-fg-muted mb-3">What's Next?</h4>
                <div className="space-y-2 text-sm text-link">
                  <div>• Your file is now permanently stored on Arweave</div>
                  <div>• Access it anytime using the transaction ID above</div>
                  <div>• Share the link with others for instant access</div>
                  <div>• Check the Status tab to monitor processing</div>
                </div>
              </div>
            </div>
          ) : activeTab === 'receipt' ? (
            /* Receipt Details Tab - Raw JSON data only */
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold">Complete Receipt JSON</h3>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-link">From Turbo SDK</div>
                  <CopyButton textToCopy={JSON.stringify(receipt, null, 2)} />
                </div>
              </div>

              <div className="bg-canvas rounded-lg p-3 sm:p-4 border border-default">
                <div className="font-mono text-xs text-link overflow-auto max-h-64 sm:max-h-96">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(receipt, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            /* Status Details Tab - Processing status and raw JSON only */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold">Processing Status</h3>
                <button
                  onClick={() => checkUploadStatus(uploadId)}
                  disabled={isLoadingStatus}
                  className="flex items-center gap-2 px-3 py-1 text-xs bg-turbo-red/20 text-turbo-red rounded hover:bg-turbo-red/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  Refresh Status
                </button>
              </div>

              {currentStatus ? (
                <div className="space-y-4">
                  {/* Current Status Summary */}
                  <div className="bg-surface rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {renderStatusIcon(getStatusIcon(currentStatus.status, currentStatus.info), getStatusColor(currentStatus.status, currentStatus.info))}
                      </div>
                      <div>
                        <div className={`text-lg font-medium ${getStatusColor(currentStatus.status, currentStatus.info)}`}>
                          {currentStatus.status}
                          {currentStatus.info && (
                            <span className="ml-2 text-sm text-link">• {currentStatus.info}</span>
                          )}
                        </div>
                        <div className="text-sm text-link">
                          {getStatusDescription(currentStatus.status, currentStatus.info)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complete Status Response */}
                  <div className="bg-canvas rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                      <h4 className="text-sm font-medium">Complete Status Response</h4>
                      <CopyButton textToCopy={JSON.stringify(currentStatus, null, 2)} />
                    </div>
                    <div className="font-mono text-xs text-link overflow-auto max-h-48 sm:max-h-64">
                      <pre className="whitespace-pre-wrap break-words">{JSON.stringify(currentStatus, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface rounded-lg p-8 text-center">
                  <div className="text-link mb-4">
                    {isLoadingStatus ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading status...
                      </div>
                    ) : (
                      "Status information not available"
                    )}
                  </div>
                  {!isLoadingStatus && (
                    <button
                      onClick={() => checkUploadStatus(uploadId)}
                      className="px-4 py-2 bg-turbo-red/20 text-turbo-red rounded hover:bg-turbo-red/30 transition-colors"
                    >
                      Check Status
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-default/30 bg-surface/50">
          <div className="text-xs text-link">
            This receipt contains all the details about your upload transaction including data cache locations, 
            fast finality indexes, and transaction metadata.
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default ReceiptModal;