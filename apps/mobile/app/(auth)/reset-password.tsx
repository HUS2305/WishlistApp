import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "@/components/ui";
import { useSignIn } from "@clerk/clerk-expo";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const signInHook = useSignIn();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (signInHook.isLoaded) {
      const signIn = signInHook.signIn;
      // If we're not in the correct state, redirect to login
      if (!signIn || signIn.status !== "needs_new_password") {
        router.replace("/(auth)/login");
      }
    }
  }, [signInHook.isLoaded, signInHook.signIn?.status]);

  const onResetPasswordPress = async () => {
    if (!signInHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter both password fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const signIn = signInHook.signIn;
      if (!signIn || signIn.status !== "needs_new_password") {
        setError("Invalid password reset state. Please try again.");
        router.replace("/(auth)/login");
        return;
      }

      // Reset password using Clerk's resetPassword method
      // The signIn object should be in needs_new_password state after code verification
      const result = await signIn.resetPassword({
        password,
      });

      if (result.status === "complete") {
        await signInHook.setActive({ session: result.createdSessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        router.replace("/");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to reset password";
      setError(errorMessage);
      console.error("Error resetting password:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!signInHook.isLoaded) {
    return null;
  }

  const signIn = signInHook.signIn;
  if (!signIn || signIn.status !== "needs_new_password") {
    return null;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Set New Password
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Please enter your new password below
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputFieldContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>New Password</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputFieldContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>Confirm Password</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
              onPress={onResetPasswordPress}
              disabled={!password || !confirmPassword || loading}
              style={[
                styles.resetButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: (!password || !confirmPassword || loading) ? 0.5 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.resetButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              style={styles.backButton}
            >
              <Text style={[styles.backText, { color: theme.colors.textSecondary }]}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    minHeight: "100%",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputFieldContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
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
  resetButton: {
    marginTop: 8,
    height: 44,
    width: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

