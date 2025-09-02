import { TokenType } from '@ardrive/turbo-sdk/web';
import { useQuery } from '@tanstack/react-query';
import { TURBO_WALLETS_URL } from '../constants';

export type TurboWallets = Record<TokenType, string>;

const useTurboWallets = () => {
  const res = useQuery({
    queryKey: ['turboWallets'],
    queryFn: () => {
      return fetch(TURBO_WALLETS_URL).then((res) => {
        return res.json().then((info) => {
          return info?.addresses as TurboWallets;
        });
      });
    },
  });

  return res;
};

export default useTurboWallets;
