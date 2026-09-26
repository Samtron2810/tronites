import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import PublicApp from "../src/PublicApp";
import { SsrDataContext } from "../src/hooks/useSsrInitialData";
import { SsrAuthProvider } from "../src/entry/SsrAuthProvider";
import { SsrThemeProvider } from "../src/entry/SsrThemeProvider";
import { SocketProvider } from "../src/context/SocketContext";
import { HelmetProvider } from "react-helmet-async";
import { fetchInitialData } from "./fetchInitialData";

// One route table, shared by fetchInitialData.js (server-side pre-fetch)
// and PublicApp.jsx (rendering) — see isPublicSsrPath below for how a
// request path is matched against it. Keeping the pattern list here
// rather than duplicating it in server/index.js is what stops the two
// from silently drifting apart if a public route is ever added or
// removed.
const PUBLIC_SSR_PATTERNS = [
  /^\/$/,
  /^\/u\/[^/]+$/,
  /^\/post\/[^/]+$/,
  /^\/hashtag\/[^/]+$/,
  /^\/explore$/,
  /^\/help$/,
  /^\/tiers$/,
  /^\/privacy$/,
  /^\/terms$/,
];

// Used by server/index.js to decide whether a given request path should
// go through this SSR pass at all — see that file's comment for the
// full routing decision (logged-in-cookie requests skip SSR entirely).
export const isPublicSsrPath = (path) =>
  PUBLIC_SSR_PATTERNS.some((re) => re.test(path));

// Tag types react-helmet-async's <Helmet> can render on React 19's
// native-hoisting path (per its own docs: "renders actual DOM elements").
// Matched globally, not just at the start of the string — empirical
// testing (see this file's own test output during development) showed
// React 19's native hoisting is NOT reliably positional: most Helmet
// tags land before the app's root element, but a JSON-LD <script> ended
// up AFTER the app's opening <div> instead. A leading-run-only extractor
// silently missed it and left it embedded in the app body. Matching
// globally and stripping every match from the remaining string, however
// many there are and wherever React placed them, is robust regardless of
// that inconsistency.
const HEAD_TAG_PATTERN = /(<title>[\s\S]*?<\/title>|<meta\b[^>]*\/>|<link\b[^>]*\/>|<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>)/g;

// react-helmet-async 3.0.0 detects React 19 at runtime and switches to
// React's native metadata hoisting: <Helmet>'s children render as real
// elements in the tree instead of being collected into HelmetProvider's
// context object (confirmed empirically — helmetContext.helmet is
// always undefined on this stack; the package's own docs describe this
// exact behavior change for React 19 and say so explicitly: "the context
// object will not be populated... render tags directly in your
// component tree instead"). In a browser, React moves these tags into
// the real <head> automatically after mount; renderToString has no
// concept of <head> at all, so they appear as literal tags somewhere in
// the rendered string, mixed in with the app's own markup in whatever
// order/position React happened to produce (see this function's comment
// above for a concrete case where that position was NOT simply "at the
// very start"). This walks the WHOLE string and pulls every matching
// tag out, wherever it is, returning the collected head tags and the
// cleaned remainder separately — there is no context object to read
// instead on this React version; the tags themselves ARE the data, and
// their position in the raw output can't be trusted.
const splitHeadTags = (html) => {
  const headTags = [];
  const appHtml = html.replace(HEAD_TAG_PATTERN, (match) => {
    headTags.push(match);
    return "";
  });
  return { headTags: headTags.join(""), appHtml };
};

// Renders PublicApp for exactly one request. Returns the split HTML
// (head tags, app markup) and the raw data payload (so the caller can
// also serialize it into a <script> tag for client hydration — see
// entry-client's counterpart in main.jsx, which reads that same tag).
//
// Why StaticRouter and not BrowserRouter: BrowserRouter reads
// window.location and calls the History API, neither of which exist in
// Node. StaticRouter takes the request's path as a prop instead and
// never touches history — react-router's own SSR-specific router,
// re-exported from react-router-dom's root (there is no
// react-router-dom/server subpath in v7 — verified against the
// installed package's actual exports map, not assumed from an older
// major version's API shape).
export const renderPublicApp = async (path) => {
  const initialData = await fetchInitialData(path);

  const rawHtml = renderToString(
    <StaticRouter location={path}>
      <HelmetProvider>
        <SsrThemeProvider>
          <SsrAuthProvider>
            {/* SocketProvider is safe to include as-is (not a stand-in)
                because its only browser-API-touching code path is
                gated on `user`, which SsrAuthProvider always reports
                as null — see that file's comment. */}
            <SocketProvider>
              <SsrDataContext.Provider value={initialData}>
                <PublicApp />
              </SsrDataContext.Provider>
            </SocketProvider>
          </SsrAuthProvider>
        </SsrThemeProvider>
      </HelmetProvider>
    </StaticRouter>,
  );

  const { headTags, appHtml } = splitHeadTags(rawHtml);

  return { appHtml, headTags, initialData };
};
