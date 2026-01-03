import { useEffect, useState } from "react";
import { Slot } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@/services/api";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { PlaywriteCZ_400Regular } from "@expo-google-fonts/playwrite-cz";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

// Get the publishable key from environment variables
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

console.log("Clerk Publishable Key loaded:", publishableKey ? `${publishableKey.substring(0, 20)}...` : "MISSING");

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function AppWithAuth() {
  const { getToken, isLoaded, userId } = useAuth();
  const [initTimeout, setInitTimeout] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlaywriteCZ_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    // Set timeout for Clerk initialization
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn("⚠️ Clerk initialization timeout - there may be an issue with your Clerk instance");
        setInitTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [isLoaded]);

  useEffect(() => {
    // Set up the auth token getter for API calls once Clerk is loaded
    if (isLoaded || initTimeout) {
      setAuthTokenGetter(getToken);
      console.log("✅ Auth token getter configured for API");
    }
  }, [getToken, isLoaded, initTimeout]);

  useEffect(() => {
    if (fontsLoaded) {
      console.log("✅ Fonts loaded successfully");
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // If timeout occurs, show warning but allow app to continue
  if (initTimeout && !isLoaded) {
    console.error("❌ Clerk failed to initialize. Check your Clerk dashboard and publishable key.");
  }

  // Always render providers, even while fonts load
  // Render a minimal view while fonts load to ensure providers are mounted
  return (
    <BottomSheetModalProvider>
      <ThemeProvider userId={userId}>
        <NotificationProvider>
          <Slot />
        </NotificationProvider>
      </ThemeProvider>
    </BottomSheetModalProvider>
  );
}

function AppWithoutAuth() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlaywriteCZ_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      console.log("✅ Fonts loaded successfully");
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Always render providers, even while fonts load
  // Render a minimal view while fonts load to ensure providers are mounted
  return (
    <BottomSheetModalProvider>
      <ThemeProvider userId={undefined}>
        <NotificationProvider>
          <Slot />
        </NotificationProvider>
      </ThemeProvider>
    </BottomSheetModalProvider>
  );
}

export default function RootLayout() {
  // Font is loaded and will be applied via global styles and Tailwind config

  // If Clerk is not configured, render without provider (for testing)
  if (!publishableKey) {
    console.warn("CLERK_PUBLISHABLE_KEY is not set. Authentication will not work.");
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AppWithoutAuth />
        </QueryClientProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <AppWithAuth />
        </ClerkProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
