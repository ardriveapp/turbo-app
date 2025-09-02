import { useQuery } from '@tanstack/react-query';
import { PAYMENT_SERVICE_FQDN } from '../services/paymentService';

const serviceURL = `https://${PAYMENT_SERVICE_FQDN}/v1/countries`;

const useCountries = () => {
  const res = useQuery({
    queryKey: ['countries'],
    queryFn: () => {
      return fetch(serviceURL).then((res) => res.json() as Promise<string[]>);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return res;
};

export default useCountries;