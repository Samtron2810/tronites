import axios from "axios";

// Separate axios instance from src/services/api.js on purpose — that one
// is built for the browser (withCredentials, response interceptors that
// redirect on 401, a baseURL resolved from import.meta.env at BUILD
// time). The SSR server is a different runtime with different needs: no
// cookies to attach (every SSR request is anonymous by construction —
// see server/index.js's routing decision), no interceptor-driven client
// redirect (there's no client to redirect), and a baseURL resolved from
// a server-side env var at REQUEST time, not baked into a client bundle.
const API_BASE_URL = process.env.SSR_API_BASE_URL || "http://localhost:5000/api";

const ssrApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

// Matches a request path to the public endpoint that feeds it, mirroring
// PublicApp.jsx's route table. Returns null for any path with nothing to
// pre-fetch (Landing, HelpSupport, Tiers, PrivacyPolicy, TermsOfUse are
// all static content — see their own SSR readiness note in App.jsx/
// PublicApp.jsx) or for a 404/network failure, in which case the
// affected page component falls back to its normal client-side fetch
// after hydration exactly as it would on a plain client-rendered visit —
// the visitor still gets a working page, just without the SSR benefit
// for that one request.
export const fetchInitialData = async (path) => {
  try {
    const profileMatch = path.match(/^\/u\/([^/]+)$/);
    if (profileMatch) {
      const res = await ssrApi.get(`/public/profiles/${profileMatch[1]}`);
      return res.data;
    }

    const postMatch = path.match(/^\/post\/([^/]+)$/);
    if (postMatch) {
      const res = await ssrApi.get(`/public/posts/${postMatch[1]}`);
      return res.data;
    }

    const hashtagMatch = path.match(/^\/hashtag\/([^/]+)$/);
    if (hashtagMatch) {
      const res = await ssrApi.get(`/public/hashtags/${hashtagMatch[1]}`, {
        params: { limit: 10 },
      });
      return res.data;
    }

    if (path === "/explore") {
      const res = await ssrApi.get("/public/explore", { params: { limit: 12 } });
      return res.data;
    }

    return null;
  } catch {
    // Covers both a genuine 404 (post/profile doesn't exist — the page
    // component's own client-side fetch will hit the same 404 and show
    // its not-found state, same outcome either way) and a transient
    // failure (backend slow/unreachable at SSR time) — in both cases,
    // letting the client-side fetch run normally is strictly better than
    // a failed SSR pass taking down the whole page request.
    return null;
  }
};
