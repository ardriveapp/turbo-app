import { TurboFactory, tokenToBaseMap } from "@ardrive/turbo-sdk/web";
import { useState, useRef, useEffect } from "react";
import { turboConfig, wincPerCredit, SupportedTokenType } from "../constants";

export function useCreditsForCrypto(
  debouncedCryptoAmount: number,
  tokenType: SupportedTokenType,
  errorCallback: (message: string) => void,
): [number | undefined, number | undefined] {
  const [winc, setWinc] = useState<string | undefined>(undefined);
  const cryptoWhenCreditsWereLastUpdatedRef = useRef<number | undefined>(
    undefined,
  );

  // Get credits for crypto amount when crypto amount has stopped debouncing
  useEffect(() => {
    if (!debouncedCryptoAmount || debouncedCryptoAmount <= 0) {
      setWinc(undefined);
      cryptoWhenCreditsWereLastUpdatedRef.current = undefined;
      return;
    }

    TurboFactory.unauthenticated({
      ...turboConfig,
      token: tokenType as any,
    })
      .getWincForToken({ 
        tokenAmount: tokenToBaseMap[tokenType as keyof typeof tokenToBaseMap](debouncedCryptoAmount),
      })
      .then(({ winc }) => {
        cryptoWhenCreditsWereLastUpdatedRef.current = debouncedCryptoAmount;
        setWinc(winc);
      })
      .catch((err) => {
        console.error(err);
        errorCallback(`Error getting credits for ${tokenType} amount: ${err.message}`);
      });
  }, [debouncedCryptoAmount, tokenType, errorCallback]);

  return [
    winc ? +winc / wincPerCredit : undefined,
    cryptoWhenCreditsWereLastUpdatedRef.current,
  ];
}