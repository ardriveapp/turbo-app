import { Upload, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getArweaveUrl } from '../../utils';
import { useNavigate } from 'react-router-dom';

export default function ActivityOverview() {
  const { uploadHistory, deployHistory } = useStore();
  const navigate = useNavigate();

  // Helper to find ArNS association for a manifest
  const getArNSAssociation = (manifestId: string) => {
    return deployHistory.find(record =>
      record.type === 'arns-update' &&
      record.manifestId === manifestId
    );
  };

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
      <div className="bg-gradient-to-br from-primary/5 to-primary/3 rounded-2xl border border-primary/20">
        <div className="p-4 border-b border-primary/20">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Recent Uploads
          </h3>
        </div>

        {uploadHistory.length === 0 ? (
          <div className="p-4 text-center">
            <Upload className="w-8 h-8 text-foreground/80 mx-auto mb-2" />
            <p className="text-sm text-foreground/80">No uploads yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {recentUploads.map((upload, index) => (
              <div key={index} className="bg-card rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="font-mono text-xs text-foreground/80">
                      {upload.id.substring(0, 6)}...
                    </div>
                    {upload.fileName && (
                      <span className="text-xs text-foreground truncate">
                        {upload.fileName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={getArweaveUrl(upload.id, upload.dataCaches)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-foreground/80 hover:text-foreground transition-colors"
                      title="View File"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Upload timestamp */}
                {upload.timestamp && (
                  <div className="text-xs text-foreground/80">
                    {new Date(upload.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
            {uploadHistory.length > 5 && (
              <div className="text-xs text-foreground/80 text-center pt-2">
                +{uploadHistory.length - 5} more files
              </div>
            )}
          </div>
        )}

        {/* View All Button at Bottom */}
        {uploadHistory.length > 0 && (
          <div className="px-4 py-3 border-t border-primary/20">
            <button
              onClick={() => navigate('/upload')}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-foreground hover:text-primary/80 transition-colors font-medium"
            >
              View All Uploads <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Recent Deployments Summary */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/3 rounded-2xl border border-primary/20">
        <div className="p-4 border-b border-primary/20">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Recent Deployments
          </h3>
        </div>

        {deployments.length === 0 ? (
          <div className="p-4 text-center">
            <Zap className="w-8 h-8 text-foreground/80 mx-auto mb-2" />
            <p className="text-sm text-foreground/80">No deployments yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {recentDeployments.map(([manifestId, group]) => {
              const arnsAssociation = getArNSAssociation(manifestId);

              return (
                <div key={manifestId} className="bg-card rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* ArNS Name or TXID */}
                      {arnsAssociation && arnsAssociation.arnsName ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://${arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}${arnsAssociation.arnsName}.ar.io`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-foreground hover:text-success hover:underline transition-colors"
                          >
                            {arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}{arnsAssociation.arnsName}
                          </a>
                          {arnsAssociation.arnsStatus === 'failed' && (
                            <span className="text-xs text-error">(failed)</span>
                          )}
                          {arnsAssociation.arnsStatus === 'pending' && (
                            <span className="text-xs text-warning">(updating...)</span>
                          )}
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-foreground/80">
                          {manifestId.substring(0, 6)}...
                        </div>
                      )}
                      <span className="text-xs text-foreground/80">
                        {group.files?.files?.length || 0} files
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={getArweaveUrl(manifestId, group.manifest?.receipt?.dataCaches)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-foreground/80 hover:text-foreground transition-colors"
                        title="Visit Site"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Deployment timestamp */}
                  {group.manifest?.timestamp && (
                    <div className="text-xs text-foreground/80">
                      {new Date(group.manifest.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
            {deployments.length > 5 && (
              <div className="text-xs text-foreground/80 text-center pt-2">
                +{deployments.length - 5} more sites
              </div>
            )}
          </div>
        )}

        {/* View All Button at Bottom */}
        {deployments.length > 0 && (
          <div className="px-4 py-3 border-t border-primary/20">
            <button
              onClick={() => {
                navigate('/deployments');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-foreground hover:text-primary/80 transition-colors font-medium"
            >
              View All Deployments <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
