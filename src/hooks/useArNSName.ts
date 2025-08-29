import { useEffect, useState } from 'react';
import { ARIO } from '@ar.io/sdk';
import { useStore } from '../store/useStore';

export function useArNSName(address: string | null) {
  const { walletType, getArNSName, setArNSName } = useStore();
  const [arnsName, setArnsName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchArNSName() {
      // Skip if no address or if it's a Solana wallet (no ArNS support)
      if (!address || walletType === 'solana') {
        setArnsName(null);
        return;
      }

      // Check cache first
      const cachedName = getArNSName(address);
      if (cachedName) {
        setArnsName(cachedName);
        return;
      }

      setLoading(true);
      try {
        const ario = ARIO.mainnet();
        const result = await ario.getPrimaryName({ address });
        
        if (result && result.name) {
          setArnsName(result.name);
          setArNSName(address, result.name);
        } else {
          setArnsName(null);
        }
      } catch (_error) {
        // If no primary name found or error, just use address
        console.log('No ArNS primary name found for address:', address);
        setArnsName(null);
      } finally {
        setLoading(false);
      }
    }

    fetchArNSName();
  }, [address, walletType, getArNSName, setArNSName]);

  return { arnsName, loading };
}