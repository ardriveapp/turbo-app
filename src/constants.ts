export const paymentServiceUrl =
  import.meta.env.PROD === true
    ? "https://payment.ardrive.io"
    : "http://localhost:3000";
export const termsOfServiceUrl = "https://ardrive.io/tos-and-privacy/";
export const defaultUSDAmount = 10.0;
