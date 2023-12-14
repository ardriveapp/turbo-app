import { paymentServiceUrl } from "../constants";

export async function redeemGift({
  destinationAddress,
  recipientEmail,
  redemptionCode,
}: {
  redemptionCode: string;
  recipientEmail: string;
  destinationAddress: string;
}): Promise<void> {
  // TODO: Support redeeming gifts on turbo sdk
  // return TurboFactory.unauthenticated(turboConfig)
  //   .redeemGift(redemptionCode, recipientEmail, destinationAddress)
  const response = await fetch(
    `${paymentServiceUrl}/v1/redeem/?email=${recipientEmail}&id=${redemptionCode}&destinationAddress=${destinationAddress}`,
  );
  if (!response.ok) throw new Error("Failed to redeem gift");
}
