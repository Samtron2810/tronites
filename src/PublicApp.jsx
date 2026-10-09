import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import PublicNavbar from "./components/PublicNavbar";
import Landing from "./pages/Landing";
import PublicProfile from "./pages/PublicProfile";
import PublicPostView from "./pages/PublicPostView";
import PublicHashtag from "./pages/PublicHashtag";
import PublicExplore from "./pages/PublicExplore";
import HelpSupport from "./pages/HelpSupport";
import Tiers from "./pages/Tiers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import RefundPolicy from "./pages/RefundPolicy";
import CopyrightPolicy from "./pages/CopyrightPolicy";
import CommunityGuidelines from "./pages/CommunityGuidelines";

// Any path this file doesn't know about (login, signup, /home, every
// authenticated route) forces a full page load instead of trying to
// render something client-side. This is NOT a lazy-loaded fallback to
// App.jsx, on purpose: App.jsx owns its own <BrowserRouter> (see its
// last few lines), and entry-client.jsx already wraps this whole
// PublicApp tree in its own <BrowserRouter> for hydration — nesting a
// second BrowserRouter inside the first is invalid and breaks
// react-router outright, it doesn't just degrade gracefully. A hard
// window.location redirect re-enters cleanly through main.jsx's normal
// createRoot()+App() path on a fresh page load, no nesting involved. The
// cost is one non-SPA transition (a full reload) the single time a
// visitor moves from an SSR'd public page into the authenticated app —
// e.g. clicking "Log in" and completing auth, which already calls
// navigate("/home") from inside Login.jsx. Everything before that point
// (browsing Landing, a profile, a post, hashtags, explore, help, tiers,
// legal pages) stays fully client-side and SPA-smooth, matching the
// scope SSR actually needs to cover.
const HardRedirect = () => {
  useEffect(() => {
    window.location.href = window.location.pathname + window.location.search;
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

// Deliberately separate from App.jsx's route tree, and deliberately all
// static imports (no lazy()) — this is the ENTIRE point of this file.
// App.jsx's lazy()-wrapped authenticated routes can't be rendered
// synchronously by a hand-rolled Node SSR pass the way this needs, and
// there's no reason to pull 60+ authenticated route chunks into the SSR
// server's bundle anyway: crawlers and freshly-arriving anonymous
// visitors only ever hit these 9 URLs server-rendered. A logged-in
// visitor's browser still gets the full App.jsx tree exactly as before —
// see server/index.js's comment on why authenticated requests skip this
// file entirely and fall through to the normal static index.html/client
// bundle in the first place.
//
// /explore, /post/:id, and /hashtag/:tag are deliberately NOT listed
// here even though App.jsx branches them on auth state — this tree is
// only ever reached for an anonymous request (see the isPublicSsrPath
// check in server/render.jsx), so the ProtectedRoute-wrapped/user-only
// branch of those routes in App.jsx never applies here; only their
// public component is relevant, and it's registered under its own path
// below like every other page in this file.
const PublicApp = () => {
  const { pathname } = useLocation();

  return (
    <>
      {pathname !== "/" && <PublicNavbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/post/:id" element={<PublicPostView />} />
        <Route path="/hashtag/:tag" element={<PublicHashtag />} />
        <Route path="/explore" element={<PublicExplore />} />
        <Route path="/help" element={<HelpSupport />} />
        <Route path="/tiers" element={<Tiers />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/refunds" element={<RefundPolicy />} />
        <Route path="/copyright" element={<CopyrightPolicy />} />
        <Route path="/guidelines" element={<CommunityGuidelines />} />
        <Route path="*" element={<HardRedirect />} />
      </Routes>
    </>
  );
};

export default PublicApp;
