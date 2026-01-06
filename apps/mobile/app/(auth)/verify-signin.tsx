import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "@/components/Text";
import { useSignIn } from "@clerk/clerk-expo";
import { useState, useEffect, useRef } from "react";
import { router } from "expo-router";
import { Button, Input, SafeAreaView } from "@/components/ui";

export default function VerifySignInScreen() {
  const signInHook = useSignIn();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationType, setVerificationType] = useState<"email_code" | "totp" | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const hasPreparedRef = useRef(false); // Track if we've already prepared verification

  useEffect(() => {
    if (!signInHook.isLoaded || hasPreparedRef.current) {
      return; // Don't prepare multiple times
    }

    // Determine what type of verification is needed
    const signIn = signInHook.signIn;
    
    console.log("🔍 Verification Screen - Sign-in status:", signIn.status);
    console.log("🔍 Supported second factor strategies:", signIn.supportedSecondFactorStrategies);
    console.log("🔍 Supported first factors:", signIn.supportedFirstFactors);
    console.log("🔍 Sign-in identifier:", signIn.identifier);
    // Note: Can't stringify signIn object due to circular references
    
    if (signIn.status === "needs_second_factor") {
      // Try to get email address from the sign-in object
      const email = signIn.identifier || signIn.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "email_code"
      )?.safeIdentifier;
      if (email) {
        setEmailAddress(email);
      }
      
      // Check if there are any second factor strategies available
      const availableStrategies = signIn.supportedSecondFactorStrategies || [];
      
      if (!hasPreparedRef.current) {
        hasPreparedRef.current = true;
        
        // If no strategies are explicitly available, this might be a configuration issue
        // But we should still try to prepare to see if Clerk can determine one
        if (availableStrategies.length === 0) {
          console.log("⚠️ No second factor strategies found. This might indicate 2FA is not properly configured.");
          console.log("📧 Attempting to prepare second factor to see if Clerk can determine available methods...");
          
          // Try to prepare with a common strategy first (totp is most common)
          // If that fails, we'll show an error
          signIn.prepareSecondFactor({ strategy: "totp" })
            .then((preparedSignIn) => {
              console.log("✅ Successfully prepared TOTP as second factor");
              const strategies = preparedSignIn.supportedSecondFactorStrategies || [];
              if (strategies.length > 0) {
                setVerificationType("totp");
                console.log(`✅ Using ${strategies[0]} as second factor`);
              } else {
                setVerificationType("totp"); // Default to TOTP if preparation succeeded
              }
            })
            .catch((err: any) => {
              // TOTP not available - this is expected, try email_code as fallback
              // Don't show this error to user as it's part of normal fallback flow
              console.log("ℹ️ TOTP not available, trying email_code as fallback...");
              
              // If TOTP fails, try email_code if it's available in first factors
              const hasEmailCode = signIn.supportedFirstFactors?.some(
                (factor: any) => factor.strategy === "email_code"
              );
              
              if (hasEmailCode) {
                signIn.prepareSecondFactor({ strategy: "email_code" })
                  .then(() => {
                    console.log("✅ Successfully prepared email_code as second factor");
                    setVerificationType("email_code");
                  })
                  .catch((err2: any) => {
                    console.error("❌ Error preparing email_code:", err2);
                    const errorMsg = err2.errors?.[0]?.message || "Failed to prepare verification";
                    setError(errorMsg);
                    hasPreparedRef.current = false;
                  });
              } else {
                setError("Your account requires two-factor authentication, but no 2FA method is configured. Please set up 2FA in your account settings.");
                hasPreparedRef.current = false;
              }
            });
        } else {
          // Strategies are available, use the first one
          const strategy = availableStrategies[0];
          console.log(`📧 Preparing second factor with strategy: ${strategy}`);
          setVerificationType(strategy === "totp" ? "totp" : "email_code");
          
          signIn.prepareSecondFactor({ strategy })
            .then(() => {
              console.log(`✅ Successfully prepared ${strategy} as second factor`);
            })
            .catch((err: any) => {
              console.error(`❌ Error preparing ${strategy}:`, err);
              const errorMsg = err.errors?.[0]?.message || err.message || "Failed to prepare verification";
              setError(errorMsg);
              hasPreparedRef.current = false;
            });
        }
      }
    } else if (signIn.status === "needs_email_address_verification") {
      setVerificationType("email_code");
      console.log("✅ Email address verification required");
      // Get the email address that needs verification
      const email = signIn.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "email_code"
      )?.safeIdentifier || signIn.identifier;
      if (email) {
        setEmailAddress(email);
      }
      
      // Prepare email verification - only once
      if (!hasPreparedRef.current) {
        hasPreparedRef.current = true;
        signIn.prepareEmailAddressVerification({ strategy: "email_code" }).then(() => {
          console.log("✅ Successfully prepared email verification");
        }).catch((err: any) => {
          console.error("Error preparing email verification:", err);
          hasPreparedRef.current = false; // Reset on error
        });
      }
    } else if (signIn.status === "needs_first_factor") {
      // Check if this is a password reset flow
      const resetPasswordFactor = signIn.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "reset_password_email_code"
      ) as any;
      
      if (resetPasswordFactor && resetPasswordFactor.emailAddressId) {
        setVerificationType("email_code");
        console.log("✅ Password reset flow initiated");
        const email = resetPasswordFactor.safeIdentifier || signIn.identifier;
        if (email) {
          setEmailAddress(email);
        }
        
        // Prepare password reset verification - only once
        if (!hasPreparedRef.current) {
          hasPreparedRef.current = true;
          signIn.prepareFirstFactor({
            strategy: "reset_password_email_code",
            emailAddressId: resetPasswordFactor.emailAddressId,
          }).then(() => {
            console.log("✅ Successfully prepared password reset verification");
          }).catch((err: any) => {
            console.error("Error preparing password reset verification:", err);
            hasPreparedRef.current = false; // Reset on error
          });
        }
      }
    }
  }, [signInHook.isLoaded, signInHook.signIn?.status]);

  const onVerifyPress = async () => {
    if (!signInHook.isLoaded) {
      setError("Authentication is not ready. Please try again.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const signIn = signInHook.signIn;
      let completeSignIn;

      if (signIn.status === "needs_second_factor") {
        // Handle 2FA/MFA
        // Get available strategies from the current signIn state
        const availableStrategies = signIn.supportedSecondFactorStrategies || [];
        let strategy: string;
        
        if (verificationType) {
          // Use the verification type we determined during preparation
          strategy = verificationType === "totp" ? "totp" : 
                    verificationType === "email_code" ? "email_code" : "phone_code";
        } else if (availableStrategies.length > 0) {
          // Use the first available strategy
          strategy = availableStrategies[0];
        } else {
          // Fallback: if no strategies are available, this shouldn't happen
          // but we'll try totp as a default
          console.warn("⚠️ No second factor strategies available, trying totp as fallback");
          strategy = "totp";
        }
        
        console.log("🔍 Attempting 2FA with strategy:", strategy);
        completeSignIn = await signIn.attemptSecondFactor({
          strategy,
          code,
        });
      } else if (signIn.status === "needs_email_address_verification") {
        // Handle email verification
        completeSignIn = await signIn.attemptEmailAddressVerification({
          code,
        });
      } else if (signIn.status === "needs_first_factor") {
        // Check if this is password reset
        const resetPasswordFactor = signIn.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "reset_password_email_code"
        );
        
        if (resetPasswordFactor) {
          // Handle password reset code verification
          completeSignIn = await signIn.attemptFirstFactor({
            strategy: "reset_password_email_code",
            code,
          });
        } else {
          setError("Invalid verification state. Please try signing in again.");
          router.replace("/(auth)/login");
          return;
        }
      } else {
        setError("Invalid verification state. Please try signing in again.");
        router.replace("/(auth)/login");
        return;
      }

      if (completeSignIn.status === "complete") {
        await signInHook.setActive({ session: completeSignIn.createdSessionId });
        // Small delay to ensure session is fully active before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        router.replace("/");
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
  };

  const onResendCode = async () => {
    if (!signInHook.isLoaded) return;

    setError("");
    setLoading(true);

    try {
      const signIn = signInHook.signIn;
      
      if (signIn.status === "needs_email_address_verification") {
        console.log("📧 Resending email verification code");
        await signIn.prepareEmailAddressVerification({ strategy: "email_code" });
        setError(""); // Clear any previous errors
      } else if (signIn.status === "needs_second_factor") {
        // Resend second factor code
        const availableStrategies = signIn.supportedSecondFactorStrategies || [];
        
        if (availableStrategies.length > 0) {
          // Use the first available strategy
          const strategy = availableStrategies[0];
          console.log(`📧 Resending ${strategy} code for 2FA`);
          await signIn.prepareSecondFactor({ strategy });
          setError(""); // Clear any previous errors
          hasPreparedRef.current = true; // Mark as prepared
        } else {
          // Try preparing without strategy to see what becomes available
          console.log("📧 Resending 2FA code (no strategy specified)");
          await signIn.prepareSecondFactor();
          setError(""); // Clear any previous errors
          hasPreparedRef.current = true; // Mark as prepared
        }
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || "Failed to resend code";
      setError(errorMessage);
      console.error("Error resending code:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!signInHook.isLoaded) {
    return null;
  }

  const signIn = signInHook.signIn;
  // Check if this is a password reset flow
  const isPasswordReset = signIn?.supportedFirstFactors?.some(
    (factor: any) => factor.strategy === "reset_password_email_code"
  );
  const needsVerification = signIn?.status === "needs_second_factor" || 
                            signIn?.status === "needs_email_address_verification" ||
                            (signIn?.status === "needs_first_factor" && isPasswordReset);

  // Handle redirect in useEffect to avoid state update during render
  useEffect(() => {
    if (signInHook.isLoaded && signIn && !needsVerification) {
      // If we're not in a verification state, redirect to login
      router.replace("/(auth)/login");
    }
  }, [signInHook.isLoaded, signIn?.status, needsVerification]);

  if (!signIn || !needsVerification) {
    return null;
  }

  // Determine if this is email-based 2FA or TOTP-based 2FA
  const isEmailBased2FA = signIn.status === "needs_second_factor" && 
                          (verificationType === "email_code" || 
                           signIn.supportedSecondFactorStrategies?.includes("email_code"));
  const isTOTP2FA = signIn.status === "needs_second_factor" && verificationType === "totp";
  
  const title = isTOTP2FA
    ? "Two-Factor Authentication" 
    : signIn.status === "needs_second_factor" && isEmailBased2FA
    ? "Verify Your Email"
    : "Verify Email";
  
  const subtitle = isTOTP2FA
    ? "Enter the code from your authenticator app"
    : emailAddress
    ? `Enter the verification code sent to ${emailAddress}`
    : "Enter the verification code sent to your email";

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={signIn.status === "needs_second_factor" ? "Authentication Code" : "Verification Code"}
              placeholder={signIn.status === "needs_second_factor" ? "Enter 6-digit code" : "Enter 6-digit code"}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title="Verify"
              onPress={onVerifyPress}
              loading={loading}
              disabled={!code || code.length !== 6}
              style={styles.button}
            />

            {(signIn.status === "needs_email_address_verification" || isEmailBased2FA) && (
              <Button
                title="Resend Code"
                onPress={onResendCode}
                variant="outline"
                disabled={loading}
                style={styles.button}
              />
            )}

            <Button
              title="Back to Sign In"
              onPress={() => router.replace("/(auth)/login")}
              variant="ghost"
              style={styles.button}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#86868B",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
});

