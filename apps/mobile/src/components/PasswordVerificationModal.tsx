import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { useUser } from "@clerk/clerk-expo";

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
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm(password);
      setPassword(""); // Clear password on success
    } catch (error: any) {
      Alert.alert(
        "Verification Failed",
        error.message || "Incorrect password. Please try again."
      );
      setPassword(""); // Clear password on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    onCancel();
  };

  return (
    <BottomSheet visible={visible} onClose={handleCancel} autoHeight={true}>
      {/* Header - Standard pattern: centered title, no X button */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Verify Your Identity
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.message, { color: theme.colors.textPrimary }]}>
          For your security, please enter your password to confirm this action.
        </Text>

        <BottomSheetTextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              borderColor: theme.colors.textSecondary + '30',
            },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          editable={!isLoading && !isVerifying}
          onSubmitEditing={handleConfirm}
        />

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: theme.isDark ? '#2E2E2E' : '#F3F4F6',
                  borderColor: theme.colors.textSecondary + '40',
                }
              ]}
              onPress={handleCancel}
              disabled={isLoading || isVerifying}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.cancelButtonText,
                { color: theme.colors.textPrimary }
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: theme.colors.primary },
                (isLoading || isVerifying) && styles.buttonDisabled
              ]}
              onPress={handleConfirm}
              disabled={isLoading || isVerifying}
              activeOpacity={0.7}
            >
              {isLoading || isVerifying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Verify
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    padding: 24,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#EF4444",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});





