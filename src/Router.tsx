import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GiftPage } from "./pages/GiftPage";
import { RedeemPage } from "./pages/RedeemPage";

export function Router() {
  return (
    <BrowserRouter basename={`${import.meta.env.BASE_URL}`}>
      <Routes>
        <Route path="/gift" element={<GiftPage />} />
        <Route path="/redeem" element={<RedeemPage />} />
        <Route
          path="/"
          element={
            /* Put gift element at baseUrl for now */
            <GiftPage />
          }
        />
        <Route path="*" element={<p>404</p>} />
      </Routes>
    </BrowserRouter>
  );
}
