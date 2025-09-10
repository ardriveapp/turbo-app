import { useState } from 'react';
import { Globe, Receipt, Globe2, Folder, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getArweaveUrl } from '../../utils';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import CopyButton from '../CopyButton';
import ReceiptModal from '../modals/ReceiptModal';
import { useNavigate } from 'react-router-dom';

export default function RecentDeploymentsSection() {
  const { deployHistory } = useStore();
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showAllDeployments, setShowAllDeployments] = useState(false);
  const { uploadStatuses } = useUploadStatus();
  const navigate = useNavigate();

  // Get the most recent deployment entries first, then group them
  const recentDeployHistory = deployHistory.slice(0, showAllDeployments ? deployHistory.length : 10); // Get more entries to ensure we have enough groups
  
  // Group deploy results by manifest ID like in DeploySitePanel
  const deploymentGroups: { [manifestId: string]: { manifest?: any, files?: any } } = {};
  
  recentDeployHistory.forEach(result => {
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

  const deployments = Object.entries(deploymentGroups);
  const recentDeployments = deployments.slice(0, 5); // Show latest 5 groups
  const displayDeployments = showAllDeployments ? deployments : recentDeployments;

  if (deployments.length === 0) {
    return (
      <div className="bg-surface/50 rounded-lg p-6 text-center border border-default">
        <Globe className="w-12 h-12 text-link mx-auto mb-4" />
        <h3 className="font-medium text-fg-muted mb-2">No Deployments Yet</h3>
        <p className="text-sm text-link mb-4">Deploy your first site to get started</p>
        <button
          onClick={() => navigate('/deploy')}
          className="px-4 py-2 bg-turbo-red text-white rounded-lg hover:bg-turbo-red/90 transition-colors"
        >
          Deploy Site
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-default">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-default">
        <h3 className="font-bold text-fg-muted flex items-center gap-2">
          <Globe className="w-5 h-5 text-turbo-red" />
          Recent Deployments ({deployments.length})
        </h3>
        <div className="flex items-center gap-2">
          {deployments.length > 5 && (
            <button
              onClick={() => setShowAllDeployments(!showAllDeployments)}
              className="text-xs text-link hover:text-fg-muted transition-colors"
            >
              {showAllDeployments ? 'Show Less' : 'Show All'}
            </button>
          )}
          <button
            onClick={() => navigate('/deployments')}
            className="text-xs text-turbo-red hover:text-turbo-red/80 transition-colors"
          >
            View All Deployments →
          </button>
        </div>
      </div>

      {/* Deployment List */}
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {displayDeployments.map(([manifestId, group]) => (
          <div key={manifestId} className="bg-canvas rounded-lg p-4 border border-default/30">
            {/* Deployment Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-turbo-green" />
                <span className="font-medium text-fg-muted">Site Deployment</span>
                {group.manifest?.timestamp && (
                  <span className="text-xs text-link">
                    {new Date(group.manifest.timestamp).toLocaleDateString()}
                  </span>
                )}
              </div>
              <a
                href={getArweaveUrl(manifestId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-turbo-green text-white rounded hover:bg-turbo-green/90 transition-colors text-xs font-medium"
                title="Visit Deployed Site"
              >
                <Globe className="w-3 h-3" />
                Visit Site
              </a>
            </div>

            {/* Manifest Info */}
            <div className="flex items-center justify-between bg-surface/50 rounded p-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 py-1 bg-turbo-green/20 text-turbo-green rounded text-xs font-medium">
                  <Globe2 className="w-3 h-3" />
                  MANIFEST
                </div>
                <div className="font-mono text-sm text-fg-muted">
                  {manifestId.substring(0, 8)}...{manifestId.substring(manifestId.length - 6)}
                </div>
                <CopyButton textToCopy={manifestId} />
              </div>
              
              <div className="flex items-center gap-1">
                <a
                  href={getArweaveUrl(manifestId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-link hover:text-turbo-red transition-colors"
                  title="View Manifest"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setShowReceiptModal(manifestId)}
                  className="p-1 text-link hover:text-turbo-red transition-colors"
                  title="View Receipt"
                >
                  <Receipt className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* File Count Summary */}
            {group.files?.files && (
              <div className="mt-2 text-xs text-link">
                <Folder className="w-3 h-3 inline mr-1" />
                {group.files.files.length} files deployed
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          onClose={() => setShowReceiptModal(null)}
          receipt={deployHistory.find(r => 
            (r.type === 'manifest' && r.id === showReceiptModal) || 
            (r.type === 'files' && r.files?.find(f => f.id === showReceiptModal))
          )}
          uploadId={showReceiptModal}
          initialStatus={uploadStatuses[showReceiptModal]}
        />
      )}
    </div>
  );
}