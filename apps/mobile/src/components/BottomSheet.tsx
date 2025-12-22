import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% of screen height
const DRAG_THRESHOLD = 50; // Minimum drag distance to dismiss

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number; // Optional custom height (0-1 as percentage of screen height)
}

export function BottomSheet({ visible, onClose, children, height = 0.9 }: BottomSheetProps) {
  const { theme } = useTheme();
  const sheetHeight = SCREEN_HEIGHT * height;
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);

  // Store close handler in ref so pan responders can access it
  const handleCloseWithAnimationRef = useRef<(() => void) | null>(null);

  // Handle close with animation - called directly by user actions (X button, backdrop, drag)
  const handleCloseWithAnimation = useCallback(() => {
    if (isClosingRef.current || isClosing) return; // Already closing, ignore
    
    // Set closing state immediately to disable pointer events
    isClosingRef.current = true;
    setIsClosing(true);
    
    // Stop any ongoing animations
    translateY.stopAnimation();
    opacity.stopAnimation();
    
          // Hide modal immediately by setting translateY to sheetHeight (no animation)
          translateY.setValue(sheetHeight);
    
    // Call parent's onClose immediately to start unmounting process
    // This allows QuickActionMenu to open right away
    onClose();
    
    // Reset closing state immediately so Modal can fully unmount
    // Use requestAnimationFrame to ensure state update happens after render
    requestAnimationFrame(() => {
      isClosingRef.current = false;
      setIsClosing(false);
    });
  }, [translateY, opacity, onClose, isClosing]);

  // Update ref when callback changes
  useEffect(() => {
    handleCloseWithAnimationRef.current = handleCloseWithAnimation;
  }, [handleCloseWithAnimation]);
  
  // Track previous visible state to detect when it changes from true to false
  const prevVisibleRef = useRef(visible);
  
  // Use useLayoutEffect to set closing state synchronously before paint
  // This ensures modalVisible is calculated correctly during render
  // NOTE: This only handles when parent sets visible = false directly
  // User-initiated closes (X button, backdrop, drag) use handleCloseWithAnimation
  useLayoutEffect(() => {
    if (visible && isClosingRef.current) {
      // Opening - reset closing state immediately
      isClosingRef.current = false;
      setIsClosing(false);
    }
    // Only track previous visible, don't trigger animations here
    // User actions handle closing via handleCloseWithAnimation
    prevVisibleRef.current = visible;
  }, [visible]);
  
  // Handle visibility changes and animations
  useEffect(() => {
    if (visible && !isClosing) {
      // Opening - animate in
      // Stop any ongoing animations first
      translateY.stopAnimation();
      opacity.stopAnimation();
      
      // Reset to starting position immediately (this is critical!)
      translateY.setValue(sheetHeight);
      opacity.setValue(0);
      
      // Backdrop is now STATIC - appears instantly, no animation
      // Animate sheet sliding up
      requestAnimationFrame(() => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      });
    } else if (!visible && isClosingRef.current && !isClosing) {
      // Parent set visible = false while we're already closing (shouldn't happen)
      // Just ensure state is clean
      isClosingRef.current = false;
      setIsClosing(false);
    }
  }, [visible, isClosing, translateY, opacity, sheetHeight]);
  
  // Handle close requests - start animation, then call onClose after
  const handleClose = useCallback(() => {
    if (!isClosingRef.current && !isClosing) {
      handleCloseWithAnimation();
    }
  }, [handleCloseWithAnimation]);

  // Store current translateY value for pan responder
  const translateYCurrent = useRef(0);
  useEffect(() => {
    const listenerId = translateY.addListener(({ value }) => {
      translateYCurrent.current = value;
    });
    return () => {
      translateY.removeListener(listenerId);
    };
  }, [translateY]);
  
  // NOTE: Pan responder removed - not attached to sheet to allow text input
  // Only dragHandlePanResponder is used for the drag handle
  // const panResponder = useRef(
  const _unusedPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to clear downward drags (not taps or small movements)
        // Must be moving down more than horizontally and have sufficient movement
        const isDownwardDrag = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 10;
        return isDownwardDrag;
      },
      onPanResponderGrant: () => {
        translateY.setOffset(translateYCurrent.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward dragging
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        
        // If dragged down more than threshold, dismiss immediately (no animation)
        if (gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5) {
          // Set closing state immediately to disable pointer events right away
          isClosingRef.current = true;
          setIsClosing(true);
          // Hide modal immediately by setting translateY to sheetHeight
          translateY.setValue(sheetHeight);
          // Stop any ongoing animations
          translateY.stopAnimation();
          // Call onClose immediately so Modal can start unmounting
          onClose();
          // No animation - close immediately
          // Reset closing state after a tiny delay to ensure Modal unmounts
          setTimeout(() => {
            isClosingRef.current = false;
            setIsClosing(false);
          }, 0);
        } else {
          // Snap back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, snap back
        translateY.flattenOffset();
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      },
    })
  ).current;

  // Separate pan responder for drag handle - always active for dragging
  const dragHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Use extractOffset to get current value, then set offset
        translateY.flattenOffset();
        const currentValue = (translateY as any).__getValue ? (translateY as any).__getValue() : 0;
        translateY.setOffset(currentValue);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow dragging in both directions from drag handle
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        
        // If dragged down more than threshold, dismiss immediately (no animation)
        if (gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5) {
          if (handleCloseWithAnimationRef.current) {
            handleCloseWithAnimationRef.current();
          }
        } else {
          // Snap back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      console.log("BottomSheet opening");
    } else {
      console.log("BottomSheet closing");
    }
  }, [visible]);

  // Keep modal visible only when actually visible
  // Don't keep it mounted during closing to avoid blocking touches
  const modalVisible = visible;
  
  // Don't render Modal if it's not visible
  if (!visible) {
    return null;
  }
  
  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.container}>
        {/* Backdrop - STATIC, appears instantly, no animation */}
        <View
          style={[
            styles.backdrop,
            {
              opacity: 0.25, // Lighter overlay (25% opacity instead of 40%)
              backgroundColor: 'rgba(0, 0, 0, 1)',
            },
          ]}
          pointerEvents="auto"
          collapsable={false}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseWithAnimation}
            disabled={isClosing || isClosingRef.current}
          />
        </View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              height: sheetHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Drag Handle */}
          <View 
            style={styles.dragHandleContainer}
            {...dragHandlePanResponder.panHandlers}
          >
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: theme.colors.textSecondary + '40' },
              ]}
            />
          </View>

          {/* Content - no pan responder to allow text input */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    minHeight: 0, // Important for ScrollView to work properly
  },
});

