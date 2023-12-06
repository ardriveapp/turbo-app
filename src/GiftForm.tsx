import { TurboFactory, USD, TopUpRawResponse } from "@ardrive/turbo-sdk";
import { useState, useEffect } from "react";
import {
  defaultUSDAmount,
  paymentServiceUrl,
  termsOfServiceUrl,
} from "./constants";
import useDebounce from "./hooks/useDebounce";
import "./GiftForm.css";

interface GiftFormProps {
  errorCallback: (message: string) => void;
}

async function getTopUpQuote(
  usdAmount: number,
  recipientEmail: string,
): Promise<TopUpRawResponse> {
  // TODO: support emails on turbo sdk
  // turbo.createCheckoutSession({amount: USD(usdAmount / 100), email: recipientEmail,owner}})
  const response = await fetch(
    `${paymentServiceUrl}/v1/top-up/checkout-session/${recipientEmail}/usd/${
      usdAmount * 100
    }?destinationAddressType=email`,
  );
  const data = await response.json();
  console.log("data", data);

  return data;
}

export function GiftForm({ errorCallback }: GiftFormProps) {
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  const [usdAmount, setUsdAmount] = useState<number>(defaultUSDAmount);
  const debouncedUsdAmount = useDebounce(usdAmount, 500);

  const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsdAmount(Number(Number(e.target.value).toFixed(2)));
  };

  const [credits, setCredits] = useState<string | undefined>(undefined);

  const [wincForOneGiB, setWincForOneGiB] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    const turbo = TurboFactory.unauthenticated({
      paymentServiceConfig: { url: paymentServiceUrl },
    });
    turbo.getFiatRates().then(({ winc }) => {
      setWincForOneGiB(winc);
    });
  }, []);

  // Get credits for USD amount when USD amount changes
  useEffect(() => {
    const getCreditsAndGiBForUSD = async (
      usdAmount: number,
    ): Promise<string> => {
      const turbo = TurboFactory.unauthenticated({
        paymentServiceConfig: { url: paymentServiceUrl },
      });
      const { winc } = await turbo.getWincForFiat({
        amount: USD(usdAmount),
        promoCodes: [],
      }); // todo: add promo codes support
      return winc;
    };
    getCreditsAndGiBForUSD(debouncedUsdAmount)
      .then((credits) => {
        setCredits(credits);
      })
      .catch((err) => {
        console.error(err);
        errorCallback(`Error getting credits for USD amount: ${err.message}`);
      });
    TurboFactory;
  }, [debouncedUsdAmount, errorCallback]);

  const canSubmitForm = !!credits && !!recipientEmail && !!termsAccepted;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    if (!canSubmitForm) {
      return;
    }

    getTopUpQuote(usdAmount, recipientEmail).then((topUpQuote) => {
      const url = topUpQuote.paymentSession.url;

      window.location.href = url;
    });
  };

  return (
    <form className="gift-form">
      <h2>Gift credits to a friend.</h2>

      <div className="form-section">
        <label className="form-label">USD amount*</label>

        <div id="usd-form-input">
          <span id="dollar-sign">$</span>
          <input
            type="number"
            id="usd-input"
            value={usdAmount}
            onChange={handleUSDChange}
            required={true}
          />
        </div>
      </div>

      {credits && (
        <div>
          {wincForOneGiB && (
            <div id="conversions">
              $<span className="conversion-amount">{usdAmount}</span> ≈{" "}
              <span className="conversion-amount">
                {(Number(credits) / 1_000_000_000_000).toFixed(4)}
              </span>
              credits ≈{" "}
              <span className="conversion-amount">
                {(Number(credits) / Number(wincForOneGiB)).toFixed(2)}
              </span>
              GiB
            </div>
          )}
        </div>
      )}

      <div className="form-section">
        <label className="form-label">Recipient email address*</label>
        <input
          type="email"
          className="form-input"
          id="recipientEmail"
          placeholder="Enter the recipient's email address here"
          value={recipientEmail}
          required={true}
          onChange={(e) => {
            setRecipientEmail(e.target.value);
          }}
        />
      </div>

      <div className="form-section">
        <label className="form-label">Gift message (optional)</label>
        <textarea
          className="form-input"
          id="giftMessage"
          rows={3}
          placeholder={
            "Enter a message to the recipient of the Turbo Credits here"
          }
          maxLength={250}
          required={false}
        ></textarea>
      </div>

      <div className="terms-and-conditions">
        <input
          type="checkbox"
          id="terms-and-conditions-checkbox"
          name="terms-and-conditions-checkbox"
          value="terms-and-conditions-checkbox"
          required={true}
          onChange={(e) => {
            setTermsAccepted(e.target.checked);
          }}
        />
        <span>
          I Agree to the
          <a href={termsOfServiceUrl}>Terms of Service and Privacy Policy</a>.
        </span>
      </div>

      <button
        type="submit"
        id="gift-form-submit-button"
        onClick={(e) => handleSubmit(e)}
        disabled={!canSubmitForm}
      >
        Proceed to Checkout
      </button>
    </form>
  );
}
