// Ponto de entrada do React: monta o App dentro da div #root do index.html.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
