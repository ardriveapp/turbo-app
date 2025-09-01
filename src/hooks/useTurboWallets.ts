import { TokenType } from '@ardrive/turbo-sdk/web';
import { useQuery } from '@tanstack/react-query';
import { TURBO_WALLETS_URL } from '../constants';

export type TurboWallets = Record<TokenType, string>;

const useTurboWallets = () => {
  const res = useQuery({
    queryKey: ['turboWallets'],
    queryFn: async () => {
      // Try the main info endpoint first
      const infoUrl = TURBO_WALLETS_URL.replace('/v1/wallets', '/info');
      try {
        const res = await fetch(infoUrl);
        if (res.ok) {
          const info = await res.json();
          // Check if wallets/addresses are in the info response
          return info?.addresses as TurboWallets || info?.wallets as TurboWallets;
        }
      } catch (e) {
        console.warn('Failed to fetch from /info endpoint:', e);
      }
      
      // Fallback to original wallets endpoint
      try {
        const res = await fetch(TURBO_WALLETS_URL);
        if (res.ok) {
          const info = await res.json();
          return info?.addresses as TurboWallets;
        }
      } catch (e) {
        console.warn('Failed to fetch from wallets endpoint:', e);
      }
      
      // If both fail, return empty object to prevent crashes
      console.error('Failed to fetch Turbo wallet addresses from both endpoints');
      return {} as TurboWallets;
    },
  });

  return res;
};

export default useTurboWallets;
