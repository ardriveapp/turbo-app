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

  const checkUploadStatus = useCallback(async (txId: string): Promise<UploadStatus> => {
    // Check cache first
    const cachedStatus = getUploadStatus(txId);
    if (cachedStatus) {
      const status: UploadStatus = cachedStatus as UploadStatus;
      setUploadStatuses(prev => ({ ...prev, [txId]: status }));
      
      // If already finalized, don't check again
      if (status.status === 'FINALIZED') {
        return status;
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

      // Save to both local state and persistent cache
      setUploadStatuses(prev => ({ ...prev, [txId]: status }));
      setUploadStatus(txId, { status: status.status, info: status.info });
      
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

  const checkMultipleStatuses = useCallback(async (txIds: string[]) => {
    const promises = txIds.map(txId => checkUploadStatus(txId));
    return Promise.all(promises);
  }, [checkUploadStatus]);

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
    if (status === 'FINALIZED' || info === 'permanent') return 'text-turbo-green';
    if (status === 'CONFIRMED' && info === 'pending') return 'text-yellow-500'; // Most common - use yellow
    if (status === 'CONFIRMED') return 'text-blue-400'; // Other confirmed states - lighter blue for better readability
    if (status === 'FAILED') return 'text-red-500';
    if (status === 'NOT_FOUND') return 'text-link';
    return 'text-yellow-500';
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
    statusChecking,
    uploadStatuses,
    formatFileSize,
    formatWinc,
    getStatusColor,
    getStatusIcon,
    getStatusDescription,
  };
}