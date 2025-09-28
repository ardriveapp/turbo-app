import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Clock,
  HardDrive
} from 'lucide-react';

export interface ActiveUpload {
  name: string;
  progress: number;
  size: number;
}

export interface RecentFile {
  name: string;
  size: number;
  status: 'success' | 'error';
  error?: string;
  timestamp: number;
}

export interface UploadError {
  fileName: string;
  error: string;
  retryable: boolean;
}

interface UploadProgressSummaryProps {
  uploadedCount: number;
  totalCount: number;
  failedCount: number;
  activeUploads: ActiveUpload[];
  recentFiles: RecentFile[];
  errors: UploadError[];
  totalSize: number;
  uploadedSize: number;
  onRetryFailed?: () => void;
  compact?: boolean;
  className?: string;
}

export default function UploadProgressSummary({
  uploadedCount,
  totalCount,
  failedCount,
  activeUploads,
  recentFiles,
  errors,
  totalSize,
  uploadedSize,
  onRetryFailed,
  compact = false,
  className = ''
}: UploadProgressSummaryProps) {
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [showRecent, setShowRecent] = useState(true);

  const inProgressCount = activeUploads.length;
  const successCount = uploadedCount - failedCount;
  const progressPercentage = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // Auto-show errors when they occur
  useEffect(() => {
    if (errors.length > 0) {
      setShowErrors(true);
    }
  }, [errors.length]);

  if (compact) {
    // Compact mode for inline display
    return (
      <div className={`bg-surface rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-fg-muted">
            {uploadedCount} / {totalCount} files
          </span>
          <span className="text-xs text-link">
            {formatSize(uploadedSize)} / {formatSize(totalSize)}
          </span>
        </div>
        <div className="w-full bg-canvas rounded-full h-2 overflow-hidden">
          <div
            className="bg-turbo-red h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {failedCount > 0 && (
          <div className="mt-2 text-xs text-red-400">
            {failedCount} failed
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-turbo-red" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-fg-muted mb-1">Upload Progress</h4>
            <p className="text-sm text-link">
              {uploadedCount} of {totalCount} files ({progressPercentage}%)
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-canvas rounded-full h-3 overflow-hidden mb-4">
          <div
            className="bg-turbo-red h-full transition-all duration-300 relative"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-turbo-green" />
              <span className="text-xs text-link">Success</span>
            </div>
            <p className="text-lg font-bold text-fg-muted">{successCount}</p>
          </div>

          <div className="bg-surface/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-link">Failed</span>
            </div>
            <p className="text-lg font-bold text-fg-muted">{failedCount}</p>
          </div>

          <div className="bg-surface/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-4 h-4 text-turbo-red animate-spin" />
              <span className="text-xs text-link">Active</span>
            </div>
            <p className="text-lg font-bold text-fg-muted">{inProgressCount}</p>
          </div>

          <div className="bg-surface/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <HardDrive className="w-4 h-4 text-link" />
              <span className="text-xs text-link">Size</span>
            </div>
            <p className="text-lg font-bold text-fg-muted">
              {formatSize(uploadedSize)}
            </p>
            <p className="text-xs text-link">
              of {formatSize(totalSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Active Uploads */}
      {activeUploads.length > 0 && (
        <div className="bg-surface rounded-xl border border-default p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-fg-muted flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-turbo-red animate-spin" />
              Currently Uploading ({activeUploads.length})
            </h4>
          </div>
          <div className="space-y-2">
            {activeUploads.slice(0, 5).map((file, index) => (
              <div key={index} className="bg-canvas rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-fg-muted truncate max-w-[60%]">
                    {file.name}
                  </span>
                  <span className="text-xs text-link">
                    {file.progress}% • {formatSize(file.size)}
                  </span>
                </div>
                <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-turbo-red h-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {activeUploads.length > 5 && (
              <p className="text-xs text-link text-center">
                +{activeUploads.length - 5} more uploading...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Completions & Errors Side by Side */}
      <div className={`grid grid-cols-1 ${recentFiles.length > 0 && errors.length > 0 ? 'lg:grid-cols-2' : ''} gap-4`}>
        {/* Recent Completions */}
        {recentFiles.length > 0 && (
          <div className="bg-surface rounded-xl border border-default p-4">
            <button
              onClick={() => setShowRecent(!showRecent)}
              className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
            >
              <h4 className="text-sm font-bold text-fg-muted flex items-center gap-2">
                <Clock className="w-4 h-4 text-link" />
                Recent Completions ({recentFiles.length})
              </h4>
              {showRecent ? (
                <ChevronUp className="w-4 h-4 text-link" />
              ) : (
                <ChevronDown className="w-4 h-4 text-link" />
              )}
            </button>

            {showRecent && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {recentFiles.slice(0, 10).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 py-1">
                    {file.status === 'success' ? (
                      <CheckCircle className="w-3 h-3 text-turbo-green flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-fg-muted truncate flex-1">
                      {file.name}
                    </span>
                    <span className="text-xs text-link">
                      {formatSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-surface rounded-xl border border-red-400/20 p-4">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
            >
              <h4 className="text-sm font-bold text-fg-muted flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Upload Errors ({errors.length})
              </h4>
              {showErrors ? (
                <ChevronUp className="w-4 h-4 text-link" />
              ) : (
                <ChevronDown className="w-4 h-4 text-link" />
              )}
            </button>

            {showErrors && (
              <>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="bg-canvas/50 rounded p-2">
                      <p className="text-xs font-medium text-fg-muted truncate">
                        {error.fileName}
                      </p>
                      <p className="text-xs text-red-400 mt-1">
                        {error.error}
                      </p>
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-xs text-link text-center">
                      +{errors.length - 10} more errors
                    </p>
                  )}
                </div>

                {onRetryFailed && errors.some(e => e.retryable) && (
                  <button
                    onClick={onRetryFailed}
                    className="w-full py-2 px-3 rounded-lg bg-turbo-red text-white text-sm font-medium hover:bg-turbo-red/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Failed Uploads
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* View All Files Button */}
      {totalCount > 20 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAllFiles(!showAllFiles)}
            className="px-4 py-2 rounded-lg border border-default text-sm text-link hover:text-fg-muted hover:border-default/50 transition-colors flex items-center gap-2"
          >
            {showAllFiles ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide File Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View All {totalCount} Files
              </>
            )}
          </button>
        </div>
      )}

      {/* Note: Virtual scrolling for all files would be implemented here */}
      {showAllFiles && (
        <div className="bg-surface rounded-xl border border-default p-4">
          <p className="text-sm text-link text-center">
            File list with virtual scrolling will be displayed here
          </p>
        </div>
      )}
    </div>
  );
}