import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";

interface WishlistMenuProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function WishlistMenu({ visible, onClose, onEdit, onDelete }: WishlistMenuProps) {
  const { theme } = useTheme();

  const handleEdit = () => {
    onClose();
    // Small delay to let menu close before navigating
    setTimeout(() => {
      onEdit();
    }, 100);
  };

  const handleDelete = () => {
    console.log("🔴 Delete button pressed in menu");
    onDelete();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Options
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Menu Options */}
        <View style={styles.content}>
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
                Edit List
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionRow,
              {
                borderBottomColor: theme.colors.textSecondary + '20',
              },
            ]}
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
                Delete List
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
