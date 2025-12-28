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
    // Check if this is a protected endpoint that requires auth
    const protectedEndpoints = ['/users/me', '/users/', '/wishlists', '/friends', '/items'];
    const requiresAuth = protectedEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    // Get Clerk token if available
    if (getTokenFunction) {
      try {
        const token = await getTokenFunction();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          // console.log("✅ Auth token added to request");
        } else if (requiresAuth) {
          // For protected endpoints without token, cancel the request to prevent 401 errors
          // This prevents unnecessary network requests and console errors
          console.debug("⚠️ No auth token available for protected endpoint - cancelling request:", config.url);
          return Promise.reject(new axios.Cancel('No auth token available'));
        }
      } catch (error) {
        if (requiresAuth) {
          // If we can't get token for protected endpoint, cancel the request
          console.debug("❌ Error getting auth token for protected endpoint - cancelling request:", config.url);
          return Promise.reject(new axios.Cancel('Error getting auth token'));
        }
        console.error("❌ Error getting auth token:", error);
      }
    } else if (requiresAuth) {
      // If auth token getter is not configured for protected endpoint, cancel the request
      console.debug("⚠️ Auth token getter not configured for protected endpoint - cancelling request:", config.url);
      return Promise.reject(new axios.Cancel('Auth token getter not configured'));
    }
    
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
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
    // console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    const isUsersMeEndpoint = error.config?.url?.includes('/users/me');
    const is401 = error.response?.status === 401;
    const isCanceled = axios.isCancel(error);
    
    // Silently handle cancelled requests (they were cancelled intentionally to prevent 401s)
    if (isCanceled) {
      // console.debug("Request was cancelled:", error.message);
      return Promise.reject(error);
    }
    
    if (error.response) {
      // Don't log 401 errors for /users/me endpoint (expected when not authenticated)
      // These should be prevented by the request interceptor, but handle gracefully if they slip through
      if (!(is401 && isUsersMeEndpoint)) {
        console.error("❌ API Error:", error.response.status, error.response.data, error.config.url);
      }
    } else if (error.request) {
      // Only log network errors if not a 401 on /users/me
      if (!(is401 && isUsersMeEndpoint)) {
        console.error("❌ Network Error: No response received", error.message, error.config?.url);
      }
    } else {
      console.error("❌ Request Error:", error.message, error.config?.url);
    }
    
    if (is401 && !isUsersMeEndpoint) {
      console.warn("⚠️ Unauthorized - token may be invalid for:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;

