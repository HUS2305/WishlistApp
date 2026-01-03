import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useTheme } from "@/contexts/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number; // Optional custom height (0-1 as percentage of screen height)
  autoHeight?: boolean; // If true, height adjusts to content (with max constraint)
}

export function BottomSheet({ visible, onClose, children, height = 0.9, autoHeight = false }: BottomSheetProps) {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  
  // Calculate snap points based on props
  // In @gorhom/bottom-sheet v5, dynamic sizing is done via enableDynamicSizing prop
  // For autoHeight, we use dynamic sizing; otherwise use static snap points
  const snapPoints = useMemo(() => {
    if (autoHeight) {
      // Return undefined to let enableDynamicSizing handle it
      return undefined;
    }
    const targetHeight = SCREEN_HEIGHT * height;
    const maxHeight = SCREEN_HEIGHT * 0.9;
    const clampedHeight = Math.min(targetHeight, maxHeight);
    return [clampedHeight];
  }, [height, autoHeight]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      console.log("BottomSheet opening");
    } else {
      bottomSheetRef.current?.dismiss();
      console.log("BottomSheet closing");
    }
  }, [visible]);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      // Sheet is closed
      onClose();
    }
  }, [onClose]);

  // Custom backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.25}
        pressBehavior="close"
      />
    ),
    []
  );

  // Render drag handle
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

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableOverDrag={false}
      enableDismissOnClose={true}
      enableDynamicSizing={autoHeight}
      maxDynamicContentSize={SCREEN_HEIGHT * 0.9}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary + "40" }}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      style={styles.sheet}
    >
      <BottomSheetView style={styles.content}>
        {children}
      </BottomSheetView>
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
  content: {
    flex: 1,
    minHeight: 0,
  },
});