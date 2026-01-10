import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import { BottomSheet } from "./BottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextInput as RNTextInput } from "react-native";
import { Dimensions } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface EmailVerificationModalProps {
  visible: boolean;
  emailAddress: any; // The Clerk EmailAddress object to verify
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isVerifying?: boolean;
}

export function EmailVerificationModal({
  visible,
  emailAddress,
  onConfirm,
  onCancel,
  isVerifying = false,
}: EmailVerificationModalProps) {
  const { theme } = useTheme();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<any>(null);
  const hasPreparedRef = useRef(false);
  const hasVerifiedRef = useRef(false);
  const isPreparingRef = useRef(false); // Track if we're currently preparing (to prevent concurrent calls)
  const preparedEmailIdRef = useRef<string | null>(null); // Track which email ID we've prepared for
  const sendVerificationCodeRef = useRef<(() => Promise<void>) | null>(null); // Store latest sendVerificationCode
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const hiddenInputRef = useRef<RNTextInput | null>(null);
  
  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Send email verification code
  const sendVerificationCode = useCallback(async () => {
    if (!emailAddress || !user) {
      console.log("sendVerificationCode: Missing emailAddress or user");
      isPreparingRef.current = false;
      setIsSendingCode(false);
      return;
    }

    // Don't prepare if already preparing
    if (isPreparingRef.current) {
      console.log("sendVerificationCode: Already preparing, skipping");
      return;
    }

    // Check if this email is already the primary email
    if (user.primaryEmailAddressId === emailAddress.id) {
      console.log("Email is already primary - verification complete");
      setVerification(emailAddress);
      setCodeSent(true);
      hasPreparedRef.current = true;
      preparedEmailIdRef.current = emailAddress.id;
      isPreparingRef.current = false;
      setIsSendingCode(false);
      return;
    }

    // Check if verification already exists with valid status
    if (emailAddress.verification) {
      const existingStatus = (emailAddress.verification as any)?.status;
      console.log("Found existing verification with status:", existingStatus);
      
      if (existingStatus === "verified" || existingStatus === "unverified") {
        console.log("Using existing verification");
        setVerification(emailAddress);
        setCodeSent(true);
        hasPreparedRef.current = true;
        preparedEmailIdRef.current = emailAddress.id;
        isPreparingRef.current = false;
        setIsSendingCode(false);
        return;
      }
    }

    // Prepare verification
    try {
      isPreparingRef.current = true;
      setIsSendingCode(true);
      setError("");

      console.log("Preparing verification for email:", emailAddress.emailAddress);
      const verificationObj = await emailAddress.prepareVerification({ strategy: "email_code" });
      console.log("Verification prepared successfully:", verificationObj);
      
      if (verificationObj) {
        // Reload user to get fresh emailAddress with verification
        await user.reload();
        const freshEmailAddress = user.emailAddresses?.find(e => e.id === emailAddress.id);
        const emailToUse = freshEmailAddress || verificationObj;
        
        const verifStatus = emailToUse.verification?.status;
        console.log("Verification status after prepareVerification:", verifStatus);
        
        setVerification(emailToUse);
        setCodeSent(true);
        hasPreparedRef.current = true;
        preparedEmailIdRef.current = emailAddress.id;
        isPreparingRef.current = false;
        setIsSendingCode(false);
      } else {
        throw new Error("Failed to create verification");
      }
    } catch (prepareError: any) {
      console.error("Error preparing verification:", prepareError);
      isPreparingRef.current = false;
      
      // Better error message extraction
      let errorMsg = "";
      if (prepareError.errors && Array.isArray(prepareError.errors) && prepareError.errors.length > 0) {
        errorMsg = prepareError.errors[0].message || prepareError.errors[0].code || "";
      } else if (prepareError.message) {
        errorMsg = prepareError.message;
      } else {
        errorMsg = "Failed to send verification code";
      }
      
      const errorString = errorMsg.toLowerCase();
      
      // Check if verification was already prepared (common case)
      try {
        await user.reload();
        const updatedEmailAddress = user.emailAddresses?.find(e => e.id === emailAddress.id);
        if (updatedEmailAddress?.verification) {
          const status = (updatedEmailAddress.verification as any)?.status;
          if (status === "unverified" || status === "verified") {
            console.log("Found existing verification after error - using it");
            setVerification(updatedEmailAddress);
            setCodeSent(true);
            hasPreparedRef.current = true;
            preparedEmailIdRef.current = emailAddress.id;
            setIsSendingCode(false);
            return;
          }
        }
      } catch (reloadError) {
        console.error("Error reloading user:", reloadError);
      }
      
      // Handle rate limiting
      if (errorString.includes("too many") || errorString.includes("rate limit")) {
        setError("Too many requests. Please try again in a bit, or use 'Resend Code' if you received a code earlier.");
      } else if (errorString.includes("already") || errorString.includes("prepared")) {
        setError("Verification already prepared. Please check for the code or use 'Resend Code'.");
      } else {
        setError(errorMsg || "Failed to send verification code. Please try again.");
      }
      setCodeSent(false);
      setIsSendingCode(false);
    }
  }, [emailAddress, user]);

  // Store latest sendVerificationCode in ref so useEffect can use it without causing re-runs
  useEffect(() => {
    sendVerificationCodeRef.current = sendVerificationCode;
  }, [sendVerificationCode]);

  // Reset state when modal opens/closes OR when emailAddress changes
  useEffect(() => {
    if (!visible || !emailAddress || !user) {
      setCode("");
      setCodeDigits(["", "", "", "", "", ""]);
      setCodeSent(false);
      setError("");
      setVerification(null);
      hasPreparedRef.current = false;
      hasVerifiedRef.current = false;
      isPreparingRef.current = false;
      preparedEmailIdRef.current = null;
      return;
    }

    // RESET ALL refs when emailAddress ID changes (new email to verify)
    const currentEmailId = emailAddress.id;
    if (preparedEmailIdRef.current !== null && preparedEmailIdRef.current !== currentEmailId) {
      console.log("Email address ID changed - resetting all preparation state");
      hasPreparedRef.current = false;
      isPreparingRef.current = false;
      preparedEmailIdRef.current = null;
    }

    // If already prepared for this exact email ID with valid verification, use it
    if (preparedEmailIdRef.current === currentEmailId && emailAddress.verification) {
      const existingStatus = (emailAddress.verification as any)?.status;
      if (existingStatus === "unverified" || existingStatus === "verified") {
        console.log("Already prepared for this email - using existing verification");
        setVerification(emailAddress);
        setCodeSent(true);
        hasPreparedRef.current = true;
        setCode("");
        setCodeDigits(["", "", "", "", "", ""]);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 200);
        return;
      }
    }

    // Check if email is already primary
    if (user.primaryEmailAddressId === currentEmailId) {
      console.log("Email is already primary - verification complete");
      setCodeSent(true);
      setVerification(emailAddress);
      hasPreparedRef.current = true;
      preparedEmailIdRef.current = currentEmailId;
      return;
    }

    // Check if verification already exists with valid status
    if (emailAddress.verification) {
      const existingStatus = (emailAddress.verification as any)?.status;
      if (existingStatus === "unverified" || existingStatus === "verified") {
        console.log("Verification already exists - using it");
        setVerification(emailAddress);
        setCodeSent(true);
        hasPreparedRef.current = true;
        preparedEmailIdRef.current = currentEmailId;
        setCode("");
        setCodeDigits(["", "", "", "", "", ""]);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 200);
        return;
      }
    }

    // Don't prepare if already preparing or already prepared for this email
    if (isPreparingRef.current || preparedEmailIdRef.current === currentEmailId) {
      console.log("Already preparing or prepared - skipping");
      return;
    }
    
    // Reset state for new preparation
    setCode("");
    setCodeDigits(["", "", "", "", "", ""]);
    setCodeSent(false);
    setError("");
    setVerification(null);
    hasVerifiedRef.current = false;
    
    // Delay sending code to allow sheet to render first
    const timer = setTimeout(async () => {
      if (!user || !emailAddress || user.primaryEmailAddressId === emailAddress.id) {
        return;
      }

      const sendCode = sendVerificationCodeRef.current;
      if (sendCode) {
        try {
          await sendCode();
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 200);
        } catch (error) {
          console.error("Error preparing verification:", error);
          isPreparingRef.current = false;
          if (preparedEmailIdRef.current === emailAddress.id) {
            preparedEmailIdRef.current = null;
            hasPreparedRef.current = false;
          }
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, emailAddress?.id, user?.id]);

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

  // Handle digit input - matching IdentityVerificationModal exactly
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

  const handleConfirm = useCallback(async (codeToVerify?: string) => {
    if (!emailAddress || !user) return;

    // Use provided code or fall back to state
    const verificationCode = codeToVerify || code;
    
    // Validate code is present and 6 digits
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code.");
      return;
    }

    // Prevent duplicate verification attempts
    if (hasVerifiedRef.current || isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      console.log("Attempting verification with code:", verificationCode);

      // If no verification object, try to get it from the emailAddress
      let verificationToUse = verification;
      if (!verificationToUse) {
        // Reload user to get latest emailAddress state
        await user.reload();
        const updatedEmailAddress = user.emailAddresses?.find(e => e.id === emailAddress.id);
        if (updatedEmailAddress?.verification) {
          console.log("Using verification from updated emailAddress object");
          verificationToUse = updatedEmailAddress;
        } else if (emailAddress.verification) {
          console.log("Using verification from emailAddress object");
          verificationToUse = emailAddress;
        } else {
          // Try to prepare verification again (might have been rate-limited before)
          console.log("No verification found. Attempting to prepare verification...");
          try {
            const newVerification = await emailAddress.prepareVerification({ strategy: "email_code" });
            if (newVerification) {
              verificationToUse = newVerification;
              setVerification(newVerification);
            }
          } catch (prepError: any) {
            console.error("Error preparing verification:", prepError);
          }
        }
      }

      if (!verificationToUse) {
        console.error("No verification found. Please request a new code.");
        setError("Verification code has expired. Please request a new code using the 'Resend Code' button.");
        setIsLoading(false);
        return;
      }

      // Check if the verification is already verified (this can happen if email is auto-verified)
      const verificationStatus = verificationToUse.verification?.status || verificationToUse.status;
      console.log("Verification status before attempting:", verificationStatus);
      
      if (verificationStatus === "verified") {
        console.log("Verification already verified - Clerk may have auto-verified this email. Proceeding with email confirmation.");
        hasVerifiedRef.current = true;
        await onConfirm();
        return;
      }
      
      // If verification status is null, we need to prepare verification first
      if (!verificationStatus || verificationStatus === null) {
        console.log("Verification status is null, preparing verification first...");
        try {
          const preparedVerification = await emailAddress.prepareVerification({ strategy: "email_code" });
          if (preparedVerification) {
            verificationToUse = preparedVerification;
            setVerification(preparedVerification);
            console.log("Verification prepared successfully");
          } else {
            throw new Error("Failed to prepare verification");
          }
        } catch (prepError: any) {
          console.error("Error preparing verification in handleConfirm:", prepError);
          const prepErrorMessage = prepError.errors?.[0]?.message || prepError.message || "Failed to prepare verification";
          setError(prepErrorMessage || "Please request a new code using the 'Resend Code' button.");
          setIsLoading(false);
          hasVerifiedRef.current = false;
          return;
        }
      }
      
      // Check if the verification is unverified or expired - if so, we need a code
      if (verificationStatus === "unverified" || verificationStatus === "expired") {
        // Need to verify with code - proceed below
      }
      
      hasVerifiedRef.current = true;

      // Attempt verification with code using the verification object
      // The verification object might be an EmailAddress (if using emailAddress directly) or a VerificationResource
      try {
        // If verificationToUse is an EmailAddress, we need to use its verification property
        let result;
        if (verificationToUse.attemptVerification) {
          // It's a VerificationResource or EmailAddress with attemptVerification method
          result = await verificationToUse.attemptVerification({ code: verificationCode });
        } else if (verificationToUse.verification?.attemptVerification) {
          // It's an EmailAddress, use the nested verification
          result = await verificationToUse.verification.attemptVerification({ code: verificationCode });
        } else {
          // Fallback: try using the emailAddress directly
          if (emailAddress?.attemptVerification) {
            result = await emailAddress.attemptVerification({ code: verificationCode });
          } else {
            throw new Error("Unable to verify - invalid verification state");
          }
        }
        console.log("Verification result:", result);
        
        const resultStatus = result.status || result.verification?.status;
        if (resultStatus === "verified") {
          console.log("Verification successful!");
          hasVerifiedRef.current = true;
          await onConfirm();
          return;
        } else {
          hasVerifiedRef.current = false;
          throw new Error(`Verification failed with status: ${resultStatus}`);
        }
      } catch (verifyError: any) {
        console.error("Verification error details:", verifyError);
        const errorMessage = verifyError.errors?.[0]?.message || verifyError.message || "";
        const errorCode = verifyError.errors?.[0]?.code;
        
        // Only proceed if verification is explicitly already verified
        if (errorCode === "verification_already_verified" || 
            errorMessage.includes("already been verified") ||
            errorMessage.includes("already verified") ||
            errorMessage.includes("This verification has already been verified")) {
          console.log("Verification already verified, proceeding with onConfirm");
          hasVerifiedRef.current = true;
          await onConfirm();
          return;
        } else {
          // For any other error (invalid code, expired, etc.), show the error
          hasVerifiedRef.current = false;
          console.error("Verification failed:", errorMessage);
          throw verifyError;
        }
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      
      let errorMessage = error.errors?.[0]?.message || error.message || "";
      
      // Clean up the error message
      if (errorMessage && typeof errorMessage === "string") {
        if (errorMessage.toLowerCase().includes("too many") || errorMessage.toLowerCase().includes("rate limit")) {
          errorMessage = "Too many requests. Please try again in a bit.";
        } else if (errorMessage.toLowerCase().includes("expired")) {
          errorMessage = "Verification code has expired. Please request a new one.";
        } else if (errorMessage.toLowerCase().includes("incorrect") || errorMessage.toLowerCase().includes("invalid")) {
          errorMessage = "Invalid verification code. Please check and try again.";
        } else if (errorMessage.toLowerCase().includes("already been verified")) {
          errorMessage = "This code has already been used. Please request a new one.";
        }
      }
      
      hasVerifiedRef.current = false;
      setError(errorMessage || "Invalid verification code. Please try again.");
      setCode("");
      setCodeDigits(["", "", "", "", "", ""]);
    } finally {
      setIsLoading(false);
    }
  }, [emailAddress, user, code, verification, onConfirm]);

  const onResendCode = async () => {
    if (!emailAddress || !user) return;

    setError("");
    setIsSendingCode(true);
    // Don't reset preparedEmailIdRef here - we're resending for the same email
    // Just prepare verification again (which will create a new verification object)
    hasPreparedRef.current = false;

    try {
      const verificationObj = await emailAddress.prepareVerification({ strategy: "email_code" });
      if (verificationObj) {
        setVerification(verificationObj);
        setCodeSent(true);
        hasPreparedRef.current = true;
        preparedEmailIdRef.current = emailAddress.id; // Track which email we prepared
        setCode("");
        setCodeDigits(["", "", "", "", "", ""]);
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to resend code";
      setError(errorMessage);
      console.error("Error resending code:", err);
      // If resend fails, don't reset preparedEmailIdRef - we might still have a valid verification
      // Only reset if there's no existing verification
      if (!emailAddress.verification) {
        hasPreparedRef.current = false;
        preparedEmailIdRef.current = null;
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  // Sync code from digits array and auto-verify when complete
  useEffect(() => {
    const combinedCode = codeDigits.join("");
    setCode(combinedCode);
    
    // Auto-verify when all 6 digits are entered, code is sent, verification is ready, and we're not already verifying
    if (combinedCode.length === 6 && 
        codeSent && 
        verification && // Make sure verification object is set
        !isLoading && 
        !isSendingCode &&
        !isVerifying && 
        !hasVerifiedRef.current) {
      // Small delay to ensure state is updated and verification is ready
      const timer = setTimeout(() => {
        handleConfirm(combinedCode);
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [codeDigits, codeSent, verification, isLoading, isSendingCode, isVerifying, handleConfirm]);

  const handleCancel = () => {
    setCode("");
    setCodeDigits(["", "", "", "", "", ""]);
    setCodeSent(false);
    setError("");
    setVerification(null);
    hasPreparedRef.current = false;
    hasVerifiedRef.current = false;
    isPreparingRef.current = false;
    preparedEmailIdRef.current = null;
    onCancel();
  };

  if (!emailAddress || !user) {
    return null;
  }

  const email = emailAddress.emailAddress || "";

  return (
    <BottomSheet 
      visible={visible} 
      onClose={handleCancel} 
      autoHeight={true}
      maxHeight={SCREEN_HEIGHT * 0.8}
      keyboardBehavior="extend"
      enablePanDownToClose={true}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      stackBehavior="switch"
    >
      {/* Header - Title with action button on right (matching IdentityVerificationModal pattern) */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Verify Your Email
        </Text>
        <TouchableOpacity
          onPress={() => handleConfirm()}
          disabled={!code || code.length !== 6 || isLoading || isVerifying || !codeSent}
          activeOpacity={0.6}
          style={styles.headerButton}
        >
          {isLoading || isVerifying ? (
            <ActivityIndicator 
              size="small" 
              color={(!code || code.length !== 6 || isLoading || isVerifying || !codeSent)
                ? theme.colors.textSecondary
                : theme.colors.primary} 
            />
          ) : (
            <Text style={[
              styles.headerButtonText,
              {
                color: (!code || code.length !== 6 || isLoading || isVerifying || !codeSent)
                  ? theme.colors.textSecondary
                  : theme.colors.primary,
              }
            ]}>
              Verify
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Enter the verification code sent to {email}
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
                selectTextOnFocus={true}
                editable={codeSent && !isLoading && !isSendingCode && !isVerifying}
                returnKeyType={index === 5 ? "done" : "next"}
                onSubmitEditing={() => {
                  if (index < 5) {
                    inputRefs.current[index + 1]?.focus();
                  } else {
                    inputRefs.current[index]?.blur();
                    handleConfirm();
                  }
                }}
              />
            ))}
          </View>
        </View>

        {error ? (
          <View style={[styles.errorContainer, { 
            backgroundColor: theme.isDark ? "rgba(239, 83, 80, 0.15)" : "rgba(239, 83, 80, 0.1)",
            borderColor: "rgba(239, 83, 80, 0.3)",
          }]}>
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

        {/* Resend Code */}
        {codeSent && !isSendingCode && (
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={onResendCode}
              disabled={isLoading || isVerifying}
              style={styles.footerButton}
            >
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isSendingCode && (
          <View style={styles.footerRow}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            <Text style={[styles.footerText, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
              Sending code...
            </Text>
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

