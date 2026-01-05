import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
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
  bypassMenu?: boolean; // When true, FAB directly calls onManualAdd without showing menu
}

export function FABMenu({
  visible,
  onToggle,
  onClose,
  onManualAdd,
  variant = "bottom-right",
  positionStyle = "screen",
  bypassMenu = false,
}: FABMenuProps) {
  const { theme } = useTheme();
  const segments = useSegments();
  const isBottomRight = variant === "bottom-right";
  
  // Keep Modal mounted during close animation to allow rotation to complete
  const [modalVisible, setModalVisible] = useState(false);
  
  // Track external sheets to fade FAB when they're open
  // This will be set via a prop or context if needed
  const externalSheetOpen = false; // Can be enhanced later if needed

  // Calculate FAB position
  const centerX = SCREEN_WIDTH / 2 - FAB_SIZE / 2;
  const rightX = SCREEN_WIDTH - FAB_PADDING - FAB_SIZE;
  const targetX = isBottomRight ? rightX : centerX;
  
  // Animated position values for smooth transitions
  // Use translateX offset from initial position (0 = no offset from initial left)
  const fabPositionX = useRef(new Animated.Value(0)).current;

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current; // For plus to X rotation animation
  
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
    
    // Calculate the offset needed from initial position
    const baseLeft = isBottomRight ? rightX : centerX;
    const targetOffset = targetX - baseLeft;
    
    // Detect navigation direction
    if (isDetailPage && wasMainPage && isBottomRight) {
      // Navigating TO detail page: start from center offset and animate to right offset
      const centerOffset = centerX - baseLeft;
      fabPositionX.setValue(centerOffset);
    } else if (!isDetailPage && wasDetailPage && !isBottomRight) {
      // Navigating BACK from detail page: start from right offset and animate to center offset
      const rightOffset = rightX - baseLeft;
      fabPositionX.setValue(rightOffset);
    }
    
    // Animate to target X offset (0 = no offset from base position)
    Animated.spring(fabPositionX, {
      toValue: targetOffset,
      tension: 100,
      friction: 9,
      useNativeDriver: true, // translateX supports native driver!
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
      label: "Add manually",
      icon: "edit-3",
      color: theme.colors.primary,
      onPress: () => {
        console.log("✅ Add manually button pressed!");
        onManualAdd(); // Call this first so it can set state before menu closes
        onClose(); // Then close the menu
      },
    },
  ];

  // Sync modal visibility with visible prop
  // Delay hiding modal slightly to allow smooth transition, but not too long
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
    } else {
      // Hide modal after a very short delay to allow FAB rotation to start smoothly
      // This ensures the rotation animation transfers properly from modal FAB to outside FAB
      const timeoutId = setTimeout(() => {
        setModalVisible(false);
      }, 50); // 50ms delay - short enough to feel instant, long enough for smooth transition
      
      return () => clearTimeout(timeoutId);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && modalVisible) {
      // Reset values to starting position before animating
      backdropOpacity.setValue(0);
      fabRotation.setValue(0);
      option1Translate.setValue(0);
      option2Translate.setValue(0);
      option3Translate.setValue(0);
      option4Translate.setValue(0);
      option1Opacity.setValue(0);
      option2Opacity.setValue(0);
      option3Opacity.setValue(0);
      option4Opacity.setValue(0);
      
      // Small delay to ensure Modal is fully mounted before animating
      const timeoutId = setTimeout(() => {
        // Open animations - faster and more responsive
        Animated.parallel([
        // Backdrop
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        // FAB rotation (45 degrees = π/4 radians) - rotates plus to X
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
      }, 10); // 10ms delay to ensure Modal is mounted
      
      return () => clearTimeout(timeoutId);
    } else if (!visible) {
      // Close animations (reverse) - faster
      // Start rotation animation immediately, then hide modal after short delay
      // This ensures smooth rotation transition from modal FAB to outside FAB
      Animated.parallel([
        // FAB rotation back to plus (0 degrees) - this is the important one
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
      ]).start(() => {
        // After close animation completes, reset all values
        backdropOpacity.setValue(0);
        fabRotation.setValue(0);
        option1Translate.setValue(0);
        option2Translate.setValue(0);
        option3Translate.setValue(0);
        option4Translate.setValue(0);
        option1Opacity.setValue(0);
        option2Opacity.setValue(0);
        option3Opacity.setValue(0);
        option4Opacity.setValue(0);
      });
    }
  }, [visible, modalVisible, backdropOpacity, fabRotation, option1Translate, option2Translate, option3Translate, option4Translate, option1Opacity, option2Opacity, option3Opacity, option4Opacity]);

  // Rotation interpolation for smooth plus to X transition
  const rotation = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"], // Rotate plus icon 45deg to make it look like X
  });
  
  // Always show plus icon, rotation makes it look like X when rotated 45deg
  const iconName: keyof typeof Feather.glyphMap = "plus";

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
    // Use left position for initial placement, then translateX for animation
    const baseLeft = isBottomRight ? rightX : centerX;
    
    if (positionStyle === "tab-bar") {
      // For tab-bar, use absolute positioning with animated center position
      return {
        position: "absolute" as const,
        width: FAB_SIZE,
        height: FAB_SIZE,
        zIndex: 1, // Low z-index - bottom sheets use portals and render above
        bottom: FAB_BOTTOM_POSITION,
        left: baseLeft, // Initial position
      };
    } else {
      // For screen positioning, use absolute with animated position
      return {
        position: "absolute" as const,
        width: FAB_SIZE,
        height: FAB_SIZE,
        zIndex: 1, // Low z-index - bottom sheets use portals and render above
        bottom: FAB_BOTTOM_POSITION,
        left: baseLeft, // Initial position
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
              transform: [
                { translateX: fabPositionX },
                { rotate: rotation },
              ],
              pointerEvents: "box-none",
            },
          ]}
        >
          <TouchableOpacity
            onPress={bypassMenu ? () => {
              console.log("✅ FAB pressed - bypassing menu, opening add item directly");
              onManualAdd();
            } : onToggle}
            activeOpacity={0.9}
            style={[
              styles.fab,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Feather name={iconName} size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Menu Overlay - only visible when menu is open and not bypassing menu */}
      {modalVisible && !bypassMenu && (
        <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
          <View style={styles.container} pointerEvents="box-none">
            {/* Backdrop - rendered first so buttons can be on top */}
            <TouchableWithoutFeedback onPress={onClose}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    opacity: backdropOpacity,
                  },
                ]}
              />
            </TouchableWithoutFeedback>

            {/* FAB Button with rotation - shown in overlay so it appears above backdrop */}
            <Animated.View
              style={[
                getFabContainerStyle(),
                {
                  transform: [
                    { translateX: fabPositionX },
                    { rotate: rotation },
                  ],
                  pointerEvents: "box-none",
                  zIndex: 2, // Slightly higher than base FAB but still lower than bottom sheets (portals)
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
                  },
                ]}
              >
                <Feather name={iconName} size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>


        {/* Option Buttons - Must be rendered after backdrop to be on top */}
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 10002 }]} pointerEvents="box-none">
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
                  { zIndex: 10002 }, // Ensure buttons are above backdrop
                ]}
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  onPress={() => {
                    console.log(`✅ ${item.label} button pressed!`);
                    item.onPress();
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.optionRow,
                    { width: targetX + FAB_SIZE - 20 } // Width from left padding to FAB right edge
                  ]}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
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
                  <View style={[styles.optionButton, { backgroundColor: item.color }]}>
                    <Feather name={item.icon} size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
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

