import { useState, useEffect } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  Pressable,
} from "react-native";
import {
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { PasswordChangeSuccessSheet } from "./PasswordChangeSuccessSheet";
import { PasswordResetSheet } from "./PasswordResetSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordSheet({ visible, onClose, onSuccess }: ChangePasswordSheetProps) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const insets = useSafeAreaInsets();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordChangeComplete, setIsPasswordChangeComplete] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showPasswordResetSheet, setShowPasswordResetSheet] = useState(false);
  const [resetPassword, setResetPassword] = useState<string | null>(null); // Store reset password to use as current
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      // Only reset if password reset sheet is not showing (to preserve resetPassword after reset)
      if (!isPasswordChangeComplete && !showSuccessSheet && !showPasswordResetSheet && !resetPassword) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setIsSaving(false);
      }
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsPasswordChangeComplete(false);
      setShowSuccessSheet(false);
      setShowPasswordResetSheet(false);
      setResetPassword(null);
      setIsSaving(false);
    }
  }, [visible, isPasswordChangeComplete, showSuccessSheet, showPasswordResetSheet]);

  const validatePasswords = (): boolean => {
    // If we have a reset password, use it as current password
    const passwordToUse = resetPassword || currentPassword;
    
    if (!passwordToUse.trim()) {
      setPasswordError("Please enter your current password");
      return false;
    }

    if (!newPassword.trim()) {
      setPasswordError("Please enter a new password");
      return false;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }

    setPasswordError("");
    return true;
  };

  const handleChangePassword = async () => {
    if (!user || !isLoaded) return;

    if (!validatePasswords()) {
      return;
    }

    try {
      setIsSaving(true);
      // Keep sheet showing with loading state during update - DON'T set isPasswordChangeComplete yet

      // Use reset password if available, otherwise use current password
      const passwordToUse = resetPassword || currentPassword;

      // Update password in Clerk (requires current password for security)
      await user.updatePassword({ 
        newPassword: newPassword,
        currentPassword: passwordToUse,
      });

      // Now that password update is complete, keep sheet visible with loading state briefly,
      // then mark as complete and show success
      // IMPORTANT: Show success sheet BEFORE calling onClose() so component stays mounted
      // The success sheet is a BottomSheetModal (portal), but the component that renders it must stay mounted
      setIsPasswordChangeComplete(true);
      setIsSaving(false);
      
      // Wait a moment for any background processes to complete, then show success sheet
      // Don't call onClose() until after success sheet is shown (component must stay mounted)
      setTimeout(() => {
        // Show success sheet first (while component is still mounted)
        setShowSuccessSheet(true);
        
        // Close the main sheet after success sheet is shown (it will be hidden by visible prop, not unmounted)
        setTimeout(() => {
          onClose();
        }, 300);
      }, 300);
    } catch (error: any) {
      console.error("Error changing password:", error);
      setIsPasswordChangeComplete(false); // Reset on error so user can retry
      setIsSaving(false);
      
      const errorMessage = error.errors?.[0]?.message || error.message || "Failed to change password. Please try again.";
      
      if (errorMessage.toLowerCase().includes("current password") || 
          errorMessage.toLowerCase().includes("incorrect password") ||
          errorMessage.toLowerCase().includes("invalid password")) {
        setPasswordError("Current password is incorrect. Please try again.");
      } else {
        setPasswordError(errorMessage);
      }
    }
  };

  if (!isLoaded || !user) {
    return null;
  }

  return (
    <>
    <BottomSheet 
      visible={visible && !showSuccessSheet && !showPasswordResetSheet && !isPasswordChangeComplete} 
      onClose={onClose} 
      autoHeight={true}
      maxHeight={SCREEN_HEIGHT * 0.9}
      stackBehavior="switch"
      keyboardBehavior="interactive"
      scrollable={false}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
    >
      {/* Header - Title with action button on right - Matching CreateWishlistSheet pattern */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Change Password
        </Text>
        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={isSaving || (!currentPassword.trim() && !resetPassword) || !newPassword.trim() || !confirmPassword.trim() || !!passwordError}
          activeOpacity={0.6}
          style={styles.headerButton}
        >
          {isSaving ? (
            <ActivityIndicator 
              size="small" 
              color={((!currentPassword.trim() && !resetPassword) || !newPassword.trim() || !confirmPassword.trim() || !!passwordError || isSaving)
                ? theme.colors.textSecondary
                : theme.colors.primary} 
            />
          ) : (
            <Text style={[
              styles.headerButtonText,
              {
                color: ((!currentPassword.trim() && !resetPassword) || !newPassword.trim() || !confirmPassword.trim() || !!passwordError || isSaving)
                  ? theme.colors.textSecondary
                  : theme.colors.primary,
              }
            ]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content - Matching signup page field styling */}
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <View style={[styles.contentContainer, { paddingBottom: bottomPadding }]}>
          {/* Current Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              Current Password
            </Text>
            <View style={styles.passwordInputWrapper}>
              <BottomSheetTextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: passwordError 
                      ? (theme.colors.error || "#EF4444")
                      : (theme.isDark ? "#666666" : "#9CA3AF"),
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Enter current password"
                placeholderTextColor={theme.colors.textSecondary}
                value={currentPassword || resetPassword || ""}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (text) {
                    setResetPassword(null); // Clear reset password when user types
                  }
                  setPasswordError("");
                }}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType={Platform.OS === "ios" ? "none" : undefined}
                keyboardType="default"
                spellCheck={false}
                editable={!isSaving && !isPasswordChangeComplete}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {/* Forgot Password Button */}
            <TouchableOpacity
              onPress={() => setShowPasswordResetSheet(true)}
              style={styles.forgotPasswordButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              New Password
            </Text>
            <View style={styles.passwordInputWrapper}>
              <BottomSheetTextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: passwordError 
                      ? (theme.colors.error || "#EF4444")
                      : (theme.isDark ? "#666666" : "#9CA3AF"),
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.textSecondary}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setPasswordError("");
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType={Platform.OS === "ios" ? "none" : undefined}
                keyboardType="default"
                spellCheck={false}
                editable={!isSaving && !isPasswordChangeComplete}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              Confirm New Password
            </Text>
            <View style={styles.passwordInputWrapper}>
              <BottomSheetTextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: passwordError 
                      ? (theme.colors.error || "#EF4444")
                      : (theme.isDark ? "#666666" : "#9CA3AF"),
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setPasswordError("");
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType={Platform.OS === "ios" ? "none" : undefined}
                keyboardType="default"
                spellCheck={false}
                editable={!isSaving && !isPasswordChangeComplete}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={[styles.errorText, { color: theme.colors.error || "#EF4444" }]}>
                {passwordError}
              </Text>
            ) : (
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                Password must be at least 8 characters long
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </BottomSheet>

    {/* Password Reset Sheet - For forgot password flow */}
    <PasswordResetSheet
      visible={showPasswordResetSheet}
      onClose={() => {
        setShowPasswordResetSheet(false);
        // If reset was successful, resetPassword will be set and user can continue
        // If cancelled, just close
      }}
      onPasswordResetComplete={(newPassword) => {
        // After password reset, store the new password so user can continue changing
        // They can now use this as their "current password" to change it to what they want
        setResetPassword(newPassword);
        // Don't set currentPassword - let it use resetPassword via value prop
        setShowPasswordResetSheet(false);
        
        // Reload user to get latest session state
        user?.reload();
        
        // Clear any errors and allow user to continue
        setPasswordError("");
        
        // Keep ChangePasswordSheet open so user can continue changing password
        // The reset password will be pre-filled as current password
        // They can now enter a new password of their choice (different from reset password)
      }}
    />

    {/* Success Sheet - Always render for proper mounting */}
    <PasswordChangeSuccessSheet
      visible={showSuccessSheet}
      onClose={() => setShowSuccessSheet(false)}
      onConfirm={() => {
        setShowSuccessSheet(false);
        if (onSuccess) {
          onSuccess();
        }
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  headerButton: {
    position: "absolute",
    right: 20,
    top: 0,
    bottom: 16,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    paddingRight: 48, // Make space for the eye icon
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
