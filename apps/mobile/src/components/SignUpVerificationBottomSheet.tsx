import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { BottomSheet } from "./BottomSheet";
import { useSignUp } from "@clerk/clerk-expo";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { TextInput as RNTextInput } from "react-native";

interface SignUpVerificationBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  emailAddress?: string;
}

export function SignUpVerificationBottomSheet({
  visible,
  onClose,
  emailAddress,
}: SignUpVerificationBottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const signUpHook = useSignUp();
  const [code, setCode] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasPreparedRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const lastVerifiedCodeRef = useRef<string>("");
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const hiddenInputRef = useRef<RNTextInput | null>(null);
  
  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Sync code from digits array
  useEffect(() => {
    const combinedCode = codeDigits.join("");
    setCode(combinedCode);
  }, [codeDigits]);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      setCode("");
      setCodeDigits(["", "", "", "", "", ""]);
      setError("");
      hasPreparedRef.current = false;
      isVerifyingRef.current = false;
      lastVerifiedCodeRef.current = "";
      // Focus first input after a small delay
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [visible]);

  // Prepare verification code sending - only once
  useEffect(() => {
    if (!visible || !signUpHook.isLoaded || hasPreparedRef.current) {
      return;
    }

    const signUp = signUpHook.signUp;
    if (!signUp) return;

    // Check if email verification is needed
    if (signUp.status === "missing_requirements" || signUp.status === "missing_fields") {
      // Prepare email verification
      if (!hasPreparedRef.current) {
        hasPreparedRef.current = true;
        signUp.prepareEmailAddressVerification({ strategy: "email_code" })
          .then(() => {
            console.log("✅ Successfully prepared sign-up email verification");
          })
          .catch((err: any) => {
            console.error("Error preparing email verification:", err);
            const errorMsg = err.errors?.[0]?.message || err.message || "";
            if (errorMsg.toLowerCase().includes("already") || 
                errorMsg.toLowerCase().includes("prepared") ||
                errorMsg.toLowerCase().includes("pending")) {
              console.log("ℹ️ Already prepared - email should have been sent");
            } else {
              hasPreparedRef.current = false;
              setError(errorMsg || "Failed to send verification code");
            }
          });
      }
    }
  }, [visible, signUpHook.isLoaded, signUpHook.signUp?.status]);

  // Handle native OTP autofill
  const handleAutofill = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 6).split("");
    const newDigits = [...codeDigits];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newDigits[index] = digit;
      }
    });
    setCodeDigits(newDigits);
    // Focus last filled box or verify button
    const lastFilledIndex = digits.length - 1;
    if (lastFilledIndex < 5) {
      inputRefs.current[lastFilledIndex + 1]?.focus();
    } else {
      inputRefs.current[5]?.blur();
    }
  };

  // Handle digit input
  const handleDigitChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    const newDigits = [...codeDigits];
    
    // Handle paste - if we get multiple digits (paste operation)
    if (numericValue.length > 1) {
      // Split the pasted value across boxes starting from current index
      const digits = numericValue.slice(0, 6).split("");
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newDigits[index + i] = digit;
        }
      });
      setCodeDigits(newDigits);
      // Focus the last filled box or blur if all 6 are filled
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      if (lastFilledIndex < 5) {
        inputRefs.current[lastFilledIndex + 1]?.focus();
      } else {
        inputRefs.current[5]?.blur();
      }
    } else if (numericValue.length === 1) {
      // Single digit input
      newDigits[index] = numericValue;
      setCodeDigits(newDigits);
      // Move to next box
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else {
        inputRefs.current[index]?.blur();
      }
    } else {
      // Backspace - clear current and move to previous
      newDigits[index] = "";
      setCodeDigits(newDigits);
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle key press for backspace
  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && codeDigits[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onVerifyPress = useCallback(async (codeToVerify?: string) => {
    if (!signUpHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    // Use provided code or fall back to state
    const verificationCode = codeToVerify || code;
    
    // Validate code is present and 6 digits
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code.");
      return;
    }

    // Prevent duplicate verification attempts
    if (isVerifyingRef.current) {
      return; // Already verifying
    }

    // Check if we already verified this exact code
    if (lastVerifiedCodeRef.current === verificationCode) {
      return; // Already verified this code
    }

    // Check if sign-up is already complete
    const signUp = signUpHook.signUp;
    if (signUp && signUp.status === "complete") {
      // Already verified, just navigate
      onClose();
      router.replace("/(auth)/create-profile");
      return;
    }

    setError("");
    setLoading(true);
    isVerifyingRef.current = true;
    lastVerifiedCodeRef.current = verificationCode;

    try {
      if (!signUp) {
        setError("No sign-up attempt found. Please try again.");
        setLoading(false);
        isVerifyingRef.current = false;
        return;
      }

      // Log current status for debugging
      console.log("🔍 Sign-up status before verification:", signUp.status);
      console.log("🔍 Verification code length:", verificationCode.length);
      console.log("🔍 Verification code:", verificationCode);

      // Attempt verification - Clerk will handle the status check
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      
      console.log("🔍 Return value - Status:", completeSignUp.status);
      // Mask session ID for security (only show first 8 chars in dev)
      if (__DEV__ && completeSignUp.createdSessionId) {
        console.log("🔍 Return value - Created session ID:", `${completeSignUp.createdSessionId.substring(0, 8)}...`);
      }
      // Mask user ID for security (only show first 8 chars in dev)
      if (__DEV__ && completeSignUp.createdUserId) {
        console.log("🔍 Return value - Created user ID:", `${completeSignUp.createdUserId.substring(0, 8)}...`);
      }
      console.log("🔍 Return value - Missing fields:", completeSignUp.missingFields);
      console.log("🔍 Return value - Unverified fields:", completeSignUp.unverifiedFields);
      
      // Also check the updated signUp object from the hook
      const updatedSignUp = signUpHook.signUp;
      if (updatedSignUp) {
        console.log("🔍 Hook signUp - Status:", updatedSignUp.status);
        // Mask session ID for security
        if (__DEV__ && updatedSignUp.createdSessionId) {
          console.log("🔍 Hook signUp - Created session ID:", `${updatedSignUp.createdSessionId.substring(0, 8)}...`);
        }
        // Mask user ID for security
        if (__DEV__ && updatedSignUp.createdUserId) {
          console.log("🔍 Hook signUp - Created user ID:", `${updatedSignUp.createdUserId.substring(0, 8)}...`);
        }
        
        // Check email verification status
        const emailVerification = updatedSignUp.verifications?.emailAddress;
        if (emailVerification) {
          console.log("🔍 Email verification status:", emailVerification.status);
          console.log("🔍 Email verification error:", emailVerification.error);
          
          // If there's an error, throw it
          if (emailVerification.error) {
            const errorMsg = emailVerification.error.message || 
                           emailVerification.error.toString() || 
                           "Invalid verification code";
            throw new Error(errorMsg);
          }
          
          // If verification failed (not verified)
          if (emailVerification.status !== "verified") {
            throw new Error("Verification code is incorrect or has expired. Please try again.");
          }
        }
      }
      
      // Use session ID from return value (like old verify.tsx) or from hook
      const sessionId = completeSignUp.createdSessionId || updatedSignUp?.createdSessionId;
      
      // Check if email is verified (unverifiedFields should be empty)
      const emailIsVerified = (completeSignUp.unverifiedFields?.length === 0 || 
                               completeSignUp.unverifiedFields === undefined) &&
                              (updatedSignUp?.unverifiedFields?.length === 0 || 
                               updatedSignUp?.unverifiedFields === undefined);
      
      // If email is verified and we have a session ID, proceed
      if (emailIsVerified && sessionId) {
        console.log("✅ Email verification successful! Setting active session...");
        await signUpHook.setActive({ session: sessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        onClose();
        router.replace("/(auth)/create-profile");
      } else if (completeSignUp.status === "complete" && sessionId) {
        // Status is complete - proceed normally
        console.log("✅ Sign-up complete! Setting active session...");
        await signUpHook.setActive({ session: sessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        onClose();
        router.replace("/(auth)/create-profile");
      } else {
        // Email verified but no session ID - check if we need to provide first_name/last_name
        console.error("⚠️ Email verified but no session ID");
        console.error("⚠️ Return status:", completeSignUp.status);
        console.error("⚠️ Return session ID:", completeSignUp.createdSessionId);
        console.error("⚠️ Hook session ID:", updatedSignUp?.createdSessionId);
        console.error("⚠️ Missing fields:", completeSignUp.missingFields);
        
        // If first_name/last_name are the only missing fields, we might need to provide them
        // But according to Clerk docs, these shouldn't be required for session creation
        // Let's check if there's a createdUserId we can use
        if (updatedSignUp?.createdUserId && __DEV__) {
          const maskedUserId = `${updatedSignUp.createdUserId.substring(0, 8)}...`;
          console.log("🔍 Found created user ID, but no session. This might be a Clerk configuration issue. User ID:", maskedUserId);
        }
        
        throw new Error("Verification succeeded but no session was created. This may be due to missing required fields in your Clerk configuration. Please check your Clerk dashboard settings.");
      }
    } catch (err: any) {
      // Log error details without JSON.stringify to avoid circular reference errors
      console.error("Error type:", typeof err);
      console.error("Error message:", err?.message);
      console.error("Error toString:", err?.toString?.());
      if (err?.errors) {
        console.error("Error errors array:", err.errors);
      }
      if (err?.status) {
        console.error("Error status:", err.status);
      }
      
      // Better error message extraction - try multiple paths
      let errorMessage = "Invalid verification code. Please try again.";
      
      // Try different error message paths
      if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        const firstError = err.errors[0];
        errorMessage = firstError?.message || firstError?.longMessage || firstError?.code || errorMessage;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.longMessage) {
        errorMessage = err.longMessage;
      } else if (err?.code) {
        errorMessage = err.code;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err?.toString && err.toString() !== "[object Object]") {
        errorMessage = err.toString();
      }
      
      // Clean up the error message
      if (errorMessage && typeof errorMessage === "string") {
        // Remove common prefixes
        errorMessage = errorMessage.replace(/^\[e:\s*/i, "").replace(/\]$/, "").trim();
        
        // Handle specific error cases
        if (errorMessage.toLowerCase().includes("too many") || errorMessage.toLowerCase().includes("rate limit")) {
          errorMessage = "Too many requests. Please try again in a bit.";
        } else if (errorMessage.toLowerCase().includes("expired")) {
          errorMessage = "Verification code has expired. Please request a new one.";
        } else if (errorMessage.toLowerCase().includes("incorrect") || errorMessage.toLowerCase().includes("invalid")) {
          errorMessage = "Invalid verification code. Please check and try again.";
        } else if (errorMessage.toLowerCase().includes("already been verified")) {
          errorMessage = "This code has already been used. Please request a new one.";
        } else if (errorMessage.length === 0 || errorMessage === "[e]") {
          errorMessage = "Verification failed. Please check your code and try again.";
        }
      }
      
      setError(errorMessage);
      console.error("Error verifying sign-up - final message:", errorMessage);
      lastVerifiedCodeRef.current = ""; // Reset on error so they can retry
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  }, [signUpHook.isLoaded, signUpHook.signUp, code, onClose]);

  const onResendCode = async () => {
    if (!signUpHook.isLoaded) return;

    setError("");
    setLoading(true);

    try {
      const signUp = signUpHook.signUp;
      if (!signUp) return;
      
      // Reset the prepared ref so we can resend
      hasPreparedRef.current = false;
      
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      hasPreparedRef.current = true;
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to resend code";
      setError(errorMessage);
      console.error("Error resending code:", err);
      hasPreparedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = signUpHook.signUp;
  if (!signUp || !visible) {
    return null;
  }

  const needsVerification = signUp.status === "missing_requirements" || 
                           signUp.status === "missing_fields";

  if (!needsVerification) {
    return null;
  }

  const displayEmail = emailAddress || signUp.emailAddress || "your email";

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight={true}>
      {/* Header - Standard pattern */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Verify Email
        </Text>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Enter the verification code sent to {displayEmail}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            Verification Code
          </Text>
          
          {/* Hidden input for native OTP autofill */}
          <BottomSheetTextInput
            ref={(ref) => {
              hiddenInputRef.current = ref as any;
            }}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleAutofill}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus={false}
            editable={true}
            maxLength={6}
            caretHidden={true}
          />

          {/* 6 individual OTP boxes */}
          <View style={styles.otpContainer}>
            {codeDigits.map((digit, index) => (
              <BottomSheetTextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref as any;
                }}
                style={[
                  styles.otpBox,
                  {
                    borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                  },
                  digit && styles.otpBoxFilled,
                ]}
                value={digit}
                onChangeText={(value) => handleDigitChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="numeric"
                maxLength={6}
                editable={!loading}
                selectTextOnFocus={true}
                returnKeyType={index === 5 ? "done" : "next"}
                onSubmitEditing={() => {
                  if (index < 5) {
                    inputRefs.current[index + 1]?.focus();
                  } else {
                    inputRefs.current[index]?.blur();
                    // Don't auto-verify on submit - user must click verify button
                  }
                }}
              />
            ))}
          </View>
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
          onPress={() => onVerifyPress()}
          disabled={!code || code.length !== 6 || loading}
          style={[
            styles.verifyButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: (!code || code.length !== 6 || loading) ? 0.5 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        {/* Resend Code */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={onResendCode}
            disabled={loading}
            style={styles.footerButton}
          >
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Resend Code
            </Text>
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
    marginBottom: 12,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
    fontSize: 1,
    pointerEvents: "none",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    paddingHorizontal: 0,
  },
  otpBoxFilled: {
    borderWidth: 2,
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 8,
  },
  footerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

