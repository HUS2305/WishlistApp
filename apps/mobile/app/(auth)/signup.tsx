import { Platform } from "react-native";
import { SignUp } from "@clerk/clerk-expo/web";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { router } from "expo-router";
import { View, StyleSheet, KeyboardAvoidingView, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "@/components/ui";
import { SocialSignInButton } from "@/components/SocialSignInButton";
import { SignUpVerificationBottomSheet } from "@/components/SignUpVerificationBottomSheet";
import { useTheme } from "@/contexts/ThemeContext";

// Check if running in web browser (works for mobile browsers too)
// In Expo, Platform.OS === "web" when running in any browser (desktop or mobile)
const isWeb = Platform.OS === "web";

export default function SignUpScreen() {
  // IMPORTANT: Clerk's SignIn/SignUp components are WEB-ONLY
  // They don't work on native iOS/Android apps
  // If you're testing on actual native mobile (Expo Go, iOS Simulator, Android Emulator),
  // you'll see the custom components below, which is correct!
  // 
  // Clerk components only work when testing in a web browser (desktop or mobile browser)
  if (isWeb) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <SignUp
          routing="hash"
          signInUrl="#/login"
          fallbackRedirectUrl="/(auth)/create-profile"
        />
      </View>
    );
  }

  // Custom implementation for native (iOS/Android)
  const { theme } = useTheme();
  const signUpHook = useSignUp();
  
  // OAuth hooks for social sign-up
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: "oauth_facebook" });
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState<"google" | "apple" | "facebook" | null>(null);
  const [error, setError] = useState("");
  const [showVerificationSheet, setShowVerificationSheet] = useState(false);

  // Handle OAuth sign-up (works for both sign-up and sign-in)
  const handleOAuthSignUp = async (provider: "google" | "apple" | "facebook") => {
    if (!signUpHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    setError("");
    setOAuthLoading(provider);

    try {
      let result;
      if (provider === "google") {
        result = await (startGoogleOAuth as any)();
      } else if (provider === "apple") {
        result = await (startAppleOAuth as any)();
      } else if (provider === "facebook") {
        result = await (startFacebookOAuth as any)();
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      if (!result) {
        throw new Error(`${provider} OAuth flow failed`);
      }

      const { createdSessionId, setActive } = result;
      
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        // Redirect to home - index.tsx will check if profile exists and redirect accordingly
        router.replace("/");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || `Failed to sign up with ${provider}`;
      setError(errorMessage);
      console.error(`Error signing up with ${provider}:`, err);
    } finally {
      setOAuthLoading(null);
    }
  };

  const onSignUpPress = async () => {
    if (!signUpHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signUpHook.signUp.create({
        emailAddress: email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      // Don't prepare here - let SignUpVerificationBottomSheet handle preparation
      // This prevents duplicate email sends
      // Open verification sheet
      setShowVerificationSheet(true);
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to create account";
      setError(errorMessage);
      console.error("Error signing up:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Join WishlistApp and start sharing your wishes
              </Text>
            </View>

            {/* Social Sign-Up Buttons */}
            <View style={styles.socialSection}>
              <SocialSignInButton
                provider="google"
                onPress={() => handleOAuthSignUp("google")}
                loading={oauthLoading === "google"}
                disabled={loading || oauthLoading !== null}
                style={styles.socialButton}
              />
              <SocialSignInButton
                provider="apple"
                onPress={() => handleOAuthSignUp("apple")}
                loading={oauthLoading === "apple"}
                disabled={loading || oauthLoading !== null}
                style={styles.socialButton}
              />
              <SocialSignInButton
                provider="facebook"
                onPress={() => handleOAuthSignUp("facebook")}
                loading={oauthLoading === "facebook"}
                disabled={loading || oauthLoading !== null}
                style={styles.socialButton}
              />
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.textSecondary }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>
                or
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.textSecondary }]} />
            </View>

            {/* Email/Password Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  First Name
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder="Enter your first name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  Last Name
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder="Enter your last name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  Email
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                  Password
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder="Create a password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: theme.isDark ? "rgba(239, 83, 80, 0.15)" : "rgba(239, 83, 80, 0.1)" }]}>
                  <View style={styles.errorContent}>
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {error}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setError("")}
                      style={styles.errorDismissButton}
                    >
                      <Text style={[styles.errorDismissText, { color: theme.colors.error }]}>
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={onSignUpPress}
                disabled={!email || !password || !firstName.trim() || !lastName.trim() || !signUpHook.isLoaded || oauthLoading !== null || loading}
                style={[
                  styles.signUpButton,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: (!email || !password || !firstName.trim() || !lastName.trim() || !signUpHook.isLoaded || oauthLoading !== null || loading) ? 0.5 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={[styles.signInText, { color: theme.colors.textSecondary }]}>
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  disabled={loading || oauthLoading !== null}
                >
                  <Text style={[styles.signInLink, { color: theme.colors.textPrimary, fontWeight: "700" }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verification Bottom Sheet */}
      <SignUpVerificationBottomSheet
        visible={showVerificationSheet}
        onClose={() => setShowVerificationSheet(false)}
        emailAddress={email}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 100,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  socialSection: {
    marginBottom: 40,
    gap: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  socialButton: {
    flex: 1,
    minWidth: "30%",
    height: 40,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.2,
  },
  dividerText: {
    fontSize: 13,
    marginHorizontal: 12,
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  errorContainer: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 83, 80, 0.3)",
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    fontSize: 13,
    textAlign: "left",
    flex: 1,
    marginRight: 12,
  },
  errorDismissButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  errorDismissText: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 20,
  },
  signUpButton: {
    marginTop: 8,
    height: 44,
    width: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  signInText: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});

