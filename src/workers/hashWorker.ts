/**
 * Web Worker for non-blocking file hashing
 * Runs SHA-256 hashing off the main thread to prevent UI blocking
 */

import { createSHA256 } from 'hash-wasm';

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
    testHasher.digest('hex');
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

  return hasher.digest('hex');
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
