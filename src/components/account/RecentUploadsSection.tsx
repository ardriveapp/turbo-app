import { useState } from 'react';
import { Upload, ExternalLink, Receipt } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getArweaveUrl } from '../../utils';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import CopyButton from '../CopyButton';
import ReceiptModal from '../modals/ReceiptModal';
import { useNavigate } from 'react-router-dom';

export default function RecentUploadsSection() {
  const { uploadHistory } = useStore();
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showAllUploads, setShowAllUploads] = useState(false);
  const { uploadStatuses, getStatusColor, getStatusIcon } = useUploadStatus();
  const navigate = useNavigate();

  const recentUploads = uploadHistory.slice(0, 5); // Show latest 5
  const displayUploads = showAllUploads ? uploadHistory : recentUploads;

  if (uploadHistory.length === 0) {
    return (
      <div className="bg-surface/50 rounded-lg p-6 text-center border border-default">
        <Upload className="w-12 h-12 text-link mx-auto mb-4" />
        <h3 className="font-medium text-fg-muted mb-2">No Uploads Yet</h3>
        <p className="text-sm text-link mb-4">Upload your first files to get started</p>
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 bg-fg-muted text-black rounded-lg hover:bg-fg-muted/90 transition-colors"
        >
          Upload Files
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-default">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-default">
        <h3 className="font-bold text-fg-muted flex items-center gap-2">
          <Upload className="w-5 h-5 text-fg-muted" />
          Recent Uploads ({uploadHistory.length})
        </h3>
        <div className="flex items-center gap-2">
          {uploadHistory.length > 5 && (
            <button
              onClick={() => setShowAllUploads(!showAllUploads)}
              className="text-xs text-link hover:text-fg-muted transition-colors"
            >
              {showAllUploads ? 'Show Less' : 'Show All'}
            </button>
          )}
          <button
            onClick={() => navigate('/upload')}
            className="text-xs text-fg-muted hover:text-fg-muted/80 transition-colors"
          >
            View Full Page →
          </button>
        </div>
      </div>

      {/* Upload List */}
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {displayUploads.map((upload, index) => {
          const status = uploadStatuses[upload.id];
          
          return (
            <div key={index} className="bg-canvas rounded-lg p-3 border border-default/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm text-fg-muted">
                      {upload.id.substring(0, 5)}...
                    </div>
                    <CopyButton textToCopy={upload.id} />
                  </div>
                  
                  {/* File name if available */}
                  {upload.fileName && (
                    <span className="text-sm text-link truncate" title={upload.fileName}>
                      {upload.fileName}
                    </span>
                  )}

                  {status && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs">
                        {getStatusIcon(status.status, status.info)} 
                      </span>
                      <span className={`text-xs font-medium ${getStatusColor(status.status, status.info)}`}>
                        {status.status}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowReceiptModal(upload.id)}
                    className="p-1.5 text-link hover:text-fg-muted transition-colors"
                    title="View Receipt"
                  >
                    <Receipt className="w-4 h-4" />
                  </button>
                  <a
                    href={getArweaveUrl(upload.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-link hover:text-fg-muted transition-colors"
                    title="View File"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              
              {/* Upload timestamp */}
              {upload.timestamp && (
                <div className="text-xs text-link">
                  Uploaded: {new Date(upload.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          onClose={() => setShowReceiptModal(null)}
          receipt={uploadHistory.find(u => u.id === showReceiptModal)?.receipt}
          uploadId={showReceiptModal}
          initialStatus={uploadStatuses[showReceiptModal]}
        />
      )}
    </div>
  );
}