import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
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

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
];

// Get comprehensive currency list
const currencyOptions = getCurrencyOptions().map(opt => ({
  value: opt.value,
  label: opt.label,
}));

const STEPS = ["Personal Info", "Theme", "Preferences"];

export default function CreateProfileScreen() {
  const { theme, setTheme, themeName } = useTheme();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [birthdate, setBirthdate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<string | null>(null);
  const [showSexPicker, setShowSexPicker] = useState(false);
  
  // Step 2: Theme selection
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(themeName);
  
  // Step 3: Preferences
  const [language, setLanguage] = useState<string>("en");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [currency, setCurrency] = useState<string>("USD"); // Will be updated from user preference if available
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Pre-fill form with existing user data
  useEffect(() => {
    if (user) {
      if (user.firstName) setFirstName(user.firstName);
      if (user.lastName) setLastName(user.lastName);
    }
  }, [user]);

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
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
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
      // If it's a network error or the endpoint doesn't exist, we'll still allow proceeding
      // but the backend will catch it during creation
      if (err.response?.status === 404) {
        // Endpoint might not exist yet, allow proceeding
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
      // Theme is already applied when user clicks on it, just proceed to next step
      setCurrentStep(3);
    } else if (currentStep === 3) {
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

      // Update Clerk user profile (firstName and lastName only)
      if (user) {
        await user.update({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      }

      // Create user in database
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Detect timezone automatically
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Convert birthday Date to ISO string format (YYYY-MM-DD) using local time, not UTC
      // This prevents timezone shifts that can change the date by a day
      const year = birthdate.getFullYear();
      const month = String(birthdate.getMonth() + 1).padStart(2, '0');
      const day = String(birthdate.getDate()).padStart(2, '0');
      const birthdayISO = `${year}-${month}-${day}`;

      await api.post("/users/me", {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: primaryEmail,
        avatar: user?.imageUrl || null,
        theme: selectedTheme, // Save the selected theme to database
        language: language, // Save language preference
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
      <HeroInput
        label="First Name"
        placeholder="Enter your first name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        isRequired
        labelPlacement="outside-top"
        backgroundColor={theme.colors.surface}
      />

      <HeroInput
        label="Last Name"
        placeholder="Enter your last name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        isRequired
        labelPlacement="outside-top"
        backgroundColor={theme.colors.surface}
      />

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

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={birthdate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            if (Platform.OS === "android") {
              setShowDatePicker(false);
            }
            if (selectedDate) {
              setBirthdate(selectedDate);
            }
            if (Platform.OS === "ios" && event.type === "dismissed") {
              setShowDatePicker(false);
            }
          }}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
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
          {/* Header */}
          <View style={styles.pickerSheetHeader}>
            <View style={styles.pickerSheetHeaderSpacer} />
            <Text style={[styles.pickerSheetHeaderTitle, { color: theme.colors.textPrimary }]}>
              Select Sex
            </Text>
            <TouchableOpacity
              onPress={() => setShowSexPicker(false)}
              style={styles.pickerSheetCloseButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.pickerSheetContent}>
            {sexOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerSheetOptionRow,
                  {
                    borderBottomColor: theme.colors.textSecondary + '20',
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
            ))}
          </View>
        </View>
      </BottomSheet>
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

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
        Configure your default preferences. You can change these anytime in settings.
      </Text>

      {/* Language Selection */}
      <View style={styles.pickerContainer}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          Language
        </Text>
        <TouchableOpacity
          style={[styles.pickerButton, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.textSecondary + '40',
          }]}
          onPress={() => setShowLanguagePicker(true)}
        >
          <Text style={[styles.pickerText, { 
            color: language ? theme.colors.textPrimary : theme.colors.textSecondary 
          }]}>
            {language
              ? languageOptions.find((l) => l.value === language)?.label || "Select language"
              : "Select language"}
          </Text>
          <Feather
            name="chevron-down"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

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

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return firstName.trim() && lastName.trim() && username.trim() && !usernameError;
    }
    return true;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Stepper
          currentStep={currentStep}
          totalSteps={STEPS.length}
          steps={STEPS}
          allowNavigation={false}
        />

        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {currentStep === 1 && "Tell us a bit about yourself"}
          {currentStep === 2 && "Choose your theme"}
          {currentStep === 3 && "Set your preferences"}
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

      {/* Language Picker BottomSheet */}
      <BottomSheet visible={showLanguagePicker} onClose={() => setShowLanguagePicker(false)} height={0.7}>
        <View style={[styles.pickerSheetContainer, { backgroundColor: theme.colors.background, flex: 1 }]}>
          {/* Header */}
          <View style={styles.pickerSheetHeader}>
            <View style={styles.pickerSheetHeaderSpacer} />
            <Text style={[styles.pickerSheetHeaderTitle, { color: theme.colors.textPrimary }]}>
              Select Language
            </Text>
            <TouchableOpacity
              onPress={() => setShowLanguagePicker(false)}
              style={styles.pickerSheetCloseButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <ScrollView 
            style={styles.pickerSheetContent}
            contentContainerStyle={styles.pickerSheetContentContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {languageOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerSheetOptionRow,
                  {
                    borderBottomColor: theme.colors.textSecondary + '20',
                  },
                ]}
                onPress={() => {
                  setLanguage(option.value);
                  setShowLanguagePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerSheetOptionText,
                    { color: theme.colors.textPrimary },
                    language === option.value && { 
                      color: theme.colors.primary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {language === option.value && (
                  <Feather name="check" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>

      {/* Currency Picker BottomSheet */}
      <BottomSheet visible={showCurrencyPicker} onClose={() => setShowCurrencyPicker(false)} height={0.7}>
        <View style={[styles.pickerSheetContainer, { backgroundColor: theme.colors.background, flex: 1 }]}>
          {/* Header */}
          <View style={styles.pickerSheetHeader}>
            <View style={styles.pickerSheetHeaderSpacer} />
            <Text style={[styles.pickerSheetHeaderTitle, { color: theme.colors.textPrimary }]}>
              Select Currency
            </Text>
            <TouchableOpacity
              onPress={() => setShowCurrencyPicker(false)}
              style={styles.pickerSheetCloseButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <ScrollView 
            style={styles.pickerSheetContent}
            contentContainerStyle={styles.pickerSheetContentContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {currencyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerSheetOptionRow,
                  {
                    borderBottomColor: theme.colors.textSecondary + '20',
                  },
                ]}
                onPress={() => {
                  setCurrency(option.value);
                  setShowCurrencyPicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerSheetOptionText,
                    { color: theme.colors.textPrimary },
                    currency === option.value && { 
                      color: theme.colors.primary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {currency === option.value && (
                  <Feather name="check" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
    paddingTop: 48,
    paddingBottom: 100,
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
  pickerContainer: {
    marginBottom: 30,
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
    paddingBottom: 32,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    position: "relative",
  },
  pickerSheetHeaderSpacer: {
    width: 24, // Same width as close button to center the title
  },
  pickerSheetHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  pickerSheetCloseButton: {
    padding: 4,
    zIndex: 1,
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
  },
  pickerSheetOptionText: {
    fontSize: 16,
    fontWeight: "400",
  },
});

