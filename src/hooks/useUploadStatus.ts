import { useState, useCallback } from 'react';
import { wincPerCredit } from '../constants';
import { useStore } from '../store/useStore';

export interface UploadStatus {
  status: 'CONFIRMED' | 'FINALIZED' | 'FAILED' | 'NOT_FOUND';
  bundleId?: string;
  info?: 'new' | 'pending' | 'permanent';
  startOffsetInRootBundle?: number;
  rawContentLength?: number;
  payloadContentType?: string;
  payloadDataStart?: number;
  payloadContentLength?: number;
  winc?: string;
}

export function useUploadStatus() {
  const [statusChecking, setStatusChecking] = useState<Record<string, boolean>>({});
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);
  const setUploadStatus = useStore((state) => state.setUploadStatus);
  const getUploadStatus = useStore((state) => state.getUploadStatus);

  // Initialize local state from cache for a list of transaction IDs
  const initializeFromCache = useCallback((txIds: string[]) => {
    const cachedStatuses: Record<string, UploadStatus> = {};

    txIds.forEach(txId => {
      const cached = getUploadStatus(txId);
      if (cached) {
        // Use the full cached status object
        cachedStatuses[txId] = cached as UploadStatus;
      }
    });

    // Only update if we have cached items to avoid unnecessary re-renders
    if (Object.keys(cachedStatuses).length > 0) {
      setUploadStatuses(prev => ({ ...prev, ...cachedStatuses }));
    }

    return cachedStatuses;
  }, [getUploadStatus]);

  const checkUploadStatus = useCallback(async (txId: string, force: boolean = false): Promise<UploadStatus> => {
    // Check cache first (unless forced refresh)
    if (!force) {
      const cachedStatus = getUploadStatus(txId);
      if (cachedStatus) {
        // Use the full cached status object
        const status: UploadStatus = cachedStatus as UploadStatus;
        setUploadStatuses(prev => ({ ...prev, [txId]: status }));

        // If already finalized, don't check again
        if (status.status === 'FINALIZED') {
          return status;
        }
      }
    }

    setStatusChecking(prev => ({ ...prev, [txId]: true }));

    try {
      const config = getCurrentConfig();
      const response = await fetch(`${config.uploadServiceUrl}/tx/${txId}/status`);

      if (!response.ok) {
        if (response.status === 404) {
          const status: UploadStatus = { status: 'NOT_FOUND' };
          setUploadStatuses(prev => ({ ...prev, [txId]: status }));
          return status;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const status: UploadStatus = {
        status: data.status?.toUpperCase() as 'CONFIRMED' | 'FINALIZED',
        bundleId: data.bundleId,
        info: data.info,
        startOffsetInRootBundle: data.startOffsetInRootBundle,
        rawContentLength: data.rawContentLength,
        payloadContentType: data.payloadContentType,
        payloadDataStart: data.payloadDataStart,
        payloadContentLength: data.payloadContentLength,
        winc: data.winc,
      };

      // Save to both local state and persistent cache (save full status)
      setUploadStatuses(prev => ({ ...prev, [txId]: status }));
      setUploadStatus(txId, status);

      return status;
    } catch (error) {
      console.error(`Failed to check status for ${txId}:`, error);
      const status: UploadStatus = { status: 'FAILED' };
      setUploadStatuses(prev => ({ ...prev, [txId]: status }));
      return status;
    } finally {
      setStatusChecking(prev => ({ ...prev, [txId]: false }));
    }
  }, [getCurrentConfig, getUploadStatus, setUploadStatus]);

  const checkMultipleStatuses = useCallback(async (txIds: string[], force: boolean = false) => {
    if (force) {
      // Force refresh all items
      const promises = txIds.map(txId => checkUploadStatus(txId, true));
      return Promise.all(promises);
    }

    // First, populate local state with any cached statuses
    const cachedStatuses: Record<string, UploadStatus> = {};
    const idsToCheck: string[] = [];

    txIds.forEach(txId => {
      const cachedStatus = getUploadStatus(txId);
      if (cachedStatus) {
        // Add to local state immediately - use full cached status
        cachedStatuses[txId] = cachedStatus as UploadStatus;

        // Only check API if not finalized
        if (cachedStatus.status !== 'FINALIZED') {
          idsToCheck.push(txId);
        }
      } else {
        // No cache, need to check
        idsToCheck.push(txId);
      }
    });

    // Update local state with all cached items first for immediate UI feedback
    if (Object.keys(cachedStatuses).length > 0) {
      setUploadStatuses(prev => ({ ...prev, ...cachedStatuses }));
    }

    // If no items need API checking, return the cached results
    if (idsToCheck.length === 0) {
      return Object.values(cachedStatuses);
    }

    // Check the remaining items that need updates
    const promises = idsToCheck.map(txId => checkUploadStatus(txId));
    const apiResults = await Promise.all(promises);

    // Return combined results
    return [...Object.values(cachedStatuses), ...apiResults];
  }, [checkUploadStatus, getUploadStatus]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }, []);

  const formatWinc = useCallback((winc: string) => {
    const wincNum = parseInt(winc);

    // Show FREE for 0 winston (free tier uploads)
    if (wincNum === 0) {
      return 'FREE';
    }

    // Convert winston to credits using the constant from constants.ts
    const credits = wincNum / wincPerCredit;

    if (credits < 0.000001) {
      return `${wincNum} winston`;
    }
    return `${credits.toFixed(6)} Credits`;
  }, []);

  const getStatusColor = useCallback((status: string, info?: string) => {
    if (status === 'FINALIZED' || info === 'permanent') return 'text-success';
    if (status === 'CONFIRMED' && info === 'pending') return 'text-warning'; // Most common - use warning
    if (status === 'CONFIRMED') return 'text-info'; // Other confirmed states - info blue for better readability
    if (status === 'FAILED') return 'text-error';
    if (status === 'NOT_FOUND') return 'text-foreground/80';
    return 'text-warning';
  }, []);

  const getStatusIcon = useCallback((status: string, info?: string): string => {
    if (status === 'FINALIZED' || info === 'permanent') return 'check-circle';
    if (status === 'CONFIRMED' && info === 'pending') return 'clock'; // Most common - clock/yellow
    if (status === 'CONFIRMED') return 'archive'; // Other confirmed states
    if (status === 'FAILED') return 'x-circle';
    if (status === 'NOT_FOUND') return 'help-circle';
    return 'clock'; // Default
  }, []);

  const getStatusDescription = useCallback((status: string, info?: string) => {
    if (status === 'FINALIZED' || info === 'permanent') {
      return 'Permanently stored on Arweave';
    }
    if (status === 'CONFIRMED' && info === 'pending') {
      return 'Bundled, waiting for Arweave mining';
    }
    if (status === 'CONFIRMED' && info === 'new') {
      return 'Bundled, processing started';
    }
    if (status === 'CONFIRMED') {
      return 'Successfully bundled';
    }
    if (status === 'FAILED') {
      return 'Upload failed';
    }
    if (status === 'NOT_FOUND') {
      return 'Not yet indexed';
    }
    return 'Processing';
  }, []);

  return {
    checkUploadStatus,
    checkMultipleStatuses,
    initializeFromCache,
    statusChecking,
    uploadStatuses,
    formatFileSize,
    formatWinc,
    getStatusColor,
    getStatusIcon,
    getStatusDescription,
  };
}
