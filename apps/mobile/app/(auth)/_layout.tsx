import { Stack, Redirect, useSegments } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function AuthLayout() {
  // ClerkProvider is always rendered in _layout.tsx, so useAuth is safe to call
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();

  // Wait for auth to load
  if (!isLoaded) {
    return null;
  }

  // Routes that should be accessible even when signed in
  const allowedWhenSignedIn = ["onboarding", "login", "signup", "verify", "create-profile"];
  
  // Check if current route is in the allowed list
  // segments can be like ["(auth)", "create-profile"] or just ["create-profile"]
  const currentRoute = segments[segments.length - 1]; // Get the last segment (actual route name)
  const isAllowedRoute = allowedWhenSignedIn.includes(currentRoute);
  
  // Only redirect if user is signed in AND not on an allowed route
  if (isSignedIn && !isAllowedRoute) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="create-profile" />
    </Stack>
  );
}

