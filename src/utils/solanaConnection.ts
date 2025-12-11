import { Connection } from '@solana/web3.js';

/**
 * Singleton connection cache for Solana RPC endpoints
 * Reuses existing connections to avoid creating new ones repeatedly
 */
const connectionCache: Map<string, Connection> = new Map();

/**
 * Get or create a cached Solana connection
 * Reuses existing connection for the same RPC URL
 *
 * @param rpcUrl - Solana RPC endpoint URL
 * @returns Cached or new Solana Connection instance
 */
export function getSolanaConnection(rpcUrl: string): Connection {
  if (!connectionCache.has(rpcUrl)) {
    connectionCache.set(rpcUrl, new Connection(rpcUrl, 'confirmed'));
  }
  return connectionCache.get(rpcUrl)!;
}

/**
 * Clear connection cache (useful for testing or config changes)
 */
export function clearSolanaConnectionCache(): void {
  connectionCache.clear();
}
