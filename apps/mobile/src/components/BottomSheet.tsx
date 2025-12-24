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
  autoHeight?: boolean; // If true, height adjusts to content (with max constraint)
}

export function BottomSheet({ visible, onClose, children, height = 0.9, autoHeight = false }: BottomSheetProps) {
  const { theme } = useTheme();
  const contentRef = useRef<View>(null);
  const [contentHeight, setContentHeight] = useState(0);
  
  const fixedMinHeight = SCREEN_HEIGHT * height;
  const maxHeight = SCREEN_HEIGHT * 0.9;
  // For autoHeight, start with a reasonable default, will be updated when content is measured
  const minHeight = autoHeight ? (contentHeight > 0 ? contentHeight + 60 : 200) : fixedMinHeight;
  const [currentHeight, setCurrentHeight] = useState(autoHeight ? 200 : fixedMinHeight);
  const translateY = useRef(new Animated.Value(autoHeight ? 200 : fixedMinHeight)).current;
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
    
          // Hide modal immediately by setting translateY to currentHeight (no animation)
          translateY.setValue(currentHeight);
    
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
  
  // Measure content height when autoHeight is enabled
  const handleContentLayout = useCallback((event: any) => {
    if (autoHeight) {
      const { height: measuredHeight } = event.nativeEvent.layout;
      if (measuredHeight > 0) {
        // Add padding for drag handle area (48px) and some bottom padding (12px)
        const totalHeight = measuredHeight + 60;
        const clampedHeight = Math.min(Math.max(totalHeight, 150), maxHeight);
        
        // Only update if significantly different to avoid infinite loops
        if (Math.abs(measuredHeight - contentHeight) > 5 || contentHeight === 0) {
          setContentHeight(measuredHeight);
          setCurrentHeight(clampedHeight);
          // Also update translateY initial position
          translateY.setValue(clampedHeight);
        }
      }
    }
  }, [autoHeight, maxHeight, contentHeight, translateY]);

  // Update height when contentHeight changes (for autoHeight)
  useEffect(() => {
    if (autoHeight && contentHeight > 0 && visible) {
      const targetHeight = Math.min(Math.max(contentHeight + 60, 150), maxHeight);
      setCurrentHeight(targetHeight);
    }
  }, [contentHeight, autoHeight, visible, maxHeight]);

  // Handle visibility changes and animations
  useEffect(() => {
    if (visible && !isClosing) {
      // Reset height to minimum when opening
      if (autoHeight) {
        // If we have measured content, use it; otherwise use default
        const targetHeight = contentHeight > 0 
          ? Math.min(Math.max(contentHeight + 60, 150), maxHeight)
          : 200;
        setCurrentHeight(targetHeight);
      } else {
        setCurrentHeight(fixedMinHeight);
      }
      
      // Opening - animate in
      // Stop any ongoing animations first
      translateY.stopAnimation();
      opacity.stopAnimation();
      
      // Reset to starting position immediately (this is critical!)
      const startHeight = autoHeight 
        ? (contentHeight > 0 ? Math.min(Math.max(contentHeight + 60, 150), maxHeight) : 200)
        : fixedMinHeight;
      translateY.setValue(startHeight);
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
  }, [visible, isClosing, translateY, opacity, minHeight]);
  
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
  
  // Pan responder for the entire sheet - allows pull-to-dismiss from anywhere
  // Uses capture phase to intercept touches before ScrollViews get them
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to clear downward drags
        // Must be moving down more than horizontally and have sufficient movement
        const isDownwardDrag = 
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && 
          gestureState.dy > 10; // Lower threshold for better responsiveness
        return isDownwardDrag;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Capture phase - intercept before ScrollViews
        // Only for clear downward drags
        const isDownwardDrag = 
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && 
          gestureState.dy > 10;
        return isDownwardDrag;
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animations
        translateY.stopAnimation();
        // Get the current value directly (should be 0 when fully open)
        const currentVal = translateYCurrent.current;
        // Store current position as offset
        translateY.setOffset(currentVal);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward dragging (positive dy)
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Get the dragged distance
        const draggedDistance = gestureState.dy;
        
        // Flatten the offset - this combines offset and value into a single value
        translateY.flattenOffset();
        
        // If dragged down more than threshold or with sufficient velocity, dismiss
        if (draggedDistance > DRAG_THRESHOLD || gestureState.vy > 0.3) {
          // Dismiss the sheet immediately
          if (handleCloseWithAnimationRef.current) {
            handleCloseWithAnimationRef.current();
          }
        } else {
          // Snap back to original position (0 = fully open)
          // The translateY is now at the dragged position after flattenOffset
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated (e.g., by another responder), snap back
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

  // Track initial height when drag starts
  const initialHeight = useRef(minHeight);

  // Separate pan responder for drag handle - allows resizing and dismissing
  const dragHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store initial height when drag starts
        initialHeight.current = currentHeight;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new height based on drag direction
        // Dragging up (negative dy) increases height
        // Dragging down (positive dy) decreases height
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight, initialHeight.current - gestureState.dy)
        );
        
        // Update height state immediately for responsive resizing
        setCurrentHeight(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalHeight = Math.max(
          minHeight,
          Math.min(maxHeight, initialHeight.current - gestureState.dy)
        );
        setCurrentHeight(finalHeight);
        
        // If dragged down significantly from minimum height, dismiss
        if (gestureState.dy > DRAG_THRESHOLD && finalHeight <= minHeight && gestureState.vy > 0.3) {
          if (handleCloseWithAnimationRef.current) {
            handleCloseWithAnimationRef.current();
          }
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
              height: currentHeight,
              maxHeight: maxHeight,
              transform: [{ translateY }],
            },
          ]}
          {...sheetPanResponder.panHandlers}
        >
          {/* Drag Handle - larger area for easier dragging */}
          <View 
            style={styles.dragHandleContainer}
            {...sheetPanResponder.panHandlers}
          >
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: theme.colors.textSecondary + '40' },
              ]}
            />
          </View>

          {/* Content - pan responder on parent allows pull-to-dismiss */}
          {autoHeight ? (
            <View 
              ref={contentRef}
              onLayout={handleContentLayout}
              style={styles.autoHeightWrapper}
            >
              {children}
            </View>
          ) : (
            <View style={styles.content} pointerEvents="box-none">
              {children}
            </View>
          )}
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
    paddingVertical: 16,
    // Larger touch area for easier dragging
    minHeight: 48,
    justifyContent: "center",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1, // Use flex: 1 instead of flexGrow to ensure proper scrolling
    minHeight: 0, // Important for ScrollView to work properly
    overflow: 'hidden', // Ensure content doesn't overflow
  },
  autoHeightWrapper: {
    // No flex - let content determine size naturally
    width: '100%',
  },
});

