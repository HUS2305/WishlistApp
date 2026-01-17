import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
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

interface DrawNamesConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  participantCount: number;
  isLoading?: boolean;
}

export function DrawNamesConfirmSheet({
  visible,
  onClose,
  onConfirm,
  participantCount,
  isLoading = false,
}: DrawNamesConfirmSheetProps) {
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

  const handleCancel = () => {
    isDismissingRef.current = true;
    bottomSheetRef.current?.dismiss();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  // Snap points for dynamic sizing (undefined enables autoHeight)
  const snapPoints = useMemo(() => undefined, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!isLoading}
      enableContentPanningGesture={!isLoading}
      enableHandlePanningGesture={!isLoading}
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
        {/* Icon */}
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
            name="shuffle"
            size={48}
            color={theme.colors.primary}
          />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: theme.colors.textPrimary },
          ]}
        >
          Draw Names
        </Text>

        {/* Message */}
        <Text
          style={[
            styles.message,
            { color: theme.colors.textSecondary },
          ]}
        >
          Are you sure you want to draw names now? This will randomly assign gift recipients to all {participantCount} participants. This cannot be undone!
        </Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              {
                backgroundColor: theme.isDark ? '#2E2E2E' : '#F3F4F6',
                borderColor: theme.colors.textSecondary + '40',
              }
            ]}
            onPress={handleCancel}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.cancelButtonText,
              { color: theme.colors.textPrimary }
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              { backgroundColor: theme.colors.primary },
              isLoading && styles.buttonDisabled
            ]}
            onPress={handleConfirm}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="shuffle" size={18} color="#fff" />
                <Text style={styles.confirmButtonText}>Draw Names</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
