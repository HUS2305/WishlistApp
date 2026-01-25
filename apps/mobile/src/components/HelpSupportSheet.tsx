import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Linking } from "react-native";
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

interface HelpSupportSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SUPPORT_EMAIL = "support@wishly.app";

export function HelpSupportSheet({
  visible,
  onClose,
}: HelpSupportSheetProps) {
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

  const handleEmailPress = () => {
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=Support Request`;
    Linking.openURL(mailtoUrl).catch((err) => {
      console.error("Failed to open email client:", err);
    });
  };

  const handleDone = () => {
    // Set dismissing flag and dismiss the sheet programmatically
    isDismissingRef.current = true;
    bottomSheetRef.current?.dismiss();
    // onChange handler will call onClose when sheet is dismissed
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
        {/* Help Icon */}
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
            name="help-circle"
            size={64}
            color={theme.colors.primary}
          />
        </View>

        {/* Support Message */}
        <Text
          style={[
            styles.message,
            { color: theme.colors.textPrimary },
          ]}
        >
          Need help? Contact us at:
        </Text>

        {/* Email Section */}
        <View style={styles.emailSection}>
          <TouchableOpacity
            onPress={handleEmailPress}
            style={styles.emailButton}
            activeOpacity={0.7}
          >
            <Feather name="mail" size={18} color={theme.colors.primary} />
            <Text
              style={[
                styles.emailText,
                { color: theme.colors.primary },
              ]}
            >
              {SUPPORT_EMAIL}
            </Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: spacing.xl, // 32px
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    textAlign: "center",
    marginBottom: spacing.sm, // 24px
  },
  emailSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xl, // 32px
  },
  emailLabel: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.sm, // 12px
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm, // 12px
    paddingVertical: spacing.sm, // 12px
    paddingHorizontal: spacing.base, // 16px
  },
  emailText: {
    fontSize: 16,
    fontWeight: "700",
    textDecorationLine: "underline",
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

