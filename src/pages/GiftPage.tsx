import { useState, useRef } from "react";
import {
  defaultUSDAmount,
  termsOfServiceUrl,
  wincPerCredit,
} from "../constants";
import useDebounce from "../hooks/useDebounce";
import "./GiftPage.css";
import { useWincForOneGiB } from "../hooks/useWincForOneGiB";
import { useCreditsForFiat } from "../hooks/useCreditsForFiat";
import { getCheckoutSessionUrl } from "../utils/getCheckoutSessionUrl";
import { Page } from "./Page";
import { ErrMsgCallbackAsProps } from "../types";
import Faq from "../components/Faq";

const maxUSDAmount = 10000;
const minUSDAmount = 5;

function GiftForm({ errorCallback }: ErrMsgCallbackAsProps) {
  const [usdAmount, setUsdAmount] = useState<number>(defaultUSDAmount);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [isTermsAccepted, setTermsAccepted] = useState<boolean>(false);

  const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = +e.target.value;
    if (amount > maxUSDAmount) {
      setUsdAmount(maxUSDAmount);
      return;
    }
    if (amount < 0) {
      setUsdAmount(0);
      return;
    }
    setUsdAmount(+amount.toFixed(2));
  };

  const wincForOneGiB = useWincForOneGiB();
  const debouncedUsdAmount = useDebounce(usdAmount);
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

    if (usdAmount < minUSDAmount) {
      errorCallback(
        `Minimum USD amount is ${minUSDAmount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}`,
      );
      return;
    }

    const giftMessage = (
      document.getElementById("gift-message") as HTMLInputElement
    ).value;

    getCheckoutSessionUrl({
      usdAmount,
      recipientEmail,
      giftMessage,
    })
      .then((url) => {
        window.location.href = url;
      })
      .catch((e) => {
        errorCallback(`Error getting checkout session URL: ${e}`);
      });
  };

  const displayConversion =
    !!credits &&
    !!wincForOneGiB &&
    usdWhenCreditsWereLastUpdatedRef &&
    usdWhenCreditsWereLastUpdatedRef >= minUSDAmount;

  return (
    <>
      <form className="form">
        <h1>Gift Credits to a friend.</h1>

        <div className="form-section">
          <label className="form-label">Suggested USD amounts</label>
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
              min={minUSDAmount}
              max={maxUSDAmount}
            />
          </div>
        </div>

        {displayConversion && (
          <div>
            {wincForOneGiB && (
              <div id="conversions">
                {"$".toLocaleUpperCase()}
                <span className="conversion-amount">
                  {usdWhenCreditsWereLastUpdatedRef}
                </span>{" "}
                ≈{" "}
                <span className="conversion-amount">{credits.toFixed(4)}</span>
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
          />
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
            <a href={termsOfServiceUrl}> Terms of Service and Privacy Policy</a>
            .
          </span>
        </div>

        <button
          type="submit"
          className="proceed-button"
          onClick={(e) => handleSubmit(e)}
          disabled={!canSubmitForm}
        >
          Proceed to Checkout
        </button>
      </form>

      <Faq />
    </>
  );
}

export const GiftPage = () => (
  <Page page={(e) => <GiftForm errorCallback={e} />} />
);
