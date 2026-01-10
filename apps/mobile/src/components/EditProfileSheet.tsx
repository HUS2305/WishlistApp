import { useState, useEffect } from "react";
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
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "@/services/api";
import { Dimensions } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface EditProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BackendUserProfile {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  displayName?: string | null;
}

export function EditProfileSheet({ visible, onClose, onSuccess }: EditProfileSheetProps) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState<string | null>(null); // Track original username for comparison
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // Track if we've already loaded data

  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Reset hasLoaded when sheet closes
  useEffect(() => {
    if (!visible) {
      setHasLoaded(false);
    }
  }, [visible]);

  // Load user data from both Clerk and backend when sheet opens
  useEffect(() => {
    // Only load if sheet is visible, user is loaded, and we haven't loaded yet
    if (!visible || !user || !isLoaded || hasLoaded) {
      return;
    }

    const loadUserData = async () => {
      setIsLoading(true);
      setUsernameError("");

      // Store current user reference to avoid stale closure
      const currentUser = user;

      try {
        // First, load from Clerk as fallback
        let loadedFirstName = currentUser.firstName || "";
        let loadedLastName = currentUser.lastName || "";
        let loadedUsername = currentUser.username || "";

        // Try to fetch from backend database for more accurate data (especially username)
        try {
          const token = await getToken();
          if (token) {
            const response = await api.get<BackendUserProfile>("/users/me");
            const backendProfile = response.data;
            
            console.log("📝 EditProfileSheet: Loaded profile from backend:", {
              firstName: backendProfile.firstName,
              lastName: backendProfile.lastName,
              username: backendProfile.username,
            });
            
            // Use backend data if available, fallback to Clerk
            loadedFirstName = backendProfile.firstName || currentUser.firstName || "";
            loadedLastName = backendProfile.lastName || currentUser.lastName || "";
            loadedUsername = backendProfile.username || currentUser.username || "";
            setOriginalUsername(backendProfile.username || null);
          }
        } catch (backendError: any) {
          console.log("Could not fetch profile from backend, using Clerk data:", backendError?.response?.status || backendError?.message);
          // Continue with Clerk data if backend fetch fails
          setOriginalUsername(currentUser.username || null);
        }

        console.log("📝 EditProfileSheet: Setting form values:", {
          firstName: loadedFirstName,
          lastName: loadedLastName,
          username: loadedUsername,
        });

        setFirstName(loadedFirstName);
        setLastName(loadedLastName);
        setUsername(loadedUsername);
        setHasLoaded(true);
      } catch (error) {
        console.error("Error loading user data:", error);
        // Fallback to Clerk data only
        setFirstName(currentUser.firstName || "");
        setLastName(currentUser.lastName || "");
        setUsername(currentUser.username || "");
        setOriginalUsername(currentUser.username || null);
        setHasLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isLoaded]); // Only depend on visible and isLoaded - hasLoaded is checked inside to prevent loops

  const validateUsername = async (): Promise<boolean> => {
    if (!username.trim()) {
      setUsernameError("");
      return true; // Username is optional
    }

    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      setUsernameError("Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens");
      return false;
    }

    // Check if username changed (compare against original username from backend or Clerk)
    if (username.trim() === (originalUsername || user?.username || "")) {
      setUsernameError("");
      return true;
    }

    // Check if username is available
    setCheckingUsername(true);
    setUsernameError("");
    try {
      const response = await api.get(`/users/check-username/${encodeURIComponent(username.trim())}`);
      if (!response.data.available) {
        setUsernameError("This username is already taken. Please choose another one.");
        setCheckingUsername(false);
        return false;
      }
    } catch (err: any) {
      console.error("Error checking username availability:", err);
      if (err.response?.status === 404) {
        console.warn("Username check endpoint not available, proceeding anyway");
      } else {
        setUsernameError("Unable to verify username availability. Please try again.");
        setCheckingUsername(false);
        return false;
      }
    } finally {
      setCheckingUsername(false);
    }

    setUsernameError("");
    return true;
  };

  const handleSave = async () => {
    if (!user || !isLoaded) return;

    // Validate username if provided
    const isUsernameValid = await validateUsername();
    if (!isUsernameValid) {
      return;
    }

    try {
      setIsSaving(true);

      // Update backend database first (source of truth, especially for username)
      try {
        await api.patch("/users/me", {
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          username: username.trim() || null,
        });
      } catch (backendError: any) {
        console.error("Failed to update backend:", backendError);
        const errorMessage = backendError.response?.data?.message || backendError.message || "Failed to update profile in database. Please try again.";
        Alert.alert("Error", errorMessage);
        setIsSaving(false);
        return;
      }

      // Update Clerk user data (firstName and lastName only - username is not supported by Clerk Expo SDK)
      // Username is only stored in our backend database, not in Clerk
      try {
        await user.update({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          // Note: username is not supported by Clerk's user.update() in Expo SDK
          // Username is only stored and managed in our backend database
        });
      } catch (clerkError: any) {
        console.warn("Failed to update Clerk, but backend update succeeded:", clerkError);
        // Don't fail the whole operation if Clerk update fails
        // Backend is the source of truth, and webhook can sync back if needed
      }

      // Reload user data to get latest from both sources
      await user.reload();

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        error.errors?.[0]?.message || error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return null;
  }

  // Show loading state while fetching profile data
  if (isLoading) {
    return (
      <BottomSheet 
        visible={visible} 
        onClose={onClose} 
        autoHeight={true}
        maxHeight={SCREEN_HEIGHT * 0.9}
        stackBehavior="switch"
        keyboardBehavior="interactive"
        scrollable={false}
      >
        <View style={[styles.contentContainer, { paddingBottom: bottomPadding, alignItems: "center", justifyContent: "center", minHeight: 200 }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </BottomSheet>
    );
  }

  // Check if there are changes (compare against original values)
  const hasChanges = 
    firstName !== (user.firstName || "") ||
    lastName !== (user.lastName || "") ||
    username !== (originalUsername || user.username || "");

  return (
    <BottomSheet 
      visible={visible} 
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
          Edit Profile
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || checkingUsername || !hasChanges || !!usernameError}
          activeOpacity={0.6}
          style={styles.headerButton}
        >
          {isSaving || checkingUsername ? (
            <ActivityIndicator 
              size="small" 
              color={(!hasChanges || isSaving || checkingUsername || !!usernameError)
                ? theme.colors.textSecondary
                : theme.colors.primary} 
            />
          ) : (
            <Text style={[
              styles.headerButtonText,
              {
                color: (!hasChanges || !!usernameError || isSaving || checkingUsername)
                  ? theme.colors.textSecondary
                  : theme.colors.primary,
              }
            ]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content - Matching signup page field styling */}
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <View style={[styles.contentContainer, { paddingBottom: bottomPadding }]}>
          {/* First Name - Matching signup page styling */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              First Name
            </Text>
            <BottomSheetTextInput
              style={[
                styles.textInput,
                {
                  borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholder="Enter your first name"
              placeholderTextColor={theme.colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              editable={!isSaving && !checkingUsername}
            />
          </View>

          {/* Last Name - Matching signup page styling */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              Last Name
            </Text>
            <BottomSheetTextInput
              style={[
                styles.textInput,
                {
                  borderColor: theme.isDark ? "#666666" : "#9CA3AF",
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholder="Enter your last name"
              placeholderTextColor={theme.colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              editable={!isSaving && !checkingUsername}
            />
          </View>

          {/* Username - Matching signup page styling */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textPrimary }]}>
              Username
            </Text>
            <BottomSheetTextInput
              style={[
                styles.textInput,
                {
                  borderColor: usernameError
                    ? (theme.colors.error || "#EF4444")
                    : (theme.isDark ? "#666666" : "#9CA3AF"),
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholder="Enter your username (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={username}
              onChangeText={(text) => {
                setUsername(text.replace(/[^a-zA-Z0-9_-]/g, ''));
                setUsernameError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving && !checkingUsername}
              maxLength={20}
            />
            {usernameError ? (
              <Text style={[styles.errorText, { color: theme.colors.error || "#EF4444" }]}>
                {usernameError}
              </Text>
            ) : (
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                Your username must be unique (optional)
              </Text>
            )}
          </View>
        </View>
      </Pressable>
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
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
});
