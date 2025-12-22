import axios from "axios";
import { getApiUrl } from "../utils/apiUrl";

const API_URL = getApiUrl();

console.log("API URL configured as:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Store the getToken function to be set by the app
let getTokenFunction: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getToken: () => Promise<string | null>) => {
  getTokenFunction = getToken;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    
    // Get Clerk token if available
    if (getTokenFunction) {
      try {
        const token = await getTokenFunction();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("✅ Auth token added to request");
        } else {
          console.warn("⚠️ No auth token available - request may fail with 401");
        }
      } catch (error) {
        console.error("❌ Error getting auth token:", error);
      }
    } else {
      console.warn("⚠️ Auth token getter not configured - request may fail with 401");
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error("❌ API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("❌ Network Error: No response received", error.message);
    } else {
      console.error("❌ Request Error:", error.message);
    }
    
    if (error.response?.status === 401) {
      console.warn("⚠️ Unauthorized - token may be invalid");
    }
    return Promise.reject(error);
  }
);

export default api;

