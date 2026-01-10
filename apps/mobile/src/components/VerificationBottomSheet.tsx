import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { BottomSheet } from "./BottomSheet";
import { useSignIn } from "@clerk/clerk-expo";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { TextInput as RNTextInput } from "react-native";

interface VerificationBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onPasswordResetNeeded?: () => void;
}

export function VerificationBottomSheet({
  visible,
  onClose,
  onPasswordResetNeeded,
}: VerificationBottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const signInHook = useSignIn();
  const [code, setCode] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationType, setVerificationType] = useState<"email_code" | "totp" | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const hasPreparedRef = useRef(false);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const hiddenInputRef = useRef<RNTextInput | null>(null);
  
  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Sync code from digits array
  useEffect(() => {
    const combinedCode = codeDigits.join("");
    setCode(combinedCode);
    // Auto-verify if 6 digits are entered
    if (combinedCode.length === 6 && !loading) {
      // Small delay to ensure state is updated, then verify with the combined code
      setTimeout(() => {
        onVerifyPress(combinedCode);
      }, 100);
    }
  }, [codeDigits, loading, onVerifyPress]);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      setCode("");
      setCodeDigits(["", "", "", "", "", ""]);
      setError("");
      // Reset prepared ref when sheet opens so preparation always runs
      // This ensures email is sent every time the sheet opens
      hasPreparedRef.current = false;
      // Focus first input after a small delay
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [visible]);

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
    // This can happen when user pastes into any box
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

  // Prepare verification code sending - only once
  useEffect(() => {
    if (!visible || !signInHook.isLoaded || hasPreparedRef.current) {
      return;
    }

    const signIn = signInHook.signIn;
    if (!signIn) return;

    console.log("🔍 Verification Sheet - Sign-in status:", signIn.status);
    console.log("🔍 Supported first factors:", signIn.supportedFirstFactors);
    console.log("🔍 Supported second factors:", signIn.supportedSecondFactorStrategies);
    
    // Check if this is a password reset flow
    const resetPasswordFactor = signIn.supportedFirstFactors?.find(
      (factor: any) => factor.strategy === "reset_password_email_code"
    ) as any;

    // Check if this is email verification (different from password reset)
    const emailCodeFactor = signIn.supportedFirstFactors?.find(
      (factor: any) => factor.strategy === "email_code"
    ) as any;

    if (signIn.status === "needs_first_factor") {
      if (resetPasswordFactor?.emailAddressId) {
        // Password reset flow - always prepare to ensure email is sent
        setVerificationType("email_code");
        const email = resetPasswordFactor.safeIdentifier || signIn.identifier;
        if (email) {
          setEmailAddress(email);
        }
        
        // Always prepare when sheet opens to ensure email is sent
        // Even if login.tsx already prepared it, we prepare again to ensure email is sent
        if (!hasPreparedRef.current) {
          hasPreparedRef.current = true;
          signIn.prepareFirstFactor({
            strategy: "reset_password_email_code",
            emailAddressId: resetPasswordFactor.emailAddressId,
          }).then(() => {
            console.log("✅ Successfully prepared password reset email code");
          }).catch((err: any) => {
            console.error("Error preparing password reset:", err);
            const errorMsg = err.errors?.[0]?.message || err.message || "";
            // If it says already prepared or similar, that's fine - email was already sent
            if (errorMsg.toLowerCase().includes("already") || 
                errorMsg.toLowerCase().includes("prepared") ||
                errorMsg.toLowerCase().includes("pending")) {
              console.log("ℹ️ Already prepared - email should have been sent");
              // Keep hasPreparedRef as true since preparation is effectively done
            } else {
              // Real error - reset ref and show error
              hasPreparedRef.current = false;
              setError(errorMsg || "Failed to send verification code");
            }
          });
        }
        return;
      } else if (emailCodeFactor?.emailAddressId) {
        // Email verification flow - prepare only if not already prepared
        if (!hasPreparedRef.current) {
          hasPreparedRef.current = true;
          setVerificationType("email_code");
          const email = emailCodeFactor.safeIdentifier || signIn.identifier;
          if (email) {
            setEmailAddress(email);
          }
          signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          }).then(() => {
            console.log("✅ Successfully prepared email verification");
          }).catch((err: any) => {
            console.error("Error preparing email verification:", err);
            hasPreparedRef.current = false;
          });
        }
        return;
      }
    }

    if (signIn.status === "needs_second_factor") {
      const email = signIn.identifier || signIn.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "email_code"
      )?.safeIdentifier;
      if (email) {
        setEmailAddress(email);
      }
      
      const availableStrategies = signIn.supportedSecondFactorStrategies || [];
      
      if (availableStrategies.length > 0) {
        const strategy = availableStrategies[0];
        setVerificationType(strategy === "totp" ? "totp" : "email_code");
        hasPreparedRef.current = true;
        
        signIn.prepareSecondFactor({ strategy })
          .then(() => {
            console.log(`✅ Successfully prepared ${strategy} as second factor`);
          })
          .catch((err: any) => {
            console.error(`❌ Error preparing ${strategy}:`, err);
            setError(err.errors?.[0]?.message || "Failed to prepare verification");
            hasPreparedRef.current = false;
          });
      }
    } else if (signIn.status === "needs_email_address_verification") {
      setVerificationType("email_code");
      const email = signIn.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "email_code"
      )?.safeIdentifier || signIn.identifier;
      if (email) {
        setEmailAddress(email);
      }
      
      if (!hasPreparedRef.current) {
        hasPreparedRef.current = true;
        signIn.prepareEmailAddressVerification({ strategy: "email_code" }).then(() => {
          console.log("✅ Successfully prepared email verification");
        }).catch((err: any) => {
          console.error("Error preparing email verification:", err);
          hasPreparedRef.current = false;
        });
      }
    }
  }, [visible, signInHook.isLoaded, signInHook.signIn?.status]);

  const onVerifyPress = useCallback(async (codeToVerify?: string) => {
    if (!signInHook.isLoaded) {
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

    setError("");
    setLoading(true);

    try {
      const signIn = signInHook.signIn;
      if (!signIn) {
        setError("No sign-in attempt found. Please try again.");
        return;
      }

      let completeSignIn;

      if (signIn.status === "needs_second_factor") {
        const availableStrategies = signIn.supportedSecondFactorStrategies || [];
        const strategy = verificationType === "totp" ? "totp" : 
                        verificationType === "email_code" ? "email_code" : 
                        availableStrategies[0] || "totp";
        
        completeSignIn = await signIn.attemptSecondFactor({
          strategy,
          code: verificationCode,
        });
      } else if (signIn.status === "needs_email_address_verification") {
        completeSignIn = await signIn.attemptEmailAddressVerification({
          code: verificationCode,
        });
      } else if (signIn.status === "needs_first_factor") {
        const resetPasswordFactor = signIn.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "reset_password_email_code"
        ) as any;
        const emailCodeFactor = signIn.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "email_code"
        ) as any;
        
        if (resetPasswordFactor) {
          // Password reset flow - use reset_password_email_code strategy
          completeSignIn = await signIn.attemptFirstFactor({
            strategy: "reset_password_email_code",
            code: verificationCode,
          });
        } else if (emailCodeFactor) {
          completeSignIn = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: verificationCode,
            emailAddressId: emailCodeFactor.emailAddressId,
          });
        } else {
          setError("Invalid verification state. Please try signing in again.");
          return;
        }
      } else {
        setError("Invalid verification state. Please try signing in again.");
        return;
      }

      if (completeSignIn.status === "complete") {
        await signInHook.setActive({ session: completeSignIn.createdSessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        onClose();
        router.replace("/");
      } else if (completeSignIn.status === "needs_new_password") {
        // Password reset code verified, now need to set new password
        // Close verification sheet and trigger password reset sheet
        onClose();
        onPasswordResetNeeded?.();
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Invalid verification code";
      setError(errorMessage);
      console.error("Error verifying sign-in:", err);
    } finally {
      setLoading(false);
    }
  }, [signInHook.isLoaded, signInHook.signIn, code, verificationType, onClose]);

  const onResendCode = async () => {
    if (!signInHook.isLoaded) return;

    setError("");
    setLoading(true);

    try {
      const signIn = signInHook.signIn;
      if (!signIn) return;
      
      // Reset the prepared ref so we can resend
      hasPreparedRef.current = false;
      
      if (signIn.status === "needs_email_address_verification") {
        await signIn.prepareEmailAddressVerification({ strategy: "email_code" });
        hasPreparedRef.current = true;
      } else if (signIn.status === "needs_second_factor") {
        const availableStrategies = signIn.supportedSecondFactorStrategies || [];
        if (availableStrategies.length > 0) {
          await signIn.prepareSecondFactor({ strategy: availableStrategies[0] });
          hasPreparedRef.current = true;
        }
      } else if (signIn.status === "needs_first_factor") {
        const resetPasswordFactor = signIn.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "reset_password_email_code"
        ) as any;
        const emailCodeFactor = signIn.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "email_code"
        ) as any;
        if (resetPasswordFactor?.emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: "reset_password_email_code",
            emailAddressId: resetPasswordFactor.emailAddressId,
          });
          hasPreparedRef.current = true;
        } else if (emailCodeFactor?.emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          hasPreparedRef.current = true;
        }
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to resend code";
      setError(errorMessage);
      console.error("Error resending code:", err);
      hasPreparedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const signIn = signInHook.signIn;
  if (!signIn || !visible) {
    return null;
  }

  const isPasswordReset = signIn.status === "needs_first_factor" && 
    signIn.supportedFirstFactors?.some(
      (factor: any) => factor.strategy === "reset_password_email_code"
    );
  const isTOTP2FA = signIn.status === "needs_second_factor" && verificationType === "totp";
  const isEmailBased2FA = signIn.status === "needs_second_factor" && verificationType === "email_code";
  
  const title = isPasswordReset
    ? "Reset Password"
    : isTOTP2FA
    ? "Two-Factor Authentication"
    : "Verify Email";
  
  const subtitle = isTOTP2FA
    ? "Enter the code from your authenticator app"
    : emailAddress
    ? `Enter the verification code sent to ${emailAddress}`
    : "Enter the verification code sent to your email";

  const canResend = signIn.status === "needs_email_address_verification" || 
                    isEmailBased2FA || 
                    isPasswordReset ||
                    (signIn.status === "needs_first_factor" && 
                     signIn.supportedFirstFactors?.some(
                       (factor: any) => factor.strategy === "email_code"
                     ));

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight={true} stackBehavior="switch">
      {/* Header - Standard pattern */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            {signIn.status === "needs_second_factor" ? "Authentication Code" : "Verification Code"}
          </Text>
          
          {/* Hidden input for native OTP autofill */}
          {/* This input is visually hidden but accessible to iOS/Android autofill */}
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
                selectTextOnFocus={true}
                returnKeyType={index === 5 ? "done" : "next"}
                onSubmitEditing={() => {
                  if (index < 5) {
                    inputRefs.current[index + 1]?.focus();
                  } else {
                    inputRefs.current[index]?.blur();
                    onVerifyPress();
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
          onPress={onVerifyPress}
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
        {canResend && (
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
        )}
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
    // Keep it in the layout but invisible for better autofill detection
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
  footerDivider: {
    width: 1,
    height: 16,
    opacity: 0.3,
    marginHorizontal: 8,
  },
});

