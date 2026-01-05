import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Image, Alert, Platform } from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { HeaderButtons } from "@/lib/navigation";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { friendsService } from "@/services/friends";
import { getDisplayName } from "@/lib/utils";
import type { User } from "@/types";
import { SortWishlistSheet, type SortOption } from "@/components/SortWishlistSheet";
import { sortWishlists } from "@/utils/sortPreferences";
import { FriendMenu } from "@/components/FriendMenu";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useAuth } from "@clerk/clerk-expo";
import { PriceDisplay } from "@/components/PriceDisplay";
import { CreateWishlistSheet } from "@/components/CreateWishlistSheet";
import { CreateGroupGiftSheet } from "@/components/CreateGroupGiftSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const { isLoaded: isAuthLoaded } = useAuth();
  const insets = useSafeAreaInsets();
  const cardBackgroundColor = theme.isDark ? '#2E2E2E' : '#D3D3D3';
  const { refreshPendingRequestsCount, refreshUnreadNotificationsCount } = useNotificationContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>("last_added");
  const [birthdayGiftModalVisible, setBirthdayGiftModalVisible] = useState(false);
  const [selectedBirthdayFriend, setSelectedBirthdayFriend] = useState<{ id: string; name: string } | null>(null);
  const [createWishlistSheetVisible, setCreateWishlistSheetVisible] = useState(false);
  const [createGroupGiftSheetVisible, setCreateGroupGiftSheetVisible] = useState(false);

  const fetchProfile = async () => {
    if (!id || !isAuthLoaded) return;
    
    try {
      const data = await friendsService.getUserProfile(id);
      setProfile(data);
    } catch (error: any) {
      console.error("❌ Error fetching user profile:", error);
      if (error.response?.status === 404) {
        Alert.alert("Error", "User not found");
        router.push("/(tabs)/friends");
      } else if (error.response?.status === 403) {
        Alert.alert("Error", "Access denied");
        router.push("/(tabs)/friends");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthLoaded && id) {
      fetchProfile();
    }
  }, [id, isAuthLoaded]);

  const onRefresh = () => {
    if (!isAuthLoaded) return;
    setIsRefreshing(true);
    fetchProfile();
  };

  const handleBack = () => {
    // Always navigate to Friends tab to ensure consistent behavior
    // This works whether user came from Friends tab or All Friends page
    router.push("/(tabs)/friends");
  };

  const handleRemoveFriend = () => {
    setMenuVisible(false);
    setTimeout(() => {
      setDeleteConfirmVisible(true);
    }, 100);
  };

  const handleBlockUser = useCallback(() => {
    if (!profile || !id) {
      return;
    }
    // Close menu first, then open block modal after a short delay
    setMenuVisible(false);
    setTimeout(() => {
      setBlockConfirmVisible(true);
    }, 150);
  }, [profile, id]);

  const confirmBlockUser = async () => {
    if (!profile || !id) return;
    try {
      setIsBlockingUser(true);
      await friendsService.blockUser(id);
      Alert.alert("Success", "User blocked successfully");
      setBlockConfirmVisible(false);
      await fetchProfile();
    } catch (error: any) {
      console.error("Error blocking user:", error);
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to block user");
      setBlockConfirmVisible(false);
    } finally {
      setIsBlockingUser(false);
    }
  };

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

  // Get privacy level display info
  const getPrivacyInfo = (privacyLevel?: string) => {
    if (!privacyLevel) return null;
    switch (privacyLevel) {
      case "PUBLIC":
        return { icon: "globe", label: "Public" };
      case "FRIENDS_ONLY":
        return { icon: "users", label: "Friends Only" };
      case "PRIVATE":
        return { icon: "lock", label: "Private" };
      default:
        return { icon: "lock", label: "Private" };
    }
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
      <StandardPageHeader
        title={displayName}
        backButton={true}
        rightActions={
          profile ? (
            <HeaderButtons
              buttons={[
                {
                  icon: "more-horizontal",
                  onPress: () => setMenuVisible(true),
                },
              ]}
            />
          ) : null
        }
      />
      
      {/* Profile Header - Centered Column Layout */}
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
        
        <View style={styles.nameRow}>
          <Text style={[styles.displayName, { color: theme.colors.textPrimary }]}>
            {displayName}
          </Text>
          <View style={[styles.nameDivider, { backgroundColor: theme.colors.textSecondary + '40' }]} />
          <Text style={[styles.username, { color: theme.colors.textSecondary }]}>
            {profile.profile.username ? `@${profile.profile.username}` : ""}
          </Text>
        </View>

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
        <View style={[styles.requestSection, { borderBottomColor: theme.colors.textSecondary + '20', borderBottomWidth: 0 }]}>
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
        <View style={[styles.requestSection, { borderBottomColor: theme.colors.textSecondary + '20', borderBottomWidth: 0 }]}>
          <View style={styles.sentRequestHeader}>
            <Text style={[styles.requestSectionTitle, { color: theme.colors.textPrimary, marginBottom: 0, includeFontPadding: false }]}>
              Friend Request Sent
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15', alignSelf: 'center' }]}>
              <Feather name="clock" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary, includeFontPadding: false }]}>Pending</Text>
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

      {/* Wishlists Section - Card Container with rounded top corners */}
      <View style={[styles.wishlistsSectionContainer, { backgroundColor: cardBackgroundColor }]}>
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
                <MaterialCommunityIcons name="swap-vertical" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.wishlistsSectionContent}>
            {sortedWishlists.length > 0 ? (
            sortedWishlists.map((wishlist, index) => {
              const privacyInfo = getPrivacyInfo((wishlist as any).privacyLevel);
              const currency = (wishlist as any).currency || "USD";
              
              return (
                <View key={wishlist.id}>
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push(`/wishlist/${wishlist.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardLeft}>
                        <View style={styles.titleRow}>
                          <Text 
                            style={[styles.cardTitle, { color: theme.colors.textPrimary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {wishlist.title}
                          </Text>
                          {privacyInfo && (
                            <Feather 
                              name={privacyInfo.icon as any} 
                              size={16} 
                              color={theme.colors.primary} 
                            />
                          )}
                        </View>
                        <View style={styles.metricsContainer}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Active wishes</Text>
                          <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{wishlist.activeWishes}</Text>
                          <View style={[styles.metricDivider, { backgroundColor: theme.colors.textSecondary + '40' }]} />
                          <PriceDisplay
                            amount={wishlist.totalPrice}
                            currency={currency}
                            textStyle={[styles.metricValue, { color: theme.colors.textPrimary, margin: 0, padding: 0 }]}
                            containerStyle={{ margin: 0, padding: 0 }}
                          />
                        </View>
                      </View>
                      <View style={styles.imagePlaceholder}>
                        {wishlist.coverImage ? (
                          <Image
                            source={{ uri: wishlist.coverImage }}
                            style={styles.imagePlaceholderImage}
                          />
                        ) : (
                          <Feather name="image" size={24} color={theme.colors.textSecondary} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {index < sortedWishlists.length - 1 && (
                    <View style={[styles.cardDivider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
                  )}
                </View>
              );
            })
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No wishlists available
              </Text>
            )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Options Menu Modal */}
      {profile && (
        <FriendMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onGift={() => {
            setMenuVisible(false);
            setSelectedBirthdayFriend({
              id: profile.profile.id,
              name: getDisplayName(profile.profile) || profile.profile.username || "Friend"
            });
            setTimeout(() => {
              setBirthdayGiftModalVisible(true);
            }, 200);
          }}
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

      {/* Block User Confirmation Modal */}
      {profile && (
        <DeleteConfirmModal
          visible={blockConfirmVisible}
          title={getDisplayName(profile.profile) || profile.profile.username || "this user"}
          modalTitle="Block User"
          onConfirm={confirmBlockUser}
          onCancel={() => {
            setBlockConfirmVisible(false);
          }}
          isDeleting={isBlockingUser}
        />
      )}

      {/* Sort Modal */}
      <SortWishlistSheet
        visible={sortModalVisible}
        onClose={() => setSortModalVisible(false)}
        currentSort={currentSort}
        onSortChange={handleSortChange}
      />

      {/* Birthday Gift Choice Modal */}
      <BottomSheet visible={birthdayGiftModalVisible} onClose={() => setBirthdayGiftModalVisible(false)} autoHeight>
        <View style={[styles.birthdayGiftModalContent, { backgroundColor: theme.colors.background }]}>
          {/* Header - Standard pattern: centered title, no X button */}
          <View style={styles.birthdayGiftModalHeader}>
            <Text style={[styles.birthdayGiftModalTitle, { color: theme.colors.textPrimary }]}>
              Create Gift List for {selectedBirthdayFriend?.name}
            </Text>
          </View>
          
          <View style={[styles.birthdayGiftOptions, { paddingBottom: Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20) }]}>
            {/* Regular Wishlist Option */}
            <TouchableOpacity
              style={[
                styles.birthdayGiftOption,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.textSecondary + '40',
                }
              ]}
              onPress={() => {
                setBirthdayGiftModalVisible(false);
                // Small delay to let the modal close before opening the next one
                setTimeout(() => {
                  setCreateWishlistSheetVisible(true);
                }, 200);
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.birthdayGiftOptionIcon,
                { backgroundColor: theme.colors.primary + '15' }
              ]}>
                <Feather name="list" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.birthdayGiftOptionContent}>
                <Text style={[styles.birthdayGiftOptionTitle, { color: theme.colors.textPrimary }]}>
                  Create Wishlist
                </Text>
                <Text style={[styles.birthdayGiftOptionDescription, { color: theme.colors.textSecondary }]}>
                  Create a personal wishlist for this friend's birthday
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Group Gift Option */}
            <TouchableOpacity
              style={[
                styles.birthdayGiftOption,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.textSecondary + '40',
                }
              ]}
              onPress={() => {
                setBirthdayGiftModalVisible(false);
                setTimeout(() => {
                  setCreateGroupGiftSheetVisible(true);
                }, 200);
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.birthdayGiftOptionIcon,
                { backgroundColor: theme.colors.primary + '15' }
              ]}>
                <Feather name="users" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.birthdayGiftOptionContent}>
                <Text style={[styles.birthdayGiftOptionTitle, { color: theme.colors.textPrimary }]}>
                  Create Group Gift
                </Text>
                <Text style={[styles.birthdayGiftOptionDescription, { color: theme.colors.textSecondary }]}>
                  Create a shared wishlist with friends for group gifting
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {/* Create Wishlist Sheet */}
      <CreateWishlistSheet
        visible={createWishlistSheetVisible}
        onClose={() => setCreateWishlistSheetVisible(false)}
        initialTitle={selectedBirthdayFriend ? `${selectedBirthdayFriend.name}'s Birthday` : undefined}
      />
      
      {/* Create Group Gift Sheet */}
      <CreateGroupGiftSheet
        visible={createGroupGiftSheetVisible}
        onClose={() => setCreateGroupGiftSheetVisible(false)}
        initialTitle={selectedBirthdayFriend ? `${selectedBirthdayFriend.name}'s Birthday` : undefined}
        initialFriendId={selectedBirthdayFriend?.id || id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
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
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 30,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "500",
  },
  nameDivider: {
    width: 1,
    height: 16,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "600",
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
    justifyContent: "center",
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
    marginBottom: 16,
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
  wishlistsSectionContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    marginTop: 16,
  },
  wishlistsSection: {
    paddingTop: 24,
  },
  wishlistsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 16,
    marginHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sortButton: {
    padding: 4,
  },
  card: {
    paddingVertical: 16,
  },
  cardContent: {
    flexDirection: "row",
    paddingHorizontal: 5,
    alignItems: "center",
  },
  wishlistsSectionContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  cardDivider: {
    height: 1,
    width: "95%",
    alignSelf: "center",
    marginVertical: 12,
  },
  cardLeft: {
    flex: 1,
    marginRight: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  metricsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    gap: 8,
  },
  metricLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2,
    lineHeight: 20,
    includeFontPadding: false,
    color: "red",
  },
  metricDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 8,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#4B5563",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
  menuButton: {
    padding: 4,
  },
  birthdayGiftModalContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  birthdayGiftModalHeader: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  birthdayGiftModalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  birthdayGiftOptions: {
    gap: 12,
  },
  birthdayGiftOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  birthdayGiftOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  birthdayGiftOptionContent: {
    flex: 1,
  },
  birthdayGiftOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  birthdayGiftOptionDescription: {
    fontSize: 14,
  },
});





