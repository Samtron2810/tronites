// Requires VITE_API_URL to be set at build time in production — vite.config.js
// now fails the build itself if it's missing, so this runtime branch only
// ever hits during local dev.
import axios from "axios";

let baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  baseURL = "http://localhost:5000/api";
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
