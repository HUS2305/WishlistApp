import { Platform } from "react-native";
import { SignIn } from "@clerk/clerk-expo/web";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { router } from "expo-router";
import { View, StyleSheet, KeyboardAvoidingView, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "@/components/ui";
import { SocialSignInButton } from "@/components/SocialSignInButton";
import { VerificationBottomSheet } from "@/components/VerificationBottomSheet";
import { SetNewPasswordBottomSheet } from "@/components/SetNewPasswordBottomSheet";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { theme } = useTheme();
  const signInHook = useSignIn();
  
  // OAuth hooks for social sign-in
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: "oauth_facebook" });
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState<"google" | "apple" | "facebook" | null>(null);
  const [error, setError] = useState("");
  const [showVerificationSheet, setShowVerificationSheet] = useState(false);
  const [showPasswordResetSheet, setShowPasswordResetSheet] = useState(false);

  // Handle OAuth sign-in
  const handleOAuthSignIn = async (provider: "google" | "apple" | "facebook") => {
    if (!signInHook.isLoaded) {
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
        router.replace("/");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || `Failed to sign in with ${provider}`;
      setError(errorMessage);
      console.error(`Error signing in with ${provider}:`, err);
    } finally {
      setOAuthLoading(null);
    }
  };

  // Handle email/password sign-in
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
      console.log("Sign-in supported strategies:", completeSignIn.supportedSecondFactors);

      if (completeSignIn.status === "complete") {
        await signInHook.setActive({ session: completeSignIn.createdSessionId });
        
        // Check if user has completed profile in database
        // The index page will handle the redirect, so just go to root
        router.replace("/");
      } else if (completeSignIn.status === "needs_second_factor" || 
                 completeSignIn.status === "needs_first_factor") {
        // User needs to complete 2FA/MFA or email verification
        console.log("Opening verification sheet");
        setShowVerificationSheet(true);
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

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    if (!signInHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Create a sign-in attempt with just the identifier (email)
      // This allows us to initiate password reset
      const signInAttempt = await signInHook.signIn.create({
        identifier: email,
      });

      // Check if password reset is available
      const resetPasswordStrategy = signInAttempt.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "reset_password_email_code"
      ) as any;

      if (signInAttempt.status === "needs_first_factor" && resetPasswordStrategy?.emailAddressId) {
        // Don't prepare here - let VerificationBottomSheet handle preparation
        // This prevents duplicate email sends
        // Open verification sheet for password reset
        setShowVerificationSheet(true);
      } else {
        setError("Password reset is not available for this account. Please contact support.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to initiate password reset. Please check your email address.";
      setError(errorMessage);
      console.error("Error initiating password reset:", err);
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
                Sign in to WishlistApp
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Welcome back! Please sign in to continue
              </Text>
            </View>

            {/* Social Sign-In Buttons */}
            <View style={styles.socialSection}>
              <SocialSignInButton
                provider="google"
                onPress={() => handleOAuthSignIn("google")}
                loading={oauthLoading === "google"}
                disabled={loading || oauthLoading !== null}
                style={styles.socialButton}
              />
              <SocialSignInButton
                provider="apple"
                onPress={() => handleOAuthSignIn("apple")}
                loading={oauthLoading === "apple"}
                disabled={loading || oauthLoading !== null}
                style={styles.socialButton}
              />
              <SocialSignInButton
                provider="facebook"
                onPress={() => handleOAuthSignIn("facebook")}
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
                  Email address
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
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordButton}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.colors.textPrimary }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>

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
                onPress={onSignInPress}
                disabled={!email || !password || !signInHook.isLoaded || oauthLoading !== null || loading}
                style={[
                  styles.signInButton,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: (!email || !password || !signInHook.isLoaded || oauthLoading !== null || loading) ? 0.5 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={[styles.signUpText, { color: theme.colors.textSecondary }]}>
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/signup")}
                disabled={loading || oauthLoading !== null}
              >
                <Text style={[styles.signUpLink, { color: theme.colors.textPrimary, fontWeight: "700" }]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verification Bottom Sheet */}
      <VerificationBottomSheet
        visible={showVerificationSheet}
        onClose={() => setShowVerificationSheet(false)}
        onPasswordResetNeeded={() => {
          setShowVerificationSheet(false);
          setShowPasswordResetSheet(true);
        }}
      />

      {/* Set New Password Bottom Sheet */}
      <SetNewPasswordBottomSheet
        visible={showPasswordResetSheet}
        onClose={() => setShowPasswordResetSheet(false)}
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
    paddingTop: 32,
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
    fontSize: 14,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "500",
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
  signInButton: {
    marginTop: 8,
    height: 44,
    width: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
