import { useEffect, useState } from "react";
import { ErrMsgCallbackAsProps } from "../types";
import { redeemGift } from "../utils/redeemGift";
import { ardriveAppUrl } from "../constants";
import { Page } from "./Page";
import { useLocation } from "react-router-dom";
import "./RedeemPage.css";

function RedeemForm({ errorCallback }: ErrMsgCallbackAsProps) {
  const [destinationAddress, setDestinationAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [redemptionCode, setRedemptionCode] = useState("");

  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);

    const redemptionCodeParam = urlParams.get("id");
    const recipientEmailParam = urlParams.get("email");
    const destinationAddressParam = urlParams.get("destinationAddress");

    if (redemptionCodeParam) {
      setRedemptionCode(redemptionCodeParam);
    }
    if (recipientEmailParam) {
      setRecipientEmail(recipientEmailParam);
    }
    if (destinationAddressParam) {
      setDestinationAddress(destinationAddressParam);
    }
  }, [location.search]);

  const canSubmitForm =
    !!destinationAddress && !!recipientEmail && !!redemptionCode;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    if (!canSubmitForm) {
      return;
    }

    redeemGift({ redemptionCode, destinationAddress, recipientEmail })
      .then(() => {
        // TODO: Success Modal or Page
        console.log("Gift redeemed!");
        alert("Gift redeemed, redirecting to ArDrive App!");

        setTimeout(() => {
          console.log("Redirecting to ArDrive app...");
          window.location.href = ardriveAppUrl;
        }, 2000);
      })
      .catch((err) => {
        errorCallback(`Error redeeming gift: ${err.message}`);
      });
  };

  return (
    <>
      <h1>Redeem Your Gift of Storage Credits</h1>

      <form className="form">
        <p>
          If you do not have an Arweave wallet, you can create one in{" "}
          <a href={ardriveAppUrl}>ArDrive App</a>.
        </p>
        <div className="form-section">
          <label className="form-label">Wallet Address</label>
          <input
            type="text"
            className="form-input"
            id="destination-address"
            placeholder="Enter the wallet address"
            value={destinationAddress}
            onChange={(e) => {
              setDestinationAddress(e.target.value);
            }}
          />
        </div>

        <div className="form-section">
          <label className="form-label">Gift Code</label>
          <input
            type="text"
            className="form-input"
            id="redemption-code"
            placeholder="Enter the gift code"
            value={redemptionCode}
            onChange={(e) => {
              setRedemptionCode(e.target.value);
            }}
          />
        </div>

        <div className="form-section">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            id="recipient-email"
            placeholder="Confirm your email address"
            value={recipientEmail}
            onChange={(e) => {
              setRecipientEmail(e.target.value);
            }}
          />
        </div>
        <button
          type="submit"
          className="proceed-button"
          onClick={(e) => handleSubmit(e)}
          disabled={!canSubmitForm}
        >
          Redeem
        </button>
      </form>

      <div className="redeem-info">
        <p>
          If you're new to ArDrive, here are a few resources to get you started:
        </p>
        <ul>
          <li>
            <a href="https://www.youtube.com/watch?v=d-a94nO92Ow">
              What is ArDrive?
            </a>
          </li>
          <li>
            <a href="https://www.youtube.com/watch?v=51Gpg3-GFZw">
              Get a Wallet
            </a>
          </li>
          <li>
            <a href="https://www.youtube.com/watch?v=51Gpg3-GFZw">
              HOW TO: Upload with ArDrive Turbo
            </a>
          </li>
        </ul>

        <p>
          Need help? Head to the{" "}
          <a href="https://help.ardrive.io/hc/en-us">Help Center</a>
        </p>
      </div>
    </>
  );
}

export const RedeemPage = () => (
  <Page page={(e) => <RedeemForm errorCallback={e} />} />
);
