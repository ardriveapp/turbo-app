import { useQuery } from '@tanstack/react-query';
import { getPaymentServiceConfig } from '../services/paymentService';

const useCountries = () => {
  const res = useQuery({
    queryKey: ['countries'],
    queryFn: () => {
      const config = getPaymentServiceConfig();
      const serviceURL = `${config.paymentServiceUrl}/v1/countries`;
      return fetch(serviceURL).then((res) => res.json() as Promise<string[]>);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return res;
};

export default useCountries;