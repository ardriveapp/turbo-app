import { useState, useCallback } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFileUpload } from '../../hooks/useFileUpload';
import { wincPerCredit } from '../../constants';
import { useStore } from '../../store/useStore';
import { CheckCircle, XCircle, Upload, ExternalLink, Loader2, Shield, RefreshCw, Info, Receipt, ChevronDown, Archive, Clock, HelpCircle } from 'lucide-react';
import CopyButton from '../CopyButton';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import ReceiptModal from '../modals/ReceiptModal';
import { getArweaveUrl } from '../../utils';

export default function UploadPanel() {
  const { address, creditBalance, uploadHistory, addUploadResults, clearUploadHistory } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const wincForOneGiB = useWincForOneGiB();
  const { uploadMultipleFiles, uploading, uploadProgress, errors, reset: resetFileUpload } = useFileUpload();
  const { 
    checkUploadStatus, 
    checkMultipleStatuses, 
    statusChecking, 
    uploadStatuses, 
    formatFileSize,
    formatWinc,
    getStatusColor,
    getStatusIcon
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
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };


  const calculateUploadCost = (bytes: number) => {
    if (bytes < 100 * 1024) return 0; // Free tier: files under 100KB
    if (!wincForOneGiB) return null;
    
    const gibSize = bytes / (1024 * 1024 * 1024);
    const wincCost = gibSize * Number(wincForOneGiB);
    const creditCost = wincCost / wincPerCredit;
    return creditCost;
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalCost = calculateUploadCost(totalSize);

  const handleUpload = async () => {
    if (!address) {
      setUploadMessage({ type: 'error', text: 'Please connect your wallet to upload files' });
      return;
    }

    setUploadMessage(null);
    
    try {
      const { results, failedFiles } = await uploadMultipleFiles(files);
      
      if (results.length > 0) {
        // Add to persistent upload history
        addUploadResults(results);
        
        // Remove successfully uploaded files (those that completed without errors)
        setFiles(prev => prev.filter(f => 
          !(uploadProgress[f.name] === 100 && !errors[f.name])
        ));
        
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
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Upload className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Upload Files</h3>
          <p className="text-sm text-link">Store your files permanently on the Arweave network</p>
        </div>
      </div>
      
      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6 mb-6">
        
        {/* Current Balance */}
        {address && (
          <div className="bg-surface rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-link">Available Credits:</span>
              <div className="text-right">
                <span className="font-bold text-fg-muted">{creditBalance.toFixed(4)} Credits</span>
                {wincForOneGiB && (
                  <div className="text-xs text-link">
                    ~{((creditBalance * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB capacity
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection Warning */}
        {!address && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-yellow-500">Connect your wallet to upload files</span>
            </div>
          </div>
        )}

      {/* Upload Message */}
      {uploadMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${
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

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging 
            ? 'border-turbo-red bg-turbo-red/10' 
            : 'border-default hover:border-turbo-red/50'
        }`}
      >
        <div className="mb-4">
          <Upload className="w-12 h-12 text-turbo-red mx-auto mb-2" />
          <p className="text-lg font-medium mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-link">
            Files under 100KB are <span className="text-turbo-green font-semibold">FREE</span> • Max 10GB per file
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

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex justify-between items-center">
            <h4 className="font-medium">Selected Files ({files.length})</h4>
            <button 
              onClick={() => {
                setFiles([]);
                setUploadMessage(null);
              }}
              className="text-link hover:text-fg-muted text-sm flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              Clear all
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => {
              const cost = calculateUploadCost(file.size);
              const isFree = file.size < 100 * 1024;
              const progress = uploadProgress[file.name];
              const error = errors[file.name];
              const isUploading = uploading && progress !== undefined && progress < 100;
              const isComplete = progress === 100;
              
              return (
                <div key={index} className="bg-surface rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-sm text-link">
                        {formatFileSize(file.size)}
                        {isFree && <span className="ml-2 text-turbo-green">• FREE</span>}
                        {cost !== null && cost > 0 && (
                          <span className="ml-2">• {cost.toFixed(6)} Credits</span>
                        )}
                      </div>
                    </div>
                    {!uploading && !isComplete && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-link hover:text-error ml-4"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                    {isComplete && (
                      <CheckCircle className="w-5 h-5 text-turbo-green ml-4" />
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  {isUploading && (
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-turbo-red h-full transition-all duration-300"
                        style={{ width: `${progress || 0}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {error && (
                    <div className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-surface rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-link">Total Size:</span>
              <span className="font-medium">{formatFileSize(totalSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-link">Estimated Cost:</span>
              <span className="font-medium">
                {totalCost === 0 ? (
                  <span className="text-turbo-green">FREE</span>
                ) : totalCost !== null ? (
                  <span>{totalCost.toFixed(6)} Credits</span>
                ) : (
                  <span className="text-link">Calculating...</span>
                )}
              </span>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full mt-4 py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload {files.length} File{files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
      </div>

      {/* Upload Results - Enhanced with Status Checking */}
      {uploadHistory.length > 0 && (
        <div className="mt-6 bg-surface rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h4 className="font-bold text-fg-muted flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-turbo-green" />
              Upload Results ({uploadHistory.length})
            </h4>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => checkMultipleStatuses(uploadHistory.map(r => r.id))}
                disabled={Object.values(statusChecking).some(checking => checking)}
                className="flex items-center gap-1 px-3 py-2 text-xs bg-turbo-red/20 text-turbo-red rounded hover:bg-turbo-red/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${Object.values(statusChecking).some(checking => checking) ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Check Status</span>
                <span className="xs:hidden">Status</span>
              </button>
              <button
                onClick={() => {
                  clearUploadHistory();
                  resetFileUpload();
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-link hover:text-fg-muted border border-default/30 rounded hover:border-default/50 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                <span className="hidden xs:inline">Clear History</span>
                <span className="xs:hidden">Clear</span>
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadHistory.map((result, index) => {
              const status = uploadStatuses[result.id];
              const isChecking = statusChecking[result.id];
              
              return (
                <div key={index} className="bg-canvas rounded-lg p-3 sm:p-4 border border-default/30 overflow-hidden">
                  {/* Mobile-First: Stack Everything */}
                  <div className="space-y-3">
                    {/* Transaction ID - Full Width */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-fg-muted break-all sm:text-sm">
                          <span className="sm:hidden">{result.id.substring(0, 10)}...{result.id.substring(result.id.length - 6)}</span>
                          <span className="hidden sm:inline">{result.id}</span>
                        </div>
                      </div>
                      <CopyButton textToCopy={result.id} />
                    </div>

                    {/* Status Row */}
                    {status && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const iconType = getStatusIcon(status.status, status.info);
                          const iconColor = getStatusColor(status.status, status.info);
                          switch (iconType) {
                            case 'check-circle':
                              return <CheckCircle className={`w-4 h-4 ${iconColor}`} />;
                            case 'clock':
                              return <Clock className={`w-4 h-4 ${iconColor}`} />;
                            case 'archive':
                              return <Archive className={`w-4 h-4 ${iconColor}`} />;
                            case 'x-circle':
                              return <XCircle className={`w-4 h-4 ${iconColor}`} />;
                            case 'help-circle':
                              return <HelpCircle className={`w-4 h-4 ${iconColor}`} />;
                            default:
                              return <Clock className={`w-4 h-4 ${iconColor}`} />;
                          }
                        })()}
                        <span className={`text-xs font-medium ${getStatusColor(status.status, status.info)}`}>
                          {status.status}
                          {status.info && <span className="ml-1 text-link">• {status.info}</span>}
                        </span>
                      </div>
                    )}

                    {/* Actions Row - Spread Out */}
                    <div className="flex items-center justify-between pt-2 border-t border-default/20">
                      <div className="flex items-center gap-3">
                        {result.receipt && (
                          <button
                            onClick={() => setShowReceiptModal(result.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-turbo-red/10 text-turbo-red rounded hover:bg-turbo-red/20 transition-colors"
                            title="View Receipt"
                          >
                            <Receipt className="w-3 h-3" />
                            <span className="hidden xs:inline">Receipt</span>
                          </button>
                        )}
                        <button
                          onClick={() => checkUploadStatus(result.id)}
                          disabled={isChecking}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-surface border border-default text-link hover:text-turbo-red transition-colors disabled:opacity-50"
                          title="Check Status"
                        >
                          <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                          <span className="hidden xs:inline">Status</span>
                        </button>
                      </div>
                      
                      <a
                        href={getArweaveUrl(result.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 text-xs text-link hover:text-turbo-red border border-default/30 rounded transition-colors"
                        title="View on Gateway"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden xs:inline">View</span>
                      </a>
                    </div>
                  </div>

                  {/* Enhanced Metadata */}
                  {status && (
                    <div className="mt-3 pt-2 border-t border-default/20">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                        {status.payloadContentType && (
                          <div>
                            <span className="text-link">Type:</span>
                            <span className="ml-1 text-fg-muted font-medium">
                              {status.payloadContentType}
                            </span>
                          </div>
                        )}
                        {status.rawContentLength && (
                          <div>
                            <span className="text-link">Size:</span>
                            <span className="ml-1 text-fg-muted font-medium">
                              {formatFileSize(status.rawContentLength)}
                            </span>
                          </div>
                        )}
                        {status.winc && (
                          <div>
                            <span className="text-link">Cost:</span>
                            <span className="ml-1 text-fg-muted font-medium">
                              {formatWinc(status.winc)}
                            </span>
                          </div>
                        )}
                        {result.timestamp && (
                          <div>
                            <span className="text-link">Upload Time:</span>
                            <span className="ml-1 text-fg-muted font-medium">
                              {new Date(result.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Collapsible Status Guide */}
          <div className="mt-4">
            <button
              onClick={() => setShowStatusGuide(!showStatusGuide)}
              className="w-full flex items-center justify-between p-3 bg-canvas rounded-lg border border-default/30 hover:border-default/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-turbo-red" />
                <span className="text-sm font-medium text-fg-muted">Status Guide</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-link transition-transform ${showStatusGuide ? 'rotate-180' : ''}`} />
            </button>
            
            {showStatusGuide && (
              <div className="mt-2 p-4 bg-surface/50 rounded-lg border border-default/30">
                <div className="text-xs text-link space-y-2">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-fg-muted">CONFIRMED/pending</strong> - File bundled, waiting for Arweave mining (most common)
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-turbo-green flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-fg-muted">FINALIZED/permanent</strong> - File is permanently stored on Arweave
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Archive className="w-4 h-4 text-turbo-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-fg-muted">CONFIRMED/new</strong> - File bundled, processing started
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-link flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-fg-muted">NOT_FOUND</strong> - File not yet indexed (try again in a few minutes)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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

    </div>
  );
}