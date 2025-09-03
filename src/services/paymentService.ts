import { TokenType, TurboWincForFiatResponse, TwoDecimalCurrency } from '@ardrive/turbo-sdk/web';
import { loadStripe, PaymentIntent, Stripe } from '@stripe/stripe-js';

// Dynamic configuration functions
let stripePromiseCache: Promise<Stripe | null> | null = null;

export const getPaymentServiceConfig = () => {
  // Access the current configuration from the store
  const store = (window as any).__TURBO_STORE__;
  if (store) {
    const config = store.getState().getCurrentConfig();
    return {
      paymentServiceUrl: config.paymentServiceUrl,
      stripeKey: config.stripeKey,
    };
  }
  
  // Fallback to legacy behavior
  const isProd = import.meta.env.VITE_NODE_ENV === 'production';
  return {
    paymentServiceUrl: isProd ? 'https://payment.ardrive.io' : 'https://payment.ardrive.dev',
    stripeKey: isProd 
      ? 'pk_live_51JUAtwC8apPOWkDLMQqNF9sPpfneNSPnwX8YZ8y1FNDl6v94hZIwzgFSYl27bWE4Oos8CLquunUswKrKcaDhDO6m002Yj9AeKj'
      : 'pk_test_51JUAtwC8apPOWkDLh2FPZkQkiKZEkTo6wqgLCtQoClL6S4l2jlbbc5MgOdwOUdU9Tn93NNvqAGbu115lkJChMikG00XUfTmo2z',
  };
};

export const getStripePromise = () => {
  const config = getPaymentServiceConfig();
  
  // Cache based on stripe key to avoid recreating unnecessarily
  if (!stripePromiseCache || (window as any).__LAST_STRIPE_KEY__ !== config.stripeKey) {
    stripePromiseCache = loadStripe(config.stripeKey);
    (window as any).__LAST_STRIPE_KEY__ = config.stripeKey;
  }
  
  return stripePromiseCache;
};

// Legacy exports for backwards compatibility
export const STRIPE_PROMISE = getStripePromise();

export const getPaymentIntent = async (
  address: string,
  amount: number,
  token: TokenType,
  promoCode?: string,
) => {
  const config = getPaymentServiceConfig();
  const url = `${config.paymentServiceUrl}/v1/top-up/payment-intent/${address}/usd/${amount}`;

  const queryStringValues = {
    token,
    ...(promoCode && { promoCode }),
  };

  const queryString = `?${new URLSearchParams(queryStringValues).toString()}`;

  const res = await fetch(url.concat(queryString));

  if (res.status !== 200) {
    // Payment service request failed
    throw new Error('Error connecting to server. Please try again later.');
  }
  
  return res.json() as Promise<{
    topUpQuote: { quotedPaymentAmount: number };
    paymentSession: PaymentIntent;
  }>;
};

// Function to get winc for fiat with promo code support
export const getWincForFiat = async ({
  amount,
  promoCode,
  destinationAddress,
}: {
  amount: TwoDecimalCurrency;
  promoCode?: string;
  destinationAddress?: string;
}): Promise<TurboWincForFiatResponse> => {
  const config = getPaymentServiceConfig();
  const url = `${config.paymentServiceUrl}/v1/price/usd/${amount.amount}`;
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

export const submitCryptoTransaction = async (
  txId: string,
  token: TokenType,
) => {
  const config = getPaymentServiceConfig();
  const url = `${config.paymentServiceUrl}/v1/top-up/crypto/${token}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: txId }),
  });

  if (!res.ok) {
    throw new Error('Failed to submit crypto transaction');
  }

  return res.json();
};

export const getGiftPaymentIntent = async ({
  amount,
  recipientEmail,
  giftMessage,
}: {
  amount: number;
  recipientEmail: string;
  giftMessage?: string;
}) => {
  const config = getPaymentServiceConfig();
  const url = `${config.paymentServiceUrl}/v1/top-up/payment-intent/${recipientEmail}/usd/${amount * 100}`;

  const queryParams = new URLSearchParams({
    destinationAddressType: 'email',
    ...(giftMessage && { giftMessage }),
  });

  const res = await fetch(`${url}?${queryParams}`);

  if (!res.ok) {
    throw new Error('Failed to create gift payment intent');
  }

  return res.json() as Promise<{
    topUpQuote: { quotedPaymentAmount: number };
    paymentSession: PaymentIntent;
  }>;
};

export const getCheckoutSessionUrl = async ({
  amount,
  recipientEmail,
  giftMessage,
  senderEmail,
}: {
  amount: number;
  recipientEmail: string;
  giftMessage?: string;
  senderEmail?: string;
}) => {
  const config = getPaymentServiceConfig();
  const url = `${config.paymentServiceUrl}/v1/gift/checkout-session`;
  
  const body = {
    amount: amount * 100, // Convert to cents
    recipientEmail,
    ...(giftMessage && { giftMessage }),
    ...(senderEmail && { senderEmail }),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error('Failed to create checkout session');
  }

  const data = await res.json();
  return data.url;
};