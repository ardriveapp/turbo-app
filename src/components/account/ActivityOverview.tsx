import { Upload, Globe, ArrowRight, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getArweaveUrl } from '../../utils';
import { useNavigate } from 'react-router-dom';

export default function ActivityOverview() {
  const { uploadHistory, deployHistory } = useStore();
  const navigate = useNavigate();

  // Group deploy results by manifest ID (same as DeploySitePanel)
  const deploymentGroups: { [manifestId: string]: { manifest?: any, files?: any } } = {};
  
  deployHistory.forEach(result => {
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
  const recentUploads = uploadHistory.slice(0, 5);
  const recentDeployments = deployments.slice(0, 5);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Recent Uploads Summary */}
      <div className="bg-surface rounded-lg border border-default">
        <div className="p-4 border-b border-default">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-fg-muted flex items-center gap-2">
              <Upload className="w-4 h-4 text-turbo-red" />
              Recent Uploads
            </h3>
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1 text-xs text-turbo-red hover:text-turbo-red/80 transition-colors"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {uploadHistory.length === 0 ? (
          <div className="p-4 text-center">
            <Upload className="w-8 h-8 text-link mx-auto mb-2" />
            <p className="text-sm text-link">No uploads yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {recentUploads.map((upload, index) => (
              <div key={index} className="bg-canvas rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="font-mono text-xs text-link">
                      {upload.id.substring(0, 5)}...
                    </div>
                    {upload.fileName && (
                      <span className="text-xs text-fg-muted truncate">
                        {upload.fileName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={getArweaveUrl(upload.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-link hover:text-turbo-red transition-colors"
                      title="View File"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                
                {/* Upload timestamp */}
                {upload.timestamp && (
                  <div className="text-xs text-link">
                    {new Date(upload.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
            {uploadHistory.length > 5 && (
              <div className="text-xs text-link text-center pt-2">
                +{uploadHistory.length - 5} more files
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Deployments Summary */}
      <div className="bg-surface rounded-lg border border-default">
        <div className="p-4 border-b border-default">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-fg-muted flex items-center gap-2">
              <Globe className="w-4 h-4 text-turbo-red" />
              Recent Deployments
            </h3>
            <button
              onClick={() => navigate('/deploy')}
              className="flex items-center gap-1 text-xs text-turbo-red hover:text-turbo-red/80 transition-colors"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {deployments.length === 0 ? (
          <div className="p-4 text-center">
            <Globe className="w-8 h-8 text-link mx-auto mb-2" />
            <p className="text-sm text-link">No deployments yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {recentDeployments.map(([manifestId, group]) => (
              <div key={manifestId} className="bg-canvas rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="font-mono text-xs text-link">
                      {manifestId.substring(0, 5)}...
                    </div>
                    <span className="text-xs text-fg-muted truncate">
                      Site ({group.files?.files?.length || 0} files)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={getArweaveUrl(manifestId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-link hover:text-turbo-red transition-colors"
                      title="Visit Site"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                
                {/* Deployment timestamp */}
                {group.manifest?.timestamp && (
                  <div className="text-xs text-link">
                    {new Date(group.manifest.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
            {deployments.length > 5 && (
              <div className="text-xs text-link text-center pt-2">
                +{deployments.length - 5} more sites
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}