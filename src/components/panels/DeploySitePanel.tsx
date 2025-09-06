import { useState, useCallback, useEffect } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFolderUpload } from '../../hooks/useFolderUpload';
import { wincPerCredit } from '../../constants';
import { useStore } from '../../store/useStore';
import { Globe, XCircle, Loader2, Shield, RefreshCw, Info, Receipt, ChevronDown, CheckCircle, Folder, Globe2, File, FileText, Image, Code, ExternalLink, Home, AlertTriangle, Archive, Clock, HelpCircle, MoreVertical } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import CopyButton from '../CopyButton';
import { getArweaveUrl, getArweaveRawUrl } from '../../utils';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import ReceiptModal from '../modals/ReceiptModal';

export default function DeploySitePanel() {
  const { address, creditBalance, deployHistory, addDeployResults, clearDeployHistory } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileList | null>(null);
  const [deployMessage, setDeployMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showFolderContents, setShowFolderContents] = useState(false);
  const [indexFile, setIndexFile] = useState<string>('');
  const [fallbackFile, setFallbackFile] = useState<string>('');
  const wincForOneGiB = useWincForOneGiB();
  const { deployFolder, deploying, deployProgress, fileProgress, deployStage, currentFile } = useFolderUpload();
  const { 
    checkUploadStatus, 
    checkMultipleStatuses, 
    statusChecking, 
    uploadStatuses, 
    getStatusColor,
    getStatusIcon,
    formatFileSize,
    formatWinc
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
    
    const items = Array.from(e.dataTransfer.items);
    const folderItem = items.find(item => item.webkitGetAsEntry?.()?.isDirectory);
    
    if (folderItem) {
      // Handle folder drop - we'll implement this in the hook
      console.log('Folder dropped:', folderItem);
    }
  }, []);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFolder(e.target.files);
      setDeployMessage(null);
      
      // Auto-detect index and fallback files
      const files = Array.from(e.target.files);
      autoDetectManifestFiles(files);
    }
  };

  // Smart detection for index and fallback files
  const autoDetectManifestFiles = (files: File[]) => {
    const htmlFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.html') || name.endsWith('.htm');
    });

    // Auto-detect index file
    let detectedIndex = '';
    const indexCandidates = ['index.html', 'index.htm', 'home.html', 'main.html'];
    for (const candidate of indexCandidates) {
      const found = htmlFiles.find(file => 
        file.webkitRelativePath.toLowerCase().endsWith(candidate) ||
        file.name.toLowerCase() === candidate
      );
      if (found) {
        detectedIndex = found.webkitRelativePath || found.name;
        break;
      }
    }

    // Auto-detect fallback file  
    let detectedFallback = '';
    const fallbackCandidates = ['404.html', 'fallback.html', 'error.html', 'not-found.html'];
    for (const candidate of fallbackCandidates) {
      const found = htmlFiles.find(file => 
        file.webkitRelativePath.toLowerCase().endsWith(candidate) ||
        file.name.toLowerCase() === candidate
      );
      if (found) {
        detectedFallback = found.webkitRelativePath || found.name;
        break;
      }
    }
    
    // If no dedicated fallback found and this looks like a SPA, suggest index.html
    if (!detectedFallback && detectedIndex) {
      // Check for common SPA indicators (React, Vue, Angular build artifacts)
      const hasBuildArtifacts = files.some(file => {
        const name = file.name.toLowerCase();
        const path = file.webkitRelativePath?.toLowerCase() || '';
        return name.includes('chunk') || name.includes('bundle') || 
               path.includes('assets/') || path.includes('static/') ||
               name.endsWith('.js') && name.includes('app');
      });
      
      if (hasBuildArtifacts) {
        console.log('🔍 SPA detected - suggesting index.html as fallback for client-side routing');
        detectedFallback = detectedIndex; // Suggest same as index for SPA routing
      }
    }

    setIndexFile(detectedIndex);
    setFallbackFile(detectedFallback);
    
    console.log('Auto-detected manifest files:', { 
      index: detectedIndex, 
      fallback: detectedFallback,
      availableHtmlFiles: htmlFiles.map(f => f.webkitRelativePath || f.name)
    });
  };

  const calculateTotalSize = (): number => {
    if (!selectedFolder) return 0;
    return Array.from(selectedFolder).reduce((total, file) => total + file.size, 0);
  };

  const calculateUploadCost = (bytes: number) => {
    if (bytes < 100 * 1024) return 0; // Free tier: files under 100KB
    if (!wincForOneGiB) return null;
    
    const gibSize = bytes / (1024 * 1024 * 1024);
    const wincCost = gibSize * Number(wincForOneGiB);
    const creditCost = wincCost / wincPerCredit;
    return creditCost;
  };

  const calculateTotalCost = (): number => {
    if (!wincForOneGiB || !selectedFolder) return 0;
    
    // Calculate cost per file, accounting for 100KiB free tier
    let totalWinc = 0;
    Array.from(selectedFolder).forEach(file => {
      if (file.size < 100 * 1024) {
        // File is under 100KiB - FREE
        return;
      } else {
        // File is over 100KiB - calculate cost
        const gibSize = file.size / (1024 ** 3);
        const fileWinc = gibSize * Number(wincForOneGiB);
        totalWinc += fileWinc;
      }
    });
    
    return totalWinc / wincPerCredit;
  };

  // Get file type icon based on extension
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return FileText;
      case 'css':
      case 'scss':
      case 'sass':
        return Code;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return Code;
      case 'json':
        return FileText;
      case 'md':
      case 'txt':
        return FileText;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return Image;
      default:
        return File;
    }
  };

  // Organize files into folder structure
  const organizeFolderStructure = () => {
    if (!selectedFolder) return {};
    
    const structure: Record<string, Array<{ file: File; path: string }>> = {};
    
    Array.from(selectedFolder).forEach(file => {
      const fullPath = file.webkitRelativePath || file.name;
      const pathParts = fullPath.split('/');
      const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
      
      if (!structure[folderPath]) {
        structure[folderPath] = [];
      }
      
      structure[folderPath].push({
        file,
        path: fullPath
      });
    });
    
    return structure;
  };

  // Convert status icon strings to JSX components
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

  // Smart content type detection for display (same logic as useFolderUpload)
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
      
      const siteUrl = getArweaveUrl(manifestId);
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

  // Auto-check status for recent deployments when page loads (same as Upload Results)
  useEffect(() => {
    if (deployHistory.length > 0) {
      // Check status for recent deployments automatically
      const recentDeployments = deployHistory.slice(0, 10);
      const allIds = recentDeployments.flatMap(result => {
        if (result.type === 'manifest') return result.id ? [result.id] : [];
        if (result.type === 'files') return result.files?.map(f => f.id) || [];
        return [];
      });
      
      // Small delay to avoid overwhelming the API
      setTimeout(() => {
        checkMultipleStatuses(allIds);
      }, 1000);
    }
  }, [deployHistory.length, checkMultipleStatuses]);

  const handleDeploy = async () => {
    if (!selectedFolder || selectedFolder.length === 0) {
      setDeployMessage({ type: 'error', text: 'Please select a folder to deploy' });
      return;
    }

    if (!address) {
      setDeployMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    try {
      setDeployMessage(null);
      const result = await deployFolder(Array.from(selectedFolder), {
        indexFile: indexFile || undefined,
        fallbackFile: fallbackFile || undefined
      });
      
      if (result.manifestId) {
        // Add results to store for persistence
        addDeployResults(result.results || []);
        
        // Clear the folder selection since deployment is complete
        setSelectedFolder(null);
        setShowFolderContents(false);
        setIndexFile('');
        setFallbackFile('');
        
        // Trigger balance refresh after successful deployment
        window.dispatchEvent(new CustomEvent('refresh-balance'));
        
        // Success message is redundant - results show everything
      }
    } catch (error) {
      console.error('Deploy failed:', error);
      setDeployMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Deploy failed' 
      });
    }
  };

  if (!address) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold mb-4">Connect Wallet Required</h3>
        <p className="text-link">Connect your Arweave wallet to deploy sites</p>
      </div>
    );
  }

  const totalSize = calculateTotalSize();
  const totalCost = calculateTotalCost();
  const folderName = selectedFolder?.[0]?.webkitRelativePath?.split('/')[0] || '';

  return (
    <div>
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Globe className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Deploy Site</h3>
          <p className="text-sm text-link">
            Deploy static sites and web apps to the permanent web with automatic manifest generation
          </p>
        </div>
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Current Balance */}
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

        {/* Folder Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-turbo-red bg-turbo-red/5'
              : 'border-link/30 hover:border-turbo-red/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Globe className="w-12 h-12 text-turbo-red mx-auto mb-2" />
          <p className="text-lg font-medium mb-2">
            Drop site folder here or click to browse
          </p>
          <p className="text-sm text-link mb-4">
            Select your site folder (HTML, CSS, JS, assets) for permanent deployment
          </p>
          <input
            type="file"
            {...({ webkitdirectory: 'true', directory: 'true' } as any)}
            multiple
            onChange={handleFolderSelect}
            className="hidden"
            id="folder-upload"
          />
          <label
            htmlFor="folder-upload"
            className="inline-block px-4 py-2 rounded bg-fg-muted text-black font-medium cursor-pointer hover:bg-fg-muted/90 transition-colors"
          >
            Select Site Folder
          </label>
        </div>

        {/* Folder Preview with Expandable Tree */}
        {selectedFolder && selectedFolder.length > 0 && (
          <div className="mt-4 sm:mt-6">
            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-link uppercase tracking-wider">Selected Folder</span>
                <button 
                  onClick={() => {
                    setSelectedFolder(null);
                    setDeployMessage(null);
                    setShowFolderContents(false);
                    setIndexFile('');
                    setFallbackFile('');
                    // Clear the file input value to allow re-selecting the same folder
                    const fileInput = document.getElementById('folder-upload') as HTMLInputElement;
                    if (fileInput) {
                      fileInput.value = '';
                    }
                  }}
                  className="text-link hover:text-fg-muted text-sm flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Clear
                </button>
              </div>

              {/* Expandable File Tree - Single folder display */}
                <button
                  onClick={() => setShowFolderContents(!showFolderContents)}
                  className="flex items-center justify-between w-full text-left hover:bg-canvas/50 rounded p-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-turbo-red" />
                    <span className="text-sm font-medium text-fg-muted">{folderName}</span>
                    <span className="text-xs text-link">({selectedFolder?.length} files)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-link transition-transform ${showFolderContents ? 'rotate-180' : ''}`} />
                </button>
                
                {showFolderContents && (
                  <div className="mt-3 p-3 bg-canvas rounded border border-default/30 max-h-60 overflow-y-auto">
                    <div className="space-y-1 text-xs font-mono">
                      {(() => {
                        const structure = organizeFolderStructure();
                        const sortedFolders = Object.keys(structure).sort();
                        
                        return sortedFolders.map(folderPath => (
                          <div key={folderPath}>
                            {/* Folder Header */}
                            {folderPath !== 'root' && (
                              <div className="flex items-center gap-2 text-turbo-red font-medium mb-1">
                                <Folder className="w-3 h-3" />
                                <span>{folderPath}/</span>
                              </div>
                            )}
                            
                            {/* Files in Folder */}
                            <div className={folderPath !== 'root' ? 'ml-4 space-y-0.5' : 'space-y-0.5'}>
                              {structure[folderPath]
                                .sort((a, b) => a.file.name.localeCompare(b.file.name))
                                .map(({ file, path }, index) => {
                                  const FileIcon = getFileIcon(file.name);
                                  const fileName = path.split('/').pop() || file.name;
                                  const fileSize = file.size < 1024 
                                    ? `${file.size}B` 
                                    : file.size < 1024 * 1024 
                                    ? `${(file.size / 1024).toFixed(1)}KB`
                                    : `${(file.size / 1024 / 1024).toFixed(1)}MB`;
                                  
                                  const fullPath = file.webkitRelativePath || file.name;
                                  const isHtml = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm');
                                  const isIndex = indexFile === fullPath;
                                  const isFallback = fallbackFile === fullPath;
                                  
                                  return (
                                    <div key={index} className="flex items-center justify-between text-link hover:text-fg-muted transition-colors py-1 px-1 rounded">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileIcon className="w-3 h-3 text-link flex-shrink-0" />
                                        <span className="truncate">{fileName}</span>
                                        
                                        {/* Badges for selected files */}
                                        {isIndex && (
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-turbo-green/20 text-turbo-green rounded text-xs font-medium">
                                            <Home className="w-3 h-3" />
                                            INDEX
                                          </div>
                                        )}
                                        {isFallback && (
                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded text-xs font-medium">
                                            <AlertTriangle className="w-3 h-3" />
                                            FALLBACK
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-link/70 text-xs">
                                          {fileSize}
                                          {file.size < 100 * 1024 && <span className="ml-1 text-turbo-green">• FREE</span>}
                                        </span>
                                        
                                        {/* Action buttons for HTML files */}
                                        {isHtml && (
                                          <div className="flex items-center gap-1">
                                            {!isIndex && (
                                              <button
                                                onClick={() => setIndexFile(fullPath)}
                                                className="px-2 py-0.5 text-xs bg-turbo-green/10 text-turbo-green rounded hover:bg-turbo-green/20 transition-colors"
                                                title="Set as Index"
                                              >
                                                Set Index
                                              </button>
                                            )}
                                            {!isFallback && (
                                              <button
                                                onClick={() => setFallbackFile(fullPath)}
                                                className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-600 rounded hover:bg-yellow-500/20 transition-colors"
                                                title="Set as Fallback"
                                              >
                                                Set Fallback
                                              </button>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Clear buttons for selected files */}
                                        {isIndex && (
                                          <button
                                            onClick={() => setIndexFile('')}
                                            className="px-2 py-0.5 text-xs text-link hover:text-red-400 rounded transition-colors"
                                            title="Clear Index"
                                          >
                                            Clear
                                          </button>
                                        )}
                                        {isFallback && (
                                          <button
                                            onClick={() => setFallbackFile('')}
                                            className="px-2 py-0.5 text-xs text-link hover:text-red-400 rounded transition-colors"
                                            title="Clear Fallback"
                                          >
                                            Clear
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
            </div>
            
            {/* Fallback Info for SPA routing */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-400">
                  <strong>SPA Routing Support:</strong> For React/Vue/Angular apps, set the <strong>Fallback</strong> to your main HTML file (usually{' '}
                  <code className="px-1 py-0.5 bg-blue-500/20 rounded text-blue-300 font-mono text-xs">index.html</code>
                  ) to enable client-side routing. This ensures URLs like{' '}
                  <code className="px-1 py-0.5 bg-blue-500/20 rounded text-blue-300 font-mono text-xs">/topup</code>
                  {' '}work correctly instead of showing 404 errors.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        
      {/* Summary Panel - Matching Upload Files */}
      {selectedFolder && selectedFolder.length > 0 && (
        <div className="mt-4 p-4 bg-surface rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-link">Total Size:</span>
              <span className="font-medium">{(totalSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-link">Estimated Cost:</span>
              <span className="font-medium">
                {totalCost === 0 ? (
                  <span className="text-turbo-green">FREE</span>
                ) : (
                  <span>{totalCost.toFixed(6)} Credits</span>
                )}
              </span>
            </div>
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
          </div>
      )}

      {/* Terms - Outside conditional, always show when folder selected */}
      {selectedFolder && selectedFolder.length > 0 && (
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
      )}

      {/* Deploy Button - Outside conditional, always show when folder selected */}
      {selectedFolder && selectedFolder.length > 0 && (
        <button
          onClick={handleDeploy}
          disabled={deploying || totalCost > creditBalance}
          className="w-full mt-4 py-4 px-6 rounded-lg bg-turbo-red text-white font-bold text-lg hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {deploying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Deploying Site...
            </>
          ) : (
            <>
              <Globe className="w-5 h-5" />
              Deploy to Permanent Web
            </>
          )}
        </button>
      )}

      {/* Deploy Progress */}
      {deploying && selectedFolder && (
        <div className="mt-4 p-4 bg-surface rounded-lg border border-turbo-red/20">
          <div className="space-y-4">
            {/* Stage Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-turbo-red animate-spin" />
                <span className="font-medium text-fg-muted">
                  {deployStage === 'uploading' && 'Uploading Files'}
                  {deployStage === 'manifest' && 'Creating Manifest'}
                  {deployStage === 'complete' && 'Complete'}
                </span>
              </div>
              <span className="text-sm text-link">
                {deployStage === 'uploading' && `${Object.keys(fileProgress).filter(key => fileProgress[key] === 100).length} / ${selectedFolder.length} files`}
                {deployStage === 'manifest' && 'Finalizing deployment...'}
                {deployStage === 'complete' && 'Deployment complete!'}
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full bg-canvas rounded-full h-2 overflow-hidden">
              <div 
                className="bg-turbo-red h-full transition-all duration-300"
                style={{ width: `${deployProgress}%` }}
              />
            </div>

            {/* Current File/Stage Info */}
            {currentFile && (
              <div className="flex items-center gap-2 text-sm text-link">
                {deployStage === 'uploading' && (
                  <>
                    <div className="w-2 h-2 bg-turbo-red rounded-full animate-pulse" />
                    <span>Uploading: {currentFile}</span>
                  </>
                )}
                {deployStage === 'manifest' && (
                  <>
                    <div className="w-2 h-2 bg-turbo-red rounded-full animate-pulse" />
                    <span>{currentFile}</span>
                  </>
                )}
              </div>
            )}

            {/* Expandable File Progress List */}
            {deployStage === 'uploading' && Object.keys(fileProgress).length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-link hover:text-fg-muted transition-colors flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  View Individual File Progress
                </summary>
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {Array.from(selectedFolder).map((file, index) => {
                    const progress = fileProgress[file.name];
                    const isComplete = progress === 100;
                    const hasError = progress === -1;
                    const isUploading = progress !== undefined && progress >= 0 && progress < 100;
                    const cost = calculateUploadCost(file.size);
                    const isFree = file.size < 100 * 1024;
                    
                    return (
                      <div key={index} className="bg-canvas rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-link text-right">
                              <div>
                                {file.size < 1024 
                                  ? `${file.size}B` 
                                  : file.size < 1024 * 1024 
                                  ? `${(file.size / 1024).toFixed(1)}KB`
                                  : `${(file.size / 1024 / 1024).toFixed(1)}MB`}
                                {isFree && <span className="ml-2 text-turbo-green">• FREE</span>}
                                {cost !== null && cost > 0 && (
                                  <span className="ml-2">• {cost.toFixed(6)} Credits</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center">
                              {isComplete && <CheckCircle className="w-4 h-4 text-turbo-green ml-2" />}
                              {hasError && <XCircle className="w-4 h-4 text-red-400 ml-2" />}
                              {isUploading && <Loader2 className="w-4 h-4 text-turbo-red animate-spin ml-2" />}
                              {progress === undefined && <div className="w-4 h-4 border border-link/30 rounded-full ml-2" />}
                            </div>
                          </div>
                        </div>
                        
                        {/* Individual File Progress Bar */}
                        {progress !== undefined && progress >= 0 && (
                          <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                hasError ? 'bg-red-400' : isComplete ? 'bg-turbo-green' : 'bg-turbo-red'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Insufficient Credits Warning */}
      {selectedFolder && selectedFolder.length > 0 && totalCost > creditBalance && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Insufficient credits. Need {(totalCost - creditBalance).toFixed(4)} more credits.</span>
          </div>
        </div>
      )}

      {/* Deploy Message */}
      {deployMessage && (
        <div className={`mt-4 p-3 rounded-lg ${
          deployMessage.type === 'error' 
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : deployMessage.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
        }`}>
          {deployMessage.text}
        </div>
      )}

      {/* Deploy Results - Unified with Upload Results */}
      {deployHistory.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-surface rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h4 className="font-bold text-fg-muted flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-turbo-green" />
              Site Deployment Results
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={exportDeployToCSV}
                className="flex items-center gap-1 px-3 py-2 text-xs bg-turbo-green/20 text-turbo-green rounded hover:bg-turbo-green/30 transition-colors"
                title="Export deployment history to CSV"
              >
                <Archive className="w-3 h-3" />
                <span className="hidden xs:inline">Export CSV</span>
                <span className="xs:hidden">CSV</span>
              </button>
              <button
                onClick={() => {
                  // Check status for all deployed items (manifest + files)
                  const allIds = deployHistory.flatMap(result => {
                    if (result.type === 'manifest') return result.id ? [result.id] : [];
                    if (result.type === 'files') return result.files?.map(f => f.id) || [];
                    return [];
                  });
                  checkMultipleStatuses(allIds);
                }}
                disabled={Object.values(statusChecking).some(checking => checking)}
                className="flex items-center gap-1 px-3 py-2 text-xs bg-turbo-red/20 text-turbo-red rounded hover:bg-turbo-red/30 transition-colors disabled:opacity-50"
                title="Check status for all deployed files"
              >
                <RefreshCw className={`w-3 h-3 ${Object.values(statusChecking).some(checking => checking) ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Check Status</span>
                <span className="xs:hidden">Status</span>
              </button>
              <button
                onClick={clearDeployHistory}
                className="flex items-center gap-1 px-3 py-2 text-xs text-link hover:text-fg-muted border border-default/30 rounded hover:border-default/50 transition-colors"
                title="Clear all deployment history"
              >
                <XCircle className="w-3 h-3" />
                <span className="hidden xs:inline">Clear History</span>
                <span className="xs:hidden">Clear</span>
              </button>
            </div>
          </div>
          
          <div className="space-y-4 max-h-[700px] overflow-y-auto">
            {(() => {
              // Group deploy results by manifest ID to show complete deployments
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

              return Object.entries(deploymentGroups).map(([manifestId, group]) => {
                
                return (
                <div key={manifestId} className="border border-default/30 rounded-lg p-4 bg-canvas/50">
                  {/* Single Consolidated Header - Manifest as Primary */}
                  {group.manifest && (
                    <div className="bg-surface rounded-lg p-3 border border-turbo-green/30 mb-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* Main Info Row */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Status Icon */}
                          {uploadStatuses[manifestId] ? (() => {
                            const iconType = getStatusIcon(uploadStatuses[manifestId].status, uploadStatuses[manifestId].info);
                            const iconColor = getStatusColor(uploadStatuses[manifestId].status, uploadStatuses[manifestId].info);
                            return renderStatusIcon(iconType);
                          })() : <Clock className="w-4 h-4 text-yellow-500" />}
                          
                          {/* Globe Icon - Indicates site manifest */}
                          <Globe className="w-4 h-4 text-turbo-green" />
                          
                          {/* Shortened Transaction ID */}
                          <div className="font-mono text-sm text-fg-muted">
                            {manifestId.substring(0, 5)}...
                          </div>
                          
                          {/* Timestamp - Desktop only */}
                          {group.manifest.timestamp && (
                            <span className="text-xs text-link hidden sm:inline">
                              {new Date(group.manifest.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        {/* Desktop: Show all actions */}
                        <div className="hidden sm:flex items-center gap-1">
                          <CopyButton textToCopy={manifestId} />
                          <button
                            onClick={() => setShowReceiptModal(manifestId)}
                            className="p-1.5 text-link hover:text-turbo-red transition-colors"
                            title="View Receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => checkUploadStatus(manifestId)}
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
                            href={getArweaveUrl(manifestId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-link hover:text-turbo-red transition-colors"
                            title="Visit Deployed Site"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        {/* Mobile: 3-dot menu */}
                        <div className="sm:hidden">
                          <Popover className="relative">
                            <PopoverButton className="p-1.5 text-link hover:text-fg-muted transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </PopoverButton>
                            <PopoverPanel className="absolute right-0 mt-2 w-48 bg-surface border border-default rounded-lg shadow-lg z-[100] py-1">
                              {({ close }) => (
                                <>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(manifestId);
                                      close();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                  >
                                    <Receipt className="w-4 h-4" />
                                    Copy Manifest ID
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
                                      checkUploadStatus(manifestId);
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
                                    href={getArweaveUrl(manifestId)}
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
                      
                      {/* Mobile Timestamp Row */}
                      {group.manifest.timestamp && (
                        <div className="text-xs text-link sm:hidden mt-2">
                          {new Date(group.manifest.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Files Section */}
                  {group.files && group.files.files && (
                    <details className="bg-surface rounded-lg border border-default/30">
                      <summary className="cursor-pointer p-3 font-medium text-fg-muted flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        Files ({group.files.files.length})
                        <ChevronDown className="w-3 h-3 text-link ml-auto" />
                      </summary>
                        <div className="px-3 pb-3 space-y-2 max-h-60 overflow-y-auto">
                          {group.files.files.map((file: any, fileIndex: number) => {
                            const status = uploadStatuses[file.id];
                            const isChecking = statusChecking[file.id];
                            
                            return (
                              <div key={fileIndex} className="bg-canvas rounded-lg p-3 border border-default/30">
                                <div className="space-y-2">
                                  {/* Row 1: Status Icon + Shortened TxID + File Path + Actions */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {/* Status Icon (no text) */}
                                      {status ? (() => {
                                        const iconType = getStatusIcon(status.status, status.info);
                                        const iconColor = getStatusColor(status.status, status.info);
                                        return renderStatusIcon(iconType);
                                      })() : <Clock className="w-4 h-4 text-yellow-500" />}
                                      
                                      {/* Shortened Transaction ID */}
                                      <div className="font-mono text-sm text-fg-muted">
                                        {file.id.substring(0, 5)}...
                                      </div>
                                      
                                      {/* File Path */}
                                      <div className="text-sm text-fg-muted truncate" title={file.path}>
                                        {file.path.split('/').pop() || file.path}
                                      </div>
                                    </div>
                                    
                                    {/* Desktop: Show all actions */}
                                    <div className="hidden sm:flex items-center gap-1">
                                      <CopyButton textToCopy={file.id} />
                                      <button
                                        onClick={() => setShowReceiptModal(file.id)}
                                        className="p-1.5 text-link hover:text-turbo-red transition-colors"
                                        title="View Receipt"
                                      >
                                        <Receipt className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => checkUploadStatus(file.id)}
                                        disabled={isChecking}
                                        className="p-1.5 text-link hover:text-turbo-red transition-colors disabled:opacity-50"
                                        title="Check Status"
                                      >
                                        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                      </button>
                                      <a
                                        href={getArweaveUrl(file.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-link hover:text-turbo-red transition-colors"
                                        title="View File"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    </div>

                                    {/* Mobile: 3-dot menu */}
                                    <div className="sm:hidden">
                                      <Popover className="relative">
                                        <PopoverButton className="p-1.5 text-link hover:text-fg-muted transition-colors">
                                          <MoreVertical className="w-4 h-4" />
                                        </PopoverButton>
                                        <PopoverPanel className="absolute right-0 mt-2 w-40 bg-surface border border-default rounded-lg shadow-lg z-[100] py-1">
                                          {({ close }) => (
                                            <>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(file.id);
                                                  close();
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                              >
                                                <Receipt className="w-4 h-4" />
                                                Copy File ID
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
                                                  checkUploadStatus(file.id);
                                                  close();
                                                }}
                                                disabled={isChecking}
                                                className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2 disabled:opacity-50"
                                              >
                                                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                                Check Status
                                              </button>
                                              <a
                                                href={getArweaveUrl(file.id)}
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
                                        ? `${file.size}B` 
                                        : file.size < 1024 * 1024 
                                        ? `${(file.size / 1024).toFixed(2)} KB`
                                        : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                    </span>
                                  </div>

                                  {/* Row 3: Cost + Deploy Timestamp */}
                                  <div className="flex items-center gap-2 text-sm text-link">
                                    <span>
                                      {file.size < 100 * 1024 ? (
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
              });
            })()}
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
                      <strong className="text-fg-muted">CONFIRMED/new</strong> - File bundling processing started
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

      {/* Technical Features */}
      <div className="grid md:grid-cols-3 gap-4 mt-4 sm:mt-6">
        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Permanent Deployment</h4>
              <p className="text-xs text-link">
                Sites are permanently stored on Arweave - no expiration dates or hosting fees.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Immutable Content</h4>
              <p className="text-xs text-link">
                Deployed sites cannot be censored, taken down, or modified - guaranteed permanence.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-default">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-turbo-red/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Folder className="w-5 h-5 text-turbo-red" />
            </div>
            <div>
              <h4 className="font-bold text-fg-muted mb-1 text-sm">Folder Structure Preserved</h4>
              <p className="text-xs text-link">
                Relative paths and folder hierarchy maintained for proper site navigation.
              </p>
            </div>
          </div>
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