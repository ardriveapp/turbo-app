import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFolderUpload } from '../../hooks/useFolderUpload';
import { wincPerCredit, tokenLabels } from '../../constants';
import { useStore } from '../../store/useStore';
import { Globe, XCircle, Loader2, RefreshCw, Info, Receipt, ChevronDown, ChevronUp, CheckCircle, Folder, File, FileText, Image, Code, ExternalLink, Home, AlertTriangle, Archive, Clock, HelpCircle, MoreVertical, Zap, ArrowRight, Copy, X } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import CopyButton from '../CopyButton';
import { getArweaveUrl, getArweaveRawUrl } from '../../utils';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import { useOwnedArNSNames } from '../../hooks/useOwnedArNSNames';
import { useNavigate } from 'react-router-dom';
import ReceiptModal from '../modals/ReceiptModal';
import ArNSAssociationPanel from '../ArNSAssociationPanel';
import AssignDomainModal from '../modals/AssignDomainModal';
import BaseModal from '../modals/BaseModal';
import UploadProgressSummary from '../UploadProgressSummary';
import { JitPaymentCard } from '../JitPaymentCard';
import { supportsJitPayment, getTokenConverter } from '../../utils/jitPayment';

// Enhanced Deploy Confirmation Modal for original deploy page
interface DeployConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  folderName: string;
  fileCount: number;
  totalSize: number;
  totalCost: number;
  indexFile: string;
  fallbackFile: string;
  // ArNS specific props
  arnsEnabled: boolean;
  arnsName: string;
  undername: string;
  // JIT payment props
  currentBalance: number;
  walletType: 'arweave' | 'ethereum' | 'solana' | null;
  jitEnabled: boolean;
  onJitEnabledChange: (enabled: boolean) => void;
  jitMaxTokenAmount: number;
  onJitMaxTokenAmountChange: (amount: number) => void;
}

function DeployConfirmationModal({
  onClose,
  onConfirm,
  folderName,
  fileCount,
  totalSize,
  totalCost,
  indexFile,
  fallbackFile,
  arnsEnabled,
  arnsName,
  undername,
  currentBalance,
  walletType,
  jitEnabled,
  onJitEnabledChange,
  jitMaxTokenAmount,
  onJitMaxTokenAmountChange,
}: DeployConfirmationModalProps) {
  const creditsNeeded = Math.max(0, totalCost - currentBalance);

  // Determine the token type for JIT payment
  // Arweave wallets must use ARIO for JIT (not AR)
  // Ethereum wallets use Base-ETH for JIT
  const jitTokenType = walletType === 'arweave'
    ? 'ario'
    : walletType === 'ethereum'
    ? 'base-eth'
    : walletType;
  const showJitOption = creditsNeeded > 0 && jitTokenType && supportsJitPayment(jitTokenType);
  return (
    <BaseModal onClose={onClose}>
      <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto min-w-[90vw] sm:min-w-[600px]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-turbo-red" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-fg-muted">Ready to Deploy</h3>
            <p className="text-sm text-link">Confirm your deployment details</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-surface rounded-lg p-4">
            {/* Main deployment stats */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-link">Folder:</span>
                <span className="font-medium text-fg-muted">{folderName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-link">Files:</span>
                <span className="font-medium text-fg-muted">{fileCount} files</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-link">Size:</span>
                <span className="font-medium text-fg-muted">
                  {(totalSize / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-link">Cost:</span>
                <span className="font-medium text-fg-muted">
                  {totalCost === 0 ? (
                    <span className="text-turbo-green font-bold">FREE</span>
                  ) : (
                    `${totalCost.toFixed(6)} Credits`
                  )}
                </span>
              </div>
            </div>
            
            {/* Auto-detected files */}
            {(indexFile || fallbackFile) && (
              <div className="border-t border-default/30 pt-3">
                <div className="text-xs text-link mb-2">Configurations:</div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                  {indexFile && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-turbo-green" />
                      <span className="text-fg-muted">Homepage: {indexFile}</span>
                    </div>
                  )}
                  {fallbackFile && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-fg-muted">Error page: {fallbackFile}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ArNS Configuration Display */}
            {arnsEnabled && arnsName && (
              <div className="border-t border-default/30 pt-3 mt-3">
                <div className="text-xs text-link mb-2">Domain Configuration:</div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3 text-fg-muted" />
                  <span className="text-sm font-medium text-fg-muted">
                    {undername ? undername + '_' : ''}{arnsName}.ar.io
                  </span>
                </div>
                <div className="text-xs text-link mt-1">
                  Your site will be accessible at this url
                </div>
              </div>
            )}
          </div>
        </div>

        {/* JIT Payment Card - Show when insufficient credits and wallet supports it */}
        {showJitOption && jitTokenType && (
          <div className="mb-6">
            <JitPaymentCard
              creditsNeeded={creditsNeeded}
              totalCost={totalCost}
              currentBalance={currentBalance}
              tokenType={jitTokenType}
              enabled={jitEnabled}
              onEnabledChange={onJitEnabledChange}
              maxTokenAmount={jitMaxTokenAmount}
              onMaxTokenAmountChange={onJitMaxTokenAmountChange}
            />
          </div>
        )}

        {/* Insufficient credits warning - Only show if JIT disabled or not supported */}
        {creditsNeeded > 0 && !jitEnabled && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Insufficient credits. You need {creditsNeeded.toFixed(6)} more credits.
                {!showJitOption && (
                  <>
                    {' '}
                    <a href="/topup" className="underline hover:text-red-300 transition-colors">
                      Buy credits
                    </a>{' '}
                    to continue.
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Terms and Conditions */}
        <div className="bg-surface/30 rounded-lg p-3 mb-6">
          <p className="text-xs text-link text-center">
            By deploying, you agree to our{' '}
            <a
              href="https://ardrive.io/tos-and-privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-turbo-red hover:text-turbo-red/80 transition-colors underline"
            >
              Terms of Service
            </a>
            {jitEnabled && creditsNeeded > 0 && walletType && (
              <>
                {' '}and authorize auto-payment of up to{' '}
                <span className="font-medium">
                  {jitMaxTokenAmount} {tokenLabels[walletType]}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-lg border border-default text-link hover:text-fg-muted hover:border-default/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={creditsNeeded > 0 && !jitEnabled}
            className="flex-1 py-3 px-4 rounded-lg bg-turbo-red text-white font-medium hover:bg-turbo-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-link"
          >
            {jitEnabled && creditsNeeded > 0 ? 'Deploy & Auto-Pay' : 'Deploy Now'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

export default function DeploySitePanel() {
  const navigate = useNavigate();
  const {
    address,
    walletType,
    creditBalance,
    deployHistory,
    addDeployResults,
    clearDeployHistory,
    jitPaymentEnabled,
    jitMaxTokenAmount,
    setJitPaymentEnabled,
    setJitMaxTokenAmount,
  } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileList | null>(null);
  const [deployMessage, setDeployMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showFolderContents, setShowFolderContents] = useState(false);
  const [indexFile, setIndexFile] = useState<string>('');
  const [fallbackFile, setFallbackFile] = useState<string>('');
  // ArNS state
  const [arnsEnabled, setArnsEnabled] = useState(false);
  const [selectedArnsName, setSelectedArnsName] = useState('');
  const [selectedUndername, setSelectedUndername] = useState('');
  const [arnsUpdateCancelled, setArnsUpdateCancelled] = useState(false);
  const [showDeployResults, setShowDeployResults] = useState(true);
  const [deploySuccessInfo, setDeploySuccessInfo] = useState<{manifestId: string; arnsConfigured: boolean; arnsName?: string; undername?: string; arnsTransactionId?: string} | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentDeployResult, setCurrentDeployResult] = useState<any>(null);
  const [postDeployArNSName, setPostDeployArNSName] = useState('');
  const [postDeployUndername, setPostDeployUndername] = useState('');
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [postDeployArNSUpdating, setPostDeployArNSUpdating] = useState(false);
  // Post-deployment ArNS enabled state (disabled by default, user can enable)
  const [postDeployArNSEnabled, setPostDeployArNSEnabled] = useState(false);
  // Domain assignment modal state
  const [showAssignDomainModal, setShowAssignDomainModal] = useState<string | null>(null);

  // JIT payment local state for this deployment
  const [localJitEnabled, setLocalJitEnabled] = useState(jitPaymentEnabled);

  // Determine the token type for JIT payment
  // Arweave wallets must use ARIO for JIT (not AR)
  // Ethereum wallets use Base-ETH for JIT
  const jitTokenTypeForDefaults = walletType === 'arweave'
    ? 'ario'
    : walletType === 'ethereum'
    ? 'base-eth'
    : walletType;

  const [localJitMax, setLocalJitMax] = useState(
    jitTokenTypeForDefaults && jitMaxTokenAmount[jitTokenTypeForDefaults]
      ? jitMaxTokenAmount[jitTokenTypeForDefaults]
      : 0
  );

  // Fixed 10% buffer for SDK (not exposed to user)
  const FIXED_BUFFER_MULTIPLIER = 1.1;
  const wincForOneGiB = useWincForOneGiB();
  const {
    deployFolder,
    deploying,
    deployProgress,
    deployStage,
    currentFile,
    updateDeployStage,
    uploadedCount,
    totalFilesCount,
    failedCount,
    activeUploads,
    recentFiles,
    uploadErrors,
    totalSize,
    uploadedSize,
    retryFailedFiles,
    cancelUploads
  } = useFolderUpload();
  const { 
    checkUploadStatus, 
    checkMultipleStatuses, 
    statusChecking, 
    uploadStatuses, 
    getStatusIcon,
    initializeFromCache
  } = useUploadStatus();
  const { updateArNSRecord, refreshSpecificName, names: userArnsNames } = useOwnedArNSNames();

  // Handle successful domain assignment from modal
  const handleAssignDomainSuccess = (manifestId: string, arnsName: string, undername?: string, transactionId?: string) => {
    // Add ArNS update to deploy history
    const arnsUpdateRecord = {
      type: 'arns-update' as const,
      id: transactionId || '',
      manifestId: manifestId,
      arnsName: arnsName,
      undername: undername,
      targetId: manifestId,
      timestamp: Date.now(),
      arnsStatus: 'success' as const,
      arnsError: undefined
    };
    
    addDeployResults([arnsUpdateRecord]);
    
    // Refresh the specific ArNS name state
    setTimeout(() => {
      refreshSpecificName(arnsName);
    }, 3000);
    
    // Close modal and show success message
    setShowAssignDomainModal(null);
    const existingAssociation = getArNSAssociation(manifestId);
    const isUpdate = existingAssociation && existingAssociation.arnsName;
    setDeployMessage({
      type: 'success',
      text: `Domain ${undername ? undername + '_' : ''}${arnsName}.ar.io ${isUpdate ? 'updated' : 'assigned'} successfully!`
    });
  };

  // Memoize deployment grouping to prevent lag
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

  // Limit recent deployments to 5 for this page  
  const recentDeploymentEntries = useMemo(() => {
    return Object.entries(deploymentGroups).slice(0, 5);
  }, [deploymentGroups]);

  // Helper to find ArNS association for a manifest
  const getArNSAssociation = useCallback((manifestId: string) => {
    return deployHistory.find(record => 
      record.type === 'arns-update' && 
      record.manifestId === manifestId
    );
  }, [deployHistory]);

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
        detectedFallback = detectedIndex; // Suggest same as index for SPA routing
      }
    }

    setIndexFile(detectedIndex);
    setFallbackFile(detectedFallback);
    
  };

  const calculateTotalSize = (): number => {
    if (!selectedFolder) return 0;
    return Array.from(selectedFolder).reduce((total, file) => total + file.size, 0);
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

  // Initialize status from cache (no API calls) when component loads
  useEffect(() => {
    if (deployHistory.length > 0) {
      const allIds = recentDeploymentEntries.flatMap(([manifestId, group]) => {
        const ids = [];
        if (manifestId) ids.push(manifestId);
        if (group.files?.files) ids.push(...group.files.files.map((f: any) => f.id));
        return ids;
      });
      
      // Initialize from cache only (no API calls)
      initializeFromCache(allIds);
    }
  }, [deployHistory, recentDeploymentEntries, initializeFromCache]);

  // ArNS names are fetched automatically when user connects (in useOwnedArNSNames hook)

  const handleConfirmDeploy = async () => {
    setShowConfirmModal(false);
    if (!selectedFolder || selectedFolder.length === 0) {
      setDeployMessage({ type: 'error', text: 'Please select a folder to deploy' });
      return;
    }

    if (!address) {
      setDeployMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    // Save JIT preferences to store
    setJitPaymentEnabled(localJitEnabled);

    // Determine the token type for JIT payment
    // Arweave wallets must use ARIO for JIT (not AR)
    // Ethereum wallets use Base-ETH for JIT
    const jitTokenType = walletType === 'arweave'
      ? 'ario'
      : walletType === 'ethereum'
      ? 'base-eth'
      : walletType;

    // Save max token amount to store for future use
    if (jitTokenType) {
      setJitMaxTokenAmount(jitTokenType, localJitMax);
    }

    // Convert max token amount to smallest unit for SDK
    let jitMaxTokenAmountSmallest = 0;
    if (localJitEnabled && jitTokenType && supportsJitPayment(jitTokenType)) {
      const converter = getTokenConverter(jitTokenType);
      jitMaxTokenAmountSmallest = converter ? converter(localJitMax) : 0;
    }

    try {
      setDeployMessage(null);
      setDeploySuccessInfo(null); // Clear any previous success info
      setArnsUpdateCancelled(false); // Reset cancel state for new deployment
      const result = await deployFolder(Array.from(selectedFolder), {
        indexFile: indexFile || undefined,
        fallbackFile: fallbackFile || undefined,
        jitEnabled: localJitEnabled,
        jitMaxTokenAmount: jitMaxTokenAmountSmallest,
        jitBufferMultiplier: FIXED_BUFFER_MULTIPLIER,
      });
      
      if (result.manifestId) {
        // Add results to store for persistence
        addDeployResults(result.results || []);
        
        // Store current deployment result for cancel button access
        setCurrentDeployResult(result);
        
        // Handle ArNS update if enabled and not cancelled
        if (arnsEnabled && selectedArnsName && !arnsUpdateCancelled) {
          try {
            // Keep deployment progress visible and update stage to show ArNS update
            updateDeployStage('updating-arns');
            console.log('Updating ArNS record:', { name: selectedArnsName, manifestId: result.manifestId, undername: selectedUndername });
            
            const arnsResult = await updateArNSRecord(
              selectedArnsName,
              result.manifestId,
              selectedUndername || undefined
            );
            
            // Add ArNS update to deploy history
            const arnsUpdateRecord = {
              type: 'arns-update' as const,
              id: arnsResult.transactionId || '',
              manifestId: result.manifestId,
              arnsName: selectedArnsName,
              undername: selectedUndername || undefined,
              targetId: result.manifestId,
              timestamp: Date.now(),
              arnsStatus: arnsResult.success ? 'success' as const : 'failed' as const,
              arnsError: arnsResult.error
            };
            
            addDeployResults([arnsUpdateRecord]);
            
            if (arnsResult.success) {
              // Mark deployment as complete and store success info
              updateDeployStage('complete');
              setDeploySuccessInfo({
                manifestId: result.manifestId,
                arnsConfigured: true,
                arnsName: selectedArnsName,
                undername: selectedUndername || undefined,
                arnsTransactionId: arnsResult.transactionId
              });
              
              // Refresh the specific ArNS name to get latest state
              setTimeout(() => {
                refreshSpecificName(selectedArnsName);
              }, 3000); // Wait 3 seconds for propagation
            } else {
              // Mark deployment as complete even if ArNS failed
              updateDeployStage('complete');
              // Site deployed successfully but ArNS failed - still show success with error info
              setDeploySuccessInfo({
                manifestId: result.manifestId,
                arnsConfigured: false // Failed ArNS = show enhancement option
              });
              setDeployMessage({
                type: 'error',
                text: `ArNS update failed: ${arnsResult.error}. Site is deployed successfully.`
              });
            }
          } catch (arnsError) {
            console.error('ArNS update failed:', arnsError);
            // Mark deployment as complete even if ArNS failed
            updateDeployStage('complete');
            // Still show success since site deployed, just note ArNS failed
            setDeploySuccessInfo({
              manifestId: result.manifestId,
              arnsConfigured: false
            });
            setDeployMessage({
              type: 'error',
              text: 'ArNS update failed. Site is deployed successfully.'
            });
          }
        } else {
          // No ArNS update - mark deployment complete and store success info
          updateDeployStage('complete');
          setDeploySuccessInfo({
            manifestId: result.manifestId,
            arnsConfigured: false
          });
        }
        
        // Clear the folder selection since deployment is complete
        setSelectedFolder(null);
        setShowFolderContents(false);
        setIndexFile('');
        setFallbackFile('');
        // Clear ArNS state
        setArnsEnabled(false);
        setSelectedArnsName('');
        setSelectedUndername('');
        // Reset post-deploy ArNS state for fresh start
        setPostDeployArNSName('');
        setPostDeployUndername('');
        setPostDeployArNSEnabled(false);
        
        // Trigger balance refresh after successful deployment
        window.dispatchEvent(new CustomEvent('refresh-balance'));
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
        <p className="text-link">Connect your wallet to deploy sites</p>
      </div>
    );
  }

  const totalFileSize = calculateTotalSize();
  const totalCost = calculateTotalCost();
  const folderName = selectedFolder?.[0]?.webkitRelativePath?.split('/')[0] || '';

  return (
    <div className="px-4 sm:px-6">
      {/* Success-focused header when deployment is complete */}
      {deploySuccessInfo ? (
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-turbo-green/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <CheckCircle className="w-5 h-5 text-turbo-green" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-fg-muted mb-1">
              {deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ? 
                'Site Deployed with Domain' : 
                'Site Deployed'
              }
            </h3>
            <p className="text-sm text-link">
              Success! Your site is live on the permanent web.
            </p>
          </div>
        </div>
      ) : (
        /* Normal deploy header when not showing success */
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <Zap className="w-5 h-5 text-turbo-red" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-fg-muted mb-1">Deploy Site</h3>
            <p className="text-sm text-link">
              Deploy NFT collections, static sites and apps to the permanent web
            </p>
          </div>
        </div>
      )}

      {/* Main Content Container with Gradient - Hide during success and deployment */}
      {!deploySuccessInfo && !deploying && (
        <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-turbo-red/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Dynamic Zone: Drop Zone OR Selected Folder */}
        {!selectedFolder || selectedFolder.length === 0 ? (
          /* Drop Zone when no folder selected */
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
            <Zap className="w-12 h-12 text-turbo-red mx-auto mb-2" />
            <p className="text-lg font-medium mb-2">
              Drop site folder here or click to browse
            </p>
            <p className="text-sm text-link mb-4">
              Select your site folder (HTML, CSS, JS, assets) for deployment
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
        ) : (
          /* Selected Folder Card - replaces drop zone */
          <div className="bg-surface/0 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-fg-muted" />
                  <div>
                    <h4 className="font-medium text-fg-muted">{folderName}</h4>
                    <p className="text-xs text-link">{selectedFolder?.length} files</p>
                  </div>
                </div>
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
                  className="text-link hover:text-red-400 transition-colors"
                  title="Clear folder selection"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Separator */}
              <div className="border-t border-default/20 my-4" />

              {/* Expandable File Tree */}
              <button
                onClick={() => setShowFolderContents(!showFolderContents)}
                className="flex items-center justify-between w-full text-left hover:bg-canvas/50 rounded p-2 transition-colors"
              >
                <span className="text-sm text-fg-muted">View folder contents</span>
                <ChevronDown className={`w-4 h-4 text-link transition-transform ${showFolderContents ? 'rotate-180' : ''}`} />
              </button>
                
                {showFolderContents && (
                  <div className="mt-3 p-3 bg-surface/50 rounded border border-default/30 max-h-60 overflow-y-auto">
                    <div className="space-y-1 text-xs font-mono">
                      {(() => {
                        const structure = organizeFolderStructure();
                        const sortedFolders = Object.keys(structure).sort();
                        
                        return sortedFolders.map(folderPath => (
                          <div key={folderPath}>
                            {/* Folder Header */}
                            {folderPath !== 'root' && (
                              <div className="flex items-center gap-2 text-fg-muted font-medium mb-1">
                                <Folder className="w-3 h-3 text-fg-muted" />
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

                                        <span className="text-link/70 text-xs">
                                          {fileSize}
                                          {file.size < 100 * 1024 && <span className="ml-1 text-turbo-green">• FREE</span>}
                                        </span>
                                        
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

            {/* SPA Routing Info - Only show when we couldn't auto-detect proper fallback */}
            {(!indexFile || !fallbackFile || fallbackFile !== indexFile) && (
              <div className="mt-4 p-3 bg-turbo-red/10 border border-turbo-red/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-turbo-red flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-link">
                    <strong className="text-fg-muted">SPA Routing Configuration:</strong> We couldn't automatically detect your fallback file. For React/Vue/Angular apps, set the <strong>Fallback</strong> to your main HTML file (usually{' '}
                    <code className="px-1 py-0.5 bg-turbo-red/20 rounded text-turbo-red font-mono text-xs">index.html</code>
                    ) to enable client-side routing. This ensures URLs like{' '}
                    <code className="px-1 py-0.5 bg-turbo-red/20 rounded text-turbo-red font-mono text-xs">/topup</code>
                    {' '}work correctly instead of showing 404 errors.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      )}
        
      {/* ArNS Association Panel - Show for all users, but only Arweave wallets can actually update records */}
      {selectedFolder && selectedFolder.length > 0 && (walletType === 'arweave' || walletType === 'ethereum') && !deploySuccessInfo && !deploying && (
        <ArNSAssociationPanel
          enabled={arnsEnabled}
          onEnabledChange={setArnsEnabled}
          selectedName={selectedArnsName}
          onNameChange={setSelectedArnsName}
          selectedUndername={selectedUndername}
          onUndernameChange={setSelectedUndername}
        />
      )}

      {/* Summary Panel - After ArNS configuration, hide during success and deployment */}
      {selectedFolder && selectedFolder.length > 0 && !deploySuccessInfo && !deploying && (
        <div className="mt-4 p-4 bg-surface/50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-link">Total Size:</span>
              <span className="font-medium">{(totalFileSize / 1024 / 1024).toFixed(2)} MB</span>
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

            {/* Insufficient Credits Warning */}
            {selectedFolder && selectedFolder.length > 0 && totalCost > creditBalance && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>Insufficient credits. Need {(totalCost - creditBalance).toFixed(4)} more credits.</span>
                </div>
              </div>
            )}

          </div>
      )}


      {/* Deploy Button - Hide during success display and deployment */}
      {selectedFolder && selectedFolder.length > 0 && !deploySuccessInfo && !deploying && creditBalance >= totalCost && (
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={deploying || totalCost > creditBalance || (arnsEnabled && !selectedArnsName)}
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
              Confirm Deployment
            </>
          )}
        </button>
      )}

      {/* Deploy Progress with New Summary Component */}
      {deploying && selectedFolder && deployStage === 'uploading' && (
        <div className="mt-4">
          <UploadProgressSummary
            uploadedCount={uploadedCount}
            totalCount={totalFilesCount}
            failedCount={failedCount}
            activeUploads={activeUploads}
            recentFiles={recentFiles}
            errors={uploadErrors}
            totalSize={totalSize}
            uploadedSize={uploadedSize}
            onRetryFailed={retryFailedFiles}
            onCancel={cancelUploads}
          />
        </div>
      )}

      {/* Non-upload stages (manifest, ArNS update) */}
      {deploying && selectedFolder && deployStage !== 'uploading' && (
        <div className="mt-4 p-4 bg-surface rounded-lg border border-turbo-red/20">
          <div className="space-y-4">
            {/* Stage Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-turbo-red animate-spin" />
                <span className="font-medium text-fg-muted">
                  {deployStage === 'manifest' && 'Creating Manifest'}
                  {deployStage === 'updating-arns' && 'Updating ArNS Name'}
                  {deployStage === 'complete' && 'Complete'}
                </span>
              </div>
              <span className="text-sm text-link">
                {deployStage === 'manifest' && 'Finalizing deployment...'}
                {deployStage === 'updating-arns' && `Updating ${selectedUndername ? selectedUndername + '_' : ''}${selectedArnsName}.ar.io`}
                {deployStage === 'complete' && 'Deployment complete!'}
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full bg-[#090909] rounded-full h-2 overflow-hidden">
              <div
                className="bg-turbo-red h-full transition-all duration-300"
                style={{ width: `${deployProgress}%` }}
              />
            </div>

            {/* Current File/Stage Info */}
            {(currentFile || deployStage === 'updating-arns') && (
              <div className="flex items-center gap-2 text-sm text-link">
                {deployStage === 'manifest' && (
                  <>
                    <div className="w-2 h-2 bg-turbo-red rounded-full animate-pulse" />
                    <span>{currentFile}</span>
                  </>
                )}
                {deployStage === 'updating-arns' && (
                  <>
                    <div className="w-2 h-2 bg-turbo-yellow rounded-full animate-pulse" />
                    <span>Connecting {selectedUndername ? selectedUndername + '_' : ''}{selectedArnsName}.ar.io to your site...</span>
                  </>
                )}
              </div>
            )}

            {/* Cancel ArNS Update Button */}
            {deployStage === 'updating-arns' && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setArnsUpdateCancelled(true);
                    updateDeployStage('complete');
                    // Show success info since deployment was successful
                    setDeploySuccessInfo({
                      manifestId: currentDeployResult?.manifestId || '',
                      arnsConfigured: false
                    });
                    setDeployMessage({
                      type: 'info',
                      text: 'Site deployed successfully! ArNS update was cancelled.'
                    });
                  }}
                  className="px-4 py-2 text-sm bg-surface border border-default rounded-lg text-link hover:text-fg-muted hover:border-default/50 transition-colors"
                >
                  Skip ArNS Update
                </button>
              </div>
            )}

            {/* File progress details are now handled by UploadProgressSummary */}
          </div>
        </div>
      )}

      {/* Rich Success Display */}
      {deploySuccessInfo && (
        <div className="border border-turbo-green rounded-xl p-6 bg-surface">


          {/* Site Details */}
          <div className="bg-surface rounded-lg p-4 mb-4 space-y-3">
            <div>
              <div className="text-sm text-link mb-2">Your site URL:</div>
              <div className="flex items-center gap-2 p-3 bg-canvas rounded border border-default/30">
                <span className="font-mono text-sm text-fg-muted flex-1 min-w-0 truncate">
                  {deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ? 
                    `https://${deploySuccessInfo.undername ? deploySuccessInfo.undername + '_' : ''}${deploySuccessInfo.arnsName}.ar.io` :
                    `https://arweave.net/${deploySuccessInfo.manifestId}`
                  }
                </span>
                <CopyButton textToCopy={
                  deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ? 
                    `https://${deploySuccessInfo.undername ? deploySuccessInfo.undername + '_' : ''}${deploySuccessInfo.arnsName}.ar.io` :
                    `https://arweave.net/${deploySuccessInfo.manifestId}`
                } />
              </div>
            </div>

            {/* Permanent ID */}
            <div>
              <div className="text-sm text-link mb-2">Deployment Transaction ID:</div>
              <div className="flex items-center gap-2 p-3 bg-canvas rounded border border-default/30">
                <span className="font-mono text-sm text-fg-muted flex-1 min-w-0 truncate">
                  {deploySuccessInfo.manifestId}
                </span>
                <CopyButton textToCopy={deploySuccessInfo.manifestId} />
              </div>
            </div>

            {/* ArNS Transaction ID - Only show if ArNS was configured */}
            {deploySuccessInfo.arnsTransactionId && (
              <div>
                <div className="text-sm text-link mb-2">Domain Update Transaction ID:</div>
                <div className="flex items-center gap-2 p-3 bg-canvas rounded border border-default/30">
                  <span className="font-mono text-sm text-fg-muted flex-1 min-w-0 truncate">
                    {deploySuccessInfo.arnsTransactionId}
                  </span>
                  <CopyButton textToCopy={deploySuccessInfo.arnsTransactionId} />
                </div>
              </div>
            )}
          </div>

          {/* Primary Actions */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => window.open(
                deploySuccessInfo.arnsConfigured && deploySuccessInfo.arnsName ? 
                  `https://${deploySuccessInfo.undername ? deploySuccessInfo.undername + '_' : ''}${deploySuccessInfo.arnsName}.ar.io` :
                  `https://arweave.net/${deploySuccessInfo.manifestId}`,
                '_blank'
              )}
              className="flex-1 py-3 px-4 bg-turbo-green text-white rounded-lg font-medium hover:bg-turbo-green/90 transition-colors"
            >
              Visit Your Site
            </button>
            <button
              onClick={() => {
                setDeploySuccessInfo(null);
                setDeployMessage(null);
                // Reset post-deploy ArNS state
                setPostDeployArNSName('');
                setPostDeployUndername('');
                setPostDeployArNSEnabled(false);
              }}
              className="flex-1 py-3 px-4 bg-surface border border-default rounded-lg text-fg-muted hover:bg-canvas hover:border-turbo-red/50 transition-colors"
            >
              Deploy Another Site
            </button>
          </div>

        </div>
      )}

      {/* ArNS Discovery Section - Only for users without ArNS names */}
      {deploySuccessInfo && !deploySuccessInfo.arnsConfigured && 
       ((walletType !== 'arweave' && walletType !== 'ethereum') || userArnsNames.length === 0) && (
        <div className="mt-6">
          <div className="bg-gradient-to-br from-turbo-yellow/5 to-turbo-yellow/3 rounded-xl border border-turbo-yellow/20 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-turbo-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Globe className="w-5 h-5 text-turbo-yellow" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-fg-muted mb-1">Want a Friendly Domain Name?</h4>
                <p className="text-sm text-link">
                  Your site is live, but you can make it even better with an ArNS domain name
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-turbo-green" />
                <span className="text-link">Human-readable URLs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-turbo-green" />
                <span className="text-link">Lease or Permanently own</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-turbo-green" />
                <span className="text-link">Global propagation across the AR.IO Network</span>
              </div>
            </div>
            
            <div className="bg-surface/50 rounded-lg p-4 mb-4">
              <div className="text-sm text-link mb-2">Instead of:</div>
              <div className="font-mono text-xs text-fg-muted/60 mb-3 break-all">
                https://arweave.net/{deploySuccessInfo.manifestId}
              </div>
              
              <div className="text-sm text-link mb-2">Get something like:</div>
              <div className="font-mono text-sm text-turbo-yellow font-medium">
                https://mysite.ar.io
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.href = '/domains'}
                className="flex-1 py-3 px-4 bg-turbo-yellow text-black rounded-lg font-medium hover:bg-turbo-yellow/90 transition-colors"
              >
                Search for Your Name
              </button>
              <button
                onClick={() => window.open('https://docs.ar.io/arns', '_blank')}
                className="flex-1 py-3 px-4 bg-surface border border-default rounded-lg text-fg-muted hover:bg-canvas transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Deploy ArNS Enhancement - Show ArNS panel for users who have ArNS names */}
      {deploySuccessInfo && !deploySuccessInfo.arnsConfigured && 
       (walletType === 'arweave' || walletType === 'ethereum') && userArnsNames.length > 0 && (
        <div className="mt-6">
          <ArNSAssociationPanel
            enabled={postDeployArNSEnabled}
            onEnabledChange={setPostDeployArNSEnabled}
            selectedName={postDeployArNSName}
            onNameChange={setPostDeployArNSName}
            selectedUndername={postDeployUndername}
            onUndernameChange={setPostDeployUndername}
          />
          
          {/* Connect Domain Action - Only show when enabled and name selected */}
          {postDeployArNSEnabled && postDeployArNSName && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  if (!postDeployArNSName || !deploySuccessInfo?.manifestId) return;
                  
                  setPostDeployArNSUpdating(true);
                  try {
                    console.log('Starting post-deployment ArNS update:', { 
                      arnsName: postDeployArNSName, 
                      manifestId: deploySuccessInfo.manifestId, 
                      undername: postDeployUndername 
                    });
                    
                    const result = await updateArNSRecord(postDeployArNSName, deploySuccessInfo.manifestId, postDeployUndername || undefined);
                    console.log('Post-deployment ArNS update result:', result);
                    
                    if (result.success) {
                      // Add ArNS update to deploy history for Recent Deployments to show
                      const arnsUpdateRecord = {
                        type: 'arns-update' as const,
                        id: result.transactionId || '',
                        manifestId: deploySuccessInfo.manifestId,
                        arnsName: postDeployArNSName,
                        undername: postDeployUndername || undefined,
                        targetId: deploySuccessInfo.manifestId,
                        timestamp: Date.now(),
                        arnsStatus: 'success' as const,
                        arnsError: undefined
                      };
                      
                      addDeployResults([arnsUpdateRecord]);
                      
                      // Update success info to show ArNS was configured
                      setDeploySuccessInfo(prev => prev ? {
                        ...prev,
                        arnsConfigured: true,
                        arnsName: postDeployArNSName,
                        undername: postDeployUndername || undefined,
                        arnsTransactionId: result.transactionId
                      } : prev);
                      
                      // Refresh the specific ArNS name to get latest state
                      setTimeout(() => {
                        refreshSpecificName(postDeployArNSName);
                      }, 3000); // Wait 3 seconds for propagation
                      
                      // Reset ArNS panel state
                      setPostDeployArNSName('');
                      setPostDeployUndername('');
                      setPostDeployArNSEnabled(false);
                      
                      // Clear any existing messages since the success card will show the domain
                      setDeployMessage(null);
                    } else {
                      setDeployMessage({
                        type: 'error',
                        text: `Domain update failed: ${result.error}`
                      });
                    }
                  } catch (error) {
                    console.error('Post-deployment ArNS update error:', error);
                    setDeployMessage({
                      type: 'error',
                      text: `Domain update failed: ${error instanceof Error ? error.message : 'Please try again.'}`
                    });
                  }
                  setPostDeployArNSUpdating(false);
                }}
                disabled={!postDeployArNSName || postDeployArNSUpdating}
                className="w-full py-3 px-4 bg-turbo-yellow text-black rounded-lg hover:bg-turbo-yellow/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {postDeployArNSUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting Domain...
                  </>
                ) : (
                  'Connect Domain'
                )}
              </button>
            </div>
          )}
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
          <div className="flex items-center justify-between">
            <span>{deployMessage.text}</span>
            <button
              onClick={() => setDeployMessage(null)}
              className="ml-4 p-1 hover:opacity-70 transition-opacity flex-shrink-0"
              title="Close message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Deploy Results - Unified Design with Recent Deployments Page */}
      {deployHistory.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 border border-turbo-red/20 rounded-xl">
          {/* Collapsible Header with Actions on Same Row */}
          <div className={`flex items-center justify-between p-4 ${showDeployResults ? 'pb-0 mb-4' : 'pb-4'}`}>
            <button
              onClick={() => setShowDeployResults(!showDeployResults)}
              className="flex items-start gap-2 hover:text-turbo-green transition-colors text-left"
              type="button"
            >
              <Zap className="w-5 h-5 text-turbo-red flex-shrink-0 mt-0.5" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-bold text-fg-muted">Recent</span>
                <span className="text-xs text-link">({recentDeploymentEntries.length}{Object.keys(deploymentGroups).length > 5 ? ' of ' + Object.keys(deploymentGroups).length : ''})</span>
              </div>
              {showDeployResults ? (
                <ChevronUp className="w-4 h-4 text-link flex-shrink-0 mt-0.5" />
              ) : (
                <ChevronDown className="w-4 h-4 text-link flex-shrink-0 mt-0.5" />
              )}
            </button>
            
            {/* Actions only show when expanded */}
            {showDeployResults && (
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
                    // Check status for recent deployed items (manifest + files)
                    const allIds = recentDeploymentEntries.flatMap(([, group]) => {
                      const ids = [];
                      if (group.manifest?.id) ids.push(group.manifest.id);
                      if (group.files?.files) ids.push(...group.files.files.map((f: any) => f.id));
                      return ids;
                    });
                    checkMultipleStatuses(allIds, true);
                  }}
                  disabled={Object.values(statusChecking).some(checking => checking)}
                  className="flex items-center gap-1 px-3 py-2 text-xs bg-surface border border-default rounded text-fg-muted hover:bg-canvas hover:text-fg-muted transition-colors disabled:opacity-50"
                  title="Check status for recent deployed files"
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
            )}
          </div>
          
          {showDeployResults && (
            <>              
              {/* Option 3: Single unified cards */}
              <div className="space-y-4 max-h-[700px] overflow-y-auto px-4">
                {recentDeploymentEntries.map(([manifestId, group]) => {
                  const arnsAssociation = getArNSAssociation(manifestId);
                  
                  return (
                    <div key={manifestId} className="bg-bg-[#090909] border border-turbo-red/20 rounded-lg p-4">
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
                              className="p-1.5 text-link hover:text-fg-muted transition-colors"
                              title="View Receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => checkUploadStatus(manifestId, true)}
                              disabled={!!statusChecking[manifestId]}
                              className="p-1.5 text-link hover:text-fg-muted transition-colors disabled:opacity-50"
                              title="Check Status"
                            >
                              <RefreshCw className={`w-4 h-4 ${statusChecking[manifestId] ? 'animate-spin' : ''}`} />
                            </button>
                            <a
                              href={getArweaveRawUrl(manifestId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-link hover:text-fg-muted transition-colors"
                              title="View Raw Manifest JSON"
                            >
                              <Code className="w-4 h-4" />
                            </a>
                            <a
                              href={getArweaveUrl(manifestId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-link hover:text-fg-muted transition-colors"
                              title="Visit Deployed Site"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            {/* Assign Domain Button - Always show for compatible wallets */}
                            {(walletType === 'arweave' || walletType === 'ethereum') && (
                              <button
                                onClick={() => setShowAssignDomainModal(manifestId)}
                                className="p-1.5 text-link hover:text-fg-muted transition-colors"
                                title={arnsAssociation ? "Change Domain" : "Assign Domain"}
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Mobile: Status + 3-dot menu */}
                          <div className="sm:hidden flex items-center gap-1">
                            {/* Status Icon - visible on mobile, only show if we have real status */}
                            {uploadStatuses[manifestId] && (
                              <div className="p-1.5" title={`Status: ${uploadStatuses[manifestId].status}`}>
                                {(() => {
                                  const iconType = getStatusIcon(uploadStatuses[manifestId].status, uploadStatuses[manifestId].info);
                                  return renderStatusIcon(iconType);
                                })()}
                              </div>
                            )}
                            
                            <Popover className="relative">
                              <PopoverButton className="p-1.5 text-link hover:text-fg-muted transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </PopoverButton>
                              <PopoverPanel anchor="bottom end" className="w-48 bg-surface border border-default rounded-lg shadow-lg z-[9999] py-1 mt-1">
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
                                      href={getArweaveUrl(manifestId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => close()}
                                      className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      Visit Deployed Site
                                    </a>
                                    {/* Assign/Change Domain - Mobile Menu */}
                                    {(walletType === 'arweave' || walletType === 'ethereum') && (
                                      <button
                                        onClick={() => {
                                          setShowAssignDomainModal(manifestId);
                                          close();
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-link hover:bg-canvas transition-colors flex items-center gap-2"
                                      >
                                        <Globe className="w-4 h-4" />
                                        {arnsAssociation ? "Change Domain" : "Assign Domain"}
                                      </button>
                                    )}
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
                          <summary className="cursor-pointer text-sm text-fg-muted flex items-center gap-2 hover:text-white transition-colors">
                            <Folder className="w-4 h-4" />
                            Files ({group.files.files.length})
                            <ChevronDown className="w-3 h-3 text-link ml-auto" />
                          </summary>
                          <div className="pt-3 space-y-2 max-h-60 overflow-y-auto pl-1">
                            {group.files.files.map((file: any, fileIndex: number) => {
                              const status = uploadStatuses[file.id];
                              const isChecking = statusChecking[file.id];
                              
                              return (
                                <div key={fileIndex} className="bg-[#090909] border border-default/20 rounded p-3">
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
                                          className="p-1.5 text-link hover:text-fg-muted transition-colors"
                                          title="View Receipt"
                                        >
                                          <Receipt className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => checkUploadStatus(file.id, true)}
                                          disabled={isChecking}
                                          className="p-1.5 text-link hover:text-fg-muted transition-colors disabled:opacity-50"
                                          title="Check Status"
                                        >
                                          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                        </button>
                                        <a
                                          href={getArweaveUrl(file.id)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 text-link hover:text-fg-muted transition-colors"
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
                                          <PopoverPanel anchor="bottom end" className="w-40 bg-surface border border-default rounded-lg shadow-lg z-[9999] py-1 mt-1">
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
                                          ? `${file.size} B` 
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
                })}
              </div>
            </>
          )}
          
          {/* View All Button at Bottom - only show when expanded and there are deployments */}
          {showDeployResults && Object.keys(deploymentGroups).length > 0 && (
            <div className="border-t border-default mt-4">
              <div className="p-4">
                <button
                  onClick={() => {
                    navigate('/deployments');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-fg-muted hover:text-fg-muted/80 transition-colors font-medium"
                >
                  View All Deployments <ArrowRight className="w-4 h-4" />
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
          receipt={deployHistory.find(r => 
            (r.type === 'manifest' && r.id === showReceiptModal) || 
            (r.type === 'files' && r.files?.find(f => f.id === showReceiptModal))
          )}
          uploadId={showReceiptModal}
        />
      )}

      {/* Deploy Confirmation Modal */}
      {showConfirmModal && selectedFolder && (
        <DeployConfirmationModal
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmDeploy}
          folderName={folderName}
          fileCount={selectedFolder.length}
          totalSize={totalFileSize}
          totalCost={totalCost}
          indexFile={indexFile}
          fallbackFile={fallbackFile}
          arnsEnabled={arnsEnabled}
          arnsName={selectedArnsName}
          undername={selectedUndername}
          currentBalance={creditBalance}
          walletType={walletType}
          jitEnabled={localJitEnabled}
          onJitEnabledChange={setLocalJitEnabled}
          jitMaxTokenAmount={localJitMax}
          onJitMaxTokenAmountChange={setLocalJitMax}
        />
      )}

      {/* Assign Domain Modal */}
      {showAssignDomainModal && (
        <AssignDomainModal
          onClose={() => setShowAssignDomainModal(null)}
          manifestId={showAssignDomainModal}
          existingArnsName={getArNSAssociation(showAssignDomainModal)?.arnsName}
          existingUndername={getArNSAssociation(showAssignDomainModal)?.undername}
          onSuccess={(arnsName, undername, transactionId) => 
            handleAssignDomainSuccess(showAssignDomainModal, arnsName, undername, transactionId)
          }
        />
      )}
    </div>
  );
}