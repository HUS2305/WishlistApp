import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from "react-native";
import { Text } from "@/components/Text";
import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user, isLoaded } = useUser();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      
      // Update Clerk user data
      await user.update({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        username: username.trim() || undefined,
      });

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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PageHeader
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
    padding: 20,
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



