import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Pressable,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "./Text";
import { FAB_SIZE, FAB_PADDING, FAB_BOTTOM_POSITION } from "./fabConstants";
import { useTheme } from "@/contexts/ThemeContext";
import { useSegments } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Shared state to track navigation across component unmounts
// This is imported/exported to share with AnimatedFAB
let wasOnDetailPage = false;
export const setWasOnDetailPage = (value: boolean) => {
  wasOnDetailPage = value;
};
export const getWasOnDetailPage = () => wasOnDetailPage;

interface FABMenuItem {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress: () => void;
}

interface FABMenuProps {
  visible: boolean;
  onToggle: () => void;
  onClose: () => void;
  onManualAdd: () => void;
  variant?: "center" | "bottom-right";
  positionStyle?: "tab-bar" | "screen";
}

export function FABMenu({
  visible,
  onToggle,
  onClose,
  onManualAdd,
  variant = "bottom-right",
  positionStyle = "screen",
}: FABMenuProps) {
  const { theme } = useTheme();
  const segments = useSegments();
  const isBottomRight = variant === "bottom-right";

  // Calculate FAB position
  const centerX = SCREEN_WIDTH / 2 - FAB_SIZE / 2;
  const rightX = SCREEN_WIDTH - FAB_PADDING - FAB_SIZE;
  const targetX = isBottomRight ? rightX : centerX;
  
  // Animated position values for smooth transitions
  // Always start from center position to allow smooth transition from wishlists page
  const fabPositionX = useRef(new Animated.Value(centerX)).current;

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;
  
  // Track if we're on a detail page and update shared state
  const isDetailPage = segments.includes("wishlist") && segments.length > 1;
  
  // Update shared state when on detail page - keep it true while we're on detail page
  useEffect(() => {
    if (isDetailPage) {
      setWasOnDetailPage(true);
    }
    // Don't clear it here - let AnimatedFAB clear it when it mounts on the main page
  }, [isDetailPage]);
  
  // Track previous route to detect navigation direction
  const previousRouteRef = useRef<string>("");
  const previousIsDetailPageRef = useRef<boolean>(false);
  
  // Animate FAB position when variant changes or when navigating
  useEffect(() => {
    const currentRoute = segments.join("/");
    const wasDetailPage = previousIsDetailPageRef.current;
    const wasMainPage = previousRouteRef.current === "" || previousRouteRef.current === "(tabs)/index" || previousRouteRef.current.includes("(tabs)");
    
    // Detect navigation direction
    if (isDetailPage && wasMainPage && isBottomRight) {
      // Navigating TO detail page: start from center and animate to right
      fabPositionX.setValue(centerX);
    } else if (!isDetailPage && wasDetailPage && !isBottomRight) {
      // Navigating BACK from detail page: start from right and animate to center
      fabPositionX.setValue(rightX);
    }
    
    // Animate to target X position (center or right)
    Animated.spring(fabPositionX, {
      toValue: targetX,
      tension: 100,
      friction: 9,
      useNativeDriver: false, // Position animations don't support native driver
    }).start();
    
    // Update previous state
    previousRouteRef.current = currentRoute;
    previousIsDetailPageRef.current = isDetailPage;
  }, [variant, targetX, fabPositionX, segments, isBottomRight, centerX, rightX, isDetailPage]);
  const option1Translate = useRef(new Animated.Value(0)).current;
  const option2Translate = useRef(new Animated.Value(0)).current;
  const option3Translate = useRef(new Animated.Value(0)).current;
  const option4Translate = useRef(new Animated.Value(0)).current;
  const option1Opacity = useRef(new Animated.Value(0)).current;
  const option2Opacity = useRef(new Animated.Value(0)).current;
  const option3Opacity = useRef(new Animated.Value(0)).current;
  const option4Opacity = useRef(new Animated.Value(0)).current;

  // Distance between option buttons
  const OPTION_SPACING = 70;
  const OPTION_SIZE = 56;

  // Menu items
  const menuItems: FABMenuItem[] = [
    {
      label: "Scan barcode",
      icon: "maximize",
      color: "#6B7280",
      onPress: () => {
        onClose();
        // TODO: Implement barcode scanning
        console.log("Scan barcode");
      },
    },
    {
      label: "From other apps",
      icon: "globe",
      color: "#3B82F6",
      onPress: () => {
        onClose();
        // TODO: Implement share from other apps
        console.log("From other apps");
      },
    },
    {
      label: "Add by link",
      icon: "link",
      color: "#EF4444",
      onPress: () => {
        onClose();
        // TODO: Implement add by link
        console.log("Add by link");
      },
    },
    {
      label: "Add manually",
      icon: "edit-3",
      color: theme.colors.primary,
      onPress: () => {
        onClose();
        onManualAdd();
      },
    },
  ];

  useEffect(() => {
    if (visible) {
      // Open animations - faster and more responsive
      Animated.parallel([
        // Backdrop
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        // FAB rotation (45 degrees = π/4 radians)
        Animated.spring(fabRotation, {
          toValue: 1,
          tension: 100,
          friction: 9,
          useNativeDriver: true,
        }),
        // Options animate up with stagger - faster with stagger delay
        Animated.stagger(50, [ // 50ms delay between each animation
          Animated.parallel([
            Animated.spring(option1Translate, {
              toValue: 1,
              tension: 100,
              friction: 9,
              useNativeDriver: true,
            }),
            Animated.timing(option1Opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(option2Translate, {
              toValue: 1,
              tension: 100,
              friction: 9,
              useNativeDriver: true,
            }),
            Animated.timing(option2Opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(option3Translate, {
              toValue: 1,
              tension: 100,
              friction: 9,
              useNativeDriver: true,
            }),
            Animated.timing(option3Opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(option4Translate, {
              toValue: 1,
              tension: 100,
              friction: 9,
              useNativeDriver: true,
            }),
            Animated.timing(option4Opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    } else {
      // Close animations (reverse) - faster
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(fabRotation, {
          toValue: 0,
          tension: 100,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(option1Translate, {
            toValue: 0,
            tension: 100,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(option1Opacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(option2Translate, {
            toValue: 0,
            tension: 100,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(option2Opacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(option3Translate, {
            toValue: 0,
            tension: 100,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(option3Opacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(option4Translate, {
            toValue: 0,
            tension: 100,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(option4Opacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, backdropOpacity, fabRotation, option1Translate, option2Translate, option3Translate, option4Translate, option1Opacity, option2Opacity, option3Opacity, option4Opacity]);

  const rotation = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const getOptionStyle = (
    translate: Animated.Value,
    opacity: Animated.Value,
    index: number
  ) => {
    const translateY = translate.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -(OPTION_SPACING * (index + 1))],
    });

    return {
      transform: [{ translateY }],
      opacity,
    };
  };

  const getOptionPosition = () => {
    // Position the container starting from left padding
    // The row width will extend to FAB right edge, ensuring buttons align with FAB
    return {
      left: 20, // Start from left padding
      bottom: FAB_BOTTOM_POSITION + (FAB_SIZE - OPTION_SIZE) / 2, // Align with FAB center vertically
    };
  };

  const getFabContainerStyle = () => {
    if (positionStyle === "tab-bar") {
      // For tab-bar, use absolute positioning with animated center position
      return {
        position: "absolute" as const,
        width: FAB_SIZE,
        height: FAB_SIZE,
        zIndex: 1000,
        bottom: FAB_BOTTOM_POSITION,
      };
    } else {
      // For screen positioning, use absolute with animated position
      return {
        position: "absolute" as const,
        width: FAB_SIZE,
        height: FAB_SIZE,
        zIndex: 10000,
        bottom: FAB_BOTTOM_POSITION,
      };
    }
  };

  return (
    <>
      {/* FAB Button with rotation - always visible */}
      {!visible && (
        <Animated.View
          style={[
            getFabContainerStyle(),
            {
              left: fabPositionX, // Animated horizontal position
              transform: [{ rotate: rotation }],
              pointerEvents: "box-none",
            },
          ]}
        >
          <TouchableOpacity
            onPress={onToggle}
            activeOpacity={0.9}
            style={[
              styles.fab,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
              },
            ]}
          >
            <Feather name="plus" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Menu Overlay - only visible when menu is open */}
      {visible && (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
          <View style={styles.container} pointerEvents="box-none">
            {/* Backdrop */}
            <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    opacity: backdropOpacity,
                  },
                ]}
              />
            </Pressable>

            {/* FAB Button with rotation - shown in overlay so it appears above backdrop */}
            <Animated.View
              style={[
                getFabContainerStyle(),
                {
                  left: fabPositionX, // Animated horizontal position
                  transform: [{ rotate: rotation }],
                  pointerEvents: "box-none",
                  zIndex: 10001,
                },
              ]}
            >
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.9}
                style={[
                  styles.fab,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
              >
                <Feather name="plus" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>


        {/* Option Buttons */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {menuItems.map((item, index) => {
            const translate = [option1Translate, option2Translate, option3Translate, option4Translate][index];
            const opacity = [option1Opacity, option2Opacity, option3Opacity, option4Opacity][index];
            const position = getOptionPosition();
            
            return (
              <Animated.View
                key={item.label}
                style={[
                  styles.optionContainer,
                  getOptionStyle(translate, opacity, index),
                  position,
                ]}
                pointerEvents="box-none"
              >
                <View style={[
                  styles.optionRow,
                  { width: targetX + FAB_SIZE - 20 } // Width from left padding to FAB right edge
                ]}>
                  <View style={styles.optionLabelContainer}>
                    <View style={[styles.optionLabelBackground, { backgroundColor: theme.isDark ? '#2E2E2E' : '#FFFFFF' }]}>
                      <Text 
                        style={[styles.optionLabel, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.label}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={item.onPress}
                    activeOpacity={0.8}
                    style={[styles.optionButton, { backgroundColor: item.color }]}
                  >
                    <Feather name={item.icon} size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>
        </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
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
  optionContainer: {
    position: "absolute",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  optionLabelContainer: {
    marginRight: 12,
    flexShrink: 1,
  },
  optionLabelBackground: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: "100%",
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

