import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  // Wait for Clerk to load before making routing decisions
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Simple routing - index.tsx only runs at root route "/"
  // The verify screen will redirect to create-profile after signup
  // The auth layout will allow create-profile route when signed in
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/onboarding" />;
  }
}
