import { useEffect, useState } from 'react';
import { ARIO, ANT } from '@ar.io/sdk';
import { useStore } from '../store/useStore';

// Check if address is valid Arweave transaction ID
function checkValidAddress(address: string): boolean {
  return /^[a-zA-Z0-9_-]{43}$/.test(address);
}

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
  } catch (error) {
    // If decoding fails, return original name
    return name;
  }
};

export interface ArNSProfile {
  name: string | null;
  logo: string | null;
}

export function usePrimaryArNSName(address: string | null) {
  const { walletType, getArNSName, setArNSName } = useStore();
  const [arnsName, setArnsName] = useState<string | null>(null);
  const [arnsLogo, setArnsLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchArNSProfile() {
      // Skip if no address or if it's a Solana wallet (no ArNS support)
      if (!address || walletType === 'solana' || !checkValidAddress(address)) {
        setArnsName(null);
        setArnsLogo(null);
        return;
      }

      // Check cache first
      const cached = getArNSName(address);
      if (cached) {
        setArnsName(cached.name);
        setArnsLogo(cached.logo || null);
        return;
      }

      setLoading(true);
      try {
        // Get primary name with longer timeout
        const ario = ARIO.mainnet();
        console.log('Fetching primary name for address:', address);
        
        // Create a more generous timeout promise
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.log('Primary name fetch timed out after 30 seconds for:', address);
            resolve(null);
          }, 30000); // Increased to 30 second timeout
        });

        const primaryNamePromise = ario.getPrimaryName({ address }).catch((error) => {
          console.log('Primary name fetch failed:', error);
          return null;
        });
        
        const result = await Promise.race([primaryNamePromise, timeoutPromise]);
        
        if (result && result.name) {
          const primaryName = result.name;
          const displayName = decodePunycode(primaryName);
          setArnsName(displayName); // Store the decoded name for display
          
          // Now try to get the logo
          let logoTxId: string | null = null;
          try {
            console.log('Fetching logo for ArNS name:', primaryName);
            
            // Create timeout for logo fetch with much longer timeout
            const logoTimeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                console.log('Logo fetch timed out after 45 seconds for:', primaryName);
                resolve(null);
              }, 45000); // Increased to 45 second timeout for logo
            });

            const logoPromise = (async () => {
              try {
                // Get the ArNS record to get the processId
                console.log('Getting ArNS record for:', primaryName);
                const record = await ario.getArNSRecord({ name: primaryName });
                console.log('ArNS record result:', record);
                
                if (record && record.processId) {
                  console.log('Initializing ANT client with processId:', record.processId);
                  // Initialize ANT client and get logo
                  const ant = ANT.init({ processId: record.processId });
                  const logo = await ant.getLogo();
                  console.log('ANT logo result:', logo);
                  
                  const isValidLogo = logo && checkValidAddress(logo);
                  console.log('Logo validation result:', isValidLogo, 'for logo:', logo);
                  
                  return isValidLogo ? logo : null;
                }
                console.log('No processId found in ArNS record');
                return null;
              } catch (innerError) {
                console.log('Inner logo fetch error:', innerError);
                return null;
              }
            })();

            logoTxId = await Promise.race([logoPromise, logoTimeoutPromise]);
            console.log('Final logo txId after race:', logoTxId);
          } catch (logoError) {
            console.log('Failed to fetch ArNS logo for', primaryName, ':', logoError);
          }

          // Set logo state
          setArnsLogo(logoTxId);
          
          // Cache both name and logo
          setArNSName(address, primaryName, logoTxId || undefined);
        } else {
          setArnsName(null);
          setArnsLogo(null);
          // Cache negative result to avoid repeated API calls
          setArNSName(address, '', undefined);
        }
      } catch (error) {
        // If no primary name found or error, just use address
        console.log('No ArNS primary name found for address:', address, error);
        setArnsName(null);
        setArnsLogo(null);
      } finally {
        setLoading(false);
      }
    }

    fetchArNSProfile();
  }, [address, walletType, getArNSName, setArNSName]);

  // Create the profile object
  const profile: ArNSProfile = {
    name: arnsName,
    logo: arnsLogo ? `https://arweave.net/${arnsLogo}` : null
  };

  return { arnsName, arnsLogo, profile, loading };
}