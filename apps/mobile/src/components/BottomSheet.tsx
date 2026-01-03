import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import BottomSheetModal, {
  BottomSheetBackdrop,
  BottomSheetView,
  useBottomSheetDynamicSnapPoints,
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
  const staticSnapPoints = useMemo(() => {
    const targetHeight = SCREEN_HEIGHT * height;
  const maxHeight = SCREEN_HEIGHT * 0.9;
    const clampedHeight = Math.min(targetHeight, maxHeight);
    return [clampedHeight];
  }, [height]);

  // For autoHeight, use dynamic snap points
  const {
    animatedContentHeight,
    animatedHandleHeight,
    animatedSnapPoints,
    handleContentLayout,
  } = useBottomSheetDynamicSnapPoints(useMemo(() => ["CONTENT_HEIGHT"], []));

  // Use dynamic snap points for autoHeight, static otherwise
  const snapPoints = autoHeight ? animatedSnapPoints : staticSnapPoints;

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
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary + "40" }}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      style={styles.sheet}
    >
          {autoHeight ? (
        <BottomSheetView onLayout={handleContentLayout} style={styles.content}>
              {children}
        </BottomSheetView>
          ) : (
        <BottomSheetView style={styles.content}>
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
  content: {
    flex: 1,
    minHeight: 0,
  },
});