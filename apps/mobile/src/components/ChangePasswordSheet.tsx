import { useState, useEffect } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentPassword?: string; // Password verified by PasswordVerificationModal
}

export function ChangePasswordSheet({ visible, onClose, onSuccess, currentPassword }: ChangePasswordSheetProps) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const insets = useSafeAreaInsets();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [visible]);

  const validatePasswords = (): boolean => {
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

    if (!currentPassword) {
      setPasswordError("Current password is required. Please verify again.");
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

      if (!currentPassword) {
        setPasswordError("Current password is required. Please verify again.");
        return;
      }

      // Update password in Clerk
      await user.updatePassword({ 
        newPassword: newPassword,
        currentPassword: currentPassword,
      });

      Alert.alert(
        "Success",
        "Your password has been changed successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              onClose();
              if (onSuccess) {
                onSuccess();
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error("Error changing password:", error);
      const errorMessage = error.errors?.[0]?.message || error.message || "Failed to change password. Please try again.";
      
      if (errorMessage.toLowerCase().includes("current password") || 
          errorMessage.toLowerCase().includes("incorrect password") ||
          errorMessage.toLowerCase().includes("invalid password")) {
        setPasswordError("Current password is incorrect. Please verify again.");
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return null;
  }

  return (
    <BottomSheet 
      visible={visible} 
      onClose={onClose} 
      autoHeight={true}
      maxHeight={SCREEN_HEIGHT * 0.9}
      stackBehavior="switch"
      keyboardBehavior="interactive"
      scrollable={false}
    >
      {/* Header - Title with action button on right - Matching CreateWishlistSheet pattern */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Change Password
        </Text>
        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={isSaving || !newPassword.trim() || !confirmPassword.trim() || !!passwordError}
          activeOpacity={0.6}
          style={styles.headerButton}
        >
          {isSaving ? (
            <ActivityIndicator 
              size="small" 
              color={(!newPassword.trim() || !confirmPassword.trim() || !!passwordError || isSaving)
                ? theme.colors.textSecondary
                : theme.colors.primary} 
            />
          ) : (
            <Text style={[
              styles.headerButtonText,
              {
                color: (!newPassword.trim() || !confirmPassword.trim() || !!passwordError || isSaving)
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
                editable={!isSaving}
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
                editable={!isSaving}
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
});
