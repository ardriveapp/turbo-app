import { tokenToBaseMap, TurboFactory, ETHToTokenAmount, SOLToTokenAmount, ARToTokenAmount, ARIOToTokenAmount } from "@ardrive/turbo-sdk/web";
import { useState, useEffect } from "react";
import { useTurboConfig } from "./useTurboConfig";

export function useWincForOneGiB() {
  const [wincForOneGiB, setWincForOneGiB] = useState<string | undefined>(
    undefined,
  );
  const turboConfig = useTurboConfig();

  // On first render, get winc for 1 GiB for conversions
  useEffect(() => {
    TurboFactory.unauthenticated(turboConfig)
      .getFiatRates()
      .then(({ winc }) => {
        setWincForOneGiB(winc);
      });
  }, [turboConfig]);

  return wincForOneGiB;
}

export function useWincForToken(token: "arweave" | "ario", amount: number) {
  const [wincForToken, setWincForToken] = useState<string | undefined>(
    undefined,
  );
  const turboConfig = useTurboConfig();
  
  useEffect(() => {
    TurboFactory.unauthenticated({ ...turboConfig, token })
      .getWincForToken({
        tokenAmount: tokenToBaseMap[token](amount),
      })
      .then(({ winc }) => {
        setWincForToken(winc);
      });
  }, [token, amount, turboConfig]);

  return wincForToken;
}

// Get proper token amount with unit conversion (following reference app pattern)
const getAmountByTokenType = (amount: number, token: string) => {
  switch (token) {
    case 'arweave':
      return ARToTokenAmount(amount);
    case 'ethereum':
    case 'base-eth':
      return ETHToTokenAmount(amount);  // Converts to wei for both mainnet and Base
    case 'solana':
      return SOLToTokenAmount(amount);  // Converts to lamports
    case 'ario':
      return ARIOToTokenAmount(amount); // Proper ARIO token conversion
    // For now, these tokens use base amounts - may need specific converters later
    case 'kyve':
    case 'matic':
    case 'pol':
      return amount * 1e18; // Most ERC20 tokens use 18 decimals
    default:
      return amount;
  }
};

// Direct API call for getting winc price (following reference app pattern)
const getWincForToken = async (amount: number, tokenType: string, paymentServiceUrl: string): Promise<{ winc: string }> => {
  const PAYMENT_SERVICE_FQDN = paymentServiceUrl.replace('https://', '');
  const url = `https://${PAYMENT_SERVICE_FQDN}/v1/price/${tokenType}/${amount}`;

  const response = await fetch(url);

  if (response.status === 404) {
    return { winc: '0' };
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

// Extended hook to support all supported token types (using reference app approach)
export function useWincForAnyToken(token: string, amount: number) {
  const [wincForToken, setWincForToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const turboConfig = useTurboConfig();
  
  useEffect(() => {
    if (amount <= 0) {
      setWincForToken(undefined);
      setError(null);
      return;
    }

    setError(null);
    setLoading(true);
    
    const fetchPricing = async () => {
      try {
        // Convert to proper token units (wei for ETH, lamports for SOL, etc.)
        const tokenAmount = getAmountByTokenType(amount, token);
        
        if (!tokenAmount) {
          throw new Error(`Unsupported token type: ${token}`);
        }
        
        // Use direct API call like reference app
        const paymentServiceUrl = turboConfig.paymentServiceConfig?.url || 'https://payment.ardrive.io';
        const result = await getWincForToken(+tokenAmount, token, paymentServiceUrl);
        
        if (result.winc && Number(result.winc) > 0) {
          setWincForToken(result.winc);
        } else {
          throw new Error(`No pricing data available for ${token}`);
        }
      } catch (err) {
        console.warn(`Pricing failed for ${token}:`, err);
        const errorMessage = err instanceof Error ? err.message : `${token.toUpperCase()} pricing not available`;
        setError(errorMessage);
        setWincForToken(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [token, amount, turboConfig]);

  return { wincForToken, error, loading };
}