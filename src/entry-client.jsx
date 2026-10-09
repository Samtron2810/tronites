import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import PublicApp from "./PublicApp";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SsrDataContext } from "./hooks/useSsrInitialData";
import { registerServiceWorker } from "./services/pwaUpdate";
import "./fonts";
import "./index.css";

// Separate from main.jsx on purpose. main.jsx calls createRoot(...).render(...),
// which does NOT hydrate — it discards whatever markup is already in #root
// and renders fresh, client-side, from nothing. That's correct for main.jsx's
// own case (a direct load of an authenticated route, where there's no SSR
// markup to preserve), but wrong here: server/renderShell.js has already
// put real, server-rendered HTML into #root for these 9 public routes, and
// createRoot().render() would silently throw that away and re-render from
// scratch — defeating the entire point of this phase for the one audience
// (a real visitor's browser) that JS-executing crawlers aside, actually
// runs this script. hydrateRoot is the API that reuses the existing
// markup and only attaches event listeners/reconciles, matching what the
// server produced instead of replacing it.
//
// server/index.js decides which of main.jsx or this file gets served —
// see its comment for the exact routing rule (SSR'd public paths for an
// anonymous request get this file; everything else keeps loading
// main.jsx exactly as before, completely unchanged).
registerServiceWorker();

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

// Seeded once from the <script> tag server/renderShell.js embedded
// alongside the SSR'd markup — see useSsrInitialData.js for why this is
// only ever read on the very first render of the matching page
// component, never again after that (including if the visitor
// navigates away and back to the same URL client-side).
const initialData = window.__INITIAL_DATA__ ?? null;

ReactDOM.hydrateRoot(
  document.getElementById("root"),
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <SsrDataContext.Provider value={initialData}>
                <PublicApp />
              </SsrDataContext.Provider>
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
