import React from "react";
import ReactDOM from "react-dom/client";

import { Toaster } from "react-hot-toast";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <Toaster position="top-center" />

        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>,
);
