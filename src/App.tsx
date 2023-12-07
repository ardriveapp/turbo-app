import "./App.css";
import { GiftForm } from "./GiftForm";
import { RouterPage } from "./components/RouterPage";
import { useErrorMessage } from "./hooks/useErrorMessage";

import { HashRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  const [errorMessage, setErrorMessage] = useErrorMessage();

  const router = (
    <Router basename="/turbo-app">
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
    </Router>
  );

  return router;
}

export default App;
