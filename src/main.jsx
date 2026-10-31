import React from "react";
import ReactDOM from "react-dom/client";

import { Toaster } from "react-hot-toast";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./fonts";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import { registerServiceWorker } from "./services/pwaUpdate";
import { warmUpBackend } from "./services/api";

registerServiceWorker();
// Wake the (possibly idle) backend now, before any real request needs it.
warmUpBackend();


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
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Toaster
              position="top-center"
              containerStyle={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
              toastOptions={{
                duration: 3500,
                style: {
                  background: "var(--color-ink)",
                  color: "var(--color-surface)",
                  borderRadius: "10px",
                  border: "2px solid var(--color-line)",
                  boxShadow: "3px 3px 0 0 var(--hard-shadow)",
                  fontSize: "14px",
                  fontWeight: 600,
                  maxWidth: "min(92vw, 420px)",
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
                  style: { background: "var(--color-red-600)", color: "#fff" },
                  iconTheme: { primary: "#fff", secondary: "var(--color-red-600)" },
                },
              }}
            />

            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
