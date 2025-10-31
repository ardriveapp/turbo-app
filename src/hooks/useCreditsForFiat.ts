import { TurboFactory, USD } from "@ardrive/turbo-sdk/web";
import { useQuery } from "@tanstack/react-query";
import { wincPerCredit } from "../constants";
import { useTurboConfig } from "./useTurboConfig";

export function useCreditsForFiat(
  debouncedUsdAmount: number,
  errorCallback: (message: string) => void,
): [number | undefined, number | undefined] {
  const turboConfig = useTurboConfig();

  const { data: winc, error } = useQuery({
    queryKey: ['creditsForFiat', debouncedUsdAmount, turboConfig.paymentServiceConfig.url],
    queryFn: async () => {
      const result = await TurboFactory.unauthenticated(turboConfig)
        .getWincForFiat({
          amount: USD(debouncedUsdAmount),
          promoCodes: []
        });
      return result.winc;
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
  });

  // Handle errors
  if (error) {
    console.error(error);
    errorCallback(`Error getting credits for USD amount: ${(error as Error).message}`);
  }

  return [
    winc ? +winc / wincPerCredit : undefined,
    debouncedUsdAmount,
  ];
}