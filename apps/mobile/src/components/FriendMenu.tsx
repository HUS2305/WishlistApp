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

interface FriendMenuProps {
  visible: boolean;
  onClose: () => void;
  onViewProfile?: () => void;
  onRemoveFriend?: () => void;
  onBlockUser?: () => void;
  onUnblockUser?: () => void;
  areFriends?: boolean;
  isBlockedByMe?: boolean;
  isBlockedByThem?: boolean;
}

export function FriendMenu({ 
  visible, 
  onClose, 
  onViewProfile,
  onRemoveFriend,
  onBlockUser,
  onUnblockUser,
  areFriends = false,
  isBlockedByMe,
  isBlockedByThem,
}: FriendMenuProps) {
  const { theme } = useTheme();

  const handleViewProfile = () => {
    onClose();
    setTimeout(() => {
      onViewProfile?.();
    }, 100);
  };

  const handleRemoveFriend = () => {
    onRemoveFriend();
  };

  const handleBlockUser = () => {
    if (onBlockUser) {
      onBlockUser();
      // Don't call onClose here - let the parent handle closing the menu
      // The parent's handleBlockUser will close the menu and open the confirmation modal
    }
  };

  const handleUnblockUser = () => {
    onClose();
    setTimeout(() => {
      onUnblockUser?.();
    }, 100);
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
          {onViewProfile && !isBlockedByThem && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleViewProfile}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="user" 
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
                  View Profile
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {areFriends && !isBlockedByMe && !isBlockedByThem && onRemoveFriend && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleRemoveFriend}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="user-minus" 
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
                  Remove Friend
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {isBlockedByMe && onUnblockUser && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleUnblockUser}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="unlock" 
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
                  Unblock User
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {!isBlockedByMe && !isBlockedByThem && onBlockUser && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleBlockUser}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="slash" 
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
                  Block User
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
