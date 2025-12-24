import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import { BottomSheet } from "./BottomSheet";

interface IdentityVerificationModalProps {
  visible: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isVerifying?: boolean;
}

export function IdentityVerificationModal({
  visible,
  onConfirm,
  onCancel,
  isVerifying = false,
}: IdentityVerificationModalProps) {
  const { theme } = useTheme();
  const { user } = useUser();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const codeInputRef = useRef<TextInput>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCode("");
      setCodeSent(false);
      setVerification(null);
      // Delay sending code to allow sheet to measure content first
      // This prevents layout shift and re-measurement
      if (user && !codeSent && !isSendingCode) {
        // Small delay to let BottomSheet measure content first
        const timer = setTimeout(() => {
          sendVerificationCode();
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      setCode("");
      setCodeSent(false);
      setVerification(null);
    }
  }, [visible]);

  // Focus input when code is sent
  useEffect(() => {
    if (codeSent && codeInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 300);
    }
  }, [codeSent]);

  // Send email verification code
  const sendVerificationCode = async () => {
    if (!user) return;

    try {
      setIsSendingCode(true);
      const emailAddress = user.emailAddresses[0];
      
      if (!emailAddress) {
        Alert.alert("Error", "No email address found");
        return;
      }

      // For account deletion, we need to create a new verification attempt
      // This creates a verification object that we can use to verify the code
      const verificationObj = await emailAddress.prepareVerification({ strategy: "email_code" });
      console.log("Verification object created:", verificationObj);
      
      // Store the verification object directly - this is what we'll use to verify the code
      if (verificationObj) {
        setVerification(verificationObj);
        setCodeSent(true);
        Alert.alert("Code Sent", `We've sent a verification code to ${emailAddress.emailAddress}.`);
      } else {
        throw new Error("Failed to create verification");
      }
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      Alert.alert(
        "Error",
        error.errors?.[0]?.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirm = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      if (!code.trim()) {
        Alert.alert("Error", "Please enter the verification code");
        setIsLoading(false);
        return;
      }

      console.log("Attempting verification with code:", code.trim());
      console.log("Stored verification object:", verification);

      if (!verification) {
        console.error("No verification found. Requesting new code...");
        Alert.alert(
          "Verification Expired",
          "The verification code has expired. Please request a new code.",
          [
            {
              text: "Request New Code",
              onPress: () => {
                setCode("");
                setCodeSent(false);
                setVerification(null);
                sendVerificationCode();
              }
            },
            { text: "Cancel", style: "cancel" }
          ]
        );
        setIsLoading(false);
        return;
      }

      // Check if the verification is already verified
      if (verification.status === "verified") {
        console.log("Verification already verified, proceeding with onConfirm");
        await onConfirm();
        return;
      }

      console.log("Attempting verification with stored verification object");
      
      // Attempt verification with code using the stored verification object
      try {
        const result = await verification.attemptVerification({ code: code.trim() });
        console.log("Verification result:", result);
        
        if (result.status === "verified") {
          console.log("Verification successful!");
          await onConfirm();
        } else {
          throw new Error(`Verification failed with status: ${result.status}`);
        }
      } catch (verifyError: any) {
        console.error("Verification error details:", verifyError);
        const errorMessage = verifyError.errors?.[0]?.message || verifyError.message || "";
        const errorCode = verifyError.errors?.[0]?.code;
        
        // Only proceed if verification is explicitly already verified
        if (errorCode === "verification_already_verified" || 
            errorMessage.includes("already been verified") ||
            errorMessage.includes("already verified")) {
          console.log("Verification already verified, proceeding with deletion");
          await onConfirm();
        } else {
          // For any other error (invalid code, expired, etc.), show the error
          console.error("Verification failed:", errorMessage);
          throw verifyError;
        }
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      const errorMessage = error.errors?.[0]?.message || error.message || "";
      const errorCode = error.errors?.[0]?.code;
      
      // Show the actual error to the user
      Alert.alert(
        "Verification Failed",
        errorMessage || "Invalid verification code. Please try again.",
        [
          {
            text: "Request New Code",
            onPress: () => {
              setCode("");
              setCodeSent(false);
              setVerification(null);
              sendVerificationCode();
            }
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCode("");
    setCodeSent(false);
    setVerification(null);
    onCancel();
  };

  if (!user) return null;

  return (
    <BottomSheet visible={visible} onClose={handleCancel} autoHeight={true}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Verify Your Identity
            </Text>
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isLoading || isVerifying}
            >
              <Feather 
                name="x" 
                size={24} 
                color={isLoading || isVerifying ? theme.colors.textSecondary : theme.colors.textPrimary} 
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.message, { color: theme.colors.textPrimary }]}>
              We've sent a 6-digit verification code to {user.emailAddresses[0]?.emailAddress}. Please enter it below.
            </Text>

            {/* Always show input field to prevent layout shift */}
            <TextInput
              ref={codeInputRef}
              style={[
                styles.input,
                styles.codeInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.textSecondary + '30',
                  opacity: codeSent ? 1 : 0.5,
                },
              ]}
              value={code}
              onChangeText={(text) => {
                // Only allow numbers
                const numericText = text.replace(/[^0-9]/g, '');
                setCode(numericText);
              }}
              placeholder="000000"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              editable={codeSent && !isLoading && !isVerifying}
              onSubmitEditing={handleConfirm}
              selectTextOnFocus={false}
              textContentType="oneTimeCode"
              returnKeyType="done"
              autoFocus={Platform.OS === 'web' && codeSent}
            />

            {/* Always render resend button container to prevent layout shift */}
            <View style={styles.resendButton}>
              {!codeSent && !isSendingCode && (
                <TouchableOpacity
                  onPress={sendVerificationCode}
                  disabled={isSendingCode}
                  style={styles.resendButtonInner}
                >
                  <Text style={[styles.resendText, { color: theme.colors.primary }]}>
                    Send Code
                  </Text>
                </TouchableOpacity>
              )}

              {isSendingCode && (
                <View style={styles.sendingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.sendingText, { color: theme.colors.textSecondary }]}>
                    Sending code...
                  </Text>
                </View>
              )}

              {codeSent && !isSendingCode && (
                <TouchableOpacity
                  onPress={sendVerificationCode}
                  disabled={isSendingCode}
                  style={styles.resendButtonInner}
                >
                  <Text style={[styles.resendText, { color: theme.colors.primary }]}>
                    Resend Code
                  </Text>
                </TouchableOpacity>
              )}
            </View>

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
                  (isLoading || isVerifying || !codeSent) && styles.buttonDisabled
                ]}
                onPress={handleConfirm}
                disabled={isLoading || isVerifying || !codeSent}
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
        </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerSpacer: {
    width: 24,
  },
  closeButton: {
    padding: 4,
    zIndex: 1,
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
    borderWidth: 1,
    marginBottom: 16,
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: "600",
  },
  resendButton: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 8,
    minHeight: 40, // Fixed height to prevent layout shift
  },
  resendButtonInner: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sendingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  sendingText: {
    fontSize: 14,
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
