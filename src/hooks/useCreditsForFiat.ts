import { TurboFactory, USD } from "@ardrive/turbo-sdk/web";
import { useState, useRef, useEffect } from "react";
import { wincPerCredit } from "../constants";
import { useTurboConfig } from "./useTurboConfig";

export function useCreditsForFiat(
  debouncedUsdAmount: number,
  errorCallback: (message: string) => void,
): [number | undefined, number | undefined] {
  const [winc, setWinc] = useState<string | undefined>(undefined);
  const usdWhenCreditsWereLastUpdatedRef = useRef<number | undefined>(
    undefined,
  );
  const turboConfig = useTurboConfig();

  // Get credits for USD amount when USD amount has stopped debouncing
  useEffect(() => {
    TurboFactory.unauthenticated(turboConfig)
      .getWincForFiat({ amount: USD(debouncedUsdAmount), promoCodes: [] })
      .then(({ winc }) => {
        usdWhenCreditsWereLastUpdatedRef.current = debouncedUsdAmount;
        setWinc(winc);
      })
      .catch((err) => {
        console.error(err);
        errorCallback(`Error getting credits for USD amount: ${err.message}`);
      });
  }, [debouncedUsdAmount, errorCallback, turboConfig]);

  return [
    winc ? +winc / wincPerCredit : undefined,
    usdWhenCreditsWereLastUpdatedRef.current,
  ];
}