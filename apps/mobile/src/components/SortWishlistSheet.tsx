import { useState, useEffect } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "./BottomSheet";

export type SortOption = "last_added" | "last_edited" | "added_first" | "alphabetical";

interface SortWishlistSheetProps {
  visible: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "last_added", label: "Last added" },
  { value: "last_edited", label: "Last edited" },
  { value: "added_first", label: "Added first" },
  { value: "alphabetical", label: "Alphabetical" },
];

/**
 * Bottom sheet for sorting wishlists
 * 
 * Features:
 * - Sort option selection
 * - Uses BottomSheetScrollView for smooth scrolling
 * - Dynamic sizing (autoHeight)
 * - Standard header pattern (no X button)
 */
export function SortWishlistSheet({ visible, onClose, currentSort, onSortChange }: SortWishlistSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedSort, setSelectedSort] = useState<SortOption>(currentSort);
  const bottomPadding = Math.max(20, insets.bottom + 30);

  // Update selected sort when currentSort changes
  useEffect(() => {
    setSelectedSort(currentSort);
  }, [currentSort]);

  const handleSelect = (sort: SortOption) => {
    setSelectedSort(sort);
    onSortChange(sort);
    // Close modal after selection
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight={true}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header - Standard pattern: centered title, no X button */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Sort by
          </Text>
        </View>

        {/* Sort Options - Using BottomSheetScrollView for proper gesture handling */}
        <BottomSheetScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {sortOptions.map((option, index) => {
            const isLast = index === sortOptions.length - 1;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  isLast ? styles.optionRowLast : styles.optionRow,
                  {
                    backgroundColor: selectedSort === option.value
                      ? (theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15')
                      : 'transparent',
                    borderBottomColor: theme.colors.textSecondary + '20',
                  },
                ]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
              <Text
                style={[
                  styles.optionText,
                  {
                    color: selectedSort === option.value
                      ? theme.colors.primary
                      : theme.colors.textPrimary,
                    fontWeight: selectedSort === option.value ? '600' : '400',
                  },
                ]}
              >
                {option.label}
              </Text>
              {selectedSort === option.value && (
                <Feather
                  name="check"
                  size={20}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionRowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
  },
});

