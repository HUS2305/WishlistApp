import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Text } from "@/components/Text";
import { useUser, useAuth, useClerk } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import api from "@/services/api";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { IdentityVerificationModal } from "@/components/IdentityVerificationModal";

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { signOut } = useClerk();
  const [identityVerifyVisible, setIdentityVerifyVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // If user signed out, redirect immediately (only after Clerk is loaded)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/(auth)/onboarding");
    }
  }, [isLoaded, isSignedIn]);

  // Wait for Clerk to load before making decisions
  if (!isLoaded || !isSignedIn || !clerkUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const handleDeleteAccount = () => {
    // Start identity verification flow
    setIdentityVerifyVisible(true);
  };

  const handleIdentityVerified = async () => {
    // Close identity verification modal
    setIdentityVerifyVisible(false);
    
    // Open delete confirmation modal after a delay
    setTimeout(() => {
      setDeleteConfirmVisible(true);
    }, 400);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      const token = await getToken();
      
      // Delete user from database FIRST (while token is still valid)
      // This ensures database is cleaned even if Clerk deletion fails
      if (token) {
        try {
          await api.delete("/users/me");
          console.log("✅ User deleted from database");
        } catch (error: any) {
          console.error("❌ Error deleting user from database:", error);
          Alert.alert(
            "Deletion Failed",
            "Failed to delete account from database. Please try again or contact support.",
            [{ text: "OK" }]
          );
          setIsDeleting(false);
          setDeleteConfirmVisible(false);
          return;
        }
      }
      
      // Delete user from Clerk (requires verification)
      // If this fails, database is already cleaned, so we can still proceed
      try {
        await clerkUser?.delete();
        console.log("✅ User deleted from Clerk");
      } catch (clerkError: any) {
        console.error("⚠️ Error deleting user from Clerk:", clerkError);
        // Database is already deleted, so show a warning but proceed
        Alert.alert(
          "Partial Deletion",
          "Your account was deleted from our database, but there was an error deleting it from Clerk. You may need to contact Clerk support to complete the deletion.",
          [{ text: "OK" }]
        );
      }
      
      // Sign out and redirect
      await signOut();
      router.replace("/(auth)/onboarding");
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Deletion Failed",
        "An unexpected error occurred. Please try again."
      );
      setIsDeleting(false);
      setDeleteConfirmVisible(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Delete Account"
        backButton={true}
        onBack={() => router.push("/(tabs)/profile")}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
      >
        {/* Warning Section */}
        <View style={styles.warningSection}>
          <View style={[styles.warningIconContainer, { backgroundColor: theme.isDark ? `${theme.colors.error}20` : `${theme.colors.error}15` }]}>
            <Feather name="alert-triangle" size={48} color={theme.colors.error || "#EF4444"} />
          </View>
          
          <Text style={[styles.warningTitle, { color: theme.colors.textPrimary }]}>
            Delete Your Account
          </Text>
          
          <Text style={[styles.warningDescription, { color: theme.colors.textSecondary }]}>
            This action cannot be undone. Deleting your account will permanently remove:
          </Text>

          <View style={styles.warningList}>
            <View style={styles.warningItem}>
              <Feather name="x" size={16} color={theme.colors.error || "#EF4444"} />
              <Text style={[styles.warningItemText, { color: theme.colors.textSecondary }]}>
                All your wishlists and items
              </Text>
            </View>
            <View style={styles.warningItem}>
              <Feather name="x" size={16} color={theme.colors.error || "#EF4444"} />
              <Text style={[styles.warningItemText, { color: theme.colors.textSecondary }]}>
                Your profile and account data
              </Text>
            </View>
            <View style={styles.warningItem}>
              <Feather name="x" size={16} color={theme.colors.error || "#EF4444"} />
              <Text style={[styles.warningItemText, { color: theme.colors.textSecondary }]}>
                All your friends and connections
              </Text>
            </View>
            <View style={styles.warningItem}>
              <Feather name="x" size={16} color={theme.colors.error || "#EF4444"} />
              <Text style={[styles.warningItemText, { color: theme.colors.textSecondary }]}>
                Access to your account forever
              </Text>
            </View>
          </View>
        </View>

        {/* Delete Button */}
        <View style={styles.buttonContainer}>
          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />
          
          <Text style={[styles.buttonHelpText, { color: theme.colors.textSecondary }]}>
            If you're sure you want to proceed, click the button below to verify your identity and delete your account.
          </Text>

          <View style={styles.dangerButtonWrapper}>
            <TouchableOpacity
              style={[
                styles.dangerButton,
                { 
                  backgroundColor: theme.colors.error || "#EF4444",
                  opacity: isDeleting ? 0.6 : 1,
                }
              ]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="trash-2" size={20} color="#FFFFFF" />
                  <Text style={styles.dangerButtonText}>
                    Delete My Account
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Identity Verification Modal - Required before deletion */}
      <IdentityVerificationModal
        visible={identityVerifyVisible}
        onConfirm={handleIdentityVerified}
        onCancel={() => {
          setIdentityVerifyVisible(false);
        }}
        isVerifying={false}
      />

      {/* Delete Account Confirmation */}
      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        title="your account"
        modalTitle="Delete Account"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmVisible(false)}
        isDeleting={isDeleting}
        type="wishlist"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  warningSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  warningIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  warningDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  warningList: {
    width: "100%",
    paddingHorizontal: 16,
    gap: 12,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  warningItemText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    marginBottom: 24,
    opacity: 1,
  },
  buttonHelpText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  dangerButtonWrapper: {
    width: "100%",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

