import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Image, Alert } from "react-native";
import { Text } from "@/components/Text";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { getDisplayName } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { IdentityVerificationModal } from "@/components/IdentityVerificationModal";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { ChangeEmailSheet } from "@/components/ChangeEmailSheet";
import { ChangePasswordSheet } from "@/components/ChangePasswordSheet";
import * as ImagePicker from "expo-image-picker";
import { uploadAvatar } from "@/services/imageUpload";
import api from "@/services/api";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user: clerkUser } = useUser();
  const { isSignedIn, isLoaded } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile, refetch: refetchUserProfile, isFetching: isRefreshing } = useCurrentUser();
  const [identityVerifyVisible, setIdentityVerifyVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changeEmailVisible, setChangeEmailVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [identityVerifyForEmailChange, setIdentityVerifyForEmailChange] = useState(false);
  const [identityVerifyForPasswordChange, setIdentityVerifyForPasswordChange] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission needed", "Please grant photo library permissions to change your avatar");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndSaveAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission needed", "Please grant camera permissions to take a photo");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndSaveAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const uploadAndSaveAvatar = async (uri: string) => {
    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadAvatar(uri);
      await api.patch("/users/me", { avatar: uploadedUrl });
      await refetchUserProfile();
      Alert.alert("Success", "Profile photo updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Alert.alert("Error", "Failed to upload profile photo. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Change Profile Photo",
      "Choose an option",
      [
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Library", onPress: handlePickImage },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // If user signed out, redirect immediately (only after Clerk is loaded)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/(auth)/onboarding");
    }
  }, [isLoaded, isSignedIn]);

  const onRefresh = async () => {
    try {
      await refetchUserProfile();
      // Also reload Clerk user data
      await clerkUser?.reload();
    } catch (error) {
      console.error("Error refreshing profile:", error);
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

  // Show loading state while fetching profile (only if we don't have cached data)
  if (isLoadingProfile && userProfile === undefined) {
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
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={showImageOptions}
            disabled={isUploadingAvatar}
          >
            {userProfile?.avatar ? (
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: "#fff" }]}>
                <Text style={styles.avatarText}>
                  {avatarInitialUpper}
                </Text>
              </View>
            )}
            <View style={[styles.cameraButton, { backgroundColor: theme.colors.primary }]}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="camera" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
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
            onPress={() => setEditProfileVisible(true)}
          >
            <Feather name="edit-3" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Edit Profile</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setIdentityVerifyForEmailChange(true);
              setIdentityVerifyVisible(true);
            }}
          >
            <Feather name="mail" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Change Email</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setIdentityVerifyForPasswordChange(true);
              setIdentityVerifyVisible(true);
            }}
          >
            <Feather name="lock" size={24} color={theme.colors.primary} />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Change Password</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '25' }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/profile/delete-account")}
          >
            <Feather name="trash-2" size={24} color={theme.colors.error || "#EF4444"} />
            <Text style={[styles.menuText, { color: theme.colors.error || "#EF4444" }]}>Delete Account</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Sheets - Always render to ensure proper mounting */}
      <EditProfileSheet
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        onSuccess={() => {
          setEditProfileVisible(false);
          refetchUserProfile(); // Refresh profile data
          clerkUser?.reload(); // Reload Clerk user data
        }}
      />

      {/* Identity Verification Modal - Used for email change and password change */}
      <IdentityVerificationModal
        visible={identityVerifyVisible}
        onConfirm={async () => {
          // Store the flag values before resetting - CRITICAL!
          const isForEmailChange = identityVerifyForEmailChange;
          const isForPasswordChange = identityVerifyForPasswordChange;
          console.log("Identity verification onConfirm called, isForEmailChange:", isForEmailChange, "isForPasswordChange:", isForPasswordChange);
          
          // Close modal first - allow it to animate out
          setIdentityVerifyVisible(false);
          setIdentityVerifyForEmailChange(false); // Reset flag after storing
          setIdentityVerifyForPasswordChange(false); // Reset flag after storing
          
          // Delay to ensure modal fully closes before opening next sheet
          // Using requestAnimationFrame + setTimeout for better timing
          requestAnimationFrame(() => {
            setTimeout(() => {
              console.log("Opening next step after identity verification, isForEmailChange:", isForEmailChange, "isForPasswordChange:", isForPasswordChange);
              if (isForEmailChange) {
                // For email change, open ChangeEmailSheet
                console.log("Setting changeEmailVisible to true");
                setChangeEmailVisible(true);
              } else if (isForPasswordChange) {
                // For password change, open ChangePasswordSheet
                console.log("Setting changePasswordVisible to true");
                setChangePasswordVisible(true);
              }
            }, 400); // Increased delay to ensure smooth transition
          });
        }}
        onCancel={() => {
          setIdentityVerifyVisible(false);
          setIdentityVerifyForEmailChange(false); // Reset flag
          setIdentityVerifyForPasswordChange(false); // Reset flag
        }}
        isVerifying={false}
      />

      <ChangeEmailSheet
        visible={changeEmailVisible}
        onClose={() => setChangeEmailVisible(false)}
        onSuccess={() => {
          setChangeEmailVisible(false);
          refetchUserProfile(); // Refresh profile data
          clerkUser?.reload(); // Reload Clerk user data
        }}
      />

      <ChangePasswordSheet
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        onSuccess={() => {
          setChangePasswordVisible(false);
          refetchUserProfile(); // Refresh profile data
          clerkUser?.reload(); // Reload Clerk user data
        }}
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
  avatarContainer: {
    position: "relative",
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
