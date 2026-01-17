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

interface MarkCompleteSuccessSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function MarkCompleteSuccessSheet({
  visible,
  onClose,
}: MarkCompleteSuccessSheetProps) {
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

  const handleDone = () => {
    isDismissingRef.current = true;
    bottomSheetRef.current?.dismiss();
  };

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
          Event Ended!
        </Text>

        {/* Message */}
        <Text
          style={[
            styles.message,
            { color: theme.colors.textSecondary },
          ]}
        >
          The Secret Santa event has ended. Hope everyone enjoyed their gifts!
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
  button: {
    width: "100%",
    paddingVertical: spacing.base,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
