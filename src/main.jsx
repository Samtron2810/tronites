import React from "react";
import ReactDOM from "react-dom/client";

import { Toaster } from "react-hot-toast";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import { registerServiceWorker } from "./services/pwaUpdate";

registerServiceWorker();


// Apply the saved theme before first paint to avoid a flash of the wrong
// theme on reload. Reads the same localStorage key the ThemeProvider uses.
(function () {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  } catch {
    // ignore — ThemeProvider will reconcile on mount
  }
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--color-primary-900)",
                color: "var(--color-primary-100)",
                borderRadius: "12px",
                border: "1px solid rgba(159, 225, 203, 0.2)",
                fontSize: "14px",
                fontWeight: 500,
              },
              success: {
                style: {
                  background: "var(--color-primary-600)",
                  color: "#fff",
                },
                iconTheme: {
                  primary: "#fff",
                  secondary: "var(--color-primary-600)",
                },
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
    </ThemeProvider>
  </React.StrictMode>,
);
