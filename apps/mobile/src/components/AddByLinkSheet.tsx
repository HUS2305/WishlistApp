import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "./BottomSheet";

interface AddByLinkSheetProps {
  visible: boolean;
  onClose: () => void;
  wishlistId?: string;
}

/**
 * Test bottom sheet for "Add by link" functionality
 * This is a test implementation to verify @gorhom/bottom-sheet features work correctly
 * 
 * Features implemented:
 * - Dynamic sizing (automatically adjusts to content height)
 * - Proper keyboard handling
 * - BottomSheetScrollView for smooth scrolling
 * - Stackable (uses BottomSheetModal internally)
 * 
 * Uses dynamic sizing as per: https://gorhom.dev/react-native-bottom-sheet/dynamic-sizing
 */
export function AddByLinkSheet({
  visible,
  onClose,
  wishlistId,
}: AddByLinkSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState("");
  const [testSheetVisible, setTestSheetVisible] = useState(false);

  // Bottom padding - separate from section spacing
  const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 50 : 20);

  return (
    <>
    <BottomSheet 
      visible={visible} 
      onClose={onClose} 
      autoHeight={true}
      enablePanDownToClose={true}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Add by Link
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content - Using BottomSheetScrollView for proper gesture handling */}
        <BottomSheetScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              setTestSheetVisible(true);
            }}
          >
            <Text style={[styles.addButtonText, { color: "#FFFFFF" }]}>
              Add Item
            </Text>
          </TouchableOpacity>

          {/* Info Text */}
          <View style={styles.infoSection}>
            <Feather 
              name="info" 
              size={16} 
              color={theme.colors.textSecondary} 
              style={styles.infoIcon}
            />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Paste a product URL and we'll extract the details automatically
            </Text>
          </View>

          {/* Example URLs Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              Supported Sites
            </Text>
            <View style={styles.exampleUrls}>
              <View style={[styles.exampleUrlItem, { 
                backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                borderColor: theme.colors.textSecondary + '20',
              }]}>
                <Feather name="globe" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.exampleUrlText, { color: theme.colors.textSecondary }]}>
                  Amazon
                </Text>
              </View>
              <View style={[styles.exampleUrlItem, { 
                backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                borderColor: theme.colors.textSecondary + '20',
              }]}>
                <Feather name="globe" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.exampleUrlText, { color: theme.colors.textSecondary }]}>
                  eBay
                </Text>
              </View>
              <View style={[styles.exampleUrlItem, { 
                backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                borderColor: theme.colors.textSecondary + '20',
              }]}>
                <Feather name="globe" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.exampleUrlText, { color: theme.colors.textSecondary }]}>
                  Other sites
                </Text>
              </View>
            </View>
          </View>

          {/* URL Input Section */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              Product URL
            </Text>
            <BottomSheetTextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                  borderColor: theme.colors.textSecondary + '40',
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholder="https://example.com/product"
              placeholderTextColor={theme.colors.textSecondary + '80'}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
              autoComplete="url"
            />
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheet>

    {/* Test Stacking Sheet - Must be a sibling, not nested */}
    <BottomSheet
      visible={testSheetVisible}
      onClose={() => setTestSheetVisible(false)}
      autoHeight={true}
      enablePanDownToClose={true}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
    >
      <View style={[styles.testSheetContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.testSheetHeader}>
          <View style={styles.testSheetHeaderSpacer} />
          <Text style={[styles.testSheetTitle, { color: theme.colors.textPrimary }]}>
            Test Stacking Sheet
          </Text>
          <TouchableOpacity
            onPress={() => setTestSheetVisible(false)}
            style={styles.testSheetCloseButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.testSheetContent}>
          <Text style={[styles.testSheetText, { color: theme.colors.textPrimary }]}>
            This is a test sheet to verify stacking works correctly!
          </Text>
          <Text style={[styles.testSheetText, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            If you can see this sheet on top of the "Add by Link" sheet, stacking is working! 🎉
          </Text>
          <View style={[styles.testSheetBox, { 
            backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
            borderColor: theme.colors.textSecondary + '20',
          }]}>
            <Text style={[styles.testSheetText, { color: theme.colors.textSecondary }]}>
              Random content box
            </Text>
          </View>
          <View style={[styles.testSheetBox, { 
            backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
            borderColor: theme.colors.textSecondary + '20',
            marginTop: 12,
          }]}>
            <Text style={[styles.testSheetText, { color: theme.colors.textSecondary }]}>
              Another content box
            </Text>
          </View>
          
          {/* Dismiss Button */}
          <TouchableOpacity
            style={[
              styles.testSheetDismissButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setTestSheetVisible(false)}
          >
            <Text style={[styles.testSheetDismissButtonText, { color: "#FFFFFF" }]}>
              Dismiss This Sheet
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    // With dynamic sizing, let content determine size
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  headerSpacer: {
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    // With dynamic sizing, don't use flex
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  exampleUrls: {
    gap: 8,
  },
  exampleUrlItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  exampleUrlText: {
    fontSize: 14,
  },
  addButton: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  testSheetContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  testSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
    marginBottom: 16,
  },
  testSheetHeaderSpacer: {
    width: 24,
  },
  testSheetTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  testSheetCloseButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  testSheetContent: {
    paddingBottom: Platform.OS === "ios" ? 20 : 20,
  },
  testSheetText: {
    fontSize: 16,
    lineHeight: 24,
  },
  testSheetBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  testSheetDismissButton: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  testSheetDismissButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

