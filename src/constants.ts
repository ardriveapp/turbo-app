export const paymentServiceUrl =
  import.meta.env.PROD === true
    ? "https://payment.ardrive.io"
    : "http://localhost:3000";
export const termsOfServiceUrl = "https://ardrive.io/tos-and-privacy/";
export const defaultUSDAmount = 10.0;
export const turboConfig = {
  paymentServiceConfig: { url: paymentServiceUrl },
};
export const wincPerCredit = 1_000_000_000_000;
export const defaultDebounceMs = 500;
export const ardriveAppUrl = "https://app.ardrive.io";
