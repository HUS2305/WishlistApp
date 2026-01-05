import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { Text } from "@/components/Text";
import { useUser, useAuth, useClerk } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import api from "@/services/api";
import { getDisplayName } from "@/lib/utils";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { IdentityVerificationModal } from "@/components/IdentityVerificationModal";

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { signOut } = useClerk();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [identityVerifyVisible, setIdentityVerifyVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // If user signed out, redirect immediately (only after Clerk is loaded)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/(auth)/onboarding");
    }
  }, [isLoaded, isSignedIn]);

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setIsLoadingProfile(false);
        return;
      }
      
      const response = await api.get("/users/me");
      setUserProfile(response.data);
    } catch (error: any) {
      // If user doesn't exist or error, that's okay - we'll use Clerk data as fallback
      console.log("Error fetching user profile (will use Clerk data):", error?.response?.status || error?.message);
      setUserProfile(null); // Set to null so we use Clerk fallback
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && userLoaded) {
      fetchUserProfile();
    }
  }, [isSignedIn, userLoaded]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchUserProfile();
      // Also reload Clerk user data
      await clerkUser?.reload();
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for visual feedback
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine display name and email (use database profile if available, fallback to Clerk)
  const displayName = userProfile 
    ? (userProfile.displayName || getDisplayName(userProfile) || userProfile.username || userProfile.email)
    : (clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress || "User");
  const email = userProfile?.email || clerkUser?.emailAddresses?.[0]?.emailAddress || "";
  const computedDisplayName = userProfile ? (userProfile.displayName || getDisplayName(userProfile)) : null;
  const avatarInitial = (computedDisplayName?.[0] || userProfile?.username?.[0]) || clerkUser?.emailAddresses?.[0]?.emailAddress?.[0] || clerkUser?.firstName?.[0] || "U";
  const avatarInitialUpper = avatarInitial.toUpperCase();

  // Wait for Clerk to load before making decisions
  // Don't render profile if Clerk is still loading, user is not signed in, or Clerk user is not loaded
  if (!isLoaded || !isSignedIn || !clerkUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  // Show loading state while fetching profile
  if (isLoadingProfile && !userProfile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StandardPageHeader title="Profile" backButton={false} />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Profile"
        backButton={true}
        onBack={() => router.push("/(tabs)/settings")}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={[theme.colors.primary]} 
          />
        }
      >
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {avatarInitialUpper}
            </Text>
          </View>
          <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
            {displayName || "User"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
            {email}
          </Text>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/profile/edit")}
          >
            <Feather name="edit-3" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Edit Profile</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/profile/change-email")}
          >
            <Feather name="mail" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Change Email</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/profile/change-password")}
          >
            <Feather name="lock" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Change Password</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.dangerButton, { backgroundColor: theme.colors.error }]}
          onPress={() => setIdentityVerifyVisible(true)}
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
          <Text style={styles.dangerButtonText}>
            Delete Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Identity Verification Modal */}
      <IdentityVerificationModal
        visible={identityVerifyVisible}
        onConfirm={async () => {
          // Identity verified, show delete confirmation
          setIdentityVerifyVisible(false);
          setDeleteConfirmVisible(true);
        }}
        onCancel={() => setIdentityVerifyVisible(false)}
        isVerifying={false}
      />

      {/* Delete Account Confirmation */}
      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        title="your account"
        modalTitle="Delete Account"
        onConfirm={async () => {
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
        }}
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
  profileInfo: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  menuContainer: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 16,
  },
  divider: {
    height: 1,
    marginLeft: 20,
    marginRight: 16,
    opacity: 1,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
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
