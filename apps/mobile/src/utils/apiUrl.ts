import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Get the API URL with smart detection for physical devices.
 * On physical devices, automatically uses the development machine's IP address.
 */
export const getApiUrl = (): string => {
  // If explicitly set via environment variable, use that
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // For web, use localhost
  if (Platform.OS === "web") {
    return "http://localhost:3000/api";
  }

  // For physical devices, try to get the debugger host from Expo
  // This is the IP address of the development machine
  // Try multiple possible locations for the host URI
  const debuggerHost = 
    Constants.expoConfig?.hostUri || 
    Constants.expoConfig?.extra?.debuggerHost ||
    (Constants.manifest2?.extra?.expoGo?.debuggerHost as string) ||
    (Constants.manifest?.debuggerHost as string);
  
  if (debuggerHost) {
    // Extract IP from debugger host (format: "192.168.1.63:8081" or "192.168.1.63")
    const ip = debuggerHost.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:3000/api`;
    }
  }

  // Fallback to localhost (won't work on physical devices)
  console.warn("⚠️ Could not detect development machine IP. API calls may fail on physical devices.");
  console.warn("   Set EXPO_PUBLIC_API_URL environment variable to fix this.");
  return "http://localhost:3000/api";
};

