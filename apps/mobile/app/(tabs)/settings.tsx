import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "@/components/Text";
import { useClerk, useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);

  const handleSignOut = () => {
    setSignOutConfirmVisible(true);
  };

  const confirmSignOut = async () => {
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
      setSignOutConfirmVisible(false);
    }
  };

  // If user signed out, redirect immediately (this handles the case where signOut completes)
  // Only redirect if Clerk is loaded and user is actually signed out (not just during loading)
  useEffect(() => {
    if (isLoaded && !isSignedIn && !isSigningOut) {
      router.replace("/(auth)/onboarding");
    }
  }, [isLoaded, isSignedIn, isSigningOut]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for visual feedback
    setIsRefreshing(false);
  };

  // Wait for Clerk to load before making decisions
  // Don't render settings if Clerk is still loading, user is signing out, or not signed in
  if (!isLoaded || !isSignedIn || isSigningOut) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Settings"
        backButton={false}
        extraTopPadding={8}
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
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Feather name="user" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Profile</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="bell" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Notifications</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="lock" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Privacy</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="help-circle" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Help & Support</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/appearance")}
          >
            <Feather name="sliders" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Appearance</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: theme.colors.primary }]} 
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={20} color="#FFFFFF" />
          <Text style={styles.signOutText}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <DeleteConfirmModal
        visible={signOutConfirmVisible}
        title="Sign Out"
        modalTitle="Sign Out"
        onConfirm={confirmSignOut}
        onCancel={() => setSignOutConfirmVisible(false)}
        isDeleting={isSigningOut}
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    // paddingTop removed - PageHeader handles safe area spacing
  },
  menuContainer: {
    marginBottom: 32,
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
    marginLeft: 20, // Start from the same left padding as menu items
    marginRight: 16,
    opacity: 1,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
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

