/**
 * Web Worker for non-blocking file hashing
 * Runs SHA-256 hashing off the main thread to prevent UI blocking
 */

import { createSHA256 } from 'hash-wasm';

/**
 * Convert Uint8Array to base64url string (no padding)
 * Matches ar.io gateway X-AR-IO-DIGEST format
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // Convert to base64url: replace + with -, / with _, remove padding
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Message types for worker communication
export interface HashWorkerRequest {
  type: 'hash';
  id: string;
  file: File;
  path: string;
}

export interface HashWorkerResponse {
  type: 'result' | 'error' | 'progress';
  id: string;
  path?: string;
  hash?: string;
  error?: string;
  bytesProcessed?: number;
  totalBytes?: number;
}

// Track if hash-wasm is initialized
let isInitialized = false;

/**
 * Initialize hash-wasm (lazy initialization)
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    // Create a test hasher to ensure WASM is loaded
    const testHasher = await createSHA256();
    testHasher.init();
    testHasher.update(new Uint8Array([0]));
    testHasher.digest('binary');
    isInitialized = true;
  }
}

/**
 * Hash a file using streaming to minimize memory usage
 */
async function hashFileStreaming(
  file: File,
  onProgress?: (bytesProcessed: number, totalBytes: number) => void
): Promise<string> {
  await ensureInitialized();

  const hasher = await createSHA256();
  hasher.init();

  const stream = file.stream();
  const reader = stream.getReader();
  let bytesProcessed = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      hasher.update(value);
      bytesProcessed += value.length;

      // Report progress for large files (every ~5MB)
      if (onProgress && bytesProcessed % (5 * 1024 * 1024) < value.length) {
        onProgress(bytesProcessed, file.size);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Return base64url encoded hash (matches ar.io gateway X-AR-IO-DIGEST format)
  const hashBytes = hasher.digest('binary');
  return toBase64Url(new Uint8Array(hashBytes));
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<HashWorkerRequest>) => {
  const { type, id, file, path } = event.data;

  if (type === 'hash') {
    try {
      const hash = await hashFileStreaming(file, (bytesProcessed, totalBytes) => {
        // Send progress updates for large files
        const response: HashWorkerResponse = {
          type: 'progress',
          id,
          path,
          bytesProcessed,
          totalBytes,
        };
        self.postMessage(response);
      });

      const response: HashWorkerResponse = {
        type: 'result',
        id,
        path,
        hash,
      };
      self.postMessage(response);
    } catch (error) {
      const response: HashWorkerResponse = {
        type: 'error',
        id,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      self.postMessage(response);
    }
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });
