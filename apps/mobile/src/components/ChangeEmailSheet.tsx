import { useState, useEffect, useRef } from "react";
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
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";
import { EmailVerificationModal } from "./EmailVerificationModal";
import { EmailChangeSuccessSheet } from "./EmailChangeSuccessSheet";
import api from "@/services/api";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ChangeEmailSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangeEmailSheet({ visible, onClose, onSuccess }: ChangeEmailSheetProps) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const insets = useSafeAreaInsets();
  
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newEmailAddress, setNewEmailAddress] = useState<any>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEmailChangeComplete, setIsEmailChangeComplete] = useState(false); // Track if email change is complete
  const [showSuccessSheet, setShowSuccessSheet] = useState(false); // Track success sheet visibility
  const isCreatingEmailRef = useRef(false); // Prevent duplicate email creation

  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      // Only reset if verification modal is not showing and email change is not complete
      if (!showEmailVerification && !isEmailChangeComplete) {
        setNewEmail("");
        setEmailError("");
        setNewEmailAddress(null);
        setIsVerifying(false);
        setIsEmailChangeComplete(false);
        setShowSuccessSheet(false);
        isCreatingEmailRef.current = false;
      }
    } else {
      // When sheet closes, also close verification modal if it's open
      setShowEmailVerification(false);
      setIsEmailChangeComplete(false); // Reset completion flag when sheet closes
      setShowSuccessSheet(false); // Reset success sheet state when main sheet closes
      // Clean up unverified email if verification was cancelled
      if (newEmailAddress && user) {
        // Check if email is verified - if not, try to delete it
        const isVerified = newEmailAddress.verification?.status === "verified" || 
                          newEmailAddress.id === user.primaryEmailAddressId;
        if (!isVerified) {
          newEmailAddress.destroy().catch((err: any) => {
            console.error("Error deleting unverified email on sheet close:", err);
          });
        }
      }
      setNewEmail("");
      setEmailError("");
      setNewEmailAddress(null);
      setIsVerifying(false);
      isCreatingEmailRef.current = false;
    }
  }, [visible]); // Remove newEmailAddress and user from deps to avoid premature resets

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    // Check if it's the same as current email
    const currentEmail = user?.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;
    if (email.trim().toLowerCase() === currentEmail?.toLowerCase()) {
      setEmailError("This is already your current email address");
      return false;
    }

    setEmailError("");
    return true;
  };

  const handleChangeEmail = async () => {
    if (!user || !isLoaded || isSaving || showEmailVerification) return;
    
    // Prevent duplicate calls
    if (isCreatingEmailRef.current) {
      console.log("Already creating email - skipping duplicate call");
      return;
    }

    if (!newEmail.trim()) {
      setEmailError("Please enter a new email address");
      return;
    }

    if (!validateEmail(newEmail)) {
      return;
    }

    try {
      isCreatingEmailRef.current = true;
      setIsSaving(true);
      setEmailError("");

      // Add the new email address to Clerk
      const emailAddress = await user.createEmailAddress({ email: newEmail.trim() });
      console.log("Created new email address:", emailAddress);
      console.log("Email address ID:", emailAddress.id);
      console.log("Email address string:", emailAddress.emailAddress);
      
      // Use the emailAddress object directly - it should be valid
      // Reload user to ensure state is synced, then find the email address by ID
      await user.reload();
      
      // Find the email address by ID (more reliable than email string matching)
      const freshEmailAddress = user.emailAddresses?.find(e => e.id === emailAddress.id);
      const emailToUse = freshEmailAddress || emailAddress;
      
      console.log("Using email address for verification:", emailToUse);
      console.log("Email address ID:", emailToUse.id);
      console.log("Email address string:", emailToUse.emailAddress);
      
      // Store the email address first
      setNewEmailAddress(emailToUse);
      setIsSaving(false);
      isCreatingEmailRef.current = false;
      
      // Close this sheet first, then show verification modal
      console.log("Closing ChangeEmailSheet and showing EmailVerificationModal");
      // Close the parent sheet first
      setTimeout(() => {
        setShowEmailVerification(true);
      }, 150);
    } catch (error: any) {
      console.error("Error changing email:", error);
      const errorMessage = error.errors?.[0]?.message || error.message || "Failed to change email. Please try again.";
      setEmailError(errorMessage);
      setIsSaving(false);
      isCreatingEmailRef.current = false;
    }
  };

  const handleEmailVerified = async () => {
    if (!user || !isLoaded || !newEmailAddress) return;

    try {
      setIsVerifying(true);
      setIsEmailChangeComplete(true); // Mark as complete to prevent sheet from reappearing

      // Keep verification modal open with loading state while doing background work
      // Don't close it yet - let it show the loading spinner
      
      // Get the old email address before making the new one primary
      const oldEmailAddressId = user.primaryEmailAddressId;
      const oldEmailAddress = user.emailAddresses?.find(e => e.id === oldEmailAddressId);

      // Make the new email address primary in Clerk
      await user.update({ primaryEmailAddressId: newEmailAddress.id });
      console.log("Set new email as primary in Clerk");

      // Reload user to get latest state
      await user.reload();

      // Delete the old email address from Clerk (so it's no longer used)
      if (oldEmailAddress && oldEmailAddress.id !== newEmailAddress.id) {
        try {
          await oldEmailAddress.destroy();
          console.log("Deleted old email address from Clerk");
          // Reload user after deletion to update state
          await user.reload();
        } catch (deleteError: any) {
          console.error("Error deleting old email address:", deleteError);
          // Don't fail the whole flow if deletion fails - the new email is already primary
        }
      }

      // Update the email in our database
      try {
        await api.patch("/users/me", { email: newEmail.trim() });
        console.log("Updated email in database");
      } catch (dbError: any) {
        console.error("Error updating email in database:", dbError);
        // Don't fail the whole flow if database update fails
        // The webhook should eventually sync it, but show success anyway
        // (email is already changed in Clerk)
      }

      // Now that all background work is complete, close verification modal and show success
      setShowEmailVerification(false);
      setIsVerifying(false);
      
      // Close the main sheet after a short delay to allow verification modal to close
      setTimeout(() => {
        onClose();
        
        // Show success sheet after sheet closes
        setTimeout(() => {
          setShowSuccessSheet(true);
        }, 200);
      }, 300);
    } catch (error: any) {
      console.error("Error completing email change:", error);
      setIsEmailChangeComplete(false); // Reset on error so user can retry
      setIsVerifying(false);
      setShowEmailVerification(false);
      Alert.alert(
        "Error",
        error.errors?.[0]?.message || error.message || "Failed to complete email change. Please try again."
      );
    }
  };

  const handleEmailVerificationCancel = () => {
    setShowEmailVerification(false);
    // Optionally, delete the unverified email address from Clerk
    if (newEmailAddress && user) {
      const isVerified = newEmailAddress.verification?.status === "verified" || 
                        newEmailAddress.id === user.primaryEmailAddressId;
      if (!isVerified) {
        newEmailAddress.destroy().catch((err: any) => {
          console.error("Error deleting unverified email:", err);
        });
      }
    }
    setNewEmailAddress(null);
  };

  if (!isLoaded || !user) {
    return null;
  }

  const currentEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || "";

  return (
    <>
      <BottomSheet 
        visible={visible && !showEmailVerification && !isEmailChangeComplete} 
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
            Change Email
          </Text>
          <TouchableOpacity
            onPress={handleChangeEmail}
            disabled={isSaving || !newEmail.trim() || !!emailError}
            activeOpacity={0.6}
            style={styles.headerButton}
          >
            {isSaving ? (
              <ActivityIndicator 
                size="small" 
                color={(!newEmail.trim() || !!emailError || isSaving)
                  ? theme.colors.textSecondary
                  : theme.colors.primary} 
              />
            ) : (
              <Text style={[
                styles.headerButtonText,
                {
                  color: (!newEmail.trim() || !!emailError || isSaving)
                    ? theme.colors.textSecondary
                    : theme.colors.primary,
                }
              ]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content - Matching signup page field styling */}
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <View style={[styles.contentContainer, { paddingBottom: bottomPadding }]}>
            {/* Current Email Info */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                Current Email
              </Text>
              <View style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                  justifyContent: "center", // Center text vertically
                },
              ]}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 15 }}>
                  {currentEmail}
                </Text>
              </View>
            </View>

            {/* New Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
                New Email Address
              </Text>
              <BottomSheetTextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: emailError 
                      ? (theme.colors.error || "#EF4444")
                      : (theme.isDark ? "#666666" : "#9CA3AF"),
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Enter new email address"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEmail}
                onChangeText={(text) => {
                  setNewEmail(text);
                  setEmailError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isSaving}
              />
              {emailError ? (
                <Text style={[styles.errorText, { color: theme.colors.error || "#EF4444" }]}>
                  {emailError}
                </Text>
              ) : (
                <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                  We'll send a verification code to confirm your new email address.
                </Text>
              )}
            </View>
          </View>
        </Pressable>
      </BottomSheet>

      {/* Email Verification Modal - shown independently after ChangeEmailSheet is hidden */}
      {showEmailVerification && newEmailAddress && (
        <EmailVerificationModal
          visible={showEmailVerification && !!newEmailAddress}
          emailAddress={newEmailAddress}
          onConfirm={handleEmailVerified}
          onCancel={handleEmailVerificationCancel}
          isVerifying={isVerifying}
        />
      )}

      <EmailChangeSuccessSheet
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
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
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
