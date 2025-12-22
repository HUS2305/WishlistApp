import { Tabs, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import TabBarWithNotch from "@/components/TabBarWithNotch";
import { useAuth } from "@clerk/clerk-expo";
import { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import api from "@/services/api";

export default function TabsLayout() {
  const { isSignedIn, getToken } = useAuth();
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

    checkProfile();
  }, [isSignedIn, getToken]);

  // Show loading while checking profile
  if (checkingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no profile, redirect to create profile
  if (!hasProfile) {
    return <Redirect href="/(auth)/create-profile" />;
  }

  return (
    <Tabs
      tabBar={(props) => <TabBarWithNotch {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Wishlists",
          tabBarIcon: ({ color, size }) => (
            <Feather name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      {/* Placeholder for center FAB */}
      <Tabs.Screen
        name="_placeholder"
        options={{
          href: null, // This prevents it from being navigable
        }}
      />
      <Tabs.Screen
        name="gifts"
        options={{
          title: "Gifts",
          tabBarIcon: ({ color, size }) => (
            <Feather name="gift" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarButton: () => null, // Completely hide from tab bar
          tabBarStyle: { height: 0, overflow: 'hidden' }, // Hide tab bar when on profile page
        }}
      />
    </Tabs>
  );
}

