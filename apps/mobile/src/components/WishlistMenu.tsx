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
  onEdit?: () => void;
  onDelete?: () => void;
  onViewMembers?: () => void;
  showMembersOption?: boolean;
  onLeave?: () => void;
}

export function WishlistMenu({ visible, onClose, onEdit, onDelete, onViewMembers, showMembersOption = false, onLeave }: WishlistMenuProps) {
  const { theme } = useTheme();

  const handleEdit = () => {
    onClose();
    // Small delay to let menu close before navigating
    setTimeout(() => {
      onEdit?.();
    }, 100);
  };

  const handleDelete = () => {
    console.log("🔴 Delete button pressed in menu");
    onDelete?.();
    onClose();
  };

  const handleViewMembers = () => {
    onClose();
    // Small delay to let menu close before opening members modal
    setTimeout(() => {
      onViewMembers?.();
    }, 100);
  };

  const handleLeave = () => {
    onClose();
    // Small delay to let menu close before showing leave confirmation
    setTimeout(() => {
      onLeave?.();
    }, 100);
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
          {onEdit && (
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
          )}

          {showMembersOption && onViewMembers && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleViewMembers}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="users" 
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
                  Members
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {onLeave && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleLeave}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="log-out" 
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
                  Leave Wishlist
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {onDelete && (
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
                  Delete List
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
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
