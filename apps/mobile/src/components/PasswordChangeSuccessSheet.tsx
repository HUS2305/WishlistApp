import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@/lib/theme";

interface PasswordChangeSuccessSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PasswordChangeSuccessSheet({
  visible,
  onClose,
  onConfirm,
}: PasswordChangeSuccessSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isDismissingRef = useRef(false);
  const previousVisibleRef = useRef(false);
  const hasMountedRef = useRef(false);

  // Calculate bottom inset for detached modal (from safe area + some padding)
  const bottomInset = useMemo(() => {
    return Math.max(insets.bottom, 20) + 20; // At least 20px, plus 20px padding
  }, [insets.bottom]);

  // Handle visibility changes
  useEffect(() => {
    const wasVisible = previousVisibleRef.current;

    // On first mount, initialize the ref
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousVisibleRef.current = visible;

      // If visible on first mount, present it
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

  // Handle sheet changes
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        // Sheet was dismissed - reset flag and call onClose
        // (handleConfirm will also call onClose for programmatic dismissals, but it's idempotent)
        isDismissingRef.current = false;
        onClose();
      }
    },
    [onClose]
  );

  // Custom backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleConfirm = () => {
    // Set dismissing flag and dismiss the sheet programmatically
    isDismissingRef.current = true;
    bottomSheetRef.current?.dismiss();
    // onChange handler will call onClose when sheet is dismissed
    // Then call onConfirm after a delay to allow the sheet to close
    setTimeout(() => {
      onConfirm();
    }, 300);
  };

  // Snap points for dynamic sizing (undefined enables autoHeight)
  const snapPoints = useMemo(() => undefined, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      stackBehavior="switch"
      detached={true}
      bottomInset={bottomInset}
      style={styles.sheetContainer}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.isDark ? "#666666" : "#9CA3AF",
      }}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Success Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: theme.isDark
                ? `${theme.colors.primary}20`
                : `${theme.colors.primary}15`,
            },
          ]}
        >
          <Feather
            name="check-circle"
            size={64}
            color={theme.colors.primary}
          />
        </View>

        {/* Success Message */}
        <Text
          style={[
            styles.message,
            { color: theme.colors.textPrimary },
          ]}
        >
          Your password has been successfully changed.
        </Text>

        {/* Done Button */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    marginHorizontal: spacing.lg, // 24px horizontal spacing for detached modal
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg, // 24px
    paddingTop: spacing.xl, // 32px
    paddingBottom: spacing.xl, // 32px
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl, // 32px (increased since no title)
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    textAlign: "center",
    marginBottom: spacing.xl, // 32px
  },
  button: {
    width: "100%",
    paddingVertical: spacing.base, // 16px
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56, // Large button as requested
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

