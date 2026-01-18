import { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Linking } from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "@/components/BottomSheet";
import { BottomSheetFlatList, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrencyOptions } from "@/utils/currencies";
import api from "@/services/api";
import { ThemedSwitch } from "@/components/ThemedSwitch";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { clearExchangeRateCache } from "@/services/currency";

// Get comprehensive currency list
const currencyOptions = getCurrencyOptions().map(opt => ({
  value: opt.value,
  label: opt.labelWithFlag,
}));

export default function PreferencesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const [currency, setCurrency] = useState<string | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState("");
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  
  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoadingPush, setIsLoadingPush] = useState(true);
  const [isTogglingPush, setIsTogglingPush] = useState(false);

  // Fetch current user currency on mount
  useEffect(() => {
    const fetchUserCurrency = async () => {
      try {
        const response = await api.get("/users/me");
        if (response.data?.currency) {
          setCurrency(response.data.currency);
        }
      } catch (error) {
        console.error("Failed to fetch user currency:", error);
      } finally {
        setIsLoadingCurrency(false);
      }
    };
    fetchUserCurrency();
  }, []);

  // Check push notification permission status on mount
  useEffect(() => {
    const checkPushPermission = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setPushEnabled(status === "granted");
      } catch (error) {
        console.error("Failed to check push notification permission:", error);
      } finally {
        setIsLoadingPush(false);
      }
    };
    checkPushPermission();
  }, []);

  const handleCurrencySelect = async (newCurrency: string) => {
    const previousCurrency = currency;
    setCurrency(newCurrency);
    setShowCurrencyPicker(false);
    setCurrencySearchQuery("");
    
    try {
      setIsSavingCurrency(true);
      await api.patch("/users/me", { currency: newCurrency });
      
      // Invalidate React Query cache so all components get the new currency immediately
      queryClient.invalidateQueries({ queryKey: ['user', 'currency'] });
      
      // Clear exchange rate cache to force fresh rates with new base currency
      clearExchangeRateCache();
    } catch (error) {
      console.error("Failed to save currency:", error);
      // Revert on error
      setCurrency(previousCurrency);
    } finally {
      setIsSavingCurrency(false);
    }
  };

  const getCurrencyDisplayLabel = () => {
    if (isLoadingCurrency) return "Loading...";
    if (!currency) return "Select currency";
    const option = currencyOptions.find(c => c.value === currency);
    return option?.label || currency;
  };

  // Handle push notification toggle
  const handlePushToggle = async (value: boolean) => {
    setIsTogglingPush(true);
    
    try {
      if (value) {
        // Enable: Request permissions
        const { status } = await Notifications.requestPermissionsAsync();
        
        if (status === "granted") {
          setPushEnabled(true);
          // The usePushNotifications hook in _layout.tsx will handle token registration
        } else if (status === "denied") {
          // Permission denied at system level, open settings
          Linking.openSettings();
        }
      } else {
        // Disable: Unregister token from backend
        try {
          await api.delete("/users/me/push-token");
          setPushEnabled(false);
        } catch (error) {
          console.error("Failed to unregister push token:", error);
        }
      }
    } catch (error) {
      console.error("Failed to toggle push notifications:", error);
    } finally {
      setIsTogglingPush(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Preferences"
        backButton={true}
        onBack={() => router.push("/(tabs)/settings")}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.menuContainer}>
          {/* General Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              General
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Configure your default settings
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowCurrencyPicker(true)}
            disabled={isLoadingCurrency || isSavingCurrency}
          >
            <Feather name="dollar-sign" size={24} color={theme.colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
                Currency
              </Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                {getCurrencyDisplayLabel()}
              </Text>
            </View>
            {isSavingCurrency ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Notifications Section */}
          <View style={[styles.section, styles.sectionSpacing]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Notifications
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Manage your notification preferences
            </Text>
          </View>

          <View style={styles.menuItem}>
            <Feather name="bell" size={24} color={theme.colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
                Push Notifications
              </Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                Receive push notifications on your device
              </Text>
            </View>
            {isLoadingPush || isTogglingPush ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <ThemedSwitch
                value={pushEnabled}
                onValueChange={handlePushToggle}
              />
            )}
          </View>

          {/* Appearance Section */}
          <View style={[styles.section, styles.sectionSpacing]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Appearance
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Customize the look and feel of the app
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/appearance")}
          >
            <Feather name="sliders" size={24} color={theme.colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
                Theme
              </Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                Choose your color theme
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Currency Picker BottomSheet */}
      <BottomSheet 
        visible={showCurrencyPicker} 
        onClose={() => {
          setShowCurrencyPicker(false);
          setCurrencySearchQuery("");
        }} 
        autoHeight 
        scrollable
      >
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
                  onPress={() => handleCurrencySelect(item.value)}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuContainer: {
    marginBottom: 32,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionSpacing: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 16,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginLeft: 20,
    marginRight: 16,
    opacity: 1,
  },
  // Currency picker styles
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
});
