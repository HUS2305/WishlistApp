import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  Pressable,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PasswordVerificationModalProps {
  visible: boolean;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
  isVerifying?: boolean;
}

export function PasswordVerificationModal({
  visible,
  onConfirm,
  onCancel,
  isVerifying = false,
}: PasswordVerificationModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setPassword("");
      setError("");
    } else {
      setPassword("");
      setError("");
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await onConfirm(password);
      setPassword(""); // Clear password on success
    } catch (error: any) {
      const errorMessage = error.message || "Incorrect password. Please try again.";
      setError(errorMessage);
      setPassword(""); // Clear password on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    onCancel();
  };

  return (
    <BottomSheet visible={visible} onClose={handleCancel} autoHeight={true}>
      {/* Header - Standard pattern */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Verify Your Identity
        </Text>
      </View>

      {/* Content */}
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <View style={[styles.content, { paddingBottom: bottomPadding }]}>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            For your security, please enter your password to confirm this action.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              Password
            </Text>
            <View style={styles.passwordInputWrapper}>
              <BottomSheetTextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: error 
                      ? (theme.colors.error || "#EF4444")
                      : (theme.isDark ? "#666666" : "#9CA3AF"),
                  },
                ]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading && !isVerifying}
                onSubmitEditing={handleConfirm}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.error || "#EF4444" }]}>
                {error}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!password.trim() || isLoading || isVerifying}
            style={[
              styles.verifyButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: (!password.trim() || isLoading || isVerifying) ? 0.5 : 1,
              },
            ]}
          >
            {isLoading || isVerifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </Pressable>
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
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  input: {
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
  verifyButton: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});





