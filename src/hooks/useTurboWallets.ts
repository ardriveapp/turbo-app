import { TokenType } from '@ardrive/turbo-sdk/web';
import { useQuery } from '@tanstack/react-query';

export type TurboWallets = Record<TokenType, string>;

/**
 * Get Turbo wallet addresses from payment service
 * Uses dynamic configuration from developer mode
 */
const useTurboWallets = () => {
  const res = useQuery({
    queryKey: ['turboWallets'],
    queryFn: () => {
      // Get dynamic payment service URL from store
      let paymentServiceUrl = 'https://payment.ardrive.io'; // Fallback
      if (typeof window !== 'undefined' && (window as any).__TURBO_STORE__) {
        const config = (window as any).__TURBO_STORE__.getState().getCurrentConfig();
        paymentServiceUrl = config.paymentServiceUrl;
      }

      const url = `${paymentServiceUrl}/info`;

      return fetch(url).then((res) => {
        return res.json().then((info) => {
          return info?.addresses as TurboWallets;
        });
      });
    },
  });

  return res;
};

export default useTurboWallets;
