import React, { useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "./BottomSheet";
import type { Wishlist } from "@/types";
import { getDisplayName } from "@/lib/utils";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MembersSheetProps {
  visible: boolean;
  onClose: () => void;
  wishlist: Wishlist | null;
  currentUserId?: string;
  isOwner?: boolean;
  onOpenEditWishlist?: () => void;
  hideManage?: boolean;
}

/**
 * Reusable bottom sheet for displaying wishlist members/collaborators
 * 
 * Features:
 * - Shows owner and collaborators
 * - Uses BottomSheetScrollView for smooth scrolling
 * - Dynamic sizing (autoHeight) - follows Gorhom docs: https://gorhom.dev/react-native-bottom-sheet/dynamic-sizing
 * - Stackable (stackBehavior="push" - pushes on top, parent stays visible)
 * - Standard header pattern (no X button)
 * - Custom footer with FAB-like button for adding members (owner/admin only)
 * - Remove collaborator functionality (owner/admin only)
 */
export function MembersSheet({
  visible,
  onClose,
  wishlist,
  currentUserId,
  isOwner = false,
  onOpenEditWishlist,
  hideManage = false,
}: MembersSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();


  // Handle manage friends (opens edit wishlist with friend selection)
  const handleManageFriends = useCallback(() => {
    if (onOpenEditWishlist) {
      onOpenEditWishlist();
    }
  }, [onOpenEditWishlist]);

  return (
    <BottomSheet 
      visible={visible} 
      onClose={onClose} 
      autoHeight={true}
      maxHeight={SCREEN_HEIGHT * 0.9}
      stackBehavior="push"
      scrollable={true}
    >
      {/* Header - Title with action button on right (owner/admin only) */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Members
        </Text>
        {isOwner === true && !hideManage && (
          <TouchableOpacity
            onPress={handleManageFriends}
            activeOpacity={0.6}
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>
              Manage
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content - Using BottomSheetScrollView for proper gesture handling and dynamic sizing */}
      <BottomSheetScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { 
            paddingBottom: Math.max(20, insets.bottom + 30),
            backgroundColor: theme.colors.background,
          }
        ]}
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
                  <View style={styles.memberItemRight}>
                    <View style={[styles.roleBadge, { backgroundColor: theme.colors.textSecondary + '20' }]}>
                      <Text style={[styles.roleBadgeText, { color: theme.colors.textSecondary }]}>
                        {collab.role}
                      </Text>
                    </View>
                  </View>
                </View>
                {wishlist.collaborators && index < wishlist.collaborators.length - 1 && (
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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    minHeight: 44,
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
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexGrow: 0,
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

