import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Upload,
  AlertCircle,
  ExternalLink,
  Receipt,
  Globe,
  Shield,
  Infinity as InfinityIcon,
  X,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  BookOpen,
  Code,
  ArrowRight,
  RefreshCw,
  MoreVertical,
  Copy,
  CheckCircle,
  Mail,
} from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { usePrivy, useLogin, useWallets, useCreateWallet } from '@privy-io/react-auth';
import { useStore } from '../../store/useStore';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useFreeUploadLimit, isFileFree, formatFreeLimit } from '../../hooks/useFreeUploadLimit';
import { useUploadStatus } from '../../hooks/useUploadStatus';
import { getArweaveUrl, resolveEthereumAddress, getTurboBalance } from '../../utils';
import CopyButton from '../CopyButton';
import ReceiptModal from '../modals/ReceiptModal';

// Get appropriate icon for file type (returns component class)
function getFileIconClass(type: string) {
  if (type.startsWith('image/')) return FileImage;
  if (type.startsWith('video/')) return FileVideo;
  if (type.startsWith('audio/')) return FileAudio;
  if (type.startsWith('text/') || type.includes('document') || type.includes('pdf')) return FileText;
  return File;
}

// Get contextual file icon JSX based on content type or file name
const getFileIcon = (contentType?: string, fileName?: string) => {
  const type = contentType?.toLowerCase() || '';
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';

  // Images
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) {
    return <FileImage className="w-4 h-4 text-foreground/80 flex-shrink-0" />;
  }

  // Videos
  if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return <FileVideo className="w-4 h-4 text-foreground/80 flex-shrink-0" />;
  }

  // Audio
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
    return <FileAudio className="w-4 h-4 text-foreground/80 flex-shrink-0" />;
  }

  // Code files
  if (['application/javascript', 'application/json', 'text/css', 'text/html', 'application/xml', 'text/xml'].includes(type) ||
      ['js', 'ts', 'jsx', 'tsx', 'css', 'html', 'json', 'xml', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'yml', 'yaml', 'toml', 'md'].includes(ext)) {
    return <Code className="w-4 h-4 text-foreground/80 flex-shrink-0" />;
  }

  // Text/Documents
  if (type.startsWith('text/') || ['txt', 'pdf', 'doc', 'docx', 'rtf'].includes(ext)) {
    return <FileText className="w-4 h-4 text-foreground/80 flex-shrink-0" />;
  }

  // Default file icon
  return <File className="w-4 h-4 text-foreground/80 flex-shrink-0" />;
};

export default function TryItNowPanel() {
  const { address, uploadHistory, addUploadResults, setAddress } = useStore();
  const freeLimit = useFreeUploadLimit();
  const { uploadFile } = useFileUpload();
  const { uploadStatuses, getStatusIcon, checkUploadStatus, statusChecking, formatFileSize } = useUploadStatus();

  // Privy hooks
  usePrivy(); // Initialize Privy
  const { wallets: privyWallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [showAllUploads, setShowAllUploads] = useState(false);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [lastUploadedFile, setLastUploadedFile] = useState<{ id: string; fileName: string; dataCaches?: string[] } | null>(null);
  const [waitingForWallet, setWaitingForWallet] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);

  // Track if we should upload after login completes
  const pendingUploadRef = useRef(false);

  // Helper function to resolve and set Ethereum address
  const setEthereumAddress = async (rawAddress: string) => {
    try {
      const resolvedAddress = await resolveEthereumAddress(rawAddress, getTurboBalance);
      setAddress(resolvedAddress, 'ethereum');
      return resolvedAddress;
    } catch (error) {
      console.error('[TryItNow] Error resolving Ethereum address:', error);
      setAddress(rawAddress, 'ethereum');
      return rawAddress;
    }
  };

  // Privy login handler
  const { login } = useLogin({
    onComplete: async ({ user }) => {
      setLoginInProgress(false);

      // Check if user already has a wallet
      const existingWallet = user?.linkedAccounts?.find(
        account => account.type === 'wallet'
      );

      if (existingWallet) {
        await setEthereumAddress(existingWallet.address);
      } else {
        // Create embedded wallet
        setWaitingForWallet(true);
        try {
          const newWallet = await createWallet();
          if (newWallet) {
            await setEthereumAddress(newWallet.address);
            setWaitingForWallet(false);
          } else {
            // createWallet returned null/undefined without throwing
            console.error('[TryItNow] createWallet returned falsy value');
            setWaitingForWallet(false);
            setError('Failed to create wallet. Please try again.');
            pendingUploadRef.current = false;
          }
        } catch (err) {
          console.error('[TryItNow] Failed to create wallet:', err);
          setWaitingForWallet(false);
          setError('Failed to create wallet. Please try again.');
          pendingUploadRef.current = false;
        }
      }
    },
    onError: (error) => {
      console.error('[TryItNow] Login error:', error);
      setLoginInProgress(false);
      setError('Login failed. Please try again.');
      pendingUploadRef.current = false;
    }
  });

  // Watch for wallet to become available after login
  useEffect(() => {
    if (waitingForWallet && privyWallets && privyWallets.length > 0) {
      const privyWallet = privyWallets.find(w =>
        w.walletClientType === 'privy' ||
        w.walletClientType === 'embedded' ||
        !w.imported
      );

      if (privyWallet) {
        setEthereumAddress(privyWallet.address).then(() => {
          setWaitingForWallet(false);
        });
      }
    }
  }, [privyWallets, waitingForWallet]);

  // Check if file is previewable (image)
  const isPreviewable = useMemo(() => {
    return selectedFile?.type.startsWith('image/') ?? false;
  }, [selectedFile]);

  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);
      setSuccessMessage(null);

      // Revoke previous preview URL to prevent memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      // Validate file size against free limit
      if (!isFileFree(file.size, freeLimit)) {
        setError(
          `File too large. Free uploads are limited to ${formatFreeLimit(freeLimit)}. Try a smaller file.`
        );
        return;
      }

      setSelectedFile(file);

      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    },
    [freeLimit, previewUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // The actual upload logic
  const executeUpload = useCallback(async () => {
    if (!selectedFile || !address) return;

    const fileName = selectedFile.name;
    setError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const result = await uploadFile(selectedFile);

      // Save to upload history
      if (result) {
        const resultWithCorrectOwner = {
          ...result,
          owner: address,
        };
        addUploadResults([resultWithCorrectOwner]);
        setLastUploadedFile({ id: result.id, fileName, dataCaches: result.dataCaches });
        setSuccessMessage(`"${fileName}" uploaded successfully!`);
      }

      // Clear selection and revoke preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedFile(null);

      // Trigger balance refresh
      window.dispatchEvent(new CustomEvent('refresh-balance'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, uploadFile, addUploadResults, previewUrl, address]);

  // Execute upload when address becomes available after login
  useEffect(() => {
    if (pendingUploadRef.current && address && selectedFile && !isUploading && !waitingForWallet) {
      pendingUploadRef.current = false;
      executeUpload();
    }
  }, [address, waitingForWallet, selectedFile, isUploading, executeUpload]);

  // Handle upload button click
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setError(null);
    setSuccessMessage(null);

    // If already logged in, upload directly
    if (address) {
      await executeUpload();
      return;
    }

    // Not logged in - trigger Privy login
    pendingUploadRef.current = true;
    setLoginInProgress(true);
    login();
  }, [selectedFile, address, executeUpload, login]);

  const clearSelection = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setError(null);
  }, [previewUrl]);

  // Filter upload history for this address
  const userUploads = uploadHistory.filter(
    (u) => u.owner?.toLowerCase() === address?.toLowerCase()
  );
  const recentUploads = userUploads.slice(0, 5);
  const displayUploads = showAllUploads ? userUploads : recentUploads;

  const FileIcon = selectedFile ? getFileIconClass(selectedFile.type) : File;

  const isLoading = isUploading || loginInProgress || waitingForWallet;
  const loadingText = loginInProgress ? 'Signing in...' : waitingForWallet ? 'Creating wallet...' : 'Uploading...';

  return (
    <div className="px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground mb-1">Try It Out</h3>
          <p className="text-sm text-foreground/80">
            Upload a file for free. It will be stored permanently and accessible to anyone with the link.
          </p>
        </div>
      </div>

      {/* What You Should Know - Key Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/20">
          <InfinityIcon className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Permanent</p>
            <p className="text-xs text-foreground/80">Stored forever, can't be deleted</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/20">
          <Globe className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Public</p>
            <p className="text-xs text-foreground/80">Anyone with the link can view</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/20">
          <Shield className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Verifiable</p>
            <p className="text-xs text-foreground/80">Tamper-proof and authentic</p>
          </div>
        </div>
      </div>

      {/* Upload Area - Only show if bundler supports free uploads */}
      {freeLimit > 0 ? (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/30 p-6 mb-6">
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-primary/30 hover:border-primary/50'
              }`}
            >
              <div className="mb-4">
                <Upload className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-lg font-medium mb-2">
                  Drop a file here or click to browse
                </p>
                <p className="text-sm text-foreground/80">
                  Max file size: <span className="text-foreground font-medium">{formatFreeLimit(freeLimit)}</span>
                </p>
              </div>
              <input
                type="file"
                onChange={handleInputChange}
                className="hidden"
                id="try-file-upload"
              />
              <label
                htmlFor="try-file-upload"
                className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium cursor-pointer hover:bg-primary/90 transition-colors"
              >
                Select File
              </label>
            </div>
          ) : (
          <div className="space-y-4">
            {/* File Preview / Info */}
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-start gap-4">
                {/* Preview or Icon */}
                <div className="flex-shrink-0">
                  {isPreviewable && previewUrl ? (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-card border border-border/20">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-card border border-border/20 flex items-center justify-center">
                      <FileIcon className="w-8 h-8 text-foreground/80" />
                    </div>
                  )}
                </div>

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate mb-1">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-foreground/80 mb-1">{formatFileSize(selectedFile.size)}</p>
                  <p className="text-xs text-foreground/70">{selectedFile.type || 'Unknown type'}</p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={clearSelection}
                  className="p-1.5 text-foreground/80 hover:text-foreground hover:bg-card rounded-full transition-colors"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Upload Button - Shows email sign-in hint if not logged in */}
            <button
              onClick={handleUpload}
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  {loadingText}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload File
                </>
              )}
            </button>

            {/* Sign-in hint for non-authenticated users */}
            {!address && !isLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground/80">
                <Mail className="w-4 h-4" />
                <span>You'll sign in with email to complete the upload</span>
              </div>
            )}

            {/* Reminder about permanence and terms */}
            <p className="text-xs text-center text-foreground/80">
              Once uploaded, this file will be publicly accessible and cannot be removed.
              By uploading, you agree to our{' '}
              <a
                href="https://ardrive.io/tos-and-privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors underline"
              >
                Terms of Service
              </a>.
            </p>
          </div>
        )}

          {/* Success Message */}
          {successMessage && lastUploadedFile && (
            <div className="mt-4 bg-success/10 border border-success/20 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-success text-sm mb-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <a
                href={getArweaveUrl(lastUploadedFile.id, lastUploadedFile.dataCaches)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white font-medium rounded-full hover:bg-success/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Your File
              </a>
              <p className="text-xs text-foreground/80 mt-3">
                Your file is now permanently stored and accessible at this link.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-error/10 border border-error/20 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-error text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Bundler doesn't support free uploads */
        <div className="bg-card rounded-2xl border border-border/20 p-8 mb-6 text-center">
          <div className="w-12 h-12 bg-foreground/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-foreground/80" />
          </div>
          <h4 className="text-lg font-semibold font-heading text-foreground mb-2">Free Uploads Not Available</h4>
          <p className="text-sm text-foreground/80 max-w-md mx-auto">
            The current bundler doesn't support free uploads. Connect a wallet to purchase credits,
            or try a different gateway that offers free uploads.
          </p>
        </div>
      )}

      {/* Recent Uploads */}
      {userUploads.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/20">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/20">
            <h3 className="font-bold font-heading text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-foreground" />
              Your Uploads ({userUploads.length})
            </h3>
            {userUploads.length > 5 && (
              <button
                onClick={() => setShowAllUploads(!showAllUploads)}
                className="text-xs text-foreground/80 hover:text-foreground transition-colors"
              >
                {showAllUploads ? 'Show Less' : 'Show All'}
              </button>
            )}
          </div>

          {/* Upload List */}
          <div className="space-y-4 max-h-80 overflow-y-auto p-4">
            {displayUploads.map((upload, index) => {
              const status = uploadStatuses[upload.id];
              const isChecking = statusChecking[upload.id];

              return (
                <div key={index} className="bg-card border border-border/20 rounded-2xl p-4">
                  <div className="space-y-2">
                    {/* Row 1: Transaction ID + Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="font-mono text-sm text-foreground">
                          {upload.id.substring(0, 6)}...
                        </div>
                      </div>

                      {/* Desktop: Show all actions */}
                      <div className="hidden sm:flex items-center gap-1">
                        {/* Status Icon */}
                        {status && (
                          <div className="p-1.5" title={`Status: ${status.status}`}>
                            <span className="text-xs">{getStatusIcon(status.status, status.info)}</span>
                          </div>
                        )}
                        <CopyButton textToCopy={upload.id} />
                        <button
                          onClick={() => setShowReceiptModal(upload.id)}
                          className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                          title="View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => checkUploadStatus(upload.id)}
                          disabled={isChecking}
                          className="p-1.5 text-foreground/80 hover:text-foreground transition-colors disabled:opacity-50"
                          title="Check Status"
                        >
                          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                        </button>
                        <a
                          href={getArweaveUrl(upload.id, upload.dataCaches)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-foreground/80 hover:text-foreground transition-colors"
                          title="View File"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {/* Mobile: Status icon + 3-dot menu */}
                      <div className="sm:hidden flex items-center gap-1">
                        {status && (
                          <div className="p-1.5" title={`Status: ${status.status}`}>
                            <span className="text-xs">{getStatusIcon(status.status, status.info)}</span>
                          </div>
                        )}
                        <Popover className="relative">
                          <PopoverButton className="p-1.5 text-foreground/80 hover:text-foreground transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </PopoverButton>
                          <PopoverPanel
                            anchor="bottom end"
                            className="w-40 bg-card border border-border/20 rounded-2xl shadow-lg z-[200] py-1 mt-1"
                          >
                            {({ close }) => (
                              <>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(upload.id);
                                    setCopiedItems(prev => new Set([...prev, upload.id]));
                                    setTimeout(() => {
                                      close();
                                      setTimeout(() => {
                                        setCopiedItems(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(upload.id);
                                          return newSet;
                                        });
                                      }, 500);
                                    }, 1000);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                >
                                  {copiedItems.has(upload.id) ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-success" />
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
                                    setShowReceiptModal(upload.id);
                                    close();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
                                >
                                  <Receipt className="w-4 h-4" />
                                  View Receipt
                                </button>
                                <button
                                  onClick={() => {
                                    checkUploadStatus(upload.id);
                                    close();
                                  }}
                                  disabled={isChecking}
                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                                  Check Status
                                </button>
                                <a
                                  href={getArweaveUrl(upload.id, upload.dataCaches)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => close()}
                                  className="w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-card transition-colors flex items-center gap-2"
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

                    {/* Row 2: File Name */}
                    {upload.fileName && (
                      <div className="text-sm text-foreground truncate flex items-center gap-2" title={upload.fileName}>
                        {getFileIcon(upload.contentType, upload.fileName)}
                        <span className="truncate">{upload.fileName}</span>
                      </div>
                    )}

                    {/* Row 3: Content Type + File Size */}
                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                      <span>{upload.contentType || 'Unknown Type'}</span>
                      <span>-</span>
                      <span>{upload.fileSize ? formatFileSize(upload.fileSize) : 'Unknown Size'}</span>
                    </div>

                    {/* Row 4: Timestamp */}
                    {upload.timestamp && (
                      <div className="text-sm text-foreground/80">
                        {new Date(upload.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Learn More CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <a
          href="https://docs.ar.io/learn/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/20 hover:border-primary/30 transition-colors"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground group-hover:text-foreground">
              What is the AR.IO Network?
            </p>
            <p className="text-xs text-foreground/80">Learn about the permanent cloud - decentralized storage and hosting that lasts forever</p>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground/80 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </a>

        <a
          href="https://docs.ar.io/build/turbo-sdk/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/20 hover:border-primary/30 transition-colors"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Code className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground group-hover:text-foreground">
              Build with Turbo SDK
            </p>
            <p className="text-xs text-foreground/80">Add permanent uploads to your app, or deploy and host it on the permaweb</p>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground/80 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </a>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          onClose={() => setShowReceiptModal(null)}
          receipt={userUploads.find((u) => u.id === showReceiptModal)?.receipt}
          uploadId={showReceiptModal}
          initialStatus={uploadStatuses[showReceiptModal]}
        />
      )}
    </div>
  );
}
