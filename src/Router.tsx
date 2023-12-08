import { HashRouter, Route, Routes, useNavigate } from "react-router-dom";
import { GiftPage } from "./pages/GiftPage";
import { RedeemPage } from "./pages/RedeemPage";
import { ipcRenderer } from "electron";
import { useEffect } from "react";

export function Router() {
  const navigate = useNavigate();

  useEffect(() => {
    ipcRenderer.on("navigate", (_event, route) => {
      // Use React Router's navigate function
      navigate(route);
    });

    // Clean up the listener when the component unmounts
    return () => {
      ipcRenderer.removeAllListeners("navigate");
    };
  }, [navigate]);

  return (
    <HashRouter basename={`${import.meta.env.BASE_URL}`}>
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
    </HashRouter>
  );
}
