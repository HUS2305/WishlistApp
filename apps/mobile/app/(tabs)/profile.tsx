import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "@/components/Text";
import { useUser, useClerk, useAuth } from "@clerk/clerk-expo";
import { Card } from "@/components/ui";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import api from "@/services/api";
import { getDisplayName } from "@/lib/utils";

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
  const { signOut } = useClerk();
  const { isSignedIn, getToken } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      // Wait a moment for Clerk to update the session state
      await new Promise(resolve => setTimeout(resolve, 100));
      // Navigate to onboarding after sign-out completes
      router.replace("/(auth)/onboarding");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  // If user signed out, redirect immediately (this handles the case where signOut completes)
  useEffect(() => {
    if (!isSignedIn && !isSigningOut) {
      router.replace("/(auth)/onboarding");
    }
  }, [isSignedIn, isSigningOut]);

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

  // Don't render profile if user is signing out or not signed in
  if (!isSignedIn || isSigningOut || !clerkUser) {
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
        <PageHeader title="Profile" backButton={false} />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PageHeader
        title="Profile"
        backButton={false}
      />
      
      <View style={styles.profileInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {avatarInitialUpper}
          </Text>
        </View>
        <Text style={styles.userName}>
          {displayName || "User"}
        </Text>
        <Text style={styles.userEmail}>
          {email}
        </Text>
      </View>

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
        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem}>
            <Feather name="user" size={24} color="#4A90E2" />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Feather name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="bell" size={24} color="#4A90E2" />
            <Text style={styles.menuText}>Notifications</Text>
            <Feather name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="lock" size={24} color="#4A90E2" />
            <Text style={styles.menuText}>Privacy</Text>
            <Feather name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="help-circle" size={24} color="#4A90E2" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Feather name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/appearance")}
          >
            <Feather name="sliders" size={24} color="#4A90E2" />
            <Text style={styles.menuText}>Appearance</Text>
            <Feather name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
        </Card>

        <TouchableOpacity 
          style={[styles.signOutButton, isSigningOut && styles.signOutButtonDisabled]} 
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Feather name="log-out" size={20} color="#FF3B30" />
          )}
          <Text style={styles.signOutText}>
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileInfo: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: "#1E3A5F",
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
    color: "#fff",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  menuCard: {
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
