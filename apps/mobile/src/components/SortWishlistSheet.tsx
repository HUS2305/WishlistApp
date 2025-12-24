import { useState, useEffect } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
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

export function SortWishlistSheet({ visible, onClose, currentSort, onSortChange }: SortWishlistSheetProps) {
  const { theme } = useTheme();
  const [selectedSort, setSelectedSort] = useState<SortOption>(currentSort);

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Sort by
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Sort Options */}
        <View style={styles.content}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
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
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerSpacer: {
    width: 24, // Same width as close button to center the title
  },
  closeButton: {
    padding: 4,
    zIndex: 1,
  },
  content: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
});

