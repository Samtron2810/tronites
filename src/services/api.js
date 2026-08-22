// VITE_API_URL must be set at build time in production (see README) —
// this fallback only ever applies during local dev, where the backend
// is assumed to be running on localhost:5000.
import axios from "axios";

let baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  baseURL = "http://localhost:5000/api";
}

// Short default timeout — every request through this instance is plain
// JSON (auth, feed, posts, etc). Image/video bytes never travel through
// here: uploadToCloudinary (cloudinary.js) and uploadVideoToCloudinary
// (videoUpload.js) both go straight to Cloudinary via their own
// fetch/XHR calls, so there's no large-payload request on this instance
// that would need a long timeout. A hung GET/POST should fail fast
// rather than leave the UI spinning for 3 minutes.
const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
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
      return Promise.reject(refreshError);
    }
  },
);

export default api;
