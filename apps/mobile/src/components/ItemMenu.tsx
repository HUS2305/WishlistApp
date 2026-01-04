import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";

interface ItemMenuProps {
  visible: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onGoToLink?: () => void;
  onAddToWishlist?: () => void;
  onRestoreToWanted?: () => void;
  onDelete: () => void;
  isPurchased?: boolean;
  itemUrl?: string | null;
}

export function ItemMenu({ 
  visible, 
  onClose, 
  onEdit, 
  onGoToLink,
  onAddToWishlist, 
  onRestoreToWanted,
  onDelete,
  isPurchased = false,
  itemUrl
}: ItemMenuProps) {
  const { theme } = useTheme();

  const handleEdit = () => {
    onClose();
    setTimeout(() => {
      onEdit?.();
    }, 100);
  };

  const handleGoToLink = () => {
    onClose();
    setTimeout(() => {
      onGoToLink?.();
    }, 100);
  };

  const handleAddToWishlist = () => {
    onClose();
    setTimeout(() => {
      onAddToWishlist?.();
    }, 100);
  };

  const handleRestoreToWanted = () => {
    onRestoreToWanted?.();
  };

  const handleDelete = () => {
    onDelete();
    // Don't close immediately for purchased items as they delete directly
    if (!isPurchased) {
      onClose();
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header - Standard pattern: centered title, no X button */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Options
          </Text>
        </View>

        {/* Menu Options */}
        <View style={styles.content}>
          {!isPurchased && onEdit && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="edit" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Edit Item
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {itemUrl && onGoToLink && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleGoToLink}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="external-link" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Go to Link
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {!isPurchased && onAddToWishlist && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleAddToWishlist}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="list" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Add to Another Wishlist
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {isPurchased && onRestoreToWanted && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleRestoreToWanted}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="rotate-ccw" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Restore to Wanted List
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.optionRowLast}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <Feather 
                name="trash-2" 
                size={20} 
                color="#EF4444" 
                style={styles.optionIcon}
              />
              <Text
                style={[
                  styles.optionText,
                  { color: "#EF4444" },
                ]}
              >
                Delete Item
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
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
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "400",
  },
});



