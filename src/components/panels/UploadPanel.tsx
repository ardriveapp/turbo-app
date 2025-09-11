import { useState, useCallback, useEffect } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFileUpload } from '../../hooks/useFileUpload';
import { wincPerCredit } from '../../constants';
import { useStore } from '../../store/useStore';
import { CheckCircle, XCircle, Upload, ExternalLink, Loader2, Shield, RefreshCw, Receipt, ChevronDown, ChevronUp, Archive, Clock, HelpCircle, MoreVertical, ArrowRight, Copy } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
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
  const [showUploadResults, setShowUploadResults] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const wincForOneGiB = useWincForOneGiB();
  const { uploadMultipleFiles, uploading, uploadProgress, errors, reset: resetFileUpload } = useFileUpload();
  const { 
    checkUploadStatus, 
    checkMultipleStatuses, 
    statusChecking, 
    uploadStatuses, 
    formatFileSize,
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

  // Auto-check status for recent uploads when page loads
  useEffect(() => {
    if (uploadHistory.length > 0) {
      // Check status for recent uploads (last 10) automatically
      const recentUploads = uploadHistory.slice(0, 10);
      const uploadIds = recentUploads.map(upload => upload.id);
      
      // Small delay to avoid overwhelming the API
      setTimeout(() => {
        checkMultipleStatuses(uploadIds);
      }, 1000);
    }
  }, [uploadHistory, checkMultipleStatuses]);

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
        getArweaveUrl(result.id)
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
    if (bytes < 100 * 1024) return 0; // Free tier: Files under 100KiB
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
      
      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        

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
            Files under 100KiB are <span className="text-turbo-green font-semibold">FREE</span> • Max 10GB per file
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
        <div className="mt-4 sm:mt-6">
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
                <div key={index} className="bg-surface/50 rounded p-3">
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
          <div className="mt-4 p-4 bg-surface/50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-link">Total Size:</span>
              <span className="font-medium">{formatFileSize(totalSize)}</span>
            </div>
            <div className="flex justify-between mb-2">
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
            {totalCost !== null && address && (
              <div className="flex justify-between">
                <span className="text-link">Balance After:</span>
                <div className="text-right">
                  <span className={`font-medium ${
                    creditBalance - totalCost < 0 ? 'text-red-400' : 'text-fg-muted'
                  }`}>
                    {(creditBalance - totalCost).toFixed(6)} Credits
                  </span>
                  {wincForOneGiB && (
                    <div className="text-xs text-link">
                      ~{(((creditBalance - totalCost) * wincPerCredit) / Number(wincForOneGiB)).toFixed(2)} GiB capacity
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="text-center bg-surface/30 rounded-lg p-4 mt-4">
            <p className="text-xs text-link">
              By continuing, you agree to our{' '}
              <a 
                href="https://ardrive.io/tos-and-privacy/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-turbo-red hover:text-turbo-red/80 transition-colors"
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a 
                href="https://ardrive.io/tos-and-privacy/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-turbo-red hover:text-turbo-red/80 transition-colors"
              >
                Privacy Policy
              </a>
            </p>
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

      {/* Upload Results - Modernized to Match Deployment Results */}
      {uploadHistory.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-surface/50 rounded-lg">
          {/* Collapsible Header with Actions */}
          <div className={`flex items-center justify-between p-4 ${showUploadResults ? 'pb-0 mb-4' : 'pb-4'}`}>
            <button
              onClick={() => setShowUploadResults(!showUploadResults)}
              className="flex items-center gap-2 hover:text-turbo-green transition-colors text-left"
              type="button"
            >
              <Upload className="w-5 h-5 text-fg-muted" />
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
              <div className="space-y-4 max-h-[700px] overflow-y-auto px-4">
                {uploadHistory.map((result, index) => {
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
                    <div key={index} className="border border-default rounded-lg p-4 bg-surface/50">
                      <div className="space-y-2">
                        {/* Row 1: Transaction ID + Filename + Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Shortened Transaction ID */}
                            <div className="font-mono text-sm text-fg-muted">
                              {result.id.substring(0, 6)}...
                            </div>
                            {/* File Name (if available) */}
                            {(result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value) && (
                              <div className="text-sm text-fg-muted truncate" title={result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value}>
                                {result.fileName || result.receipt?.tags?.find((tag: any) => tag.name === 'File-Name')?.value}
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
                          className="p-1.5 text-link hover:text-turbo-red transition-colors"
                          title="View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => checkUploadStatus(result.id)}
                          disabled={isChecking}
                          className="p-1.5 text-link hover:text-turbo-red transition-colors disabled:opacity-50"
                          title="Check Status"
                        >
                          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                        </button>
                        <a
                          href={getArweaveUrl(result.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-link hover:text-turbo-red transition-colors"
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

                    {/* Row 2: Content Type + File Size */}
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
                          if (result.fileSize && result.fileSize < 100 * 1024) {
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
          
          {/* View All Button at Bottom - only show when expanded and there are uploads */}
          {showUploadResults && uploadHistory.length > 0 && (
            <div className="border-t border-default mt-4">
              <div className="p-4">
                <button
                  onClick={() => {
                    // For now, just scroll to top of current page - could link to dedicated uploads page later
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-fg-muted hover:text-fg-muted/80 transition-colors font-medium"
                >
                  View All Uploads <ArrowRight className="w-4 h-4" />
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

    </div>
  );
}