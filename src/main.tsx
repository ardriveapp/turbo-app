import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Router } from "./Router.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);

// Remove Preload scripts loading
postMessage({ payload: "removeLoading" }, "*");

// Use contextBridge
window.ipcRenderer?.on("main-process-message", (_event, message) => {
  console.log(message);
});
