import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Text } from "./Text";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { typography, spacing, borderRadius, shadows } from "@/lib/theme";
import { textStyle } from "@/lib/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { Badge } from "./Badge";

export function BottomMenuBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { theme } = useTheme();
  const { pendingRequestsCount } = useNotificationContext();

  // Menu bar background: #0A0A0F for dark themes, white for light themes
  const menuBarBackground = theme.isDark ? "#121212" : "#FFFFFF";
  
  // Text color: white for dark themes, black for light themes
  const textColor = theme.isDark ? "#FFFFFF" : "#000000";

  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === "ios" ? (insets?.bottom || spacing.lg) : spacing.base }]}>
      <View style={[styles.menuBar, { backgroundColor: menuBarBackground }]}>
        {/* Tab navigation buttons */}
        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            // Skip profile route completely - don't render anything
            if (route.name === "profile") {
              return null;
            }

            // Render placeholder for FAB
            if (route.name === "_placeholder") {
              return <View key={route.key} style={styles.tabPlaceholder} />;
            }

            // Skip routes with href: null or tabBarButton that returns null
            if ((options as any).href === null || options.tabBarButton === null) {
              return null;
            }

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const icon = options.tabBarIcon as any;
            const labelValue = options.tabBarLabel !== undefined
              ? typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : route.name
              : options.title !== undefined
              ? options.title
              : route.name;

            // Check if this is the friends tab and should show a badge
            const isFriendsTab = route.name === "friends";
            const shouldShowBadge = isFriendsTab && pendingRequestsCount > 0;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tab}
              >
                <View style={styles.iconContainer}>
                  {icon &&
                    icon({
                      color: isFocused ? theme.colors.primary : textColor,
                      size: 24,
                    })}
                  {shouldShowBadge && (
                    <Badge count={pendingRequestsCount} />
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    textStyle({
                      fontSize: typography.fontSize.xs,
                      color: textColor,
                    }),
                  ]}
                >
                  {labelValue}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.base,
    pointerEvents: "box-none",
    zIndex: 0, // Same z-index as FAB - bottom sheets use portals and render above
  },
  menuBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
    width: "100%",
    maxWidth: "100%",
    ...shadows.xl,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    position: "relative",
  },
  tabPlaceholder: {
    flex: 1,
  },
  label: {
    marginTop: spacing.xs / 2,
  },
});

