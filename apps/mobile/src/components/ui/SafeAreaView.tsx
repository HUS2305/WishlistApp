import React from "react";
import { SafeAreaView as RNSafeAreaView, StyleSheet } from "react-native";

interface SafeAreaViewProps {
  children: React.ReactNode;
  style?: any;
}

export function SafeAreaView({ children, style }: SafeAreaViewProps) {
  return (
    <RNSafeAreaView style={[styles.container, style]}>
      {children}
    </RNSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
});

