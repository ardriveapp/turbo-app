import "./App.css";
import { ArDriveLogo } from "./ArDriveLogo";
import { GiftForm } from "./GiftForm";
import { useErrorMessage } from "./hooks/useErrorMessage";

function App() {
  const [errorMessage, setErrorMessage] = useErrorMessage();

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
