import { useState, useEffect } from 'react';
import { X, ExternalLink, Receipt, FileText, Clock, RefreshCw, CheckCircle, Archive, XCircle, HelpCircle, Code, Download } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');
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
        return <CheckCircle className={`w-5 h-5 ${colorClass}`} />;
      case 'clock':
        return <Clock className={`w-5 h-5 ${colorClass}`} />;
      case 'archive':
        return <Archive className={`w-5 h-5 ${colorClass}`} />;
      case 'x-circle':
        return <XCircle className={`w-5 h-5 ${colorClass}`} />;
      case 'help-circle':
        return <HelpCircle className={`w-5 h-5 ${colorClass}`} />;
      default:
        return <Clock className={`w-5 h-5 ${colorClass}`} />;
    }
  };

  // Helper to download receipt as JSON
  const downloadReceipt = () => {
    const data = {
      uploadId,
      receipt,
      status: currentStatus,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turbo-receipt-${uploadId.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <BaseModal onClose={onClose} showCloseButton={false}>
      <div className="w-[90vw] sm:w-[672px] h-[85vh] sm:h-[75vh] flex flex-col text-fg-muted max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-default/30">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-turbo-red" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold">Upload Receipt</h3>
              <p className="text-xs sm:text-sm text-link">Transaction status and details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simplified Tabs */}
        <div className="flex border-b border-default/30">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'summary'
                ? 'text-turbo-red border-turbo-red bg-turbo-red/5'
                : 'text-link hover:text-fg-muted hover:bg-surface/50 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Summary
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'text-turbo-red border-turbo-red bg-turbo-red/5'
                : 'text-link hover:text-fg-muted hover:bg-surface/50 border-transparent'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            Details
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'summary' ? (
            /* Enhanced Summary Tab - User-friendly overview */
            <div className="p-4 sm:p-6 space-y-6">
              {/* Status Section - Clean status display */}
              {currentStatus && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      {renderStatusIcon(getStatusIcon(currentStatus.status, currentStatus.info), getStatusColor(currentStatus.status, currentStatus.info))}
                    </div>
                    <div>
                      <div className={`text-lg font-semibold ${getStatusColor(currentStatus.status, currentStatus.info)}`}>
                        {currentStatus.status === 'FINALIZED' ? 'Permanently Stored' :
                         currentStatus.status === 'CONFIRMED' ? 'Processing' :
                         currentStatus.status === 'FAILED' ? 'Upload Failed' :
                         'Checking Status'}
                      </div>
                      <p className="text-sm text-link">
                        {getStatusDescription(currentStatus.status, currentStatus.info)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => checkUploadStatus(uploadId, true)}
                    disabled={isLoadingStatus}
                    className="p-2 hover:bg-surface rounded transition-colors disabled:opacity-50"
                    title="Refresh status"
                  >
                    <RefreshCw className={`w-4 h-4 text-link ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}

              {/* File Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-fg-muted flex items-center gap-2">
                  <FileText className="w-4 h-4 text-turbo-red" />
                  File Information
                </h4>
                
                <div className="bg-surface rounded-lg p-4 space-y-3">
                  {/* File Size & Type */}
                  <div className="grid grid-cols-2 gap-4">
                    {currentStatus?.rawContentLength && (
                      <div>
                        <div className="text-xs text-link mb-1">Size</div>
                        <div className="text-sm text-fg-muted">
                          {formatFileSize(currentStatus.rawContentLength)}
                        </div>
                      </div>
                    )}
                    
                    {currentStatus?.payloadContentType && (
                      <div>
                        <div className="text-xs text-link mb-1">Type</div>
                        <div className="text-sm text-fg-muted">
                          {currentStatus.payloadContentType.split('/').pop()?.toUpperCase() || 'File'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upload Cost */}
                  {(currentStatus?.winc || receipt?.winc) && (
                    <div>
                      <div className="text-xs text-link mb-1">Upload Cost</div>
                      <div className="text-sm font-medium text-fg-muted">
                        {formatWinc(currentStatus?.winc || receipt?.winc)}
                      </div>
                    </div>
                  )}

                  {/* Upload Time */}
                  {receipt?.timestamp && (
                    <div>
                      <div className="text-xs text-link mb-1">Uploaded</div>
                      <div className="text-sm text-fg-muted">
                        {formatTimestamp(receipt.timestamp)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction IDs - Collapsible for cleaner look */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-fg-muted flex items-center gap-2">
                  <Archive className="w-4 h-4 text-turbo-red" />
                  Transaction Details
                </h4>
                
                <div className="space-y-3">
                  {/* Data Item ID */}
                  <div className="bg-surface rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-link">Data Item ID</span>
                      <div className="flex items-center gap-1">
                        <CopyButton textToCopy={uploadId} />
                      </div>
                    </div>
                    <div className="font-mono text-xs text-fg-muted break-all">
                      {uploadId}
                    </div>
                  </div>

                  {/* Parent Bundle ID */}
                  {currentStatus?.bundleId && (
                    <div className="bg-surface rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-link">Parent Bundle ID</span>
                        <CopyButton textToCopy={currentStatus.bundleId} />
                      </div>
                      <div className="font-mono text-xs text-fg-muted break-all">
                        {currentStatus.bundleId}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={downloadReceipt}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-default rounded-lg text-sm text-link hover:text-fg-muted hover:border-turbo-red/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Receipt
                </button>
                <a
                  href={`https://arweave.net/${uploadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-turbo-red text-white rounded-lg text-sm hover:bg-turbo-red/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Arweave
                </a>
              </div>
            </div>
          ) : (
            /* Technical Details Tab - Combined JSON data */
            <div className="p-4 sm:p-6 space-y-6">
              {/* Receipt JSON */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-fg-muted">Upload Receipt</h4>
                  <CopyButton textToCopy={JSON.stringify(receipt, null, 2)} />
                </div>
                <div className="bg-canvas rounded-lg p-3 border border-default">
                  <pre className="font-mono text-[10px] sm:text-xs text-link overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {JSON.stringify(receipt, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Status Response JSON */}
              {currentStatus && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-fg-muted">Status Response</h4>
                    <CopyButton textToCopy={JSON.stringify(currentStatus, null, 2)} />
                  </div>
                  <div className="bg-canvas rounded-lg p-3 border border-default">
                    <pre className="font-mono text-[10px] sm:text-xs text-link overflow-auto max-h-48 whitespace-pre-wrap break-words">
                      {JSON.stringify(currentStatus, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default ReceiptModal;