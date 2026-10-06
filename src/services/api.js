// VITE_API_URL must be set at build time in production (see README) —
// this fallback only ever applies during local dev, where the backend
// is assumed to be running on localhost:5000.
import axios from "axios";
import * as httpCache from "./httpCache";

let baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  baseURL = "http://localhost:5000/api";
}

// 30s default timeout — every request through this instance is plain
// JSON (auth, feed, posts, etc). Image/video bytes never travel through
// here: uploadToCloudinary (cloudinary.js) and uploadVideoToCloudinary
// (videoUpload.js) both go straight to Cloudinary via their own
// fetch/XHR calls, so there's no large-payload request on this instance
// that would need a long timeout. 30s (up from 15s) leaves room for a
// Render cold start; warmUpBackend() below usually removes the cold start
// before the first real request is made.
const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
  timeoutErrorMessage: "Request timed out. Please try again.",
});

// Fixes multipart/FormData uploads — lets browser set Content-Type + boundary
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Silent refresh: the access token cookie is short-lived (15m — see
// backend utils/tokens.js), so any request can come back 401 purely
// because it expired mid-session, not because the user is actually
// logged out. On a 401 from anything other than the auth endpoints
// themselves, try POST /auth/refresh once (it rotates the refresh-token
// cookie and sets a fresh access token) and replay the original request
// exactly once. If the refresh itself fails, the refresh token is gone
// too — surface the 401 as-is and let the app's normal
// "not logged in" handling (AuthContext.getMe failing) take over.
//
// _retry guards against looping forever if the retried request 401s
// again (e.g. refresh succeeded but the retry hits some other 401
// cause) — one refresh attempt per original request, not per 401.
let refreshInFlight = null;

const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/send-otp", "/auth/register", "/auth/verify-otp"];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (
      response?.status !== 401 ||
      !config ||
      config._retry ||
      config.skipAuthRefresh ||
      AUTH_ENDPOINTS.some((p) => config.url?.startsWith(p))
    ) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      // Dedup concurrent 401s (e.g. several components fetching on mount
      // at once) into a single refresh call instead of racing multiple
      // rotations against each other — a second rotation would invalidate
      // the refresh token the first one just issued.
      if (!refreshInFlight) {
        refreshInFlight = api.post("/auth/refresh").finally(() => {
          refreshInFlight = null;
        });
      }
      await refreshInFlight;
      return api(config);
    } catch (refreshError) {
      // A 403 from /auth/refresh means the account is banned/suspended
      // (not just an expired token). The cached user in state would keep
      // the UI in a broken half-authenticated limbo — force a clean logout
      // via a custom event so AuthContext can clear state without a
      // circular import between api.js and AuthContext.
      if (refreshError?.response?.status === 403) {
        window.dispatchEvent(new CustomEvent("auth:forceLogout"));
      }
      return Promise.reject(refreshError);
    }
  },
);

// Fire-and-forget wake-up call, made as soon as the app loads. The backend
// (Render) spins down when idle; the first request after that can take
// 30-60s. Hitting the public liveness endpoint (mounted at the server root,
// not under /api) starts the boot immediately, in parallel with React
// mounting, so the real requests (auth/me, feed, comments) land on a warm
// server. no-cors: we never read the response, so CORS is irrelevant and
// nothing can throw into app code. Safe to call more than once.
let warmedUp = false;
export const warmUpBackend = () => {
  if (warmedUp || typeof fetch === "undefined") return;
  warmedUp = true;
  try {
    const { origin } = new URL(baseURL, window.location.origin);
    fetch(`${origin}/health/live`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
    }).catch(() => {});
  } catch {
    /* never block startup on a warm-up */
  }
};

// getCached — see caching-spec.md §4. Only for first-page/first-load
// GETs; "load more" / cursor / offset>0 calls must keep using plain
// api.get so partial pages never get served from cache.
api.getCached = (url, { params, ttlMs = 60_000, revalidate = false } = {}) => {
  if (ttlMs === 0) return api.get(url, { params });

  const key = httpCache.buildKey("GET", url, params);

  const inFlight = httpCache.getPending(key);
  if (inFlight) return inFlight;

  if (httpCache.hasFresh(key)) {
    const cachedValue = httpCache.get(key).value;
    if (!revalidate) {
      return Promise.resolve({ data: cachedValue });
    }
    // Instant paint from cache + silent background refresh.
    const bg = api
      .get(url, { params })
      .then((res) => {
        httpCache.set(key, res.data, ttlMs);
        return res;
      })
      .catch((e) => {
        console.error("[httpCache] background revalidate failed", key, e);
      });
    httpCache.setPending(key, bg);
    return Promise.resolve({ data: cachedValue });
  }

  const fetchPromise = api.get(url, { params }).then((res) => {
    httpCache.set(key, res.data, ttlMs);
    return res;
  });
  httpCache.setPending(key, fetchPromise);
  return fetchPromise;
};

api.invalidate = (prefix) => httpCache.invalidatePrefix(prefix);

api.invalidateMany = (prefixes) => prefixes.forEach((p) => httpCache.invalidatePrefix(p));

api.clearCache = () => httpCache.clearAll();

export default api;
