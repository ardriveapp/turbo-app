import {
  ARToTokenAmount,
  ETHToTokenAmount,
  SOLToTokenAmount,
  TokenType,
  TurboWincForFiatResponse,
  TwoDecimalCurrency,
} from '@ardrive/turbo-sdk/web';
import { defaultPaymentServiceUrl } from '../constants';

export const getTurboBalance = async (
  address: string,
  tokenType: string = 'arweave',
) => {
  const url = `${defaultPaymentServiceUrl}/v1/account/balance/${tokenType}?address=${address}`;

  const response = await fetch(url);

  if (response.status == 404) {
    return { winc: 0 };
  }

  return response.json();
};

export const getWincForToken = async (
  amount: number,
  tokenType: string = 'arweave',
): Promise<{ winc: string }> => {
  const url = `${defaultPaymentServiceUrl}/v1/price/${tokenType}/${amount}`;

  const response = await fetch(url);

  if (response.status == 404) {
    return { winc: '0' };
  }

  return response.json();
};

export const getWincForFiat = async ({
  amount,
  promoCode,
  destinationAddress,
}: {
  amount: TwoDecimalCurrency;
  promoCode?: string;
  destinationAddress?: string;
}): Promise<TurboWincForFiatResponse> => {
  const url = `${defaultPaymentServiceUrl}/v1/price/usd/${amount.amount}`;
  const queryString =
    promoCode && destinationAddress
      ? `?${new URLSearchParams({ promoCode, destinationAddress }).toString()}`
      : '';
  const response = await fetch(url.concat(queryString));

  if (response.status == 404) {
    return {
      winc: '0',
      adjustments: [],
      fees: [],
      actualPaymentAmount: 0,
      quotedPaymentAmount: 0,
    };
  }

  return response.json();
};

export const formatWalletAddress = (address: string, shownCount = 4) => {
  if (!address || typeof address !== 'string') {
    return 'Invalid Address';
  }
  
  if (address.length <= shownCount * 2) {
    return address; // Return full address if it's too short to truncate
  }
  
  return `${address.slice(0, shownCount)}...${address.slice(
    address.length - shownCount,
    address.length,
  )}`;
};

export const wincToCredits = (winc: number) => {
  return winc / 1_000_000_000_000;
};

export const getAmountByTokenType = (amount: number, token?: TokenType) => {
  switch (token) {
    case 'arweave':
      return ARToTokenAmount(amount);
    case 'ethereum':
      return ETHToTokenAmount(amount);
    case 'solana':
      return SOLToTokenAmount(amount);
  }
  return undefined;
};

export const getExplorerUrl = (txid: string, token: string) => {
  switch (token) {
    case 'arweave':
      return `https://viewblock.io/arweave/tx/${txid}`;
    case 'ethereum':
      return `https://etherscan.io/tx/${txid}`;
    case 'solana':
      return `https://solscan.io/tx/${txid}`;
  }
  return undefined;
};

export const getGatewayBaseUrl = (): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // Local development - use arweave.net
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://arweave.net';
  }
  
  // Production - use current domain as gateway  
  const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
  return baseUrl;
};

export const getArweaveUrl = (txId: string): string => {
  const gatewayBase = getGatewayBaseUrl();
  return `${gatewayBase}/${txId}`;
};