import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_PREVIEWS = 50; // Limit to prevent memory issues
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'];

/**
 * Hook to manage image preview URLs for multiple files
 * Handles object URL creation and cleanup to prevent memory leaks
 */
export function useImagePreviews(files: File[], maxPreviews: number = MAX_PREVIEWS) {
  // Map of file index -> preview URL
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(new Map());
  // Track which URLs we've created to ensure cleanup
  const createdUrls = useRef<Set<string>>(new Set());
  // Stable ref for reading previewUrls inside effect without stale closure
  const previewUrlsRef = useRef<Map<number, string>>(new Map());

  // Keep ref in sync with state
  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  // Check if a file is a previewable image (by MIME type or extension)
  const isPreviewableImage = useCallback((file: File): boolean => {
    // Check MIME type first
    if (IMAGE_MIME_TYPES.includes(file.type) || file.type.startsWith('image/')) {
      return true;
    }
    // Fallback to extension check (browsers don't always set correct MIME type)
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(ext);
  }, []);

  // Get preview URL for a specific file index
  const getPreviewUrl = useCallback((index: number): string | null => {
    return previewUrls.get(index) || null;
  }, [previewUrls]);

  // Check if a file at index has a preview
  const hasPreview = useCallback((index: number): boolean => {
    return previewUrls.has(index);
  }, [previewUrls]);

  // Generate previews when files change
  useEffect(() => {
    const newPreviewUrls = new Map<number, string>();
    const newCreatedUrls = new Set<string>();
    let imageCount = 0;

    // Capture previous URLs before processing
    const prevCreatedUrls = createdUrls.current;

    // Create previews for image files up to the limit
    files.forEach((file, index) => {
      if (isPreviewableImage(file) && imageCount < maxPreviews) {
        // Check if we already have this URL (same file reference) using ref to avoid stale closure
        const existingUrl = previewUrlsRef.current.get(index);
        if (existingUrl && prevCreatedUrls.has(existingUrl)) {
          // Reuse existing URL if file hasn't changed
          // Note: This is a simple check - if files array is rebuilt, URLs will be recreated
          newPreviewUrls.set(index, existingUrl);
          newCreatedUrls.add(existingUrl);
        } else {
          // Create new URL
          const url = URL.createObjectURL(file);
          newPreviewUrls.set(index, url);
          newCreatedUrls.add(url);
        }
        imageCount++;
      }
    });

    // Revoke only URLs that were in previous set but not in new set (avoids double revocation)
    prevCreatedUrls.forEach(url => {
      if (!newCreatedUrls.has(url)) {
        URL.revokeObjectURL(url);
      }
    });

    // Update ref and state
    createdUrls.current = newCreatedUrls;
    setPreviewUrls(newPreviewUrls);

    // Cleanup on unmount - revoke whatever is currently tracked
    return () => {
      createdUrls.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [files, maxPreviews, isPreviewableImage]);

  // Manual cleanup function (useful for clearing all previews)
  const clearPreviews = useCallback(() => {
    createdUrls.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    createdUrls.current.clear();
    setPreviewUrls(new Map());
  }, []);

  return {
    getPreviewUrl,
    hasPreview,
    isPreviewableImage,
    clearPreviews,
    previewCount: previewUrls.size,
    maxReached: previewUrls.size >= maxPreviews,
  };
}

export default useImagePreviews;
