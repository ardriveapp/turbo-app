/**
 * File hashing utilities for Smart Deploy deduplication
 * Uses Web Crypto API for SHA-256 hashing
 */

// Skip hashing for files larger than 50MB to prevent memory issues
const MAX_HASHABLE_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Compute SHA-256 hash of a file using Web Crypto API
 * @param file - File to hash
 * @returns Hex string of SHA-256 hash
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a single file with timeout protection
 * @param file - File to hash
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Hex string of SHA-256 hash, or null if timeout/error/too large
 */
export async function hashFileWithTimeout(
  file: File,
  timeoutMs = 30000
): Promise<string | null> {
  // Skip large files to prevent memory issues - they'll be uploaded as "new"
  if (file.size > MAX_HASHABLE_FILE_SIZE) {
    console.log(`Skipping hash for ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB > 50MB limit)`);
    return null;
  }

  try {
    const hashPromise = hashFile(file);
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    return await Promise.race([hashPromise, timeoutPromise]);
  } catch (error) {
    console.warn(`Failed to hash file ${file.name}:`, error);
    return null;
  }
}

/**
 * Hash multiple files in parallel with concurrency limit
 * Files that fail to hash are excluded from results (will be treated as "new")
 *
 * @param files - Array of files to hash
 * @param concurrency - Max concurrent hash operations (default: 10)
 * @param onProgress - Optional progress callback
 * @returns Map of file path → hash (only includes successfully hashed files)
 */
export async function hashFiles(
  files: File[],
  concurrency = 10,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  let completed = 0;

  // Process in batches for memory efficiency
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const hash = await hashFileWithTimeout(file);
        const path = file.webkitRelativePath || file.name;
        return { path, hash };
      })
    );

    // Only add successful hashes to results
    batchResults.forEach(({ path, hash }) => {
      if (hash) {
        results.set(path, hash);
      } else {
        console.warn(`Skipping hash for ${path} - will upload as new file`);
      }
    });

    completed += batch.length;
    onProgress?.(completed, files.length);
  }

  return results;
}
