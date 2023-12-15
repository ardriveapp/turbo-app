import { paymentServiceUrl } from "../constants";

export async function getCheckoutSessionUrl({
  giftMessage,
  recipientEmail,
  usdAmount,
}: {
  usdAmount: number;
  recipientEmail: string;
  giftMessage?: string;
}): Promise<string> {
  // TODO: support emails on turbo sdk
  // return turboFactory.unauthenticated(turboConfig).createCheckoutSession({ amount: USD(usdAmount / 100), email: recipientEmail })
  const response = await fetch(
    `${paymentServiceUrl}/v1/top-up/checkout-session/${recipientEmail}/usd/${
      usdAmount * 100
    }?destinationAddressType=email${
      giftMessage ? `&giftMessage=${encodeURIComponent(giftMessage)}` : ""
    }`,
  );
  const data = await response.json();

  // Send user to checkout session
  return data.paymentSession.url;
}
