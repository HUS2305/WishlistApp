import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, Image } from "react-native";
import { Text } from "@/components/Text";
import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import * as ImagePicker from "expo-image-picker";
import { uploadAvatar } from "@/services/imageUpload";
import api from "@/services/api";

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [originalAvatarUri, setOriginalAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setUsername(user.username || "");
        // Fetch avatar from backend database instead of Clerk (avoids OAuth provider avatars)
        try {
          const response = await api.get("/users/me");
          setAvatarUri(response.data.avatar || null);
          setOriginalAvatarUri(response.data.avatar || null);
        } catch (error) {
          console.error("Error fetching profile avatar:", error);
          setAvatarUri(null);
          setOriginalAvatarUri(null);
        }
      }
    };
    loadProfile();
  }, [user]);

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
        setAvatarUri(result.assets[0].uri);
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
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
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

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      
      // Check if avatar changed and needs upload
      let uploadedAvatarUrl: string | null = null;
      const avatarChanged = avatarUri !== originalAvatarUri;
      
      if (avatarChanged && avatarUri) {
        if (avatarUri.startsWith('file://') || avatarUri.startsWith('content://')) {
          setIsUploadingAvatar(true);
          try {
            uploadedAvatarUrl = await uploadAvatar(avatarUri);
          } catch (uploadError) {
            console.error('Avatar upload failed:', uploadError);
            Alert.alert(
              'Upload Failed',
              'Failed to upload profile photo. Other changes will still be saved.',
              [{ text: 'OK' }]
            );
          } finally {
            setIsUploadingAvatar(false);
          }
        } else {
          uploadedAvatarUrl = avatarUri;
        }
      }
      
      // Update Clerk user data
      await user.update({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        username: username.trim() || undefined,
      });

      // Update avatar in backend database if changed
      if (avatarChanged && uploadedAvatarUrl) {
        try {
          await api.patch("/users/me", { avatar: uploadedAvatarUrl });
        } catch (error) {
          console.error("Error updating avatar in database:", error);
          // Don't fail the whole save if just the database update fails
        }
      }

      Alert.alert("Success", "Profile updated successfully!");
      router.back();
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
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  // Get initials for fallback avatar
  const getInitials = () => {
    const first = firstName?.charAt(0) || user.firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Edit Profile"
        backButton={true}
        rightActions={
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={showImageOptions}
            disabled={isSaving}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
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
          <Text style={[styles.changePhotoText, { color: theme.colors.textSecondary }]}>
            Tap to change photo
          </Text>
        </View>

        {/* First Name */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            First Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.textSecondary + '30',
              },
            ]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            placeholderTextColor={theme.colors.textSecondary}
            editable={!isSaving}
          />
        </View>

        {/* Last Name */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Last Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.textSecondary + '30',
              },
            ]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
            placeholderTextColor={theme.colors.textSecondary}
            editable={!isSaving}
          />
        </View>

        {/* Username */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Username
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.textSecondary + '30',
              },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            editable={!isSaving}
          />
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            Your username must be unique
          </Text>
        </View>
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  avatarContainer: {
    position: "relative",
    width: 120,
    height: 120,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});
