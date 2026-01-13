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
  onGift?: () => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onBlockUser?: () => void;
  onUnblockUser?: () => void;
  areFriends?: boolean;
  isPending?: boolean;
  isBlockedByMe?: boolean;
  isBlockedByThem?: boolean;
}

export function FriendMenu({ 
  visible, 
  onClose, 
  onViewProfile,
  onGift,
  onAddFriend,
  onRemoveFriend,
  onBlockUser,
  onUnblockUser,
  areFriends = false,
  isPending = false,
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

  const handleGift = () => {
    if (!onGift) return;
    onClose();
    setTimeout(() => {
      onGift();
    }, 100);
  };

  const handleAddFriend = () => {
    onClose();
    setTimeout(() => {
      onAddFriend?.();
    }, 100);
  };

  const handleRemoveFriend = () => {
    if (onRemoveFriend) {
      onRemoveFriend();
    }
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

          {!areFriends && !isPending && !isBlockedByMe && !isBlockedByThem && onAddFriend && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleAddFriend}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="user-plus" 
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
                  Add Friend
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {areFriends && !isBlockedByMe && !isBlockedByThem && onGift && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleGift}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="gift" 
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
                  Gift
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
              style={styles.optionRowLast}
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
              style={styles.optionRowLast}
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
