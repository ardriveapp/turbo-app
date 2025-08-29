import { tokenToBaseMap, TurboFactory } from "@ardrive/turbo-sdk/web";
import { useState, useEffect } from "react";
import { turboConfig } from "../constants";

export function useWincForOneGiB() {
  const [wincForOneGiB, setWincForOneGiB] = useState<string | undefined>(
    undefined,
  );

  // On first render, get winc for 1 GiB for conversions
  useEffect(() => {
    TurboFactory.unauthenticated(turboConfig)
      .getFiatRates()
      .then(({ winc }) => {
        setWincForOneGiB(winc);
      });
  }, []);

  return wincForOneGiB;
}

export function useWincForToken(token: "arweave" | "ario", amount: number) {
  const [wincForToken, setWincForToken] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    TurboFactory.unauthenticated({ ...turboConfig, token })
      .getWincForToken({
        tokenAmount: tokenToBaseMap[token](amount),
      })
      .then(({ winc }) => {
        setWincForToken(winc);
      });
  }, [token, amount]);

  return wincForToken;
}