// Updated version to use environment variable for API URL
//for local development, change "import.meta.env.VITE_API_URL" to "http://localhost:5000/api" or your backend URL
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";
// const baseURL = "http://localhost:5000/api" || "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Fixes multipart/FormData uploads — lets browser set Content-Type + boundary
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

export default api;
