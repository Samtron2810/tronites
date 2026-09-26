import { createContext, useContext, useRef } from "react";

// Carries exactly one payload: whatever the current request's public page
// pre-fetched server-side (see server/render.jsx), keyed to nothing but
// "this page, this render" — there is only ever one route being rendered
// per request, so no per-path keying is needed. The client entry
// (main.jsx) seeds this same context from a <script> tag the server
// embedded in the HTML (see server/entry-client.jsx), so server render
// and client hydration start from an identical value.
export const SsrDataContext = createContext(null);

// Consumed via a ref, not plain context state — a page component reading
// this on every render (context value changes are usually meant to
// re-render subscribers) is exactly the "read it fresh every time"
// behavior we don't want: the payload is only valid for this component's
// very first render (server render, or the client's hydration pass). A
// ref read once during the initial render, then never revisited, makes
// that "first-render-only" contract structural rather than relying on
// every consumer remembering to add its own useState-lazy-initializer
// guard. Client-side navigation to the same route later gets null here
// because nothing repopulates SsrDataContext outside the initial
// server/hydration render — the Provider's value is set once, in
// server/render.jsx and main.jsx respectively, and never updated
// afterward.
export const useSsrInitialData = () => {
  const context = useContext(SsrDataContext);
  const consumedRef = useRef(false);
  if (consumedRef.current) return null;
  consumedRef.current = true;
  return context;
};
