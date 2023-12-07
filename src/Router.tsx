import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GiftForm } from "./GiftForm";
import { RouterPage } from "./components/RouterPage";
import { useErrorMessage } from "./hooks/useErrorMessage";

export function Router() {
  const [errorMessage, setErrorMessage] = useErrorMessage();

  return (
    <BrowserRouter basename={`${import.meta.env.BASE_URL}`}>
      <Routes>
        <Route
          path="/gift"
          element={
            <RouterPage
              page={<GiftForm errorCallback={setErrorMessage} />}
              errorMessage={errorMessage}
            />
          }
        />
        <Route
          path="/redeem"
          element={
            <RouterPage page={<p>TODO</p>} errorMessage={errorMessage} />
          }
        />
        <Route
          path="/"
          element={
            /* Put gift element at baseUrl for now */
            <RouterPage
              page={<GiftForm errorCallback={setErrorMessage} />}
              errorMessage={errorMessage}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
