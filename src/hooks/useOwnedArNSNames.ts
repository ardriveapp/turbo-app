import { useCallback, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getARIO, getANT, WRITE_OPTIONS, createContractSigner } from '../utils';
import { createAoSigner } from '@ar.io/sdk/web';

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
  currentTarget?: string; // Current transaction ID (fetched on-demand)
  lastUpdated?: Date;
  undernames?: string[];  // Available undernames (fetched on-demand)
  ttl?: number;           // TTL in seconds for base name (@)
  undernameTTLs?: Record<string, number>; // TTL for each undername
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
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  // Fetch names owned by current address
  const fetchOwnedNames = useCallback(async (forceRefresh: boolean = false): Promise<ArNSName[]> => {
    if (!address || (walletType !== 'arweave' && walletType !== 'ethereum')) return []; // Fetch names for Arweave and Ethereum wallets
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getOwnedArNSNames(address);
      if (cached) {
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
      // Use AR.IO SDK to get owned names with custom CU
      const ario = getARIO();
      const records = await ario.getArNSRecordsForAddress({
        address: address,
        limit: 100, // Get up to 100 names
        sortBy: 'startTimestamp',
        sortOrder: 'desc' // Most recent first
      });
      
      
      // Process names WITHOUT fetching ANT details (lazy loading approach)
      const processedNames: ArNSName[] = (records.items || []).map(record => ({
        name: record.name,
        displayName: decodePunycode(record.name),
        processId: record.processId,
        currentTarget: undefined, // Will be fetched on-demand
        lastUpdated: record.startTimestamp ? new Date(record.startTimestamp) : undefined,
        undernames: undefined // Will be fetched on-demand
      }));
      
      // Check if we have cached ANT details for any of these names
      const cached = getOwnedArNSNames(address);
      if (cached) {
        // Merge cached ANT details with fresh name list
        processedNames.forEach(name => {
          const cachedName = cached.find(c => c.name === name.name);
          if (cachedName) {
            name.currentTarget = cachedName.currentTarget;
            name.undernames = cachedName.undernames || [];
          }
        });
      }
      
      // Prepare cache data (only basic info, ANT details added on-demand)
      const cacheData = processedNames.map(name => ({
        name: name.name,
        processId: name.processId,
        currentTarget: name.currentTarget,
        undernames: name.undernames
      }));
      
      
      // Cache the results
      setOwnedArNSNames(address, cacheData);
      setNames(processedNames);
      return processedNames;
      
    } catch (error) {
      console.error('Failed to fetch owned ArNS names:', error);
      
      // If fetch fails, still try to use any cached data
      const cached = getOwnedArNSNames(address);
      if (cached) {
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
    undername?: string,
    customTTL?: number
  ): Promise<ArNSUpdateResult> => {
    const { walletType } = useStore.getState();
    
    const nameRecord = names.find(n => n.name === name);
    if (!nameRecord) {
      return { success: false, error: 'ArNS name not found in your owned names' };
    }

    setUpdating(prev => ({ ...prev, [name]: true }));
    
    try {
      // Create wallet-specific contract signer (async for Ethereum setup)
      const contractSigner = await createContractSigner(walletType);
      
      // Create AO signer using SDK helper (like reference app)
      const aoSigner = createAoSigner(contractSigner);
      
      // Initialize ANT with custom CU URL and proper signer
      const ant = getANT(nameRecord.processId, aoSigner) as any;

      // Determine TTL to use: custom > existing > default (600)
      let ttlToUse: number;
      if (customTTL !== undefined) {
        // User explicitly set a custom TTL
        ttlToUse = customTTL;
      } else if (undername && nameRecord.undernameTTLs?.[undername]) {
        // Preserve existing undername TTL
        ttlToUse = nameRecord.undernameTTLs[undername];
      } else if (!undername && nameRecord.ttl) {
        // Preserve existing base name TTL
        ttlToUse = nameRecord.ttl;
      } else {
        // Default for new records
        ttlToUse = 600;
      }

      let result;
      if (undername) {
        // Update undername record
        result = await ant.setRecord({
          undername,
          transactionId: manifestId,
          ttlSeconds: ttlToUse
        }, WRITE_OPTIONS);
      } else {
        // Update base name record (@)
        result = await ant.setRecord({
          undername: '@',
          transactionId: manifestId,
          ttlSeconds: ttlToUse
        }, WRITE_OPTIONS);
      }
      

      // Refresh only the updated name's state for efficiency
      if (address) {
        console.log('Refreshing ArNS state for updated name:', name);
        setTimeout(async () => {
          try {
            // Get fresh ANT state for just this name
            const nameRecord = names.find(n => n.name === name);
            if (nameRecord) {
              const ant = getANT(nameRecord.processId);
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

  // Fetch ANT details for a specific name (on-demand)
  const fetchNameDetails = useCallback(async (name: string): Promise<ArNSName | null> => {
    const nameRecord = names.find(n => n.name === name);
    if (!nameRecord) return null;
    
    // Check if we already have complete details (both currentTarget and undernames defined)
    if (nameRecord.currentTarget !== undefined && nameRecord.undernames !== undefined) {
      console.log('Already have complete ANT details for:', name);
      return nameRecord;
    }
    
    setLoadingDetails(prev => ({ ...prev, [name]: true }));
    
    try {
      console.log('Fetching ANT details on-demand for:', name);
      const ant = getANT(nameRecord.processId);
      const state = await ant.getState();

      const currentTarget = state.Records?.['@']?.transactionId;
      const ttl = state.Records?.['@']?.ttlSeconds;
      const undernames = Object.keys(state.Records || {}).filter(key => key !== '@');

      // Extract TTL for each undername
      const undernameTTLs: Record<string, number> = {};
      undernames.forEach(undername => {
        const ttlSeconds = state.Records?.[undername]?.ttlSeconds;
        if (ttlSeconds !== undefined) {
          undernameTTLs[undername] = ttlSeconds;
        }
      });

      const updatedName: ArNSName = {
        ...nameRecord,
        currentTarget: currentTarget || undefined,
        ttl: ttl || 600, // Default to 600 if not set
        undernames,
        undernameTTLs
      };
      
      // Update local state
      setNames(prevNames => prevNames.map(n => 
        n.name === name ? updatedName : n
      ));
      
      // Update cache with the new details
      if (address) {
        const cachedNames = getOwnedArNSNames(address) || [];
        let updatedCache;
        
        // Check if this name is already in cache
        const existingIndex = cachedNames.findIndex(c => c.name === name);
        if (existingIndex >= 0) {
          // Update existing cache entry
          updatedCache = [...cachedNames];
          updatedCache[existingIndex] = {
            name: nameRecord.name,
            processId: nameRecord.processId,
            currentTarget: currentTarget || undefined,
            undernames,
            ttl: ttl || 600,
            undernameTTLs
          };
        } else {
          // Add new cache entry
          updatedCache = [...cachedNames, {
            name: nameRecord.name,
            processId: nameRecord.processId,
            currentTarget: currentTarget || undefined,
            undernames,
            ttl: ttl || 600,
            undernameTTLs
          }];
        }
        
        setOwnedArNSNames(address, updatedCache);
        console.log('Updated cache with ANT details for:', name);
      }
      
      console.log('Fetched ANT details for', name, ':', { currentTarget, undernames });
      return updatedName;
      
    } catch (error) {
      console.error('Failed to fetch ANT details for', name, ':', error);
      
      // Even on error, mark as attempted by setting empty values
      const failedName: ArNSName = {
        ...nameRecord,
        currentTarget: undefined,
        undernames: []
      };
      
      setNames(prevNames => prevNames.map(n => 
        n.name === name ? failedName : n
      ));
      
      return failedName;
    } finally {
      setLoadingDetails(prev => ({ ...prev, [name]: false }));
    }
  }, [names, address, getOwnedArNSNames, setOwnedArNSNames]);

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
      const ant = getANT(nameRecord.processId);
      const freshState = await ant.getState();

      const updatedTarget = freshState.Records?.['@']?.transactionId;
      const updatedTTL = freshState.Records?.['@']?.ttlSeconds;
      const updatedUndernames = Object.keys(freshState.Records || {}).filter(key => key !== '@');

      // Extract TTL for each undername
      const updatedUndernameTTLs: Record<string, number> = {};
      updatedUndernames.forEach(undername => {
        const ttlSeconds = freshState.Records?.[undername]?.ttlSeconds;
        if (ttlSeconds !== undefined) {
          updatedUndernameTTLs[undername] = ttlSeconds;
        }
      });

      // Update local state
      setNames(prevNames => prevNames.map(prevName =>
        prevName.name === name
          ? {
              ...prevName,
              currentTarget: updatedTarget,
              ttl: updatedTTL || 600,
              undernames: updatedUndernames,
              undernameTTLs: updatedUndernameTTLs
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
              ttl: updatedTTL || 600,
              undernames: updatedUndernames,
              undernameTTLs: updatedUndernameTTLs
            }
          : cachedName
      );

      // If the name wasn't in cache, add it
      if (!cachedNames.find(n => n.name === name)) {
        updatedCacheNames.push({
          name: nameRecord.name,
          processId: nameRecord.processId,
          currentTarget: updatedTarget,
          ttl: updatedTTL || 600,
          undernames: updatedUndernames,
          undernameTTLs: updatedUndernameTTLs
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

  // Auto-fetch on address/wallet change - proactive loading for better UX
  useEffect(() => {
    if (address && (walletType === 'arweave' || walletType === 'ethereum')) {
      // Fetch names immediately when user connects
      fetchOwnedNames();
    }
  }, [address, walletType, fetchOwnedNames]);

  return {
    names,
    loading,
    updating,
    loadingDetails,
    fetchOwnedNames,
    fetchNameDetails,
    updateArNSRecord,
    refreshSpecificName
  };
}