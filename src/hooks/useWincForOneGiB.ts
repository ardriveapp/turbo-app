import { TurboFactory } from "@ardrive/turbo-sdk";
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
