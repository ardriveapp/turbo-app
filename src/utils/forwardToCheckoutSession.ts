import { paymentServiceUrl } from "../constants";

export async function forwardToCheckoutSession(
  usdAmount: number,
  recipientEmail: string,
): Promise<void> {
  // TODO: support emails on turbo sdk
  // return turboFactory.unauthenticated(turboConfig).createCheckoutSession({ amount: USD(usdAmount / 100), email: recipientEmail })
  const response = await fetch(
    `${paymentServiceUrl}/v1/top-up/checkout-session/${recipientEmail}/usd/${
      usdAmount * 100
    }?destinationAddressType=email`,
  );
  const data = await response.json();

  // Send user to checkout session
  window.location.href = data.paymentSession.url;
}
