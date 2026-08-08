// Requires VITE_API_URL to be set at build time in production.
// Only falls back to localhost during local dev (`npm run dev`) — a missing
// env var in a production build now fails loudly instead of silently
// pointing the deployed app at localhost:5000.
import axios from "axios";

let baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  if (import.meta.env.DEV) {
    baseURL = "http://localhost:5000/api";
  } else {
    console.error(
      "VITE_API_URL is not set. Set it in your deployment environment — " +
        "the app cannot reach the backend without it.",
    );
    baseURL = "/api";
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000, // 60 second timeout for large image uploads
  timeoutErrorMessage: "Request timed out. Please try again.",
});

// Fixes multipart/FormData uploads — lets browser set Content-Type + boundary
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

export default api;
