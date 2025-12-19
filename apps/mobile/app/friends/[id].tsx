import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Image, Alert, Platform } from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { friendsService } from "@/services/friends";
import { getDisplayName } from "@/lib/utils";
import type { User } from "@/types";
import { SortWishlistSheet, type SortOption } from "@/components/SortWishlistSheet";
import { sortWishlists } from "@/utils/sortPreferences";
import { FriendMenu } from "@/components/FriendMenu";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

interface UserProfile {
  profile: User & {
    bio?: string | null;
    privacyLevel: string;
  };
  wishlists: Array<{
    id: string;
    title: string;
    coverImage?: string | null;
    activeWishes: number;
    totalPrice: number;
    createdAt: string;
    updatedAt: string;
  }>;
  areFriends: boolean;
  friendshipSince: string | null;
  pendingRequestId: string | null;
  sentRequestId: string | null;
  isBlockedByMe?: boolean;
  isBlockedByThem?: boolean;
}

export default function FriendProfileScreen() {
  const { theme } = useTheme();
  const { refreshPendingRequestsCount, refreshUnreadNotificationsCount } = useNotificationContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>("last_added");

  const fetchProfile = async () => {
    if (!id) return;
    
    try {
      const data = await friendsService.getUserProfile(id);
      setProfile(data);
    } catch (error: any) {
      console.error("❌ Error fetching user profile:", error);
      if (error.response?.status === 404) {
        Alert.alert("Error", "User not found");
        router.back();
      } else if (error.response?.status === 403) {
        Alert.alert("Error", "Access denied");
        router.back();
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchProfile();
  };

  const handleBack = () => {
    router.push("/(tabs)/friends");
  };

  const handleRemoveFriend = () => {
    setMenuVisible(false);
    setTimeout(() => {
      setDeleteConfirmVisible(true);
    }, 100);
  };

  const handleBlockUser = useCallback(async () => {
    if (!profile || !id) {
      return;
    }
    
    const userName = getDisplayName(profile.profile) || profile.profile.username || "this user";
    const confirmMessage = `Are you sure you want to block ${userName}? You won't be able to see their profile or send them friend requests.`;
    
    if (Platform.OS === 'web') {
      const win = (globalThis as any).window as { confirm: (msg: string) => boolean; alert: (msg: string) => void } | undefined;
      const confirmed = win ? win.confirm(confirmMessage) : false;
      if (!confirmed) {
        return;
      }
      
      try {
        setIsBlockingUser(true);
        await friendsService.blockUser(id);
        if (win) {
          win.alert("User blocked successfully");
        }
        router.back();
      } catch (error: any) {
        console.error("Error blocking user:", error);
        if (win) {
          win.alert(error.response?.data?.message || error.message || "Failed to block user");
        }
      } finally {
        setIsBlockingUser(false);
      }
    } else {
      Alert.alert(
        "Block User",
        confirmMessage,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              try {
                setIsBlockingUser(true);
                await friendsService.blockUser(id);
                Alert.alert("Success", "User blocked successfully");
                router.back();
              } catch (error: any) {
                console.error("Error blocking user:", error);
                Alert.alert("Error", error.response?.data?.message || error.message || "Failed to block user");
              } finally {
                setIsBlockingUser(false);
              }
            },
          },
        ]
      );
    }
  }, [profile, id, router]);

  const handleUnblockUser = async () => {
    if (!profile || !id) return;
    
    try {
      setIsBlockingUser(true);
      await friendsService.unblockUser(id);
      Alert.alert("Success", "User unblocked successfully");
      await fetchProfile();
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to unblock user");
    } finally {
      setIsBlockingUser(false);
    }
  };

  const confirmRemoveFriend = async () => {
    if (!profile || !id) return;
    
    try {
      setIsRemovingFriend(true);
      await friendsService.removeFriend(id);
      Alert.alert("Success", "Friend removed successfully");
      router.push("/(tabs)/friends");
    } catch (error: any) {
      console.error("Error removing friend:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to remove friend");
    } finally {
      setIsRemovingFriend(false);
      setDeleteConfirmVisible(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!profile?.pendingRequestId) return;
    
    try {
      setIsProcessingRequest(true);
      await friendsService.acceptFriendRequest(profile.pendingRequestId);
      Alert.alert("Success", "Friend request accepted!");
      await fetchProfile();
      await refreshPendingRequestsCount();
      await refreshUnreadNotificationsCount();
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to accept friend request");
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!profile?.pendingRequestId) return;
    
    try {
      setIsProcessingRequest(true);
      await friendsService.rejectFriendRequest(profile.pendingRequestId);
      Alert.alert("Success", "Friend request declined");
      await fetchProfile();
      await refreshPendingRequestsCount();
    } catch (error: any) {
      console.error("Error declining friend request:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to decline friend request");
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleCancelSentRequest = async () => {
    if (!profile?.sentRequestId) return;
    
    try {
      setIsProcessingRequest(true);
      await friendsService.cancelFriendRequest(profile.sentRequestId);
      Alert.alert("Success", "Friend request cancelled");
      await fetchProfile();
    } catch (error: any) {
      console.error("Error cancelling friend request:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to cancel friend request");
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleSortChange = (sort: SortOption) => {
    setCurrentSort(sort);
  };

  // Calculate sorted wishlists BEFORE early returns to maintain hook order
  const sortedWishlists = useMemo(() => {
    if (!profile) return [];
    return sortWishlists(profile.wishlists, currentSort);
  }, [profile?.wishlists, currentSort]);

  // Calculate display values BEFORE early returns
  const displayName = profile ? (getDisplayName(profile.profile) || profile.profile.username || "User") : "User";
  const avatarInitial = profile ? ((displayName[0] || profile.profile.username?.[0] || "U").toUpperCase()) : "U";
  const friendshipSince = profile?.friendshipSince 
    ? new Date(profile.friendshipSince).toLocaleDateString("en-US", { 
        month: "long", 
        year: "numeric" 
      })
    : null;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PageHeader title="" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PageHeader title="" />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Profile not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PageHeader 
        title={profile.profile.username ? `@${profile.profile.username}` : ""}
        rightActions={
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="more-horizontal" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Profile Header - Horizontal Layout */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
            {profile.profile.avatar ? (
              <Image 
                source={{ uri: profile.profile.avatar }} 
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.displayName, { color: theme.colors.textPrimary }]}>
              {displayName}
            </Text>

            {/* Birthday - Only show for friends */}
            {profile.areFriends && (
              <View style={styles.birthdayInfo}>
                <View style={styles.birthdayIconContainer}>
                  <MaterialCommunityIcons name="cake-variant" size={14} color={theme.colors.textSecondary} />
                </View>
                <Text style={[styles.birthdayText, { color: theme.colors.textSecondary }]}>
                  Birthday information coming soon
                </Text>
              </View>
            )}

            {/* Friendship Status */}
            {profile.areFriends && friendshipSince ? (
              <View style={styles.friendshipStatus}>
                <Feather name="users" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.friendshipStatusText, { color: theme.colors.textSecondary }]}>
                  Friends since {friendshipSince}
                </Text>
              </View>
            ) : profile.isBlockedByMe ? (
              <View style={styles.friendshipStatus}>
                <Feather name="slash" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.friendshipStatusText, { color: theme.colors.textSecondary }]}>
                  Blocked
                </Text>
              </View>
            ) : !profile.areFriends && (
              <View style={styles.friendshipStatus}>
                <Feather name="user-x" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.friendshipStatusText, { color: theme.colors.textSecondary }]}>
                  Not friends
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bio Section */}
        {profile.profile.bio && (
          <View style={[styles.bioSection, { borderBottomColor: theme.colors.textSecondary + '20' }]}>
            <Text style={[styles.bio, { color: theme.colors.textPrimary }]}>
              {profile.profile.bio}
            </Text>
          </View>
        )}

        {/* Pending Friend Request Section (Received) */}
        {profile.pendingRequestId && !profile.areFriends && (
          <View style={[styles.requestSection, { borderBottomColor: theme.colors.textSecondary + '20' }]}>
            <Text style={[styles.requestSectionTitle, { color: theme.colors.textPrimary }]}>
              Friend Request
            </Text>
            <Text style={[styles.requestSectionText, { color: theme.colors.textSecondary }]}>
              {displayName} sent you a friend request
            </Text>
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={[styles.acceptRequestButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAcceptRequest}
                disabled={isProcessingRequest}
                activeOpacity={0.7}
              >
                <Feather name="check" size={18} color="#FFFFFF" />
                <Text style={styles.acceptRequestButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineRequestButton, { 
                  backgroundColor: theme.isDark ? '#2E2E2E' : '#E5E5E5',
                  borderColor: theme.colors.textSecondary + '30',
                }]}
                onPress={handleDeclineRequest}
                disabled={isProcessingRequest}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.declineRequestButtonText, { color: theme.colors.textPrimary }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sent Friend Request Section */}
        {profile.sentRequestId && !profile.areFriends && (
          <View style={[styles.requestSection, { borderBottomColor: theme.colors.textSecondary + '20' }]}>
            <View style={styles.sentRequestHeader}>
              <Text style={[styles.requestSectionTitle, { color: theme.colors.textPrimary }]}>
                Friend Request Sent
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Pending</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.cancelRequestButton, { 
                backgroundColor: theme.isDark ? '#2E2E2E' : '#E5E5E5',
                borderColor: theme.colors.textSecondary + '30',
              }]}
              onPress={handleCancelSentRequest}
              disabled={isProcessingRequest}
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color={theme.colors.textPrimary} />
              <Text style={[styles.cancelRequestButtonText, { color: theme.colors.textPrimary }]}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wishlists Section */}
        <View style={styles.wishlistsSection}>
          <View style={styles.wishlistsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Wishlists ({profile.wishlists.length})
            </Text>
            <TouchableOpacity
              onPress={() => setSortModalVisible(true)}
              style={styles.sortButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="sliders" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {sortedWishlists.length > 0 ? (
            sortedWishlists.map((wishlist) => (
              <TouchableOpacity
                key={wishlist.id}
                style={[styles.wishlistCard, { borderBottomColor: theme.colors.textSecondary + '20' }]}
                onPress={() => router.push(`/wishlist/${wishlist.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.wishlistContent}>
                  <View style={styles.wishlistLeftSection}>
                    <Text style={[styles.wishlistTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {wishlist.title}
                    </Text>
                    <View style={styles.wishlistStats}>
                      <Text style={[styles.wishlistStat, { color: theme.colors.textSecondary }]}>
                        {wishlist.activeWishes} active wishes
                      </Text>
                      {wishlist.totalPrice > 0 && (
                        <View style={[styles.priceBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                          <Text style={[styles.priceBadgeText, { color: theme.colors.primary }]}>
                            ${wishlist.totalPrice.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.wishlistRightSection}>
                    {wishlist.coverImage ? (
                      <Image
                        source={{ uri: wishlist.coverImage }}
                        style={styles.wishlistCover}
                      />
                    ) : (
                      <View style={[styles.wishlistPlaceholder, { backgroundColor: theme.colors.textSecondary + '20' }]}>
                        <Feather name="image" size={24} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={theme.colors.textSecondary}
                      style={styles.chevron}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No wishlists available
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Options Menu Modal */}
      {profile && (
        <FriendMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onRemoveFriend={profile.areFriends ? handleRemoveFriend : undefined}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          areFriends={profile.areFriends}
          isBlockedByMe={profile.isBlockedByMe}
          isBlockedByThem={profile.isBlockedByThem}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={confirmRemoveFriend}
        title={displayName}
        isDeleting={isRemovingFriend}
      />

      {/* Sort Modal */}
      <SortWishlistSheet
        visible={sortModalVisible}
        onClose={() => setSortModalVisible(false)}
        currentSort={currentSort}
        onSortChange={handleSortChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: "flex-start",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
    paddingTop: 8,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  birthdayInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  birthdayIconContainer: {
    marginRight: 6,
  },
  birthdayText: {
    fontSize: 14,
  },
  friendshipStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  friendshipStatusText: {
    fontSize: 14,
  },
  bioSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  requestSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  requestSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  requestSectionText: {
    fontSize: 14,
    marginBottom: 12,
  },
  sentRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  requestActions: {
    flexDirection: "row",
    gap: 12,
  },
  acceptRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  acceptRequestButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  declineRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  declineRequestButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  cancelRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
  },
  cancelRequestButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  wishlistsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  wishlistsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sortButton: {
    padding: 4,
  },
  wishlistCard: {
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  wishlistContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wishlistLeftSection: {
    flex: 1,
    marginRight: 12,
  },
  wishlistTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  wishlistStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wishlistStat: {
    fontSize: 13,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  wishlistRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wishlistCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  wishlistPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
  menuButton: {
    padding: 4,
  },
});


