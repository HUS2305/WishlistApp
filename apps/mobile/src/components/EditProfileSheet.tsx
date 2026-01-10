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
import { useUser } from "@clerk/clerk-expo";
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

export function EditProfileSheet({ visible, onClose, onSuccess }: EditProfileSheetProps) {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  const insets = useSafeAreaInsets();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);

  // Load user data when sheet opens
  useEffect(() => {
    if (visible && user && isLoaded) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
      setUsernameError("");
    }
  }, [visible, user, isLoaded]);

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

    // Check if username changed
    if (username.trim() === (user?.username || "")) {
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

      // Update Clerk user data
      await user.update({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        username: username.trim() || undefined,
      });

      // Also update backend database
      try {
        await api.patch("/users/me", {
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          username: username.trim() || null,
        });
      } catch (backendError: any) {
        console.warn("Failed to update backend, but Clerk update succeeded:", backendError);
        // Don't fail the whole operation if backend update fails
        // Clerk webhook will eventually sync it
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        error.errors?.[0]?.message || "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return null;
  }

  const hasChanges = 
    firstName !== (user.firstName || "") ||
    lastName !== (user.lastName || "") ||
    username !== (user.username || "");

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
