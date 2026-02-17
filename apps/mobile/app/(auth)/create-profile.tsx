import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Image, Alert } from "react-native";
import { Text } from "@/components/Text";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { HeroInput } from "@/components/ui/HeroInput";
import { Stepper } from "@/components/Stepper";
import { ThemeName, themes, getThemeDisplayName } from "@/lib/themes";
import { BottomSheet } from "@/components/BottomSheet";
import { ThemedSwitch } from "@/components/ThemedSwitch";
import { getCurrencyOptions } from "@/utils/currencies";
import { BottomSheetFlatList, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { uploadAvatar } from "@/services/imageUpload";

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];


// Get comprehensive currency list with flags
const currencyOptions = getCurrencyOptions().map(opt => ({
  value: opt.value,
  label: opt.labelWithFlag,
}));

const STEPS = ["Personal Info", "Theme"];

export default function CreateProfileScreen() {
  const { theme, setTheme, themeName } = useTheme();
  const { user } = useUser();
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const insets = useSafeAreaInsets();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [username, setUsername] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [birthdate, setBirthdate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<string | null>(null);
  const [showSexPicker, setShowSexPicker] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission needed", "Please grant photo library permissions to set your profile picture");
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
      "Profile Photo",
      "Choose an option",
      [
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Library", onPress: handlePickImage },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };
  
  // Preferences (now part of step 1)
  const [currency, setCurrency] = useState<string>("USD"); // Will be updated from user preference if available
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState("");
  const [enableNotifications, setEnableNotifications] = useState(true);
  
  // Step 2: Theme selection
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(themeName);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Check if user already has a profile and redirect if they do
  useEffect(() => {
    async function checkExistingProfile() {
      if (!isLoaded || !isSignedIn) {
        return;
      }

      try {
        const token = await getToken();
        if (token) {
          // Try to fetch user profile
          await api.get("/users/me");
          // User already has a profile, redirect to home
          router.replace("/");
        }
      } catch (error: any) {
        // If 404 or 401, user doesn't have a profile yet - that's fine, continue
        if (error.response?.status === 404 || error.response?.status === 401) {
          // User doesn't exist in backend yet (just signed up with Clerk)
          // Allow them to create profile - this is the expected flow
          return;
        }
        // For other errors, log but don't redirect (might be network issue)
        console.warn("Error checking existing profile:", error);
      }
    }

    if (isLoaded && isSignedIn) {
      checkExistingProfile();
    }
  }, [isLoaded, isSignedIn, getToken]);


  // Sync selectedTheme with the current themeName (so it always shows the active theme)
  useEffect(() => {
    setSelectedTheme(themeName);
  }, [themeName]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const validateStep1 = async (): Promise<boolean> => {
    if (!username.trim()) {
      setError("Please fill in all required fields");
      return false;
    }

    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      setUsernameError("Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens");
      return false;
    }

    // Check if username is available
    setCheckingUsername(true);
    setUsernameError("");
    try {
      const token = await getToken();
      if (!token) {
        setError("Authentication required. Please try again.");
        setCheckingUsername(false);
        return false;
      }

      const response = await api.get(`/users/check-username/${encodeURIComponent(username.trim())}`);
      if (!response.data.available) {
        setUsernameError("This username is already taken. Please choose another one.");
        setCheckingUsername(false);
        return false;
      }
    } catch (err: any) {
      console.error("Error checking username availability:", err);
      // If it's a network error, 404, or 401 (user not in backend yet), we'll still allow proceeding
      // The backend will catch duplicate usernames during actual profile creation
      if (err.response?.status === 404 || err.response?.status === 401) {
        // 404: Endpoint might not exist yet
        // 401: User not in backend database yet (just signed up with Clerk)
        // Allow proceeding - backend will validate during creation
        console.warn("Username check skipped (status: " + err.response?.status + "), will validate during creation");
      } else {
        setUsernameError("Unable to verify username availability. Please try again.");
        setCheckingUsername(false);
        return false;
      }
    } finally {
      setCheckingUsername(false);
    }

    setUsernameError("");
    setError("");
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await validateStep1();
      if (isValid) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      // Theme is already applied when user clicks on it, finish the profile creation
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setError("");
    setLoading(true);

    try {
      // Get email from Clerk user
      const primaryEmail = user?.emailAddresses?.find(email => email.id === user.primaryEmailAddressId)?.emailAddress 
        || user?.emailAddresses?.[0]?.emailAddress
        || '';

      if (!primaryEmail) {
        throw new Error("No email address found. Please try signing up again.");
      }

      // Create user in database
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Get firstName and lastName from Clerk user (they were set during signup)
      const firstName = user?.firstName || "";
      const lastName = user?.lastName || "";

      // Detect timezone automatically
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Convert birthday Date to ISO string format (YYYY-MM-DD) using local time, not UTC
      // This prevents timezone shifts that can change the date by a day
      const year = birthdate.getFullYear();
      const month = String(birthdate.getMonth() + 1).padStart(2, '0');
      const day = String(birthdate.getDate()).padStart(2, '0');
      const birthdayISO = `${year}-${month}-${day}`;

      // Upload avatar if user selected one
      let uploadedAvatarUrl: string | null = null;
      if (avatarUri) {
        try {
          uploadedAvatarUrl = await uploadAvatar(avatarUri);
        } catch (uploadError) {
          console.error("Avatar upload failed:", uploadError);
          // Continue without avatar - don't block profile creation
        }
      }

      await api.post("/users/me", {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: primaryEmail,
        avatar: uploadedAvatarUrl || null,
        theme: selectedTheme, // Save the selected theme to database
        currency: currency, // Save currency preference
        timezone: timezone, // Save detected timezone
        birthday: birthdayISO, // Save birthday in ISO format (YYYY-MM-DD)
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

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      {/* Avatar + Username Row */}
      <View style={styles.avatarUsernameRow}>
        {/* Avatar Picker */}
        <TouchableOpacity 
          style={styles.avatarContainer} 
          onPress={showImageOptions}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textSecondary + '40' }]}>
              <Feather name="user" size={32} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={[styles.cameraButton, { backgroundColor: theme.colors.primary }]}>
            <Feather name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Username Field */}
        <View style={styles.usernameContainer}>
          <HeroInput
            label="Username"
            placeholder="Choose a username (e.g., john_doe)"
            value={username}
            onChangeText={(text) => {
              setUsername(text.replace(/[^a-zA-Z0-9_-]/g, ''));
              setUsernameError("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            isRequired
            isInvalid={!!usernameError}
            errorMessage={usernameError}
            description="Username can only contain letters, numbers, underscores, and hyphens (3-20 characters)"
            labelPlacement="outside-top"
            backgroundColor={theme.colors.surface}
          />
        </View>
      </View>

      {/* Birthdate Picker */}
      <View style={styles.pickerContainer}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          Birthdate
        </Text>
        <TouchableOpacity
          style={[styles.pickerButton, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
          }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.pickerText, { color: theme.colors.textPrimary }]}>
            {formatDate(birthdate)}
          </Text>
          <Feather name="calendar" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Picker BottomSheet */}
      {Platform.OS === "ios" ? (
        <BottomSheet visible={showDatePicker} onClose={() => setShowDatePicker(false)} autoHeight>
          <View style={[styles.pickerSheetContainer, { backgroundColor: theme.colors.background }]}>
            {/* Header - with Done button in top right */}
            <View style={styles.datePickerHeader}>
              <View style={styles.datePickerHeaderSpacer} />
              <Text style={[styles.pickerSheetHeaderTitle, { color: theme.colors.textPrimary }]}>
                Select Birthdate
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerDoneButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.datePickerDoneText, { color: theme.colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <View style={[styles.datePickerWrapper, { paddingBottom: Math.max(20, Platform.OS === "ios" ? insets.bottom + 10 : 20) }]}>
              <DateTimePicker
                value={birthdate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setBirthdate(selectedDate);
                  }
                  if (event.type === "dismissed") {
                    setShowDatePicker(false);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                style={styles.datePicker}
              />
            </View>
          </View>
        </BottomSheet>
      ) : (
        // Android: Use native modal (DateTimePicker handles its own modal on Android)
        showDatePicker && (
          <DateTimePicker
            value={birthdate}
            mode="date"
            display="default"
            onChange={(_event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setBirthdate(selectedDate);
              }
            }}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )
      )}

      {/* Sex Selection */}
      <View style={styles.pickerContainer}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          Sex
        </Text>
        <TouchableOpacity
          style={[styles.pickerButton, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
          }]}
          onPress={() => setShowSexPicker(true)}
        >
          <Text style={[styles.pickerText, { 
            color: sex ? theme.colors.textPrimary : theme.colors.textSecondary 
          }]}>
            {sex
              ? sexOptions.find((s) => s.value === sex)?.label || "Select sex"
              : "Select sex"}
          </Text>
          <Feather
            name="chevron-down"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Sex Picker BottomSheet */}
      <BottomSheet visible={showSexPicker} onClose={() => setShowSexPicker(false)} autoHeight>
        <View style={[styles.pickerSheetContainer, { backgroundColor: theme.colors.background }]}>
          {/* Header - Standard pattern: centered title, no X button */}
          <View style={styles.pickerSheetHeader}>
            <Text style={[styles.pickerSheetHeaderTitle, { color: theme.colors.textPrimary }]}>
              Select Sex
            </Text>
          </View>

          {/* Options */}
          <View style={[styles.pickerSheetContent, { paddingBottom: Math.max(20, Platform.OS === "ios" ? insets.bottom + 0 : 20) }]}>
            {sexOptions.map((option, index) => {
              const isLast = index === sexOptions.length - 1;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerSheetOptionRow,
                    {
                      borderBottomColor: theme.colors.textSecondary + '20',
                      borderBottomWidth: isLast ? 0 : 1,
                    },
                  ]}
                  onPress={() => {
                    setSex(option.value);
                    setShowSexPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pickerSheetOptionText,
                      { color: theme.colors.textPrimary },
                      sex === option.value && { 
                        color: theme.colors.primary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sex === option.value && (
                    <Feather name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </BottomSheet>

      {/* Currency Selection */}
      <View style={styles.pickerContainer}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          Currency
        </Text>
        <TouchableOpacity
          style={[styles.pickerButton, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
          }]}
          onPress={() => setShowCurrencyPicker(true)}
        >
          <Text style={[styles.pickerText, { 
            color: currency ? theme.colors.textPrimary : theme.colors.textSecondary 
          }]}>
            {currency
              ? currencyOptions.find((c) => c.value === currency)?.label || "Select currency"
              : "Select currency"}
          </Text>
          <Feather
            name="chevron-down"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <View style={[styles.preferenceItem, { 
        borderBottomColor: theme.colors.textSecondary + '25',
        borderBottomWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }]}>
        <View style={styles.preferenceContent}>
          <Text style={[styles.preferenceLabel, { color: theme.colors.textPrimary }]}>
            Enable Notifications
          </Text>
          <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>
            Receive push notifications for friend requests and wishlist updates
          </Text>
        </View>
        <ThemedSwitch
          value={enableNotifications}
          onValueChange={setEnableNotifications}
        />
      </View>
    </View>
  );

  const renderStep2 = () => {
    const themeOptions: ThemeName[] = [
      'modernLight',
      'darkMode',
      'nature',
      'cyberpunk',
      'sunset',
      'emerald',
    ];

    const getThemePreview = (name: ThemeName) => {
      const theme = themes[name];
      return {
        primary: theme.colors.primary,
        background: theme.colors.background,
      };
    };

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
          Choose a color theme for your app. You can change this later in settings.
        </Text>

        <View style={styles.themesGrid}>
          {themeOptions.map((name) => {
            const isSelected = selectedTheme === name;
            const preview = getThemePreview(name);
            const displayName = getThemeDisplayName(name);

            return (
              <TouchableOpacity
                key={name}
                onPress={() => {
                  setSelectedTheme(name);
                  setTheme(name); // Apply theme immediately
                }}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary + '40',
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
              >
                <View style={styles.themePreview}>
                  <View
                    style={[
                      styles.colorPreview,
                      {
                        backgroundColor: preview.primary,
                        borderColor: preview.background,
                        borderWidth: 2,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.colorPreview,
                      {
                        backgroundColor: preview.background,
                        marginLeft: -8,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.themeName,
                    {
                      color: theme.colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {displayName}
                </Text>
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Feather name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };


  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      default:
        return null;
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return username.trim() && !usernameError;
    }
    return true;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(48, Platform.OS === "ios" ? insets.top + 24 : insets.top + 32) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Stepper
          currentStep={currentStep}
          totalSteps={STEPS.length}
          steps={STEPS}
          allowNavigation={false}
        />

        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {currentStep === 1 && "Complete your profile"}
          {currentStep === 2 && "Choose your theme"}
        </Text>

        {error ? (
          <Text style={[styles.errorText, { color: theme.colors.error || "#EF4444" }]}>
            {error}
          </Text>
        ) : null}

        {renderCurrentStep()}
      </ScrollView>

      <View style={[styles.buttonContainer, { 
        backgroundColor: theme.colors.background,
      }]}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + '40',
            }]}
            onPress={handleBack}
            disabled={loading}
          >
            <Text style={[styles.buttonTextSecondary, { color: theme.colors.textPrimary }]}>
              Back
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary },
            (!canProceed() || loading || checkingUsername) && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={!canProceed() || loading || checkingUsername}
        >
          {(loading || checkingUsername) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {currentStep === STEPS.length ? "Finish" : "Next"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency Picker BottomSheet */}
      <BottomSheet 
        visible={showCurrencyPicker} 
        onClose={() => {
          setShowCurrencyPicker(false);
          setCurrencySearchQuery(""); // Reset search when closing
        }} 
        autoHeight 
        scrollable
      >
        {/* Filter currencies based on search */}
        {(() => {
          const filteredCurrencies = currencySearchQuery.trim()
            ? currencyOptions.filter((option) =>
                option.label.toLowerCase().includes(currencySearchQuery.toLowerCase()) ||
                option.value.toLowerCase().includes(currencySearchQuery.toLowerCase())
              )
            : currencyOptions;

          return (
            <BottomSheetFlatList
              data={filteredCurrencies}
              keyExtractor={(item: { value: string; label: string }) => item.value}
              ListHeaderComponent={
                <View style={{ backgroundColor: theme.colors.background }}>
                  {/* Header */}
                  <View style={[styles.pickerSheetHeader, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.pickerSheetHeaderTitle, { color: theme.colors.textPrimary }]}>
                      Select Currency
                    </Text>
                  </View>
                  
                  {/* Search Bar */}
                  <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
                    <View style={[
                      styles.searchInputContainer,
                      {
                        backgroundColor: theme.isDark ? '#2E2E2E' : '#F3F4F6',
                        borderColor: theme.colors.textSecondary + '20',
                      }
                    ]}>
                      <Feather name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                      <BottomSheetTextInput
                        style={[
                          styles.searchInput,
                          { color: theme.colors.textPrimary }
                        ]}
                        placeholder="Search currencies..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={currencySearchQuery}
                        onChangeText={setCurrencySearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {currencySearchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setCurrencySearchQuery("")}
                          style={styles.clearButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="x" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              }
              renderItem={({ item }: { item: { value: string; label: string } }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerSheetOptionRow,
                    {
                      backgroundColor: theme.colors.background,
                      borderBottomColor: theme.colors.textSecondary + '20',
                    },
                  ]}
                  onPress={() => {
                    setCurrency(item.value);
                    setShowCurrencyPicker(false);
                    setCurrencySearchQuery(""); // Reset search when selecting
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pickerSheetOptionText,
                      { color: theme.colors.textPrimary },
                      currency === item.value && { 
                        color: theme.colors.primary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {currency === item.value && (
                    <Feather name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={[
                { paddingBottom: Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20) }
              ]}
              showsVerticalScrollIndicator={false}
            />
          );
        })()}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 32,
    textAlign: "center",
  },
  stepContent: {
    width: "100%",
    marginBottom: 24,
  },
  avatarUsernameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 30,
  },
  avatarContainer: {
    position: "relative",
    width: 80,
    height: 80,
  },
  avatarImage: {
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
    borderWidth: 1.5,
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
  usernameContainer: {
    flex: 1,
  },
  pickerContainer: {
    marginBottom: 30,
  },
  rowContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  pickerContainerRow: {
    flex: 1,
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 50,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    borderWidth: 1.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    marginTop: -16,
    textAlign: "center",
  },
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  themeCard: {
    width: "47%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
  },
  themePreview: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  themeName: {
    fontSize: 14,
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  preferenceItem: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  preferenceContent: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Picker sheet styles (matching WishlistMenu/ItemMenu style)
  pickerSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerSheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  pickerSheetHeaderTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    minHeight: 44,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  pickerSheetContent: {
    flex: 1, // Take available space for scrolling
  },
  pickerSheetContentContainer: {
    paddingVertical: 8,
  },
  pickerSheetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  pickerSheetOptionText: {
    fontSize: 16,
    fontWeight: "400",
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
    marginBottom: 0,
  },
  datePickerHeaderSpacer: {
    width: 50, // Same width as Done button to center the title
  },
  datePickerDoneButton: {
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerWrapper: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  datePicker: {
    height: 200,
    width: "100%",
  },
});

