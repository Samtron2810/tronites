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
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#04342c",
              color: "#e1f5ee",
              borderRadius: "12px",
              border: "1px solid rgba(159, 225, 203, 0.2)",
              fontSize: "14px",
              fontWeight: 500,
            },
            success: {
              style: { background: "#0f6e56", color: "#fff" },
              iconTheme: { primary: "#fff", secondary: "#0f6e56" },
            },
            error: {
              style: { background: "#dc2626", color: "#fff" },
              iconTheme: { primary: "#fff", secondary: "#dc2626" },
            },
          }}
        />

        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>,
);
