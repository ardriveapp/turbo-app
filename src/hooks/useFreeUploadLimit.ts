import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Hook to fetch and sync the bundler's free upload limit from the upload service.
 * Automatically fetches on mount and when the upload service URL changes.
 * Defaults to 0 bytes (no free tier) if the limit cannot be fetched.
 */
export function useFreeUploadLimit() {
  const uploadServiceUrl = useStore(s => s.getCurrentConfig().uploadServiceUrl);
  const setFreeUploadLimitBytes = useStore(s => s.setFreeUploadLimitBytes);
  const freeUploadLimitBytes = useStore(s => s.freeUploadLimitBytes);

  useEffect(() => {
    const fetchFreeUploadLimit = async () => {
      // Guard against undefined uploadServiceUrl
      if (!uploadServiceUrl) {
        console.warn('Upload service URL not configured, defaulting to 0 free bytes');
        setFreeUploadLimitBytes(0);
        return;
      }

      try {
        const response = await fetch(uploadServiceUrl);

        if (!response.ok) {
          console.warn('Failed to fetch bundler info, defaulting to 0 free bytes');
          setFreeUploadLimitBytes(0);
          return;
        }

        const data = await response.json();

        // Extract freeUploadLimitBytes, default to 0 if not present
        const limitBytes = data.freeUploadLimitBytes ?? 0;

        console.log(`Bundler free upload limit: ${limitBytes} bytes (${(limitBytes / 1024).toFixed(2)} KiB)`);
        setFreeUploadLimitBytes(limitBytes);
      } catch (error) {
        console.warn('Error fetching bundler free upload limit, defaulting to 0:', error);
        setFreeUploadLimitBytes(0);
      }
    };

    fetchFreeUploadLimit();
  }, [uploadServiceUrl, setFreeUploadLimitBytes]);

  return freeUploadLimitBytes;
}

/**
 * Utility function to check if a file size is within the free upload limit
 * @param fileSize - File size in bytes
 * @param freeLimit - Free upload limit in bytes from the bundler
 * @returns true if the file is free to upload
 */
export function isFileFree(fileSize: number, freeLimit: number): boolean {
  return fileSize < freeLimit && freeLimit > 0;
}

/**
 * Format the free upload limit for display
 * @param limitBytes - Free upload limit in bytes
 * @returns Formatted string (e.g., "105 KiB", "FREE", "No free tier")
 */
export function formatFreeLimit(limitBytes: number): string {
  if (limitBytes === 0) {
    return 'No free tier';
  }

  const kib = limitBytes / 1024;

  if (kib < 1) {
    return `${limitBytes} bytes`;
  } else if (kib < 1024) {
    return `${kib.toFixed(0)} KiB`;
  } else {
    const mib = kib / 1024;
    return `${mib.toFixed(2)} MiB`;
  }
}
