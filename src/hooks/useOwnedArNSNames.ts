import { useCallback, useState, useEffect } from 'react';
import { ARIO, ANT, ArconnectSigner } from '@ar.io/sdk/web';
import { useStore } from '../store/useStore';

// Helper to decode punycode names for better display
const decodePunycode = (name: string): string => {
  try {
    // Modern browsers have punycode built into URL/domain APIs
    if (name.startsWith('xn--')) {
      // Use the native browser API to decode punycode
      const url = new URL(`https://${name}.example.com`);
      const decoded = url.hostname.split('.')[0];
      return decoded !== name ? decoded : name;
    }
    return name;
  } catch {
    // If decoding fails, return original name
    return name;
  }
};

interface ArNSName {
  name: string;           // e.g., "my-blog" or "xn--gmq235b10p"
  displayName: string;    // Decoded punycode name for UI
  processId: string;      // ANT process ID
  currentTarget?: string; // Current transaction ID
  lastUpdated?: Date;
  undernames?: string[];  // Available undernames
}

interface ArNSUpdateResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export function useOwnedArNSNames() {
  const { address, walletType, setOwnedArNSNames, getOwnedArNSNames } = useStore();
  const [names, setNames] = useState<ArNSName[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  // Fetch names owned by current address
  const fetchOwnedNames = useCallback(async (forceRefresh: boolean = false): Promise<ArNSName[]> => {
    if (!address || walletType !== 'arweave') return []; // ArNS updates require Arweave wallet for signing
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getOwnedArNSNames(address);
      if (cached) {
        console.log('Using cached ArNS names for address:', address);
        const arnsNames: ArNSName[] = cached.map(cached => ({
          name: cached.name,
          displayName: decodePunycode(cached.name),
          processId: cached.processId,
          currentTarget: cached.currentTarget,
          lastUpdated: undefined,
          undernames: cached.undernames || []
        }));
        setNames(arnsNames);
        return arnsNames;
      }
    }
    
    setLoading(true);
    try {
      console.log('Fetching ArNS records for address:', address);
      
      // Use AR.IO SDK to get owned names
      const ario = ARIO.mainnet();
      const records = await ario.getArNSRecordsForAddress({
        address: address,
        limit: 100, // Get up to 100 names
        sortBy: 'startTimestamp',
        sortOrder: 'desc' // Most recent first
      });
      
      console.log('Fetched ArNS records:', records);
      
      const processedNames: ArNSName[] = [];
      const cacheData: Array<{name: string; processId: string; currentTarget?: string; undernames?: string[]}> = [];
      
      // Process each record and get current state from ANT
      for (const record of records.items || []) {
        try {
          console.log('Processing ArNS record:', record);
          
          // Get ANT state to find current target
          const ant = ANT.init({ processId: record.processId });
          const state = await ant.getState();
          
          console.log('ANT state for', record.name, ':', state);
          
          const currentTarget = state.Records?.['@']?.transactionId;
          const undernames = Object.keys(state.Records || {}).filter(key => key !== '@');
          
          const processedName = {
            name: record.name,
            displayName: decodePunycode(record.name),
            processId: record.processId,
            currentTarget,
            lastUpdated: record.startTimestamp ? new Date(record.startTimestamp) : undefined,
            undernames
          };
          
          processedNames.push(processedName);
          
          // Prepare cache data - include undernames!
          cacheData.push({
            name: record.name,
            processId: record.processId,
            currentTarget,
            undernames
          });
          
        } catch (antError) {
          console.warn(`Failed to get ANT state for ${record.name}:`, antError);
          
          // Still include the name even if we can't get ANT state
          const fallbackName = {
            name: record.name,
            displayName: decodePunycode(record.name),
            processId: record.processId,
            currentTarget: undefined,
            lastUpdated: record.startTimestamp ? new Date(record.startTimestamp) : undefined,
            undernames: []
          };
          
          processedNames.push(fallbackName);
          
          cacheData.push({
            name: record.name,
            processId: record.processId,
            currentTarget: undefined,
            undernames: [] // Empty array when ANT state fails
          });
        }
      }
      
      console.log('Processed ArNS names:', processedNames);
      console.log('Caching ArNS data:', cacheData);
      
      // Cache the results
      setOwnedArNSNames(address, cacheData);
      setNames(processedNames);
      console.log('ArNS fetch completed successfully');
      return processedNames;
      
    } catch (error) {
      console.error('Failed to fetch owned ArNS names:', error);
      
      // If fetch fails, still try to use any cached data
      const cached = getOwnedArNSNames(address);
      if (cached) {
        console.log('Using cached data after fetch failure');
        const fallbackNames: ArNSName[] = cached.map(cached => ({
          name: cached.name,
          displayName: decodePunycode(cached.name),
          processId: cached.processId,
          currentTarget: cached.currentTarget,
          lastUpdated: undefined,
          undernames: cached.undernames || []
        }));
        setNames(fallbackNames);
        return fallbackNames;
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [address, walletType, getOwnedArNSNames, setOwnedArNSNames]);

  // Update ArNS name to point to new manifest
  const updateArNSRecord = useCallback(async (
    name: string,
    manifestId: string,
    undername?: string
  ): Promise<ArNSUpdateResult> => {
    const nameRecord = names.find(n => n.name === name);
    if (!nameRecord) {
      return { success: false, error: 'ArNS name not found in your owned names' };
    }

    if (!window.arweaveWallet) {
      return { success: false, error: 'Arweave wallet not connected' };
    }

    setUpdating(prev => ({ ...prev, [name]: true }));
    
    try {
      console.log('Updating ArNS record:', { name, manifestId, undername, processId: nameRecord.processId });
      
      // Initialize ANT with signer for write operations
      const ant = ANT.init({
        processId: nameRecord.processId,
        signer: new ArconnectSigner(window.arweaveWallet)
      });

      let result;
      if (undername) {
        // Update undername record
        console.log('Updating undername record:', undername);
        result = await ant.setUndernameRecord({
          undername,
          transactionId: manifestId,
          ttlSeconds: 600 // 10 minutes TTL (default for all records)
        });
      } else {
        // Update base name record (@ record)
        console.log('Updating base name record');
        result = await ant.setBaseNameRecord({
          transactionId: manifestId,
          ttlSeconds: 600 // 10 minutes TTL (default for all records)
        });
      }
      
      console.log('ArNS update result:', result);

      // Refresh only the updated name's state for efficiency
      if (address) {
        console.log('Refreshing ArNS state for updated name:', name);
        setTimeout(async () => {
          try {
            // Get fresh ANT state for just this name
            const nameRecord = names.find(n => n.name === name);
            if (nameRecord) {
              const ant = ANT.init({ processId: nameRecord.processId });
              const freshState = await ant.getState();
              
              const updatedTarget = freshState.Records?.['@']?.transactionId;
              const updatedUndernames = Object.keys(freshState.Records || {}).filter(key => key !== '@');
              
              // Update just this name in our local state
              setNames(prevNames => prevNames.map(prevName => 
                prevName.name === name 
                  ? {
                      ...prevName,
                      currentTarget: updatedTarget,
                      undernames: updatedUndernames
                    }
                  : prevName
              ));
              
              // Also update the cache with the refreshed data
              const cachedNames = getOwnedArNSNames(address) || [];
              const updatedCacheNames = cachedNames.map(cachedName => 
                cachedName.name === name 
                  ? {
                      ...cachedName,
                      currentTarget: updatedTarget,
                      undernames: updatedUndernames
                    }
                  : cachedName
              );
              
              // If the name wasn't in cache (shouldn't happen), add it
              if (!cachedNames.find(n => n.name === name)) {
                updatedCacheNames.push({
                  name: nameRecord.name,
                  processId: nameRecord.processId,
                  currentTarget: updatedTarget,
                  undernames: updatedUndernames
                });
              }
              
              setOwnedArNSNames(address, updatedCacheNames);
              console.log('Refreshed ANT state and cache for', name, ':', freshState);
            }
          } catch (error) {
            console.warn('Failed to refresh ANT state after update:', error);
            // Fallback to full refresh if selective refresh fails
            fetchOwnedNames(true);
          }
        }, 2000); // Small delay to allow network propagation
      }

      return { 
        success: true, 
        transactionId: result.id 
      };
    } catch (error) {
      console.error('Failed to update ArNS record:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update ArNS record. Please try again.' 
      };
    } finally {
      setUpdating(prev => ({ ...prev, [name]: false }));
    }
  }, [names, address, fetchOwnedNames, getOwnedArNSNames, setOwnedArNSNames]);

  // Refresh a specific ArNS name's state
  const refreshSpecificName = useCallback(async (name: string): Promise<boolean> => {
    if (!address) return false;
    
    console.log('Refreshing specific ArNS name:', name);
    const nameRecord = names.find(n => n.name === name);
    
    if (!nameRecord) {
      console.warn('Name not found in local state:', name);
      return false;
    }
    
    try {
      const ant = ANT.init({ processId: nameRecord.processId });
      const freshState = await ant.getState();
      
      const updatedTarget = freshState.Records?.['@']?.transactionId;
      const updatedUndernames = Object.keys(freshState.Records || {}).filter(key => key !== '@');
      
      // Update local state
      setNames(prevNames => prevNames.map(prevName => 
        prevName.name === name 
          ? {
              ...prevName,
              currentTarget: updatedTarget,
              undernames: updatedUndernames
            }
          : prevName
      ));
      
      // Update cache
      const cachedNames = getOwnedArNSNames(address) || [];
      const updatedCacheNames = cachedNames.map(cachedName => 
        cachedName.name === name 
          ? {
              ...cachedName,
              currentTarget: updatedTarget,
              undernames: updatedUndernames
            }
          : cachedName
      );
      
      // If the name wasn't in cache, add it
      if (!cachedNames.find(n => n.name === name)) {
        updatedCacheNames.push({
          name: nameRecord.name,
          processId: nameRecord.processId,
          currentTarget: updatedTarget,
          undernames: updatedUndernames
        });
      }
      
      setOwnedArNSNames(address, updatedCacheNames);
      console.log('Successfully refreshed ArNS name:', name, freshState);
      return true;
    } catch (error) {
      console.error('Failed to refresh specific ArNS name:', error);
      return false;
    }
  }, [names, address, getOwnedArNSNames, setOwnedArNSNames]);

  // Auto-fetch on address change
  useEffect(() => {
    if (address && walletType === 'arweave') {
      fetchOwnedNames();
    }
  }, [address, walletType, fetchOwnedNames]);

  return {
    names,
    loading,
    updating,
    fetchOwnedNames,
    updateArNSRecord,
    refreshSpecificName
  };
}