import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useTheme } from "@/contexts/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface BottomSheetProps {
  /** Controls visibility of the bottom sheet */
  visible: boolean;
  /** Callback when the sheet should be closed (user dismisses or programmatically) */
  onClose: () => void;
  /** Content to render inside the sheet */
  children: React.ReactNode;
  /** Custom snap points (e.g., ['25%', '50%', '90%'] or [200, 500]). If not provided, uses height or autoHeight */
  snapPoints?: (string | number)[];
  /** If true, sheet height adjusts to content size (dynamic sizing). Default: false */
  autoHeight?: boolean;
  /** Height as percentage of screen (0-1). Only used if snapPoints and autoHeight are not set. Default: 0.9 */
  height?: number;
  /** Maximum height for dynamic sizing. Defaults to 90% of screen height */
  maxHeight?: number;
  /** Enable pan down gesture to close. Default: true */
  enablePanDownToClose?: boolean;
  /** Enable content panning gesture. Default: true */
  enableContentPanningGesture?: boolean;
  /** Enable handle panning gesture. Default: true */
  enableHandlePanningGesture?: boolean;
  /** Enable over drag (drag beyond snap points). Default: false */
  enableOverDrag?: boolean;
  /** Custom backdrop opacity. Default: 0.5 */
  backdropOpacity?: number;
  /** Stack behavior when multiple modals are present. 'push' mounts on top, 'switch' minimizes current then mounts new, 'replace' dismisses current then mounts new. Default: 'switch' */
  stackBehavior?: "push" | "switch" | "replace";
  /** Footer component that stays fixed at the bottom. Use BottomSheetFooter from @gorhom/bottom-sheet */
  footerComponent?: React.FC<any>;
  /** Keyboard behavior: 'extend' extends to max snap point, 'fillParent' fills parent, 'interactive' offsets by keyboard. Default: 'interactive' */
  keyboardBehavior?: 'extend' | 'fillParent' | 'interactive';
  /** Initial snap point index. Default: 0 (first snap point) */
  index?: number;
  /** If true, children are rendered directly without BottomSheetView wrapper. Use when children include BottomSheetScrollView/FlatList. Default: false */
  scrollable?: boolean;
}

/**
 * Reusable Bottom Sheet component using @gorhom/bottom-sheet
 * 
 * Features:
 * - ✅ Automatic stacking support (BottomSheetModal handles this natively)
 * - ✅ Dynamic sizing support
 * - ✅ Multiple snap points support
 * - ✅ Pan gestures (content and handle)
 * - ✅ Safe area insets
 * - ✅ Theme integration
 * 
 * Keyboard Handling:
 * - Always use BottomSheetTextInput instead of TextInput for proper keyboard handling
 * - The library handles keyboard automatically when using BottomSheetTextInput
 * - Uses keyboardBlurBehavior="restore" to restore sheet position when keyboard dismisses
 * - See: https://gorhom.dev/react-native-bottom-sheet/keyboard-handling
 * 
 * For scrollable content, use BottomSheetScrollView, BottomSheetFlatList, etc. from @gorhom/bottom-sheet
 * For text inputs, use BottomSheetTextInput from @gorhom/bottom-sheet for better keyboard handling
 * 
 * @example
 * ```tsx
 * const [visible, setVisible] = useState(false);
 * 
 * <BottomSheet
 *   visible={visible}
 *   onClose={() => setVisible(false)}
 *   autoHeight
 * >
 *   <Text>Content here</Text>
 * </BottomSheet>
 * ```
 * 
 * @example Multiple snap points
 * ```tsx
 * <BottomSheet
 *   visible={visible}
 *   onClose={() => setVisible(false)}
 *   snapPoints={['25%', '50%', '90%']}
 * >
 *   <Text>Content that can snap to different heights</Text>
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints: customSnapPoints,
  autoHeight = false,
  height = 0.9,
  maxHeight = SCREEN_HEIGHT * 0.9,
  enablePanDownToClose = true,
  enableContentPanningGesture = true,
  enableHandlePanningGesture = true,
  enableOverDrag = false,
  backdropOpacity = 0.5,
  stackBehavior = "switch",
  footerComponent,
  keyboardBehavior = "interactive",
  index = 0,
  scrollable = false,
}: BottomSheetProps) {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isDismissingRef = useRef(false);
  // Always initialize to false - this ensures conditionally rendered modals work correctly
  // When a modal mounts with visible=true, wasVisible will be false, triggering present()
  const previousVisibleRef = useRef(false);
  const hasMountedRef = useRef(false);

  // Calculate snap points
  const snapPoints = useMemo(() => {
    // If custom snap points provided, use them
    if (customSnapPoints) {
      return customSnapPoints;
    }
    
    // If autoHeight, return undefined to enable dynamic sizing
    if (autoHeight) {
      return undefined;
    }
    
    // Otherwise, use height percentage
    const targetHeight = SCREEN_HEIGHT * height;
    const clampedHeight = Math.min(targetHeight, maxHeight);
    return [clampedHeight];
  }, [customSnapPoints, autoHeight, height, maxHeight]);

  // Handle visibility changes - imperative API
  useEffect(() => {
    const wasVisible = previousVisibleRef.current;
    
    // On first mount, initialize the ref
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousVisibleRef.current = visible;
      
      // If visible on first mount (conditionally rendered modal), present it
      if (visible) {
        isDismissingRef.current = false;
        const timeoutId = setTimeout(() => {
          if (bottomSheetRef.current) {
            bottomSheetRef.current.present();
          }
        }, 50);
        return () => clearTimeout(timeoutId);
      }
      return;
    }
    
    // Update ref for next render
    previousVisibleRef.current = visible;

    if (visible && !wasVisible) {
      // Opening: reset dismiss flag and present
      isDismissingRef.current = false;
      // Small delay to ensure the modal ref is ready, especially for conditionally rendered modals
      const timeoutId = setTimeout(() => {
        if (bottomSheetRef.current) {
          bottomSheetRef.current.present();
        }
      }, 50);
      
      return () => clearTimeout(timeoutId);
    } else if (!visible && wasVisible) {
      // Closing programmatically: set flag and dismiss
      isDismissingRef.current = true;
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // Handle sheet changes - sync state when sheet closes
  // Stacking: When a child modal opens, parent's onChange is NOT called (library handles this)
  // onChange only fires when the sheet actually dismisses (index === -1)
  const handleSheetChanges = useCallback(
    (index: number) => {
      // When sheet closes (index === -1), call onClose to sync parent state
      // But only if it wasn't closed programmatically (to avoid double-calling onClose)
      if (index === -1) {
        const wasDismissingProgrammatically = isDismissingRef.current;
        // Reset flag for next time
        isDismissingRef.current = false;
        
        // Only call onClose if the sheet was closed by user interaction (drag, backdrop tap)
        // If it was closed programmatically (visible changed to false), the parent already knows
        if (!wasDismissingProgrammatically) {
          // Sheet was closed by user interaction, notify parent to update state
          onClose();
        }
        // If it was programmatic, parent already set visible=false, so no need to call onClose
      }
    },
    [onClose]
  );

  // Custom backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={backdropOpacity}
        pressBehavior="close"
      />
    ),
    [backdropOpacity]
  );

  // Custom handle component
  const renderHandle = useCallback(
    () => (
      <View style={styles.dragHandleContainer}>
        <View
          style={[
            styles.dragHandle,
            { backgroundColor: theme.colors.textSecondary + "40" },
          ]}
        />
      </View>
    ),
    [theme.colors.textSecondary]
  );

  // Content style - adjust based on sizing mode
  const contentStyle = useMemo(() => {
    if (autoHeight) {
      // Dynamic sizing: don't use flex, let content determine height
      // Remove any constraints that might interfere with height calculation
      return {
        flexShrink: 1,
      };
    }
    // Fixed height: use flex to fill available space
    // BottomSheetView automatically handles safe area, so no padding needed
    return {
      flex: 1,
      minHeight: 0,
      paddingBottom: 0,
    };
  }, [autoHeight]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={index}
      onChange={handleSheetChanges}
      enablePanDownToClose={enablePanDownToClose}
      enableContentPanningGesture={enableContentPanningGesture}
      enableHandlePanningGesture={enableHandlePanningGesture}
      enableOverDrag={enableOverDrag}
      enableDismissOnClose={true}
      enableDynamicSizing={autoHeight}
      maxDynamicContentSize={maxHeight}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary + "40" }}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      footerComponent={footerComponent}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior="restore"
      stackBehavior={stackBehavior}
      style={styles.sheet}
    >
      {scrollable ? (
        // For scrollable content (BottomSheetScrollView, BottomSheetFlatList), render directly
        // These components must be direct children of BottomSheetModal to work correctly
        children
      ) : (
        // For static content, wrap in BottomSheetView
        <BottomSheetView style={contentStyle}>
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 16,
    minHeight: 48,
    justifyContent: "center",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
