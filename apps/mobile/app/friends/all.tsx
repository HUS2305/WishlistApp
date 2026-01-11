import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput, FlatList, Platform } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useState, useCallback, useRef, useEffect } from "react";
import { friendsService, type SearchResult } from "@/services/friends";
import type { User } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { getDisplayName } from "@/lib/utils";
import { FriendMenu } from "@/components/FriendMenu";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useAuth } from "@clerk/clerk-expo";
import { CreateWishlistSheet } from "@/components/CreateWishlistSheet";
import { CreateGroupGiftSheet } from "@/components/CreateGroupGiftSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { HeaderButton } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriends } from "@/hooks/useFriends";

export default function AllFriendsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const { data: friends = [], isLoading, refetch, isFetching: isRefreshing } = useFriends();
  const [friendMenuVisible, setFriendMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [selectedFriendBlockStatus, setSelectedFriendBlockStatus] = useState<{ isBlockedByMe?: boolean; isBlockedByThem?: boolean }>({});
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [birthdayGiftModalVisible, setBirthdayGiftModalVisible] = useState(false);
  const [selectedBirthdayFriend, setSelectedBirthdayFriend] = useState<{ id: string; name: string } | null>(null);
  const [createWishlistSheetVisible, setCreateWishlistSheetVisible] = useState(false);
  const [createGroupGiftSheetVisible, setCreateGroupGiftSheetVisible] = useState(false);
  
  // Search state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const isSearchActiveRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchPress = useCallback(() => {
    if (isSearchActive) {
      setIsSearchActive(false);
      setSearchQuery("");
      setSearchResults([]);
      searchInputRef.current?.blur();
    } else {
      setIsSearchActive(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchActive]);


  // React Query handles fetching automatically when enabled
  const onRefresh = () => {
    refetch();
  };

  const handleViewProfile = (friendId: string) => {
    router.push(`/friends/${friendId}`);
  };

  const handleRemoveFriend = () => {
    setFriendMenuVisible(false);
    if (!selectedFriend) return;
    setRemoveConfirmVisible(true);
  };

  const confirmRemoveFriend = async () => {
    if (!selectedFriend) return;
    try {
      await friendsService.removeFriend(selectedFriend.id);
      Alert.alert("Success", "Friend removed");
      setSelectedFriend(null);
      setSelectedFriendBlockStatus({});
      setRemoveConfirmVisible(false);
      refetch();
    } catch (error: any) {
      console.error("Error removing friend:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to remove friend");
      setRemoveConfirmVisible(false);
    }
  };

  const handleBlockUser = () => {
    if (!selectedFriend) return;
    setFriendMenuVisible(false);
    setTimeout(() => {
      setBlockConfirmVisible(true);
    }, 150);
  };

  const confirmBlockUser = async () => {
    if (!selectedFriend) return;
    try {
      await friendsService.blockUser(selectedFriend.id);
      Alert.alert("Success", "User blocked successfully");
      setSelectedFriend(null);
      setSelectedFriendBlockStatus({});
      setBlockConfirmVisible(false);
      refetch();
    } catch (error: any) {
      console.error("Error blocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to block user");
      setBlockConfirmVisible(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedFriend) return;
    try {
      await friendsService.unblockUser(selectedFriend.id);
      Alert.alert("Success", "User unblocked successfully");
      setFriendMenuVisible(false);
      setSelectedFriend(null);
      setSelectedFriendBlockStatus({});
      refetch();
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to unblock user");
    }
  };


  const handleSearch = useCallback((query: string) => {
    if (!query.trim() || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Filter friends locally based on search query
      const queryLower = query.trim().toLowerCase();
      const filtered = friends.filter(friend => {
        const displayName = getDisplayName(friend)?.toLowerCase() || '';
        const username = friend.username?.toLowerCase() || '';
        return displayName.includes(queryLower) || username.includes(queryLower);
      });
      
      // Convert friends to SearchResult format for consistency
      const results: SearchResult[] = filtered.map(friend => ({
        id: friend.id,
        username: friend.username || '',
        firstName: friend.firstName,
        lastName: friend.lastName,
        avatar: friend.avatar,
        isFriend: true,
        isPending: false,
        isBlockedByMe: false,
        isBlockedByThem: false,
      }));
      
      setSearchResults(results);
    } catch (error) {
      console.error("❌ Error searching friends:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [friends]);

  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!text.trim() || text.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  useEffect(() => {
    isSearchActiveRef.current = isSearchActive;
  }, [isSearchActive]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    // Since we're only searching friends, all results are friends
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/friends/${item.id}`)}
        style={styles.searchResultRow}
      >
        <View style={styles.friendInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {(getDisplayName(item)?.[0] || item.username?.[0] || "?").toUpperCase()}
            </Text>
          </View>
          <View style={styles.friendDetails}>
            <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
              {getDisplayName(item) || item.username}
            </Text>
            <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>@{item.username}</Text>
          </View>
        </View>
        <View style={styles.searchResultActions}>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '15' }]}>
            <Feather name="check-circle" size={14} color={theme.colors.primary} />
            <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>Friends</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await friendsService.sendFriendRequest(userId);
      Alert.alert("Success", "Friend request sent!");
      // Refresh friends list after sending request
      refetch();
      // Re-run search if there's a search query
      if (searchQuery.trim()) {
        handleSearch(searchQuery.trim());
      }
    } catch (error) {
      console.error("❌ Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="All Friends"
        backButton={true}
        onBack={() => router.replace("/(tabs)/friends")}
        rightActions={
          !isSearchActive ? (
            <HeaderButton
              icon="search"
              onPress={handleSearchPress}
            />
          ) : null
        }
      />
      {/* Search Bar - shown in content area when active */}
      {isSearchActive && (
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.primary, borderWidth: 1 }]}>
            <Feather name="search" size={20} color={theme.colors.primary} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Search by name or username"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchQueryChange("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Search Results */}
      {isSearchActive && (
        <View style={styles.searchResultsContainer}>
          {isSearching ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.searchLoadingText, { color: theme.colors.textSecondary }]}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.searchResultsContent}
            />
          ) : searchQuery.trim() && !isSearching ? (
            <View style={styles.searchEmptyState}>
              <Feather name="search" size={64} color={theme.colors.primary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No friends found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Try a different name or username
              </Text>
            </View>
          ) : (
            <View style={styles.searchEmptyState}>
              <Feather name="search" size={64} color={theme.colors.primary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Search your friends</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Search by name or username to find friends
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Friends List - Hidden when search is active */}
      {!isSearchActive && (
        <ScrollView 
          style={styles.mainContent}
          contentContainerStyle={styles.mainContentContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading && !hasLoadedOnce ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>Loading friends...</Text>
            </View>
          ) : !isLoading && hasLoadedOnce && friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={64} color={theme.colors.primary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No friends yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Tap the search icon to find friends
              </Text>
            </View>
          ) : !isLoading && hasLoadedOnce && (
            <>
              <View style={styles.friendsListSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Friends ({friends.length})</Text>
              </View>
              {friends.map((friend, index) => (
                <View key={friend.id}>
                  <TouchableOpacity
                    onPress={() => handleViewProfile(friend.id)}
                    activeOpacity={0.7}
                    style={styles.friendRow}
                  >
                    <View style={styles.friendInfo}>
                      <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                        {friend.avatar ? (
                          <Text style={styles.avatarText}>🖼️</Text>
                        ) : (
                          <Text style={styles.avatarText}>
                            {(getDisplayName(friend)?.[0] || friend.username?.[0] || "?").toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.friendDetails}>
                        <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                          {getDisplayName(friend) || friend.username || "Unknown"}
                        </Text>
                        <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>@{friend.username}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={(e: any) => {
                        e.stopPropagation();
                        console.log("🔵 Three dot menu button pressed for friend:", friend.id);
                        setSelectedFriend(friend);
                        setSelectedFriendBlockStatus({});
                        setFriendMenuVisible(true);
                      }}
                      style={styles.menuButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                    >
                      <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {index < friends.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Friend Menu */}
      {selectedFriend && (
        <FriendMenu
          visible={friendMenuVisible}
          onClose={() => {
            setFriendMenuVisible(false);
            setSelectedFriend(null);
            setSelectedFriendBlockStatus({});
          }}
          onViewProfile={() => {
            setFriendMenuVisible(false);
            router.push(`/friends/${selectedFriend.id}`);
          }}
          onGift={() => {
            setFriendMenuVisible(false);
            setSelectedBirthdayFriend({
              id: selectedFriend.id,
              name: getDisplayName(selectedFriend) || selectedFriend.username || "Friend"
            });
            setTimeout(() => {
              setBirthdayGiftModalVisible(true);
            }, 200);
          }}
          onRemoveFriend={handleRemoveFriend}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          areFriends={friends.some(f => f.id === selectedFriend.id)}
          isBlockedByMe={selectedFriendBlockStatus.isBlockedByMe}
          isBlockedByThem={selectedFriendBlockStatus.isBlockedByThem}
        />
      )}

      {/* Block User Confirmation Modal - Only render when actually needed */}
      {selectedFriend && blockConfirmVisible && (
        <DeleteConfirmModal
          visible={blockConfirmVisible}
          title={getDisplayName(selectedFriend) || selectedFriend.username || "this user"}
          modalTitle="Block User"
          onConfirm={confirmBlockUser}
          onCancel={() => {
            setBlockConfirmVisible(false);
          }}
        />
      )}

      {/* Remove Friend Confirmation Modal - Only render when actually needed */}
      {selectedFriend && removeConfirmVisible && (
        <DeleteConfirmModal
          visible={removeConfirmVisible}
          title={getDisplayName(selectedFriend) || selectedFriend.username || "this friend"}
          modalTitle="Remove Friend"
          onConfirm={confirmRemoveFriend}
          onCancel={() => {
            setRemoveConfirmVisible(false);
          }}
        />
      )}

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
        initialFriendId={selectedBirthdayFriend?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
  },
  searchLoadingText: {
    fontSize: 14,
  },
  searchResultsContent: {
    paddingTop: 8,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  searchResultActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  searchEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    paddingBottom: 160,
  },
  friendsListSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1,
  },
  friendUsername: {
    fontSize: 14,
  },
  menuButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    width: "100%",
    marginLeft: 24,
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

