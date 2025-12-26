import React, { useEffect, useLayoutEffect, useRef } from "react";
import { TouchableOpacity, Animated, StyleSheet, Dimensions, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { FAB_SIZE, FAB_PADDING, FAB_BOTTOM_POSITION } from "./fabConstants";
import { useTheme } from "@/contexts/ThemeContext";
import { useSegments } from "expo-router";
import { getWasOnDetailPage, setWasOnDetailPage } from "./FABMenu";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AnimatedFABProps {
  onPress: () => void;
  variant?: "center" | "bottom-right";
  positionStyle?: "tab-bar" | "screen"; // Whether positioned relative to tab bar or screen
}

export function AnimatedFAB({ onPress, variant = "center", positionStyle = "tab-bar" }: AnimatedFABProps) {
  const { theme } = useTheme();
  const segments = useSegments();
  const isBottomRight = variant === "bottom-right";
  
  // Calculate X translation - only horizontal movement, no vertical movement
  // Center position: x = SCREEN_WIDTH / 2 - FAB_SIZE / 2 (centered)
  // Right position: x = SCREEN_WIDTH - FAB_PADDING - FAB_SIZE (right edge with padding)
  // Translation needed: (SCREEN_WIDTH - FAB_PADDING - FAB_SIZE) - (SCREEN_WIDTH / 2 - FAB_SIZE / 2)
  // = SCREEN_WIDTH - FAB_PADDING - FAB_SIZE - SCREEN_WIDTH / 2 + FAB_SIZE / 2
  // = SCREEN_WIDTH / 2 - FAB_PADDING - FAB_SIZE / 2
  const centerX = SCREEN_WIDTH / 2 - FAB_SIZE / 2;
  const rightX = SCREEN_WIDTH - FAB_PADDING - FAB_SIZE;
  const rightTranslation = rightX - centerX; // Distance from center to right
  
  const isDetailPage = segments.includes("wishlist") && segments.length > 1;
  
  // Initialize translateX - will be set in useEffect based on navigation state
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const hasInitializedRef = useRef(false);

  // useNativeDriver doesn't work on web, so we disable it for web
  const useNativeDriver = Platform.OS !== 'web';

  // Check flag synchronously before first paint
  useLayoutEffect(() => {
    // On first mount, check if we're coming back from a detail page
    if (!hasInitializedRef.current && !isDetailPage && !isBottomRight) {
      const wasOnDetailPage = getWasOnDetailPage();
      if (wasOnDetailPage) {
        // Start from right position and animate to center
        translateX.setValue(rightTranslation);
        // Clear the flag immediately
        setWasOnDetailPage(false);
      }
      hasInitializedRef.current = true;
    }
  }, []); // Only run on mount

  useEffect(() => {
    // Update shared state when on detail page
    if (isDetailPage) {
      setWasOnDetailPage(true);
    }
    
    const targetX = isBottomRight ? rightTranslation : 0;
    
    // Animate to target position
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver,
      tension: 100,
      friction: 9,
    }).start();
  }, [variant, translateX, isBottomRight, useNativeDriver, segments, rightTranslation, isDetailPage]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View
      style={[
        getFabContainerStyle(positionStyle),
        {
          transform: [
            { translateX },
            { scale },
          ],
          pointerEvents: "box-none",
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
          variant === "bottom-right" && styles.fabBottomRight,
        ]}
      >
        <Feather name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const getFabContainerStyle = (positionStyle: "tab-bar" | "screen") => {
  if (positionStyle === "tab-bar") {
    // Positioned relative to notch container in tab bar
    // The positioning is handled by the notchArea in TabBarWithNotch
    return {
      position: "relative" as const,
      width: FAB_SIZE,
      height: FAB_SIZE,
      zIndex: 1000,
      alignSelf: "center" as const,
    };
  } else {
    // Positioned relative to screen (detail pages)
    // Use the shared constant for exact positioning
    return {
      position: "absolute" as const,
      width: FAB_SIZE,
      height: FAB_SIZE,
      zIndex: 9999, // Higher zIndex to ensure it's above modals
      left: SCREEN_WIDTH / 2 - FAB_SIZE / 2, // Start from center (will be translated right)
      bottom: FAB_BOTTOM_POSITION,
    };
  }
};

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabBottomRight: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
  },
});
