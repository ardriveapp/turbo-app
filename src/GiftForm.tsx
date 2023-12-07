import { useState, useRef } from "react";
import {
  defaultUSDAmount,
  termsOfServiceUrl,
  wincPerCredit,
} from "./constants";
import useDebounce from "./hooks/useDebounce";
import "./GiftForm.css";
import { forwardToCheckoutSession } from "./utils/forwardToCheckoutSession";
import { useWincForOneGiB } from "./hooks/useWincForOneGiB";
import { useCreditsForFiat } from "./hooks/useCreditsForFiat";

interface GiftFormProps {
  errorCallback: (message: string) => void;
}

const maxUSDAmount = 10000;
const minUSDAmount = 5;

export function GiftForm({ errorCallback }: GiftFormProps) {
  const [usdAmount, setUsdAmount] = useState<number>(defaultUSDAmount);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [isTermsAccepted, setTermsAccepted] = useState<boolean>(false);

  const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = Number(e.target.value);
    if (amount > maxUSDAmount) {
      setUsdAmount(maxUSDAmount);
      return;
    }
    if (amount < minUSDAmount) {
      setUsdAmount(minUSDAmount);
      return;
    }
    setUsdAmount(Number(Number(e.target.value).toFixed(2)));
  };

  const wincForOneGiB = useWincForOneGiB();
  const debouncedUsdAmount = useDebounce(usdAmount, 500);
  const [credits, usdWhenCreditsWereLastUpdatedRef] = useCreditsForFiat(
    debouncedUsdAmount,
    errorCallback,
  );

  const recipientEmailRef = useRef<HTMLInputElement>(null);
  const isEmailHtmlElementValid = recipientEmailRef.current?.checkValidity();

  const canSubmitForm =
    !!credits &&
    !!recipientEmail &&
    !!isTermsAccepted &&
    isEmailHtmlElementValid;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    if (!canSubmitForm) {
      return;
    }

    forwardToCheckoutSession(usdAmount, recipientEmail);
  };

  return (
    <form className="gift-form">
      <h1>Gift Credits to a friend.</h1>

      <div className="form-section">
        <label className="form-label">Suggested USD amount</label>
        <div className="suggested-amount-buttons">
          <button
            type="button"
            className="suggested-amount-button"
            onClick={() => {
              setUsdAmount(25);
            }}
          >
            $25
          </button>
          <button
            type="button"
            className="suggested-amount-button"
            onClick={() => {
              setUsdAmount(50);
            }}
          >
            $50
          </button>
          <button
            type="button"
            className="suggested-amount-button"
            onClick={() => {
              setUsdAmount(100);
            }}
          >
            $100
          </button>
        </div>
        <label className="form-label">Custom USD amount*</label>

        <div id="usd-form-input">
          <span id="dollar-sign">{"$".toLocaleUpperCase()}</span>
          <input
            type="number"
            id="usd-input"
            value={usdAmount.toString()}
            onChange={handleUSDChange}
            required={true}
            min={5}
            max={10000}
          />
        </div>
      </div>

      {credits && (
        <div>
          {wincForOneGiB && (
            <div id="conversions">
              {"$".toLocaleUpperCase()}
              <span className="conversion-amount">
                {usdWhenCreditsWereLastUpdatedRef}
              </span>{" "}
              ≈ <span className="conversion-amount">{credits.toFixed(4)}</span>
              Credits ≈{" "}
              <span className="conversion-amount">
                {(
                  Number(credits * wincPerCredit) / Number(wincForOneGiB)
                ).toFixed(2)}
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
          id="recipient-email"
          placeholder="Enter the recipient's email address here"
          value={recipientEmail}
          ref={recipientEmailRef}
          required={true}
          onChange={(e) => {
            setRecipientEmail(e.target.value);
          }}
        />
      </div>

      <div className="form-section">
        <label className="form-label">
          Gift message (optional up to 250 characters)
        </label>
        <textarea
          className="form-input"
          id="gift-message"
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
