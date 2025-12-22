import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import api from "@/services/api";

export default function Index() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    async function checkProfile() {
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
        }
      } catch (error: any) {
        // If user not found (404), they need to complete profile
        if (error.response?.status === 404 || error.message?.includes("not found")) {
          setHasProfile(false);
        } else {
          // For other errors, assume they have profile to avoid blocking
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
  }, [isLoaded, isSignedIn, getToken]);

  // Wait for Clerk to load before making routing decisions
  if (!isLoaded || checkingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
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
