import { useState } from "react";
import { ErrMsgCallbackAsProps } from "../types";
import { redeemGift } from "../utils/redeemGift";
import { ardriveAppUrl } from "../constants";
import { Page } from "./Page";

function RedeemForm({ errorCallback }: ErrMsgCallbackAsProps) {
  const [destinationAddress, setDestinationAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [redemptionCode, setRedemptionCode] = useState<string>("");

  const canSubmitForm =
    !!destinationAddress && !!recipientEmail && !!redemptionCode;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    if (!canSubmitForm) {
      return;
    }

    redeemGift({ redemptionCode, destinationAddress, recipientEmail })
      .then(() => {
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
      <h1>Redeem Turbo Credits</h1>
      <p>
        Enter the address of the Arweave wallet you would like to redeem your
        Turbo Credits to.
      </p>
      <form className="form">
        <div className="form-section">
          <label className="form-label">Destination Address*</label>
          <input
            type="text"
            className="form-input"
            id="destination-address"
            placeholder="Enter the destination address here"
            value={destinationAddress}
            onChange={(e) => {
              setDestinationAddress(e.target.value);
            }}
          />
        </div>

        <div className="form-section">
          <label className="form-label">Redemption Code*</label>
          <input
            type="text"
            className="form-input"
            id="redemption-code"
            placeholder="Enter the redemption code here"
            value={redemptionCode}
            onChange={(e) => {
              setRedemptionCode(e.target.value);
            }}
          />
        </div>

        <div className="form-section">
          <label className="form-label">Recipient email address*</label>
          <input
            type="email"
            className="form-input"
            id="recipient-email"
            placeholder="Confirm your email address here"
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

      <div>
        <br></br>
        <span>
          If you do not have an Arweave wallet, you can create one in{" "}
          <a href={ardriveAppUrl}>ArDrive App</a>.
        </span>
      </div>
    </>
  );
}

export const RedeemPage = () => (
  <Page page={(e) => <RedeemForm errorCallback={e} />} />
);
