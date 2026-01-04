import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Platform, StyleSheet, LayoutChangeEvent } from "react-native";
import { Text } from "./Text";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { QuickActionMenu } from "./QuickActionMenu";
import { CreateWishlistSheet } from "./CreateWishlistSheet";
import { AddItemSheet } from "./AddItemSheet";
import { AnimatedFAB } from "./AnimatedFAB";
import { TAB_BAR_HEIGHT, FAB_SIZE } from "./fabConstants";
import { colors, typography, spacing } from "@/lib/theme";
import { textStyle } from "@/lib/styles";
import Svg, { Path } from "react-native-svg";
import { BottomMenuBar } from "./BottomMenuBar";
import { wishlistsService } from "@/services/wishlists";
import { wishlistEvents } from "@/utils/wishlistEvents";

// Creates a simple rectangle shape for non-main tab pages (no notch)
const createTabShape = (width: number) => {
  const height = TAB_BAR_HEIGHT + (Platform.OS === "ios" ? spacing.lg : 0);
  return `M0,0 H${width} V${height} H0 Z`;
};

export default function TabBarWithNotch({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [addItemSheetVisible, setAddItemSheetVisible] = useState(false);
  const [shouldOpenSheet, setShouldOpenSheet] = useState(false);
  const [shouldOpenAddItemSheet, setShouldOpenAddItemSheet] = useState(false);
  const [width, setWidth] = useState(0);
  const [hasWishlists, setHasWishlists] = useState(true); // Default to true to avoid blocking initially
  
  // Handle opening create sheet - trigger flag, menu will close
  const handleOpenCreateSheet = React.useCallback(() => {
    console.log("🔵 handleOpenCreateSheet called - setting shouldOpenSheet to true");
    setShouldOpenSheet(true);
    setMenuVisible(false);
  }, []);

  // Handle opening add item sheet
  const handleOpenAddItemSheet = React.useCallback(() => {
    setShouldOpenAddItemSheet(true);
    setMenuVisible(false);
  }, []);
  
  // Open sheet after menu closes
  React.useEffect(() => {
    if (!menuVisible && shouldOpenSheet) {
      console.log("Menu closed, opening sheet now");
      // Small delay to ensure menu closes first, then sheet can animate up smoothly
      setTimeout(() => {
        console.log("Setting createSheetVisible to true");
        setCreateSheetVisible(true);
        setShouldOpenSheet(false);
      }, 150);
    }
    if (!menuVisible && shouldOpenAddItemSheet) {
      setTimeout(() => {
        setAddItemSheetVisible(true);
        setShouldOpenAddItemSheet(false);
      }, 150);
    }
  }, [menuVisible, shouldOpenSheet, shouldOpenAddItemSheet]);
  
  // Reset flags when sheets close
  React.useEffect(() => {
    if (!createSheetVisible) {
      setShouldOpenSheet(false);
    }
    if (!addItemSheetVisible) {
      setShouldOpenAddItemSheet(false);
    }
  }, [createSheetVisible, addItemSheetVisible]);
  
  // Get current route name from state
  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute?.name;

  // Check if user has wishlists (only check on index tab to avoid unnecessary requests)
  const checkWishlists = React.useCallback(async () => {
    if (currentRouteName === "index") {
      try {
        const wishlists = await wishlistsService.getWishlists();
        setHasWishlists(wishlists.length > 0);
      } catch (error) {
        console.error("Error checking wishlists:", error);
        // On error, assume they have wishlists to avoid blocking
        setHasWishlists(true);
      }
    }
  }, [currentRouteName]);

  useEffect(() => {
    checkWishlists();
  }, [checkWishlists]);

  // Refresh wishlists count when a wishlist is created
  useEffect(() => {
    const unsubscribe = wishlistEvents.subscribe(() => {
      checkWishlists();
    });
    return unsubscribe;
  }, [checkWishlists]);
  
  // Hide tab bar on profile page
  if (currentRouteName === "profile") {
    return null;
  }
  
  // Main tab route names
  const mainTabRoutes = ["index", "friends", "discover", "settings"];
  
  // Check if we're on a main tab page - use BottomMenuBar for all main tabs
  const isMainTabPage = mainTabRoutes.includes(currentRouteName || "");

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const barHeight = TAB_BAR_HEIGHT + (Platform.OS === "ios" ? spacing.lg : 0);
  const svgHeight = barHeight;

  // Use new BottomMenuBar for main tab pages
  if (isMainTabPage) {
    // Calculate FAB position to center it on the menu bar
    // Menu bar height is 80px, FAB is 60px
    // Bottom padding: iOS uses insets.bottom or spacing.lg (20), Android uses spacing.base (16)
    const bottomPadding = Platform.OS === "ios" ? (insets?.bottom || spacing.lg) : spacing.base;
    const menuBarHeight = 80;
    const fabBottom = bottomPadding + (menuBarHeight / 2) - (FAB_SIZE / 2);
    
    return (
      <>
        <BottomMenuBar state={state} descriptors={descriptors} navigation={navigation} insets={insets} />
        {/* FAB button centered on the menu bar */}
        <View style={[styles.fabContainer, { bottom: fabBottom }]}>
          <AnimatedFAB
            variant="center"
            positionStyle="tab-bar"
            onPress={() => {
              setMenuVisible(true);
            }}
          />
        </View>
        <QuickActionMenu 
          visible={menuVisible} 
          onClose={() => setMenuVisible(false)}
          onCreateWishlist={handleOpenCreateSheet}
          onAddItem={handleOpenAddItemSheet}
          disableAddItem={!hasWishlists}
        />
        <CreateWishlistSheet 
          visible={createSheetVisible} 
          onClose={() => setCreateSheetVisible(false)} 
        />
        <AddItemSheet
          visible={addItemSheetVisible}
          onClose={() => setAddItemSheetVisible(false)}
          // No wishlistId - user will select from dropdown
        />
      </>
    );
  }

  // Use old design for detail pages
  return (
    <>
      <View style={styles.container} pointerEvents="box-none">
        <View 
          style={[
            styles.tabBarContainer, 
            { height: svgHeight }
          ]} 
          onLayout={onLayout}
        >
          {width > 0 && !isMainTabPage && (
            <Svg
              width={width}
              height={svgHeight}
              style={styles.svg}
            >
              <Path
                fill="#FF0000"
                d={createTabShape(width)}
                stroke="none"
              />
            </Svg>
          )}
        </View>
        
        {/* Tab items overlay */}
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

      <QuickActionMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "transparent", // IMPORTANT: transparent so content shows through the notch
  },
  tabBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "stretch",
    justifyContent: "flex-end",
    backgroundColor: "transparent", // IMPORTANT: no background color
  },
  svgShadowWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden", // Clip any overflow
    shadowColor: "#4460bc",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.161,
    shadowRadius: 12,
    elevation: 12,
  },
  svg: {
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  fabContainer: {
    position: "absolute",
    alignSelf: "center",
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 1, // Low z-index - bottom sheets use portals and render above
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tabsOverlay: {
    flexDirection: "row",
    height: TAB_BAR_HEIGHT + (Platform.OS === "ios" ? spacing.lg : 0),
    paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.sm,
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

