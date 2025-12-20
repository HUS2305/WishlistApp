import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { useTheme } from "@/contexts/ThemeContext";

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
            <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary, fontSize: titleSize || 20 }]} numberOfLines={1}>
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
        <Feather name={icon} size={24} color={disabled ? theme.colors.textSecondary : theme.colors.textPrimary} />
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16, // Match main content padding
    paddingRight: 26, // Reduced right padding to move menu closer to edge
  },
  headerButton: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 40,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    marginHorizontal: 12,
    textAlign: "left",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});


