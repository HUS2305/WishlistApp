import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { useTheme } from "@/contexts/ThemeContext";
import { spacing, iconSizes, headerSizes } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface StandardPageHeaderProps {
  title: string;
  backButton?: boolean;
  rightActions?: React.ReactNode;
  onBack?: () => void;
  extraTopPadding?: number; // Extra top padding in pixels (for specific pages that need more space)
}

/**
 * Standardized Page Header Component
 * 
 * Unified header component for all pages (both with and without back button).
 * Handles safe area insets automatically and provides consistent spacing and alignment.
 * 
 * @param title - The page title text (required)
 * @param backButton - Whether to show back button (default: true)
 * @param rightActions - Right-side action buttons (optional, can be multiple)
 * @param onBack - Custom back handler (optional, defaults to router.back())
 */
export function StandardPageHeader({
  title,
  backButton = true,
  rightActions,
  onBack,
  extraTopPadding = 0,
}: StandardPageHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Calculate consistent top padding that accounts for safe area (dynamic island/notch)
  // Formula: minimum 40px, or safe area top + 16px (iOS) / 24px (Android)
  // extraTopPadding can be added for specific pages that need more space
  const baseTopPadding = Math.max(40, Platform.OS === "ios" ? insets.top + 16 : insets.top + 24);
  const topPadding = baseTopPadding + extraTopPadding;
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background, paddingTop: topPadding }]}>
      <View style={styles.headerContent}>
        {backButton && (
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={iconSizes.base} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        
        <Text 
          style={[
            styles.headerTitle, 
            { 
              color: theme.colors.textPrimary,
              marginLeft: backButton ? spacing.xs : 0, // 4px gap after back button if present, otherwise 0
            }
          ]} 
          numberOfLines={1}
        >
          {title}
        </Text>
        
        <View style={styles.headerRight}>
          {rightActions}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.md, // 16px bottom padding
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md, // 16px horizontal padding
  },
  backButton: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: Platform.OS === "ios" ? 44 : 56, // Match native header back button width
    minHeight: Platform.OS === "ios" ? 44 : 56,
    marginLeft: -8, // Negative margin to align with iOS standard (matches native headers)
  },
  headerTitle: {
    flex: 1,
    fontSize: headerSizes.titleFontSize, // 20px
    lineHeight: 24,
    fontWeight: "700",
    marginRight: spacing.md, // 16px right margin
    textAlign: "left",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs, // 4px gap between right action buttons
  },
});

