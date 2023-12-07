export const paymentServiceUrl =
  import.meta.env.PROD === true
    ? "https://payment.ardrive.dev" // TODO: change to https://payment.ardrive.io when gifting is in prod
    : "http://localhost:3000";
export const termsOfServiceUrl = "https://ardrive.io/tos-and-privacy/";
export const defaultUSDAmount = 10.0;
export const turboConfig = {
  paymentServiceConfig: { url: paymentServiceUrl },
};
export const wincPerCredit = 1_000_000_000_000;
