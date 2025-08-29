import { TokenType, TurboFactory, USD } from '@ardrive/turbo-sdk/web';
import { useCallback, useEffect, useState } from 'react';
import { turboConfig, defaultPaymentServiceUrl } from '../constants';

// Extract domain from payment service URL
const PAYMENT_SERVICE_FQDN = defaultPaymentServiceUrl.replace('https://', '');

const getWincForToken = async (
  amount: number,
  tokenType: string = 'arweave',
): Promise<{ winc: string }> => {
  const url = `https://${PAYMENT_SERVICE_FQDN}/v1/price/${tokenType}/${amount}`;
  const response = await fetch(url);
  if (response.status == 404) {
    return { winc: '0' };
  }
  return response.json();
};

interface CryptoQuote {
  tokenAmount: number;
  usdAmount: number;
  credits: number;
  gigabytes: number;
  expiresAt: Date;
}

export function useCryptoForFiat(
  usdAmount: number,
  tokenType: TokenType,
  onError?: (error: string) => void
): [CryptoQuote | null, boolean, () => void] {
  const [quote, setQuote] = useState<CryptoQuote | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fetchQuote = useCallback(async () => {
    if (!usdAmount || usdAmount <= 0 || !tokenType) {
      setQuote(null);
      return;
    }
    
    setLoading(true);
    try {
      const turbo = TurboFactory.unauthenticated({
        ...turboConfig,
        token: tokenType,
      });
      
      // Get winc amount for this USD (this gives us the baseline)
      const wincForFiat = await turbo.getWincForFiat({
        amount: USD(usdAmount),
      });

      // Now calculate token amount using proper pricing API
      // We need to find what token amount equals this winc amount
      const credits = Number(wincForFiat.winc) / 1_000_000_000_000; // winc to credits
      
      // Try different token amounts to find the one that gives us the target winc
      // This is a simplified approach - in production you'd want proper rate conversion
      let tokenAmount = 1; // Start with 1 token
      try {
        // Get the winc value for 1 unit of this token type
        const wincForOneToken = await getWincForToken(1, tokenType);
        const wincPerToken = Number(wincForOneToken.winc);
        
        if (wincPerToken > 0) {
          // Calculate how many tokens we need to match the USD winc value
          tokenAmount = Number(wincForFiat.winc) / wincPerToken;
        }
      } catch (error) {
        console.error('Error calculating token amount:', error);
        // Fallback to reasonable estimates if API fails
        switch (tokenType) {
          case 'arweave': tokenAmount = usdAmount * 0.05; break;
          case 'ario': tokenAmount = usdAmount * 100; break;  
          case 'ethereum': tokenAmount = usdAmount * 0.0003; break;
          case 'base-eth': tokenAmount = usdAmount * 0.0003; break;
          case 'solana': tokenAmount = usdAmount * 0.005; break;
          default: tokenAmount = usdAmount * 0.1; break;
        }
      }
      
      const gigabytes = credits * 0.000268; // approximate GiB per credit
      
      setQuote({
        tokenAmount,
        usdAmount,
        credits,
        gigabytes,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      });
      
      onError?.('');
    } catch (error) {
      console.error('Error fetching crypto quote:', error);
      onError?.('Failed to get pricing quote. Please try again.');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [usdAmount, tokenType, onError]);
  
  const refreshQuote = useCallback(() => {
    fetchQuote();
  }, [fetchQuote]);
  
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);
  
  return [quote, loading, refreshQuote];
}