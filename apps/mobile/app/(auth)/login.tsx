import { Platform } from "react-native";
import { SignIn } from "@clerk/clerk-expo/web";
import { useSignIn } from "@clerk/clerk-expo";
import { useState } from "react";
import { router } from "expo-router";
import { View, StyleSheet, KeyboardAvoidingView } from "react-native";
import { Text } from "@/components/Text";
import { Button, Input, SafeAreaView } from "@/components/ui";

// Check if running in web browser (works for mobile browsers too)
// In Expo, Platform.OS === "web" when running in any browser (desktop or mobile)
const isWeb = Platform.OS === "web";

export default function LoginScreen() {
  // IMPORTANT: Clerk's SignIn/SignUp components are WEB-ONLY
  // They don't work on native iOS/Android apps
  // If you're testing on actual native mobile (Expo Go, iOS Simulator, Android Emulator),
  // you'll see the custom components below, which is correct!
  // 
  // Clerk components only work when testing in a web browser (desktop or mobile browser)
  if (isWeb) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <SignIn
          routing="hash"
          signUpUrl="#/signup"
          fallbackRedirectUrl="/"
        />
      </View>
    );
  }

  // Custom implementation for native (iOS/Android)
  const signInHook = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSignInPress = async () => {
    if (!signInHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const completeSignIn = await signInHook.signIn.create({
        identifier: email,
        password,
      });

      console.log("Sign-in status:", completeSignIn.status);
      console.log("Sign-in supported strategies:", completeSignIn.supportedSecondFactorStrategies);

      if (completeSignIn.status === "complete") {
        await signInHook.setActive({ session: completeSignIn.createdSessionId });
        
        // Check if user has completed profile in database
        // The index page will handle the redirect, so just go to root
        router.replace("/");
      } else if (completeSignIn.status === "needs_second_factor") {
        // User needs to complete 2FA/MFA
        console.log("Navigating to 2FA verification");
        router.push("/(auth)/verify-signin");
      } else if (completeSignIn.status === "needs_email_address_verification") {
        // User needs to verify their email
        console.log("Navigating to email verification");
        router.push("/(auth)/verify-signin");
      } else if (completeSignIn.status === "needs_new_password") {
        // User needs to reset their password
        setError("Your password needs to be reset. Please use the 'Forgot Password' option.");
      } else {
        // Unknown status - log it for debugging
        console.warn("Unknown sign-in status:", completeSignIn.status);
        setError(`Additional verification required (status: ${completeSignIn.status}). Please check your email or authenticator app.`);
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to sign in";
      setError(errorMessage);
      console.error("Error signing in:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue to WishlistApp
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title="Sign In"
              onPress={onSignInPress}
              loading={loading}
              disabled={!email || !password || !signInHook.isLoaded}
              style={styles.button}
            />

            <Button
              title="Create Account"
              onPress={() => router.push("/(auth)/signup")}
              variant="outline"
              style={styles.button}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#86868B",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
});
