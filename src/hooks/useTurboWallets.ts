import { TokenType } from '@ardrive/turbo-sdk/web';
import { useQuery } from '@tanstack/react-query';

import { defaultPaymentServiceUrl } from '../constants';

const TURBO_WALLETS_URL = `${defaultPaymentServiceUrl}/info`;

export type TurboWallets = Record<TokenType, string>;

const useTurboWallets = () => {
  const res = useQuery({
    queryKey: ['turboWallets'],
    queryFn: async () => {
      const response = await fetch(TURBO_WALLETS_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch Turbo wallets');
      }
      const info = await response.json();
      return info?.addresses as TurboWallets;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });

  return res;
};

export default useTurboWallets;