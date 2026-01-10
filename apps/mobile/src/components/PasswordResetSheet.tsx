import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Keyboard, Pressable } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { BottomSheet } from "./BottomSheet";
import { useSignIn, useClerk } from "@clerk/clerk-expo";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";
import { VerificationBottomSheet } from "./VerificationBottomSheet";
import { SetNewPasswordBottomSheet } from "./SetNewPasswordBottomSheet";
import { useUser } from "@clerk/clerk-expo";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PasswordResetSheetProps {
  visible: boolean;
  onClose: () => void;
  onPasswordResetComplete?: (newPassword: string) => void;
}

export function PasswordResetSheet({
  visible,
  onClose,
  onPasswordResetComplete,
}: PasswordResetSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const signInHook = useSignIn();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isInitiating, setIsInitiating] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationSheet, setShowVerificationSheet] = useState(false);
  const [showSetPasswordSheet, setShowSetPasswordSheet] = useState(false);
  
  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      setError("");
      setIsInitiating(false);
    } else {
      setError("");
      setIsInitiating(false);
      setShowVerificationSheet(false);
      setShowSetPasswordSheet(false);
    }
  }, [visible]);

  // Handle password reset initiation
  // Note: Clerk's password reset flow (signIn.create()) only works when user is NOT signed in
  // So we need to sign out first, then initiate the reset flow
  const handleForgotPassword = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      setError("Unable to retrieve your email address. Please try again.");
      return;
    }

    if (!signInHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    setError("");
    setIsInitiating(true);

    try {
      const email = user.primaryEmailAddress.emailAddress;
      
      // IMPORTANT: Clerk's password reset flow only works when user is NOT signed in
      // We need to sign out first (silently) before initiating password reset
      // After password reset completes, Clerk will automatically sign the user back in
      try {
        await signOut();
        // Small delay to ensure sign-out completes
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (signOutError: any) {
        console.error("Error signing out before password reset:", signOutError);
        // Continue anyway - might already be signed out
      }
      
      // Now create a sign-in attempt with just the identifier (email)
      // This is the same flow used on the login page for forgot password
      const signInAttempt = await signInHook.signIn.create({
        identifier: email,
      });

      // Check if password reset is available
      const resetPasswordStrategy = signInAttempt.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "reset_password_email_code"
      ) as any;

      if (signInAttempt.status === "needs_first_factor" && resetPasswordStrategy?.emailAddressId) {
        // Password reset flow is available - open verification sheet
        // The verification sheet will handle preparing and sending the code
        setShowVerificationSheet(true);
      } else {
        setError("Password reset is not available for this account. Please contact support.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to initiate password reset. Please try again.";
      setError(errorMessage);
      console.error("Error initiating password reset:", err);
    } finally {
      setIsInitiating(false);
    }
  };

  // Handle password reset completion
  const handlePasswordResetComplete = (newPassword: string) => {
    setShowSetPasswordSheet(false);
    setShowVerificationSheet(false);
    
    // The password has been reset and session has been updated
    // Close this sheet (PasswordResetSheet) but keep parent (ChangePasswordSheet) open
    // Notify parent so they can pre-fill the new password and allow user to continue
    onClose();
    
    // If callback provided, call it after a short delay to allow sheet to close
    if (onPasswordResetComplete) {
      setTimeout(() => {
        onPasswordResetComplete(newPassword);
      }, 300);
    }
  };

  return (
    <>
      <BottomSheet
        visible={visible && !showVerificationSheet && !showSetPasswordSheet}
        onClose={onClose}
        autoHeight={true}
        maxHeight={SCREEN_HEIGHT * 0.9}
        stackBehavior="switch"
        keyboardBehavior="interactive"
        scrollable={false}
        enableContentPanningGesture={true}
        enableHandlePanningGesture={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Reset Password
          </Text>
        </View>

        {/* Content */}
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <View style={[styles.contentContainer, { paddingBottom: bottomPadding }]}>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              We'll send a verification code to your email address. After resetting your password, you'll be signed back in automatically.
            </Text>

            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: theme.isDark ? "rgba(239, 83, 80, 0.15)" : "rgba(239, 83, 80, 0.1)" }]}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={isInitiating}
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: isInitiating ? 0.5 : 1,
                },
              ]}
            >
              {isInitiating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Send Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </BottomSheet>

      {/* Verification Sheet - Reuses existing component */}
      <VerificationBottomSheet
        visible={showVerificationSheet}
        onClose={() => {
          setShowVerificationSheet(false);
        }}
        onPasswordResetNeeded={() => {
          // After code verification, transition to set password sheet
          setShowVerificationSheet(false);
          setShowSetPasswordSheet(true);
        }}
      />

      {/* Set New Password Sheet - Reuses existing component */}
      <SetNewPasswordBottomSheet
        visible={showSetPasswordSheet}
        onClose={() => {
          setShowSetPasswordSheet(false);
          onClose();
        }}
        onComplete={handlePasswordResetComplete}
      />
    </>
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
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 83, 80, 0.3)",
  },
  errorText: {
    fontSize: 13,
    textAlign: "left",
  },
  button: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

