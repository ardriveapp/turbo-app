import { useState } from "react";
import "./App.css";
import { ArDriveLogo } from "./ArDriveLogo";
import { GiftForm } from "./GiftForm";

function App() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  // TODO: Router for different pages. We only need a gift form for now

  return (
    <>
      <ArDriveLogo />
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}
      <GiftForm errorCallback={setErrorMessage} />
    </>
  );
}

export default App;
