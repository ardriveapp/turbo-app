import { TopUpRawResponse } from "@ardrive/turbo-sdk";
import { paymentServiceUrl } from "../constants";

export async function getTopUpQuote(
  usdAmount: number,
  recipientEmail: string,
): Promise<TopUpRawResponse> {
  // TODO: support emails on turbo sdk
  // return turboFactory.unauthenticated(turboConfig).createCheckoutSession({ amount: USD(usdAmount / 100), email: recipientEmail })
  const response = await fetch(
    `${paymentServiceUrl}/v1/top-up/checkout-session/${recipientEmail}/usd/${
      usdAmount * 100
    }?destinationAddressType=email`,
  );
  const data = await response.json();

  return data;
}
