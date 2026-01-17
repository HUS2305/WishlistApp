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

interface DrawNamesSuccessSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function DrawNamesSuccessSheet({
  visible,
  onClose,
}: DrawNamesSuccessSheetProps) {
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
      return undefined;
    }
    return undefined;
  }, [visible]);

  // Handle sheet changes
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        const wasDismissingProgrammatically = isDismissingRef.current;
        isDismissingRef.current = false;

        if (!wasDismissingProgrammatically) {
          onClose();
        }
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

  const handleDone = () => {
    isDismissingRef.current = true;
    bottomSheetRef.current?.dismiss();
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
                ? "#10B98120"
                : "#10B98115",
            },
          ]}
        >
          <Feather
            name="check-circle"
            size={48}
            color="#10B981"
          />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: theme.colors.textPrimary },
          ]}
        >
          Names Drawn!
        </Text>

        {/* Message */}
        <Text
          style={[
            styles.message,
            { color: theme.colors.textSecondary },
          ]}
        >
          All participants have been assigned their gift recipients. They can now reveal who they're buying for!
        </Text>

        {/* Done Button */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>OK</Text>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg, // 24px
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: spacing.sm, // 12px
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.xl, // 32px
    paddingHorizontal: spacing.sm,
  },
  button: {
    width: "100%",
    paddingVertical: spacing.base, // 16px
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56, // Large button
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
