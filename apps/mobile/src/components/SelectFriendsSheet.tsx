import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { friendsService } from "@/services/friends";
import type { User as FriendUser } from "@/types";
import { getDisplayName } from "@/lib/utils";

interface SelectFriendsSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedFriendIds: Set<string>) => void;
  initialSelection?: Set<string>;
  emptyMessage?: string;
}

/**
 * Reusable bottom sheet for selecting friends
 * 
 * Features:
 * - Multi-select friend list
 * - Uses BottomSheetScrollView for smooth scrolling
 * - Dynamic sizing (autoHeight)
 * - Stackable (stackBehavior="push" - pushes on top, parent stays visible)
 * - Standard header pattern (no X button)
 */
export function SelectFriendsSheet({
  visible,
  onClose,
  onConfirm,
  initialSelection = new Set(),
  emptyMessage = "No friends to invite. Add friends first!",
}: SelectFriendsSheetProps) {
  const { theme } = useTheme();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(initialSelection);

  // Load friends when sheet opens
  useEffect(() => {
    if (visible) {
      loadFriends();
      setSelectedFriends(new Set(initialSelection));
    }
  }, [visible, initialSelection]);

  const loadFriends = async () => {
    setIsLoadingFriends(true);
    try {
      const friendsData = await friendsService.getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelection = new Set(selectedFriends);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriends(newSelection);
  };

  const handleConfirm = () => {
    if (selectedFriends.size > 0) {
      onConfirm(selectedFriends);
    }
    // Always close the sheet when button is pressed
    onClose();
  };

  const renderFriendItem = ({ item, index, total }: { item: FriendUser; index: number; total: number }) => {
    const isSelected = selectedFriends.has(item.id);
    const displayName = getDisplayName(item.firstName, item.lastName) || item.username || item.email;

    return (
      <View key={item.id}>
        <TouchableOpacity
          style={styles.friendItem}
          onPress={() => toggleFriendSelection(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.friendItemLeft}>
            <View style={[styles.friendAvatar, { backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.textSecondary + '20' }]}>
              <Text style={[styles.friendAvatarText, { color: isSelected ? theme.colors.primary : theme.colors.textPrimary }]}>
                {displayName[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.friendItemInfo}>
              <Text style={[styles.friendItemName, { color: theme.colors.textPrimary }]}>
                {displayName}
              </Text>
              {item.username && (
                <Text style={[styles.friendItemUsername, { color: theme.colors.textSecondary }]}>
                  @{item.username}
                </Text>
              )}
            </View>
          </View>
          {isSelected && (
            <View style={[styles.checkIcon, { backgroundColor: theme.colors.primary }]}>
              <Feather name="check" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        {index < total - 1 && (
          <View style={[styles.friendDivider, { backgroundColor: theme.colors.textSecondary + '20' }]} />
        )}
      </View>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight={true} stackBehavior="push">
      {/* Header - Title with action button on right */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Select Friends
        </Text>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={selectedFriends.size === 0}
          activeOpacity={0.6}
          style={styles.headerButton}
        >
          <Text style={[
            styles.headerButtonText,
            {
              color: selectedFriends.size === 0
                ? theme.colors.textSecondary
                : theme.colors.primary,
            }
          ]}>
            {selectedFriends.size === 0 ? "Done" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

        {/* Content - Using BottomSheetScrollView for proper gesture handling */}
        <BottomSheetScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingFriends ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading friends...
              </Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {emptyMessage}
              </Text>
            </View>
          ) : (
            friends.map((friend, index) => renderFriendItem({ item: friend, index, total: friends.length }))
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    // With dynamic sizing, let content determine size
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  headerButton: {
    position: "absolute",
    right: 20,
    top: 0,
    bottom: 16,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    // With dynamic sizing, don't use flex
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 50, // Space for footer (paddingTop: 16 + button height: 56 + paddingBottom: 20 + safe area: ~28)
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    minHeight: 56,
  },
  friendItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  friendItemInfo: {
    flex: 1,
  },
  friendItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  friendItemUsername: {
    fontSize: 14,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  friendDivider: {
    height: 1,
    marginLeft: 52,
  },
});

