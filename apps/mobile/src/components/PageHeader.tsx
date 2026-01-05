import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { useTheme } from "@/contexts/ThemeContext";
import { spacing, iconSizes, headerSizes } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  backButton?: boolean;
  titleSize?: number;
}

/**
 * Standardized Page Header Component
 * 
 * Layout: [Back Button] [Title] [Right Actions]
 * - 20px horizontal padding on both sides
 * - Even spacing throughout
 * - Consistent styling across all pages
 */
export function PageHeader({
  title,
  onBack,
  rightActions,
  backButton = true,
  titleSize,
}: PageHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Calculate consistent top padding that accounts for safe area (dynamic island/notch)
  // Formula: minimum 40px, or safe area top + 16px (iOS) / 24px (Android)
  const topPadding = Math.max(40, Platform.OS === "ios" ? insets.top + 16 : insets.top + 24);
  
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
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Feather name="chevron-left" size={iconSizes.base} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        
        <Text style={[
          styles.headerTitle, 
          { 
            color: theme.colors.textPrimary, 
            fontSize: titleSize || headerSizes.titleFontSize,
            marginLeft: backButton ? spacing.xs : 0, // 4px gap after back button if present, otherwise 0
          }
        ]} numberOfLines={1}>
          {title}
        </Text>
        
        <View style={styles.headerRight}>
          {rightActions}
        </View>
      </View>
    </View>
  );
}

export function HeaderButton({
  onPress,
  icon,
  materialCommunityIcon,
  disabled,
  children,
  style,
}: {
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  materialCommunityIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.headerButton, disabled && styles.headerButtonDisabled, style]}
    >
      {materialCommunityIcon ? (
        <MaterialCommunityIcons 
          name={materialCommunityIcon} 
          size={24} 
          color={disabled ? theme.colors.textSecondary : theme.colors.textPrimary} 
        />
      ) : icon ? (
        <Feather name={icon} size={iconSizes.base} color={disabled ? theme.colors.textSecondary : theme.colors.textPrimary} />
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    // paddingTop is now calculated dynamically using safe area insets
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.md, // 16px left padding (consistent for all headers)
    paddingRight: spacing.md, // 16px right padding to match native headers
  },
  headerButton: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: Platform.OS === "ios" ? 44 : 56, // Match native header back button width
    minHeight: Platform.OS === "ios" ? 44 : 56,
    marginLeft: -8, // Negative margin to align with iOS standard (matches native headers)
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    flex: 1,
    fontSize: headerSizes.titleFontSize,
    lineHeight: 24,
    fontWeight: "700",
    // marginLeft is set dynamically based on backButton prop
    marginRight: spacing.md, // 16px right margin to match native headers
    textAlign: "left",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});


