import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { BottomSheet } from "./BottomSheet";
import { useSignIn } from "@clerk/clerk-expo";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

interface SetNewPasswordBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SetNewPasswordBottomSheet({
  visible,
  onClose,
}: SetNewPasswordBottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const signInHook = useSignIn();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      setPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [visible]);

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
        onClose();
        router.replace("/(auth)/login");
        return;
      }

      // Reset password using Clerk's resetPassword method
      const result = await signIn.resetPassword({
        password,
      });

      if (result.status === "complete") {
        await signInHook.setActive({ session: result.createdSessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        onClose();
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

  const signIn = signInHook.signIn;
  if (!signIn || signIn.status !== "needs_new_password" || !visible) {
    return null;
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight={true} stackBehavior="replace">
      {/* Header - Standard pattern */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Set New Password
        </Text>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Please enter your new password below
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            New Password
          </Text>
          <BottomSheetTextInput
            style={[
              styles.textInput,
              {
                borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder="Enter new password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            Confirm Password
          </Text>
          <BottomSheetTextInput
            style={[
              styles.textInput,
              {
                borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder="Confirm new password"
            placeholderTextColor={theme.colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            onSubmitEditing={onResetPasswordPress}
            returnKeyType="done"
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
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
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
    height: 44,
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

