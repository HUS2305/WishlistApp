import React from "react";
import { View, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Text } from "./Text";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { QuickActionMenu } from "./QuickActionMenu";
import { CreateWishlistSheet } from "./CreateWishlistSheet";
import { usePathname } from "expo-router";
import { AnimatedFAB } from "./AnimatedFAB";
import { FAB_SIZE, NOTCH_DEPTH, FAB_CENTER_POSITION, TAB_BAR_HEIGHT } from "./fabConstants";
import { colors, typography, spacing, shadows } from "@/lib/theme";
import { textStyle } from "@/lib/styles";

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [createSheetVisible, setCreateSheetVisible] = React.useState(false);
  const pathname = usePathname();
  
  // Track if we should open sheet after menu closes
  const [shouldOpenSheet, setShouldOpenSheet] = React.useState(false);
  
  // Handle opening create sheet - trigger flag, menu will close
  const handleOpenCreateSheet = React.useCallback(() => {
    console.log("🔵 handleOpenCreateSheet CALLED - setting shouldOpenSheet to true");
    console.log("🔵 Current menuVisible:", menuVisible);
    console.log("🔵 Setting shouldOpenSheet to true and menuVisible to false");
    setShouldOpenSheet(true);
    setMenuVisible(false);
    console.log("🔵 State updates queued");
  }, [menuVisible]);
  
  // Open sheet after menu closes
  React.useEffect(() => {
    if (!menuVisible && shouldOpenSheet) {
      console.log("Menu closed, opening sheet now");
      // Small delay to ensure menu closes first, then sheet can animate up smoothly
      setTimeout(() => {
        console.log("About to set createSheetVisible to true");
        setCreateSheetVisible(true);
        setShouldOpenSheet(false);
        console.log("createSheetVisible should now be true");
      }, 150);
    }
  }, [menuVisible, shouldOpenSheet]);
  
  // Debug log for createSheetVisible state
  React.useEffect(() => {
    console.log("createSheetVisible state changed to:", createSheetVisible);
  }, [createSheetVisible]);
  
  // Reset flag when sheet closes
  React.useEffect(() => {
    if (!createSheetVisible) {
      setShouldOpenSheet(false);
    }
  }, [createSheetVisible]);
  
  // Check if we're on a detail page (wishlist detail, edit, add-item, etc.)
  const isDetailPage = pathname?.includes("/wishlist/") && 
                       pathname !== "/wishlist/create" &&
                       pathname !== "/wishlist";
  
  // Check if we're on a main tab page
  // Show FAB on: home (index), friends, gifts, profile tabs
  // Don't show on: detail pages, notifications, search, etc.
  const isMainTabPage = !isDetailPage && (
    !pathname || 
    pathname === "/" ||
    pathname === "/(tabs)" || 
    pathname === "/(tabs)/" || 
    pathname === "/(tabs)/index" ||
    pathname === "/index" ||
    pathname === "/(tabs)/friends" ||
    pathname === "/(tabs)/gifts" ||
    pathname === "/(tabs)/settings" ||
    (pathname?.startsWith("/(tabs)/") && 
     !pathname?.includes("/wishlist/") && 
     !pathname?.includes("/friends/search") && 
     !pathname?.includes("/notifications") &&
     pathname !== "/(tabs)/friends/search")
  );

  // Debug log (can be removed later)
  React.useEffect(() => {
    console.log("CustomTabBar - pathname:", pathname, "isMainTabPage:", isMainTabPage, "isDetailPage:", isDetailPage);
  }, [pathname, isMainTabPage, isDetailPage]);

  return (
    <>
      <View style={styles.wrapper}>
        {/* Tab bar background with notch cutout */}
        <View style={[
          styles.container,
          !isMainTabPage && styles.containerFilled
        ]}>
          {/* Left section with curved inner edge */}
          <View style={[
            styles.leftSection,
            isMainTabPage && styles.leftSectionWithNotch
          ]} />
          
          {/* Center notch area - creates the cutout */}
          <View style={styles.notchContainer}>
            {isMainTabPage ? (
              <View style={styles.notchArea}>
                <View style={styles.fabWrapper}>
                  <AnimatedFAB
                    variant="center"
                    positionStyle="tab-bar"
                    onPress={() => {
                      setMenuVisible(true);
                    }}
                  />
                </View>
              </View>
            ) : (
              // When no notch, fill with background
              <View style={styles.notchContainerFilled} />
            )}
          </View>
          
          {/* Right section with curved inner edge */}
          <View style={[
            styles.rightSection,
            isMainTabPage && styles.rightSectionWithNotch
          ]} />
        </View>
        
        {/* Tab items overlay - positioned above the background */}
        <View style={styles.tabsOverlay}>
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
            // Handle label - it can be a string or a function, but we need a string for display
            const labelValue = options.tabBarLabel !== undefined
              ? typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : route.name
              : options.title !== undefined
              ? options.title
              : route.name;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tab}
              >
                {icon &&
                  icon({
                    color: isFocused ? colors.tabBar.active : colors.tabBar.inactive,
                    size: 24,
                  })}
                <Text
                  style={[
                    styles.label,
                    textStyle({
                      fontSize: typography.fontSize.sm,
                      color: isFocused ? colors.tabBar.active : colors.tabBar.inactive,
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

      <QuickActionMenu 
        visible={menuVisible} 
        onClose={() => {
          console.log("QuickActionMenu onClose called");
          setMenuVisible(false);
        }}
        onCreateWishlist={() => {
          console.log("🟢 onCreateWishlist prop called in CustomTabBar");
          console.log("🟢 handleOpenCreateSheet function exists:", typeof handleOpenCreateSheet);
          handleOpenCreateSheet();
        }}
      />
      
      <CreateWishlistSheet 
        visible={createSheetVisible} 
        onClose={() => {
          console.log("CreateWishlistSheet onClose called");
          setCreateSheetVisible(false);
        }} 
      />
    </>
  );
}

const NOTCH_WIDTH = FAB_SIZE + 40; // Width of the notch cutout
const NOTCH_RADIUS = (FAB_SIZE + 20) / 2; // Radius for the curved notch (semi-circle)

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  container: {
    flexDirection: "row",
    backgroundColor: "transparent", // Transparent by default, filled only when no notch
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    height: TAB_BAR_HEIGHT,
    paddingBottom: Platform.OS === "ios" ? spacing.lg : 0,
    ...shadows.lg,
    overflow: "visible",
    position: "relative",
  },
  containerFilled: {
    backgroundColor: colors.background.DEFAULT, // Fill when no notch
  },
  leftSection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: "50%",
    marginRight: NOTCH_WIDTH / 2, // Leave space for notch
    height: TAB_BAR_HEIGHT + (Platform.OS === "ios" ? spacing.lg : 0),
    backgroundColor: colors.background.DEFAULT,
    zIndex: 2,
  },
  leftSectionWithNotch: {
    // Extend upward and create curved edge to form notch
    top: -NOTCH_RADIUS,
    height: TAB_BAR_HEIGHT + NOTCH_RADIUS + (Platform.OS === "ios" ? spacing.lg : 0),
    borderTopRightRadius: NOTCH_RADIUS,
    overflow: "hidden",
  },
  notchContainer: {
    width: NOTCH_WIDTH,
    backgroundColor: "transparent", // Transparent to create cutout - shows screen background
    overflow: "visible",
    position: "relative",
    zIndex: 1,
  },
  notchContainerFilled: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  notchArea: {
    position: "absolute",
    bottom: -NOTCH_DEPTH, // Extend below the tab bar to create notch
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end", // Align to bottom of notch area
    // Calculate padding to match FAB center position exactly
    // Notch area bottom is at: TAB_BAR_HEIGHT + NOTCH_DEPTH from screen bottom
    // FAB center should be at: FAB_CENTER_POSITION from screen bottom
    // With justifyContent: "flex-end", paddingBottom pushes content up
    // FAB bottom = notch bottom - paddingBottom
    // FAB center = FAB bottom + FAB_SIZE/2 = (notch bottom - paddingBottom) + FAB_SIZE/2
    // We want: FAB center = FAB_CENTER_POSITION
    // So: (TAB_BAR_HEIGHT + NOTCH_DEPTH - paddingBottom) + FAB_SIZE/2 = FAB_CENTER_POSITION
    // Therefore: paddingBottom = TAB_BAR_HEIGHT + NOTCH_DEPTH + FAB_SIZE/2 - FAB_CENTER_POSITION
    paddingBottom: (TAB_BAR_HEIGHT + NOTCH_DEPTH) + FAB_SIZE / 2 - FAB_CENTER_POSITION,
    zIndex: 10,
  },
  fabWrapper: {
    zIndex: 1000,
  },
  rightSection: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: NOTCH_WIDTH / 2, // Leave space for notch
    right: 0,
    height: TAB_BAR_HEIGHT + (Platform.OS === "ios" ? spacing.lg : 0),
    backgroundColor: colors.background.DEFAULT,
    zIndex: 2,
  },
  rightSectionWithNotch: {
    // Extend upward and create curved edge to form notch
    top: -NOTCH_RADIUS,
    height: TAB_BAR_HEIGHT + NOTCH_RADIUS + (Platform.OS === "ios" ? spacing.lg : 0),
    borderTopLeftRadius: NOTCH_RADIUS,
    overflow: "hidden",
  },
  tabsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    pointerEvents: "box-none",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.md : spacing.sm,
  },
  tabPlaceholder: {
    flex: 1,
  },
  label: {
    marginTop: spacing.xs,
  },
});
