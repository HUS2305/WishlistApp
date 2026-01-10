import { Redirect } from "expo-router";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import { View, ActivityIndicator, Text } from "react-native";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";

export default function Index() {
  // Safely get theme with fallback
  let theme;
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch (error) {
    // ThemeProvider not available yet, use default colors
    theme = {
      colors: {
        background: "#ffffff",
        primary: "#007AFF",
      },
    };
  }
  
  // Check if Clerk is available (ClerkProvider mounted)
  let clerk;
  try {
    clerk = useClerk();
  } catch (error) {
    // ClerkProvider not mounted yet - show loading state
    // This can happen during initial app load with Expo Router
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  // ClerkProvider is available, safe to use useAuth
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      // Wait for Clerk to be loaded before checking profile
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn) {
        setCheckingProfile(false);
        return;
      }

      try {
        // Try to fetch user profile from backend
        const token = await getToken();
        if (token) {
          await api.get("/users/me");
          setHasProfile(true);
        } else {
          // If no token but user is signed in, wait a bit and retry
          // This can happen during initial load
          console.warn("No token available yet, assuming profile exists to avoid redirect loop");
          setHasProfile(true);
        }
      } catch (error: any) {
        // If user not found (404), they need to complete profile
        if (error.response?.status === 404 || error.message?.includes("not found")) {
          setHasProfile(false);
        } else {
          // For other errors (network, 401, etc.), assume they have profile to avoid blocking
          // This prevents redirect loops on refresh when there are temporary network issues
          console.warn("Error checking profile:", error);
          setHasProfile(true);
        }
      } finally {
        setCheckingProfile(false);
      }
    }

    if (isLoaded) {
      checkProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]); // getToken is stable, don't include in deps to prevent loops

  // Wait for Clerk to load before making routing decisions
  if (!isLoaded || checkingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If signed in but no profile, redirect to create profile
  if (isSignedIn && !hasProfile) {
    return <Redirect href="/(auth)/create-profile" />;
  }

  // Normal routing
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/onboarding" />;
  }
}
