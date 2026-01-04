import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "./BottomSheet";
import type { Wishlist, Collaborator } from "@/types";
import { getDisplayName } from "@/lib/utils";

interface MembersSheetProps {
  visible: boolean;
  onClose: () => void;
  wishlist: Wishlist | null;
  currentUserId?: string;
  isOwner?: boolean;
  onRemoveCollaborator?: (collaborator: Collaborator) => void;
}

/**
 * Reusable bottom sheet for displaying wishlist members/collaborators
 * 
 * Features:
 * - Shows owner and collaborators
 * - Uses BottomSheetScrollView for smooth scrolling
 * - Dynamic sizing (autoHeight)
 * - Stackable (stackBehavior="push" - pushes on top, parent stays visible)
 * - Standard header pattern (no X button)
 */
export function MembersSheet({
  visible,
  onClose,
  wishlist,
  currentUserId,
  isOwner = false,
  onRemoveCollaborator,
}: MembersSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(20, insets.bottom + 30);

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight={true} stackBehavior="push">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header - Standard pattern: centered title, no X button */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Members
          </Text>
        </View>

        {/* Content - Using BottomSheetScrollView for proper gesture handling */}
        <BottomSheetScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Owner */}
          {wishlist?.owner && (
            <>
              <View style={styles.memberItem}>
                <View style={styles.memberItemLeft}>
                  <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.memberAvatarText, { color: theme.colors.primary }]}>
                      {getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName)?.[0]?.toUpperCase() || wishlist.owner.username?.[0]?.toUpperCase() || 'O'}
                    </Text>
                  </View>
                  <View style={styles.memberItemInfo}>
                    <Text style={[styles.memberItemName, { color: theme.colors.textPrimary }]}>
                      {getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName) || wishlist.owner.username || 'Owner'}
                    </Text>
                    {wishlist.owner.username && (
                      <Text style={[styles.memberItemUsername, { color: theme.colors.textSecondary }]}>
                        @{wishlist.owner.username}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>
                    Owner
                  </Text>
                </View>
              </View>
              {wishlist?.collaborators && wishlist.collaborators.length > 0 && (
                <View style={[styles.memberDivider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
              )}
            </>
          )}
          
          {/* Collaborators */}
          {wishlist?.collaborators && wishlist.collaborators.length > 0 && (
            wishlist.collaborators.map((collab, index) => {
              const displayName = getDisplayName(collab.user.firstName, collab.user.lastName) || collab.user.username || collab.user.email || 'User';
              const isCurrentUser = collab.userId === currentUserId;
              const canManage = isOwner === true;
              
              return (
                <View key={collab.id}>
                  <View style={styles.memberItem}>
                    <View style={styles.memberItemLeft}>
                      <View style={[styles.memberAvatar, { backgroundColor: theme.colors.textSecondary + '20' }]}>
                        <Text style={[styles.memberAvatarText, { color: theme.colors.textPrimary }]}>
                          {displayName[0]?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.memberItemInfo}>
                        <Text style={[styles.memberItemName, { color: theme.colors.textPrimary }]}>
                          {displayName} {isCurrentUser && '(You)'}
                        </Text>
                        {collab.user.username && (
                          <Text style={[styles.memberItemUsername, { color: theme.colors.textSecondary }]}>
                            @{collab.user.username}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.memberItemRight} pointerEvents="box-none">
                      <View style={[styles.roleBadge, { backgroundColor: theme.colors.textSecondary + '20', marginRight: canManage && !isCurrentUser ? 5 : 0 }]}>
                        <Text style={[styles.roleBadgeText, { color: theme.colors.textSecondary }]}>
                          {collab.role}
                        </Text>
                      </View>
                      {canManage && !isCurrentUser && onRemoveCollaborator && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.removeButton,
                            pressed && { opacity: 0.5 }
                          ]}
                          onPress={() => onRemoveCollaborator(collab)}
                          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                          <Feather name="x" size={20} color={theme.colors.error || "#EF4444"} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                  {index < wishlist.collaborators.length - 1 && (
                    <View style={[styles.memberDivider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
                  )}
                </View>
              );
            })
          )}

          {/* Empty state */}
          {!wishlist?.owner && (!wishlist?.collaborators || wishlist.collaborators.length === 0) && (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No members found
              </Text>
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    // With dynamic sizing, don't use flex
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    minHeight: 56,
  },
  memberItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberItemInfo: {
    flex: 1,
  },
  memberItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  memberItemUsername: {
    fontSize: 14,
  },
  memberItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  removeButton: {
    padding: 4,
  },
  memberDivider: {
    height: 1,
    marginLeft: 52,
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
});

