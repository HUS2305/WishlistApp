import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { useTheme } from "@/contexts/ThemeContext";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  backButton?: boolean;
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
        
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
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
  disabled,
  children,
  style,
}: {
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
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
      {icon ? (
        <Feather name={icon} size={20} color={disabled ? theme.colors.textSecondary : theme.colors.textPrimary} />
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
    paddingHorizontal: 20,
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


