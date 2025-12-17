/**
 * File hashing utilities for Smart Deploy deduplication
 *
 * Features:
 * - Web Workers: Hashing runs off main thread (non-blocking UI)
 * - Worker Pool: Multiple workers for true parallelism
 * - Streaming: Files read in chunks to minimize memory
 * - Dynamic concurrency: Adapts based on file sizes
 * - Cancellation: AbortController support
 * - Retry logic: Automatic retry for transient failures
 * - Graceful fallback: Falls back to main thread if workers unavailable
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

// ============================================================================
// Types
// ============================================================================

export interface HashProgress {
  completed: number;
  total: number;
  currentFile?: string;
  bytesProcessed?: number;
  totalBytes?: number;
}

export interface HashOptions {
  signal?: AbortSignal;
  onProgress?: (progress: HashProgress) => void;
  maxRetries?: number;
  useWorkers?: boolean;
}

export interface HashResult {
  results: Map<string, string>;
  errors: Map<string, string>;
  cancelled: boolean;
}

// Worker message types
interface WorkerRequest {
  type: 'hash';
  id: string;
  file: File;
  path: string;
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress' | 'ready';
  id: string;
  path?: string;
  hash?: string;
  error?: string;
  bytesProcessed?: number;
  totalBytes?: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Dynamic concurrency based on file size
const CONCURRENCY_CONFIG = {
  tiny: { maxSize: 100 * 1024, concurrency: 50 },       // <100KB
  small: { maxSize: 1024 * 1024, concurrency: 30 },     // <1MB
  medium: { maxSize: 10 * 1024 * 1024, concurrency: 15 }, // <10MB
  large: { maxSize: 50 * 1024 * 1024, concurrency: 8 },   // <50MB
  huge: { maxSize: Infinity, concurrency: 4 },            // 50MB+
};

// Worker pool configuration
const MAX_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 8);
const DEFAULT_MAX_RETRIES = 2;

// ============================================================================
// Worker Pool Management
// ============================================================================

interface PooledWorker {
  worker: Worker;
  busy: boolean;
  currentId: string | null;
}

let workerPool: PooledWorker[] = [];
let workersSupported: boolean | null = null;
let workerInitPromise: Promise<boolean> | null = null;

/**
 * Check if Web Workers are supported and hash-wasm works in them
 */
async function checkWorkerSupport(): Promise<boolean> {
  if (workersSupported !== null) return workersSupported;

  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = new Promise((resolve) => {
    try {
      // Check basic worker support
      if (typeof Worker === 'undefined') {
        console.warn('Web Workers not supported, using main thread fallback');
        workersSupported = false;
        resolve(false);
        return;
      }

      // Try to create a worker with hash-wasm
      const workerCode = `
        import('hash-wasm').then(({ createSHA256 }) => {
          createSHA256().then(hasher => {
            hasher.init();
            hasher.update(new Uint8Array([1, 2, 3]));
            const result = hasher.digest('binary');
            self.postMessage({ success: true, result });
          }).catch(err => {
            self.postMessage({ success: false, error: err.message });
          });
        }).catch(err => {
          self.postMessage({ success: false, error: err.message });
        });
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const testWorker = new Worker(URL.createObjectURL(blob), { type: 'module' });

      const timeout = setTimeout(() => {
        testWorker.terminate();
        console.warn('Worker test timed out, using main thread fallback');
        workersSupported = false;
        resolve(false);
      }, 5000);

      testWorker.onmessage = (e) => {
        clearTimeout(timeout);
        testWorker.terminate();
        workersSupported = e.data.success === true;
        if (!workersSupported) {
          console.warn('Worker hash-wasm test failed:', e.data.error);
        }
        resolve(workersSupported);
      };

      testWorker.onerror = (err) => {
        clearTimeout(timeout);
        testWorker.terminate();
        console.warn('Worker creation failed:', err);
        workersSupported = false;
        resolve(false);
      };
    } catch (err) {
      console.warn('Worker support check failed:', err);
      workersSupported = false;
      resolve(false);
    }
  });

  return workerInitPromise;
}

/**
 * Initialize the worker pool
 */
async function initWorkerPool(): Promise<void> {
  if (workerPool.length > 0) return;

  const supported = await checkWorkerSupport();
  if (!supported) return;

  const workerCount = Math.min(MAX_WORKERS, navigator.hardwareConcurrency || 4);

  for (let i = 0; i < workerCount; i++) {
    try {
      const worker = new Worker(
        new URL('../workers/hashWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerPool.push({
        worker,
        busy: false,
        currentId: null,
      });
    } catch (err) {
      console.warn(`Failed to create worker ${i}:`, err);
    }
  }

  if (workerPool.length === 0) {
    workersSupported = false;
  }
}

/**
 * Get an available worker from the pool
 */
function getAvailableWorker(): PooledWorker | null {
  return workerPool.find((w) => !w.busy) || null;
}

/**
 * Terminate all workers (call on cleanup)
 * Also resets state so workers can be re-initialized if needed
 */
export function terminateWorkerPool(): void {
  workerPool.forEach((w) => w.worker.terminate());
  workerPool = [];
  // Reset state so workers can be re-initialized
  workersSupported = null;
  workerInitPromise = null;
}

// ============================================================================
// Main Thread Fallback (Streaming)
// ============================================================================

/**
 * Hash a file on the main thread using streaming
 * Used as fallback when workers unavailable
 */
async function hashFileMainThread(
  file: File,
  signal?: AbortSignal
): Promise<string> {
  const hasher = await createSHA256();
  hasher.init();

  const stream = file.stream();
  const reader = stream.getReader();

  try {
    while (true) {
      // Check for cancellation
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;
      hasher.update(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Return base64url encoded hash (matches ar.io gateway X-AR-IO-DIGEST format)
  const hashBytes = hasher.digest('binary');
  return toBase64Url(new Uint8Array(hashBytes));
}

// ============================================================================
// Worker-based Hashing
// ============================================================================

/**
 * Hash a file using a Web Worker
 */
function hashFileWithWorker(
  pooledWorker: PooledWorker,
  file: File,
  path: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = `${path}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    pooledWorker.busy = true;
    pooledWorker.currentId = id;

    let resolved = false;
    // eslint-disable-next-line prefer-const -- assigned after cleanup function is defined (closure)
    let timeoutHandle: ReturnType<typeof setTimeout>;

    // Use named handlers so we can remove them properly
    const messageHandler = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      if (response.id !== id) return; // Not our message

      if (response.type === 'result') {
        cleanup();
        resolve(response.hash!);
      } else if (response.type === 'error') {
        cleanup();
        reject(new Error(response.error || 'Worker hash failed'));
      }
      // Ignore progress messages for now
    };

    const errorHandler = (err: ErrorEvent) => {
      cleanup();
      reject(new Error(`Worker error: ${err.message}`));
    };

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      pooledWorker.busy = false;
      pooledWorker.currentId = null;
      clearTimeout(timeoutHandle);
      // Remove specific listeners instead of nulling handlers
      pooledWorker.worker.removeEventListener('message', messageHandler);
      pooledWorker.worker.removeEventListener('error', errorHandler);
    };

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }

    // Set timeout
    timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout hashing ${path}`));
    }, timeoutMs);

    // Add event listeners (allows multiple concurrent listeners if needed)
    pooledWorker.worker.addEventListener('message', messageHandler);
    pooledWorker.worker.addEventListener('error', errorHandler);

    // Send hash request
    const request: WorkerRequest = { type: 'hash', id, file, path };
    pooledWorker.worker.postMessage(request);
  });
}

// ============================================================================
// Queue-based Processing
// ============================================================================

interface QueueItem {
  file: File;
  path: string;
  size: number;
  retries: number;
  resolve: (result: { hash: string | null; error?: string }) => void;
}

/**
 * Process files with dynamic concurrency and queue management
 */
async function processQueue(
  queue: QueueItem[],
  options: HashOptions,
  useWorkers: boolean
): Promise<void> {
  const { signal, onProgress, maxRetries = DEFAULT_MAX_RETRIES } = options;

  let completedSuccessfully = 0; // Only counts final completions (not retries)
  const total = queue.length;
  let activeCount = 0;

  // Sort by size (smallest first for quick progress)
  queue.sort((a, b) => a.size - b.size);

  // Get concurrency for current file sizes
  const getConcurrency = (size: number): number => {
    for (const config of Object.values(CONCURRENCY_CONFIG)) {
      if (size <= config.maxSize) return config.concurrency;
    }
    return CONCURRENCY_CONFIG.huge.concurrency;
  };

  // Process a single item with a specific worker (or main thread)
  const processItem = async (item: QueueItem, worker: PooledWorker | null): Promise<void> => {
    try {
      let hash: string;
      const timeout = Math.max(30000, (item.size / (5 * 1024 * 1024)) * 1000);

      if (worker) {
        hash = await hashFileWithWorker(worker, item.file, item.path, timeout, signal);
      } else {
        hash = await hashFileMainThread(item.file, signal);
      }

      item.resolve({ hash });
      completedSuccessfully++;
    } catch (error) {
      // Handle abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        item.resolve({ hash: null, error: 'Cancelled' });
        completedSuccessfully++; // Count as "done" for progress
        return;
      }

      // Retry logic
      if (item.retries < maxRetries) {
        console.warn(`Retrying hash for ${item.path} (attempt ${item.retries + 1})`);
        item.retries++;
        queue.unshift(item); // Re-add to front of queue for quick retry
        // Don't increment completedSuccessfully - this item isn't done yet
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to hash ${item.path} after ${maxRetries} retries:`, errorMsg);
        item.resolve({ hash: null, error: errorMsg });
        completedSuccessfully++; // Count as "done" even though it failed
      }
    } finally {
      activeCount--;

      // Report progress (only count truly completed items)
      onProgress?.({
        completed: completedSuccessfully,
        total,
        currentFile: item.path,
      });
    }
  };

  // Process next items from queue
  const processNext = async (): Promise<void> => {
    while (queue.length > 0 || activeCount > 0) {
      // Check cancellation
      if (signal?.aborted) {
        // Resolve all remaining items as cancelled
        while (queue.length > 0) {
          const item = queue.shift()!;
          item.resolve({ hash: null, error: 'Cancelled' });
          completedSuccessfully++;
        }
        // Wait for active items to finish (they'll also be cancelled via signal)
        while (activeCount > 0) {
          await new Promise((r) => setTimeout(r, 10));
        }
        return;
      }

      // If queue is empty but items are still active, wait
      if (queue.length === 0) {
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }

      // Get next item
      const item = queue[0];

      // Check concurrency limit for this file size
      const maxConcurrency = getConcurrency(item.size);
      if (activeCount >= maxConcurrency) {
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }

      // Try to get a worker if using workers
      let worker: PooledWorker | null = null;
      if (useWorkers) {
        worker = getAvailableWorker();
        if (!worker) {
          // No worker available, but check if we can use main thread as fallback
          // Only fallback if we have capacity and have been waiting
          if (activeCount < 2) {
            // Use main thread fallback for low concurrency situations
            worker = null; // Will use main thread
          } else {
            await new Promise((r) => setTimeout(r, 10));
            continue;
          }
        }
      }

      // Remove from queue and process
      queue.shift();
      activeCount++;

      // Process asynchronously (don't await - allows parallelism)
      processItem(item, worker);
    }
  };

  // Start processing
  await processNext();
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Hash multiple files with optimal performance and safety
 *
 * Features:
 * - Non-blocking (uses Web Workers when available)
 * - Dynamic concurrency based on file sizes
 * - Cancellable via AbortSignal
 * - Automatic retry for transient failures
 * - Graceful fallback to main thread
 *
 * @param files - Files to hash
 * @param options - Configuration options
 * @returns Hash results with any errors
 */
export async function hashFilesAsync(
  files: File[],
  options: HashOptions = {}
): Promise<HashResult> {
  const { signal, useWorkers = true } = options;

  // Check for cancellation before starting
  if (signal?.aborted) {
    return {
      results: new Map(),
      errors: new Map(),
      cancelled: true,
    };
  }

  // Empty file list
  if (files.length === 0) {
    return {
      results: new Map(),
      errors: new Map(),
      cancelled: false,
    };
  }

  // Initialize workers if requested
  let workersAvailable = false;
  if (useWorkers) {
    try {
      await initWorkerPool();
      workersAvailable = workerPool.length > 0;
    } catch (err) {
      console.warn('Failed to initialize worker pool:', err);
    }
  }

  // Create queue items
  const queue: QueueItem[] = [];
  const resultPromises: Promise<{ path: string; hash: string | null; error?: string }>[] = [];

  files.forEach((file) => {
    const path = file.webkitRelativePath || file.name;
    const promise = new Promise<{ path: string; hash: string | null; error?: string }>((resolve) => {
      queue.push({
        file,
        path,
        size: file.size,
        retries: 0,
        resolve: (result) => resolve({ path, ...result }),
      });
    });
    resultPromises.push(promise);
  });

  // Process queue
  await processQueue(queue, options, workersAvailable);

  // Collect results
  const allResults = await Promise.all(resultPromises);

  const results = new Map<string, string>();
  const errors = new Map<string, string>();
  let cancelled = false;

  allResults.forEach(({ path, hash, error }) => {
    if (error === 'Cancelled') {
      cancelled = true;
    } else if (hash) {
      results.set(path, hash);
    } else if (error) {
      errors.set(path, error);
    }
  });

  return { results, errors, cancelled };
}

/**
 * Legacy API for backwards compatibility
 * @deprecated Use hashFilesAsync for better control
 */
export async function hashFiles(
  files: File[],
  _concurrency?: number,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const result = await hashFilesAsync(files, {
    onProgress: onProgress
      ? (p) => onProgress(p.completed, p.total)
      : undefined,
  });

  // Log any errors
  if (result.errors.size > 0) {
    console.warn(`Hashing completed with ${result.errors.size} errors:`, Object.fromEntries(result.errors));
  }

  return result.results;
}

/**
 * Hash a single file (convenience function)
 */
export async function hashFile(file: File): Promise<string> {
  return hashFileMainThread(file);
}

/**
 * Hash a single file with timeout
 */
export async function hashFileWithTimeout(
  file: File,
  timeoutMs?: number
): Promise<string | null> {
  const timeout = timeoutMs ?? Math.max(30000, (file.size / (5 * 1024 * 1024)) * 1000);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const hash = await hashFileMainThread(file, controller.signal);
    clearTimeout(timeoutId);
    return hash;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn(`Timeout hashing ${file.name}`);
      return null;
    }
    console.warn(`Failed to hash ${file.name}:`, error);
    return null;
  }
}

/**
 * Estimate hashing time for files
 */
export function estimateHashingTime(files: File[]): number {
  const HASH_SPEED_BYTES_PER_MS = 500 * 1024;
  const OVERHEAD_PER_FILE_MS = 2;

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const hashingTime = totalSize / HASH_SPEED_BYTES_PER_MS;
  const overheadTime = files.length * OVERHEAD_PER_FILE_MS;

  return Math.ceil(hashingTime + overheadTime);
}
