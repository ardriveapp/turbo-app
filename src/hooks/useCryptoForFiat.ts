import { Currency, TurboUnauthenticatedClient } from '@ardrive/turbo-sdk/web';
import { useQuery } from '@tanstack/react-query';

const useFiatToAR = (
  turboUnauthenticatedClient?: TurboUnauthenticatedClient,
  currency: Currency = 'usd',
) => {
  const res = useQuery({
    queryKey: ['fiatToAr', currency],
    queryFn: () => {
      if (!turboUnauthenticatedClient) {
        throw Error('TurboUnauthenticatedClient is not set');
      }
      return turboUnauthenticatedClient.getFiatToAR({ currency });
    },
  });
  return res;
};

export default useFiatToAR;
export { useFiatToAR as useCryptoForFiat };
