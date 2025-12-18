import { View, StyleSheet, ScrollView, Platform, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Text } from "@/components/Text";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { Button, Input, SafeAreaView } from "@/components/ui";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function CreateProfileScreen() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [birthdate, setBirthdate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<string | null>(null);
  const [showSexPicker, setShowSexPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill form with existing user data
  useEffect(() => {
    if (user) {
      if (user.firstName) setFirstName(user.firstName);
      if (user.lastName) setLastName(user.lastName);
    }
  }, [user]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDateConfirm = (date: Date) => {
    setBirthdate(date);
    setShowDatePicker(false);
  };

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate username format (alphanumeric, underscores, hyphens, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      setError("Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Update Clerk user profile
      if (user) {
        await user.update({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      }

      // Save profile data to backend (username, displayName, email)
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Get email from Clerk user
      const primaryEmail = user.emailAddresses?.find(email => email.id === user.primaryEmailAddressId)?.emailAddress 
        || user.emailAddresses?.[0]?.emailAddress
        || '';

      await api.patch("/users/me", {
        username: username.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: primaryEmail, // Sync email from Clerk to database
      });

      // Navigate to home
      router.replace("/(tabs)");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || err.errors?.[0]?.message || "Failed to create profile";
      setError(errorMessage);
      console.error("Error creating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself to get started
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="First Name *"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <Input
            label="Last Name *"
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Input
            label="Username *"
            placeholder="Choose a username (e.g., john_doe)"
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Text style={styles.hintText}>
            Username can only contain letters, numbers, underscores, and hyphens (3-20 characters)
          </Text>

          {/* Birthdate Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Birthdate</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerText}>
                {formatDate(birthdate)}
              </Text>
              <Feather name="calendar" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Date Picker Modal */}
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Birthdate</Text>
                  <TouchableOpacity onPress={() => handleDateConfirm(birthdate)}>
                    <Text style={styles.modalDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerWrapper}>
                  <DateTimePicker
                    value={birthdate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setBirthdate(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    style={Platform.OS === "ios" ? styles.iosDatePicker : undefined}
                    textColor="#1D1D1F"
                    themeVariant="light"
                  />
                </View>
              </View>
            </View>
          </Modal>

          {/* Sex Selection - Dropdown */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Sex</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowSexPicker(!showSexPicker)}
            >
              <Text style={styles.pickerText}>
                {sex
                  ? sexOptions.find((s) => s.value === sex)?.label || "Select sex"
                  : "Select sex"}
              </Text>
              <Feather
                name={showSexPicker ? "chevron-up" : "chevron-down"}
                size={24}
                color="#007AFF"
              />
            </TouchableOpacity>
            {showSexPicker && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {sexOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        sex === option.value && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setSex(option.value);
                        setShowSexPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          sex === option.value && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!firstName.trim() || !lastName.trim() || !username.trim()}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#86868B",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#fff",
    maxHeight: 200,
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F7",
  },
  dropdownItemSelected: {
    backgroundColor: "#007AFF10",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownItemTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  hintText: {
    fontSize: 12,
    color: "#86868B",
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F7",
  },
  modalCancel: {
    fontSize: 16,
    color: "#007AFF",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  modalDone: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  datePickerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    width: "100%",
    minHeight: 200,
  },
  iosDatePicker: {
    width: "100%",
    height: 200,
  },
});

