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

interface DeclineInvitationSheetProps {
  visible: boolean;
  onClose: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

export function DeclineInvitationSheet({
  visible,
  onClose,
  onDecline,
  isLoading = false,
}: DeclineInvitationSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isDismissingRef = useRef(false);
  const previousVisibleRef = useRef(false);
  const hasMountedRef = useRef(false);

  const bottomInset = useMemo(() => {
    return Math.max(insets.bottom, 20) + 20;
  }, [insets.bottom]);

  useEffect(() => {
    const wasVisible = previousVisibleRef.current;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousVisibleRef.current = visible;

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

    previousVisibleRef.current = visible;

    if (visible && !wasVisible) {
      isDismissingRef.current = false;
      const timeoutId = setTimeout(() => {
        if (bottomSheetRef.current) {
          bottomSheetRef.current.present();
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    } else if (!visible && wasVisible) {
      isDismissingRef.current = true;
      bottomSheetRef.current?.dismiss();
      return undefined;
    }
    return undefined;
  }, [visible]);

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

  const handleDecline = () => {
    onDecline();
  };

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
                ? "#EF444420"
                : "#EF444415",
            },
          ]}
        >
          <Feather
            name="x-circle"
            size={48}
            color="#EF4444"
          />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: theme.colors.textPrimary },
          ]}
        >
          Decline Invitation
        </Text>

        {/* Message */}
        <Text
          style={[
            styles.message,
            { color: theme.colors.textSecondary },
          ]}
        >
          Are you sure you want to decline this Secret Santa invitation? You won't be able to join unless the organizer invites you again.
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
              styles.declineButton,
              { backgroundColor: "#EF4444" },
              isLoading && styles.buttonDisabled
            ]}
            onPress={handleDecline}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="x" size={18} color="#fff" />
                <Text style={styles.declineButtonText}>Decline</Text>
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
    marginHorizontal: spacing.lg,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.xl,
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
  declineButton: {
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
