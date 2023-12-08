import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GiftForm } from "./GiftForm";
import { Page } from "./components/RouterPage";

export function Router() {
  return (
    <BrowserRouter basename={`${import.meta.env.BASE_URL}`}>
      <Routes>
        <Route
          path="/gift"
          element={
            <Page
              page={(errorCallback) => (
                <GiftForm errorCallback={errorCallback} />
              )}
            />
          }
        />
        <Route path="/redeem" element={<Page page={() => <p>TODO</p>} />} />
        <Route
          path="/"
          element={
            /* Put gift element at baseUrl for now */
            <Page
              page={(errorCallback) => (
                <GiftForm errorCallback={errorCallback} />
              )}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
