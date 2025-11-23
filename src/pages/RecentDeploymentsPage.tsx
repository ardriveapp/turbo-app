import { useState, useMemo, useCallback, useEffect } from 'react';
import { Globe, Receipt, Folder, ExternalLink, Zap, RefreshCw, XCircle, Archive, Clock, HelpCircle, MoreVertical, Code, ChevronDown, CheckCircle, Copy } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useStore } from '../store/useStore';
import { getArweaveUrl, getArweaveRawUrl } from '../utils';
import { useUploadStatus } from '../hooks/useUploadStatus';
import { useWincForOneGiB } from '../hooks/useWincForOneGiB';
import { useFreeUploadLimit, isFileFree } from '../hooks/useFreeUploadLimit';
import { wincPerCredit } from '../constants';
import CopyButton from '../components/CopyButton';
import ReceiptModal from '../components/modals/ReceiptModal';
import { useNavigate } from 'react-router-dom';

export default function RecentDeploymentsPage() {
  const navigate = useNavigate();
  const { deployHistory, clearDeployHistory } = useStore();
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const { 
    checkUploadStatus, 
    checkMultipleStatuses,
    initializeFromCache, 
    statusChecking, 
    uploadStatuses, 
    getStatusIcon
  } = useUploadStatus();
  const wincForOneGiB = useWincForOneGiB();

  // Fetch and track the bundler's free upload limit
  const freeUploadLimitBytes = useFreeUploadLimit();

  // Memoize deployment grouping to prevent lag - exact same as DeploySitePanel
  const deploymentGroups = useMemo(() => {
    const groups: { [manifestId: string]: { manifest?: any, files?: any } } = {};
    
    deployHistory.forEach(result => {
      const manifestId = result.manifestId || result.id;
      if (!manifestId) return;
      
      if (!groups[manifestId]) {
        groups[manifestId] = {};
      }
      
      if (result.type === 'manifest') {
        groups[manifestId].manifest = result;
      } else if (result.type === 'files') {
        groups[manifestId].files = result;
      }
    });
    
    return groups;
  }, [deployHistory]);

  // Helper to find ArNS association for a manifest - exact same as DeploySitePanel
  const getArNSAssociation = useCallback((manifestId: string) => {
    return deployHistory.find(record => 
      record.type === 'arns-update' && 
      record.manifestId === manifestId
    );
  }, [deployHistory]);

  // Convert status icon strings to JSX components - exact same as DeploySitePanel
  const renderStatusIcon = (iconName: string) => {
    switch (iconName) {
      case 'check-circle':
        return <CheckCircle className="w-3 h-3 text-turbo-green" />;
      case 'clock':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'archive':
        return <Archive className="w-3 h-3 text-turbo-blue" />;
      case 'x-circle':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'help-circle':
        return <HelpCircle className="w-3 h-3 text-link" />;
      default:
        return <Clock className="w-3 h-3 text-yellow-500" />;
    }
  };

  // Smart content type detection for display - exact same as DeploySitePanel
  const getDisplayContentType = (filePath: string, storedContentType?: string): string => {
    // If stored type is valid and not generic, use it
    if (storedContentType && storedContentType !== 'application/octet-stream') {
      return storedContentType;
    }
    
    // Apply smart detection based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg', 
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      
      // Documents
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'txt': 'text/plain',
      'md': 'text/markdown',
      
      // Fonts
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      
      // Other
      'pdf': 'application/pdf',
    };
    
    return mimeTypes[extension || ''] || storedContentType || 'application/octet-stream';
  };

  const exportDeployToCSV = () => {
    if (deployHistory.length === 0) return;

    // Group deployments by manifest ID like we do in the UI
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

    const headers = [
      'Deployment Type',
      'Manifest ID', 
      'Site URL',
      'Deployment Date',
      'File Path',
      'File Transaction ID',
      'File Size (Bytes)',
      'File Size (Human)',
      'Content Type',
      'Owner Address',
      'Total Files in Site',
      'Total Site Size'
    ];

    const rows: string[][] = [];

    Object.entries(deploymentGroups).forEach(([manifestId, group]) => {
      const deployDate = group.manifest?.timestamp ? 
        new Date(group.manifest.timestamp).toLocaleString() : 
        'Unknown';
      
      const siteUrl = getArweaveUrl(manifestId, group.manifest?.receipt?.dataCaches);
      const totalFiles = group.files?.files?.length || 0;
      const totalSize = group.files?.files?.reduce((sum: number, file: any) => sum + file.size, 0) || 0;
      const totalSizeHuman = totalSize > 0 ? (
        totalSize < 1024 ? `${totalSize}B` :
        totalSize < 1024 * 1024 ? `${(totalSize / 1024).toFixed(1)}KB` :
        `${(totalSize / 1024 / 1024).toFixed(1)}MB`
      ) : '0B';

      // Add manifest row
      rows.push([
        'Manifest',
        manifestId,
        siteUrl,
        deployDate,
        'manifest.json',
        manifestId,
        'Unknown',
        'Unknown', 
        'application/x.arweave-manifest+json',
        group.manifest?.receipt?.owner || 'Unknown',
        totalFiles.toString(),
        `${totalSize} (${totalSizeHuman})`
      ]);

      // Add individual file rows  
      if (group.files?.files) {
        group.files.files.forEach((file: any) => {
          const fileSizeHuman = file.size < 1024 ? `${file.size}B` :
            file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)}KB` :
            `${(file.size / 1024 / 1024).toFixed(1)}MB`;
          
          const contentType = file.receipt?.tags?.find((tag: any) => tag.name === 'Content-Type')?.value || 
                              'application/octet-stream';

          rows.push([
            'File',
            manifestId,
            siteUrl,
            deployDate,
            file.path,
            file.id,
            file.size.toString(),
            fileSizeHuman,
            contentType,
            file.receipt?.owner || 'Unknown',
            totalFiles.toString(),
            `${totalSize} (${totalSizeHuman})`
          ]);
        });
      }
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
    link.setAttribute('download', `turbo-deployments-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initialize status from cache only (no API calls) when page loads
  useEffect(() => {
    if (deployHistory.length > 0) {
      // Get all IDs that need status checking
      const allIds = deployHistory.flatMap(result => {
        if (result.type === 'manifest') return result.id ? [result.id] : [];
        if (result.type === 'files') return result.files?.map(f => f.id) || [];
        return [];
      });
      
      // Initialize from cache only (no API calls)
      initializeFromCache(allIds);
    }
  }, [deployHistory, initializeFromCache]);

  if (Object.keys(deploymentGroups).length === 0) {
    return (
      <div className="px-4 sm:px-6">
            {/* Header */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Zap className="w-5 h-5 text-turbo-red" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-fg-muted mb-1">Recent Deployments</h3>
                <p className="text-sm text-link">View and manage all your site deployments</p>
              </div>
            </div>

            {/* Empty State */}
            <div className="bg-gradient-to-br from-turbo-red/10 to-turbo-red/5 rounded-xl border border-turbo-red/20 p-6 mb-6">
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
            </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <Zap className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-fg-muted mb-1">Recent Deployments</h3>
              <p className="text-sm text-link">View and manage all your site deployments</p>
            </div>
          </div>

          {/* Option A Header + Option 3 Cards */}
          <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-turbo-red/20 p-6 mb-6">
            {/* Header with better description */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-fg-muted">Your Site Deployments</h3>
                <p className="text-sm text-link">
                  {Object.keys(deploymentGroups).length} site{Object.keys(deploymentGroups).length !== 1 ? 's' : ''} deployed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportDeployToCSV}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-surface border border-default rounded text-fg-muted hover:bg-canvas hover:text-fg-muted transition-colors"
                  title="Export deployment history to CSV"
                >
                  <Archive className="w-3 h-3" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    // Check status for all deployed items (manifest + files)
                    const allIds = deployHistory.flatMap(result => {
                      if (result.type === 'manifest') return result.id ? [result.id] : [];
                      if (result.type === 'files') return result.files?.map(f => f.id) || [];
                      return [];
                    });
                    checkMultipleStatuses(allIds, true);
                  }}
                  disabled={Object.values(statusChecking).some(checking => checking)}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-surface border border-default rounded text-fg-muted hover:bg-canvas hover:text-fg-muted transition-colors disabled:opacity-50"
                  title="Check status for all deployed files"
                >
                  <RefreshCw className={`w-3 h-3 ${Object.values(statusChecking).some(checking => checking) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Check Status</span>
                </button>
                <button
                  onClick={clearDeployHistory}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-link hover:text-red-400 border border-default/30 rounded hover:border-red-400/50 transition-colors"
                  title="Clear all deployment history"
                >
                  <XCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear History</span>
                </button>
              </div>
            </div>
            
            {/* Option 3: Single unified cards */}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-1">
              {Object.entries(deploymentGroups).map(([manifestId, group]) => {
                const arnsAssociation = getArNSAssociation(manifestId);
                
                return (
                  <div key={manifestId} className="bg-[#090909] border border-turbo-red/20 rounded-lg p-4">
                    {/* Unified Header Row - Manifest Info + Actions */}
                    {group.manifest && (
                      <div className="flex items-center justify-between gap-2 mb-3">
                        {/* Main Info Row */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Globe Icon - Indicates site manifest */}
                          <Globe className="w-4 h-4 text-fg-muted" />
                          
                          {/* ArNS Name or Shortened Transaction ID */}
                          {arnsAssociation && arnsAssociation.arnsName ? (
                            <div className="flex items-center gap-2">
                              <a 
                                href={`https://${arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}${arnsAssociation.arnsName}.ar.io`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-fg-muted hover:text-turbo-green hover:underline transition-colors"
                              >
                                {arnsAssociation.undername ? arnsAssociation.undername + '_' : ''}{arnsAssociation.arnsName}
                              </a>
                              {arnsAssociation.arnsStatus === 'failed' && (
                                <span className="text-xs text-red-400">(failed)</span>
                              )}
                              {arnsAssociation.arnsStatus === 'pending' && (
                                <span className="text-xs text-yellow-400">(updating...)</span>
                              )}
                            </div>
                          ) : (
                            <div className="font-mono text-sm text-fg-muted">
                              {manifestId.substring(0, 6)}...
                            </div>
                          )}
                          
                          {/* Timestamp - Desktop only */}
                          {group.manifest.timestamp && (
                            <span className="text-xs text-link hidden sm:inline">
                              {new Date(group.manifest.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        {/* Desktop: Show all actions */}
                        <div className="hidden sm:flex items-center gap-1">
                          {/* Status Icon as part of actions - only show if we have real status */}
                          {uploadStatuses[manifestId] && (
                            <div className="p-1.5" title={`Status: ${uploadStatuses[manifestId].status}`}>
                              {(() => {
                                const iconType = getStatusIcon(uploadStatuses[manifestId].status, uploadStatuses[manifestId].info);
                                return renderStatusIcon(iconType);
                              })()}
                            </div>
                          )}
                          <CopyButton textToCopy={manifestId} />
                          <button
                            onClick={() => setShowReceiptModal(manifestId)}
                            className="p-1.5 text-link hover:text-turbo-red transition-colors"
                            title="View Receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => checkUploadStatus(manifestId, true)}
                            disabled={!!statusChecking[manifestId]}
                            className="p-1.5 text-link hover:text-turbo-red transition-colors disabled:opacity-50"
                            title="Check Status"
                          >
                            <RefreshCw className={`w-4 h-4 ${statusChecking[manifestId] ? 'animate-spin' : ''}`} />
                          </button>
                          <a
                            href={getArweaveRawUrl(manifestId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-link hover:text-turbo-red transition-colors"
                            title="View Raw Manifest JSON"
                          >
                            <Code className="w-4 h-4" />
                          </a>
                          <a
                            href={getArweaveUrl(manifestId, group.manifest?.receipt?.dataCaches)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-link hover:text-turbo-red transition-colors"
                            title="Visit Deployed Site"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        {/* Mobile: Status + 3-dot menu */}
                        <div className="sm:hidden flex items-center gap-1">
                          {/* Status Icon - visible on mobile */}
                          <div className="p-1.5" title={`Status: ${uploadStatuses[manifestId]?.status || 'Checking...'}`}>
                            {uploadStatuses[manifestId] ? (() => {
                              const iconType = getStatusIcon(uploadStatuses[manifestId].status, uploadStatuses[manifestId].info);
                              return renderStatusIcon(iconType);
                            })() : <Clock className="w-4 h-4 text-yellow-500" />}
                          </div>
                          
                          <Popover className="relative">
                            <PopoverButton className="p-1.5 text-link hover:text-fg-muted transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </PopoverButton>
                            <PopoverPanel 
                              anchor="bottom end" 
                              className="w-48 bg-surface border border-default rounded-lg shadow-lg z-[9999] py-1 mt-1"
                            >
                              {({ close }) => (
                                <>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(manifestId);
                                      setCopiedItems(prev => new Set([...prev, manifestId]));
                                      // Show feedback for 1 second before closing menu
                                      setTimeout(() => {
                                        close();
                                        // Clear copied state after menu closes
                                        setTimeout(() => {
                                          setCopiedItems(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(manifestId);
                                            return newSet;
                                          });
                                        }, 500);
                                      }, 1000);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                  >
                                    {copiedItems.has(manifestId) ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4" />
                                        Copy Deployment ID
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowReceiptModal(manifestId);
                                      close();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                  >
                                    <Receipt className="w-4 h-4" />
                                    View Receipt
                                  </button>
                                  <button
                                    onClick={() => {
                                      checkUploadStatus(manifestId, true);
                                      close();
                                    }}
                                    disabled={!!statusChecking[manifestId]}
                                    className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2 disabled:opacity-50"
                                  >
                                    <RefreshCw className={`w-4 h-4 ${statusChecking[manifestId] ? 'animate-spin' : ''}`} />
                                    Check Status
                                  </button>
                                  <a
                                    href={getArweaveRawUrl(manifestId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => close()}
                                    className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                  >
                                    <Code className="w-4 h-4" />
                                    View Raw JSON
                                  </a>
                                  <a
                                    href={getArweaveUrl(manifestId, group.manifest?.receipt?.dataCaches)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => close()}
                                    className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Visit Deployed Site
                                  </a>
                                </>
                              )}
                            </PopoverPanel>
                          </Popover>
                        </div>
                      </div>
                    )}
                    
                    {/* Mobile Timestamp Row */}
                    {group.manifest && group.manifest.timestamp && (
                      <div className="text-xs text-link sm:hidden mb-3">
                        {new Date(group.manifest.timestamp).toLocaleString()}
                      </div>
                    )}

                    {/* Files Section - Integrated into same card */}
                    {group.files && group.files.files && (
                      <details className="border-t border-default/30 pt-3">
                        <summary className="cursor-pointer font-medium text-fg-muted flex items-center gap-2 hover:text-turbo-red transition-colors">
                          <Folder className="w-4 h-4" />
                          Files ({group.files.files.length})
                          <ChevronDown className="w-3 h-3 text-link ml-auto" />
                        </summary>
                        <div className="pt-3 space-y-2 max-h-60 overflow-y-auto pl-1">
                          {group.files.files.map((file: any, fileIndex: number) => {
                            const status = uploadStatuses[file.id];
                            const isChecking = statusChecking[file.id];
                            
                            return (
                              <div key={fileIndex} className="bg-canvas border border-default/20 rounded p-3">
                                <div className="space-y-2">
                                  {/* Row 1: Status Icon + Shortened TxID + File Path + Actions */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {/* Shortened Transaction ID */}
                                      <div className="font-mono text-sm text-fg-muted">
                                        {file.id.substring(0, 6)}...
                                      </div>
                                      
                                      {/* File Path */}
                                      <div className="text-sm text-fg-muted truncate" title={file.path}>
                                        {file.path.split('/').pop() || file.path}
                                      </div>
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
                                      <CopyButton textToCopy={file.id} />
                                      <button
                                        onClick={() => setShowReceiptModal(file.id)}
                                        className="p-1.5 text-link hover:text-turbo-red transition-colors"
                                        title="View Receipt"
                                      >
                                        <Receipt className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => checkUploadStatus(file.id, true)}
                                        disabled={isChecking}
                                        className="p-1.5 text-link hover:text-turbo-red transition-colors disabled:opacity-50"
                                        title="Check Status"
                                      >
                                        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                      </button>
                                      <a
                                        href={getArweaveUrl(file.id, file.receipt?.dataCaches)}
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
                                          className="w-40 bg-surface border border-default rounded-lg shadow-lg z-[9999] py-1 mt-1"
                                        >
                                          {({ close }) => (
                                            <>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(file.id);
                                                  setCopiedItems(prev => new Set([...prev, file.id]));
                                                  // Show feedback for 1 second before closing menu
                                                  setTimeout(() => {
                                                    close();
                                                    // Clear copied state after menu closes
                                                    setTimeout(() => {
                                                      setCopiedItems(prev => {
                                                        const newSet = new Set(prev);
                                                        newSet.delete(file.id);
                                                        return newSet;
                                                      });
                                                    }, 500);
                                                  }, 1000);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                              >
                                                {copiedItems.has(file.id) ? (
                                                  <>
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    Copied!
                                                  </>
                                                ) : (
                                                  <>
                                                    <Copy className="w-4 h-4" />
                                                    Copy File ID
                                                  </>
                                                )}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setShowReceiptModal(file.id);
                                                  close();
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                              >
                                                <Receipt className="w-4 h-4" />
                                                View Receipt
                                              </button>
                                              <button
                                                onClick={() => {
                                                  checkUploadStatus(file.id, true);
                                                  close();
                                                }}
                                                disabled={isChecking}
                                                className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2 disabled:opacity-50"
                                              >
                                                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                                Check Status
                                              </button>
                                              <a
                                                href={getArweaveUrl(file.id, file.receipt?.dataCaches)}
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
                                      {getDisplayContentType(
                                        file.path,
                                        file.receipt?.tags?.find((tag: any) => tag.name === 'Content-Type')?.value
                                      )}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {file.size < 1024 
                                        ? `${file.size} B` 
                                        : file.size < 1024 * 1024 
                                        ? `${(file.size / 1024).toFixed(2)} KB`
                                        : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                    </span>
                                  </div>

                                  {/* Row 3: Cost + Deploy Timestamp */}
                                  <div className="flex items-center gap-2 text-sm text-link">
                                    <span>
                                      {isFileFree(file.size, freeUploadLimitBytes) ? (
                                        <span className="text-turbo-green">FREE</span>
                                      ) : wincForOneGiB ? (
                                        `${((file.size / (1024 ** 3)) * Number(wincForOneGiB) / wincPerCredit).toFixed(6)} Credits`
                                      ) : (
                                        'Unknown Cost'
                                      )}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {group.files.timestamp 
                                        ? new Date(group.files.timestamp).toLocaleString()
                                        : 'Unknown Time'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
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