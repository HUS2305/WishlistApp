import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { useTheme } from "@/contexts/ThemeContext";
import { spacing, iconSizes, headerSizes } from "@/lib/theme";

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
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContent}>
        {backButton && (
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Feather name="chevron-left" size={iconSizes.base} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary, fontSize: titleSize || headerSizes.titleFontSize }]} numberOfLines={1}>
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
    paddingTop: 48,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  headerButton: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: headerSizes.height,
    minHeight: headerSizes.height,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    flex: 1,
    fontSize: headerSizes.titleFontSize,
    lineHeight: 24,
    fontWeight: "700",
    marginHorizontal: spacing.md,
    textAlign: "left",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});


