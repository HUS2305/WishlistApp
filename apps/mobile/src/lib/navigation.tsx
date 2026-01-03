/**
 * Navigation Configuration & Utilities
 * 
 * Provides standardized header configuration for Expo Router Stack screens
 * to ensure consistent navigation across the app.
 * 
 * Usage in screens:
 * ```tsx
 * import { useLayoutEffect } from 'react';
 * import { useNavigation } from 'expo-router';
 * import { useHeaderOptions } from '@/lib/navigation';
 * 
 * export default function MyScreen() {
 *   const navigation = useNavigation();
 *   
 *   useLayoutEffect(() => {
 *     navigation.setOptions(
 *       useHeaderOptions({
 *         title: 'My Screen',
 *         headerRight: () => <HeaderButton icon="more-horizontal" onPress={handleMenu} />,
 *       })
 *     );
 *   }, [navigation]);
 * }
 * ```
 */

import { Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity, View, Text } from "react-native";
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { headerSizes, iconSizes, spacing } from "./theme";
import { useNavigation } from "expo-router";

/**
 * Default header configuration for Expo Router Stack screens
 * Use this as the base for all header configurations
 * NOTE: This is a plain object, not a hook, so it can be used in screenOptions
 */
export const defaultHeaderConfig = {
  headerShown: true,
  headerStyle: {
    backgroundColor: "transparent", // Will be set by theme in useHeaderOptions
    elevation: 0, // Android - remove shadow
    shadowOpacity: 0, // iOS - remove shadow
    borderBottomWidth: 0, // Remove divider
    shadowColor: "transparent", // Ensure no shadow
    borderBottomColor: "transparent", // Ensure no border
    height: Platform.OS === "ios" ? 44 : 56, // Standard header height
  },
  headerTitleStyle: {
    fontSize: headerSizes.titleFontSize,
    fontWeight: "700" as const,
    fontFamily: "Poppins_700Bold",
  },
  headerTitleAlign: "left" as const, // Align title to left (next to back button) - REQUIRED for iOS
  headerBackTitleVisible: false, // iOS - hide back button text
  headerBackVisible: true, // Explicitly enable native back button
  headerBackButtonDisplayMode: "minimal" as const, // iOS - show only icon, no text
  headerShadowVisible: false, // React Navigation 6+ - explicitly hide shadow/divider
  // Native iOS back button spacing
  headerLeftContainerStyle: {
    paddingLeft: 0,
  },
  headerRightContainerStyle: {
    paddingRight: spacing.md,
  },
  headerTitleContainerStyle: {
    paddingLeft: spacing.xs, // Small gap after back button
    paddingRight: spacing.md,
    flex: 1,
  },
  // Use native iOS slide animation
  animation: Platform.select({
    ios: "default" as const,
    android: "fade_from_bottom" as const,
  }),
  presentation: "card" as const, // Native iOS card slide animation
};

/**
 * Get themed header options for Expo Router
 * This is NOT a hook - it's a regular function that takes theme as a parameter
 * Use this inside useLayoutEffect callbacks
 */


export function getHeaderOptions(
  theme: ReturnType<typeof useTheme>['theme'],
  options: {
    title: string;
    headerLeft?: () => React.ReactNode;
    headerRight?: () => React.ReactNode;
    headerBackTitle?: string;
    headerShown?: boolean;
  }
) {
  // Custom header title component for iOS to ensure left alignment
  // This works better than headerTitleAlign on iOS
  const HeaderTitleComponent = Platform.OS === "ios" 
    ? () => (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-start", paddingLeft: 0 }}>
          <Text
            style={{
              fontSize: headerSizes.titleFontSize,
              fontWeight: "700",
              fontFamily: "Poppins_700Bold",
              color: theme.colors.textPrimary,
            }}
            numberOfLines={1}
          >
            {options.title}
          </Text>
        </View>
      )
    : undefined;

  // Native-style back button for iOS (when not explicitly provided)
  // Uses router.canGoBack() which doesn't require hooks
  const NativeBackButton = Platform.OS === "ios" && options.headerLeft === undefined
    ? () => {
        // Check if we can go back
        if (!router.canGoBack()) {
          return null;
        }
        
        return (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: -8, // Negative margin to align with iOS standard
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name="chevron-left"
              size={28}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        );
      }
    : undefined;

  const headerOptions: any = {
    ...defaultHeaderConfig,
    // Use custom title component on iOS for guaranteed left alignment
    title: Platform.OS === "ios" ? undefined : options.title,
    headerTitle: Platform.OS === "ios" && HeaderTitleComponent ? HeaderTitleComponent : undefined,
    headerStyle: {
      ...defaultHeaderConfig.headerStyle,
      backgroundColor: theme.colors.background,
      // Force remove divider/shadow - ALL properties
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
      shadowColor: "transparent",
      borderBottomColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 0,
    },
    headerTintColor: theme.colors.textPrimary,
    headerTitleStyle: Platform.OS === "ios" ? undefined : {
      ...defaultHeaderConfig.headerTitleStyle,
      color: theme.colors.textPrimary,
    },
    headerShown: options.headerShown ?? true,
    // Explicitly ensure back button is visible
    headerBackVisible: true,
    // Title aligned to left (next to back button) - CRITICAL for iOS
    headerTitleAlign: "left" as const,
    // Explicitly hide shadow/divider (React Navigation 6+)
    headerShadowVisible: false,
    // Native iOS back button spacing - ensure space for back button
    headerLeftContainerStyle: {
      paddingLeft: 0,
      minWidth: Platform.OS === "ios" ? 44 : 56, // Ensure space for back button
    },
    // Title container - ensure proper spacing and left alignment
    headerTitleContainerStyle: {
      paddingLeft: Platform.OS === "ios" ? spacing.xs : spacing.xs, // Small gap after back button
      paddingRight: spacing.md,
      flex: 1,
      alignItems: Platform.OS === "ios" ? "flex-start" : "flex-start", // Force left alignment
    },
  };

  // Set headerLeft: explicit or native-style back button on iOS
  if (options.headerLeft !== undefined) {
    headerOptions.headerLeft = options.headerLeft;
  } else if (NativeBackButton) {
    // Use our native-style back button on iOS (needed when using custom headerTitle)
    headerOptions.headerLeft = NativeBackButton;
  }
  // Otherwise, let React Navigation handle it automatically

  // Only set headerRight if explicitly provided
  if (options.headerRight !== undefined) {
    headerOptions.headerRight = options.headerRight;
  }

  // Only set headerBackTitle if explicitly provided
  if (options.headerBackTitle !== undefined) {
    headerOptions.headerBackTitle = options.headerBackTitle;
  }

  return headerOptions;
}

/**
 * Hook to get themed header options for Expo Router
 * Use this at the top level of your component, then use the result in useLayoutEffect
 * NOTE: This is a hook, so it can only be called at the top level of components
 */
export function useHeaderOptions(options: {
  title: string;
  headerLeft?: () => React.ReactNode;
  headerRight?: () => React.ReactNode;
  headerBackTitle?: string;
  headerShown?: boolean;
}) {
  const { theme } = useTheme();
  return getHeaderOptions(theme, options);
}

/**
 * Header Back Button Component
 * Use this as headerLeft in your header options
 */
export function HeaderBackButton({ onPress }: { onPress?: () => void }) {
  const { theme } = useTheme();
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/");
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        width: headerSizes.height,
        height: headerSizes.height,
        alignItems: "center",
        justifyContent: "center",
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather
        name="chevron-left"
        size={iconSizes.base}
        color={theme.colors.textPrimary}
      />
    </TouchableOpacity>
  );
}

/**
 * Header Button Component (for right side actions)
 * Use this in headerRight
 */
export function HeaderButton({
  icon,
  onPress,
  disabled,
  size,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}) {
  const { theme } = useTheme();
  const iconSize = size || iconSizes.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        width: headerSizes.height,
        height: headerSizes.height,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather
        name={icon}
        size={iconSize}
        color={theme.colors.textPrimary}
      />
    </TouchableOpacity>
  );
}

/**
 * Header Buttons Container (for multiple buttons on right side)
 * Use this to render multiple buttons in headerRight
 */
export function HeaderButtons({
  buttons,
}: {
  buttons: Array<{
    icon: keyof typeof Feather.glyphMap;
    onPress: () => void;
    disabled?: boolean;
    size?: number;
  }>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {buttons.map((button, index) => (
        <HeaderButton
          key={index}
          icon={button.icon}
          onPress={button.onPress}
          disabled={button.disabled}
          size={button.size}
        />
      ))}
    </View>
  );
}
