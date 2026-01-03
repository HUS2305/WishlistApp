import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { friendsService, type SearchResult } from "@/services/friends";
import { useTheme } from "@/contexts/ThemeContext";
import { getDisplayName } from "@/lib/utils";
import { FriendMenu } from "@/components/FriendMenu";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { getHeaderOptions } from "@/lib/navigation";

export default function FriendSearchScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { refreshUnreadNotificationsCount } = useNotificationContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [friendMenuVisible, setFriendMenuVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Configure native header
  useLayoutEffect(() => {
    navigation.setOptions(
      getHeaderOptions(theme, {
        title: "Find Friends",
      })
    );
  }, [navigation, theme]);

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 1) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await friendsService.searchUsers(query.trim());
      setResults(searchResults);
      console.log("✅ Found", searchResults.length, "users");
    } catch (error) {
      console.error("❌ Error searching users:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If text is empty, clear results immediately
    if (!text.trim() || text.trim().length < 1) {
      setResults([]);
      return;
    }
    
    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSendRequest = async (userId: string) => {
    try {
      await friendsService.sendFriendRequest(userId);
      Alert.alert("Success", "Friend request sent!");
      
      // Refresh search results
      if (searchQuery.trim()) {
        const searchResults = await friendsService.searchUsers(searchQuery.trim());
        setResults(searchResults);
      }
      
      // Refresh notification count
      await refreshUnreadNotificationsCount();
    } catch (error) {
      console.error("❌ Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const handleBlockUser = () => {
    if (!selectedUser) return;
    // Close menu first, then open block modal after a short delay
    setFriendMenuVisible(false);
    setTimeout(() => {
      setBlockConfirmVisible(true);
    }, 150);
  };

  const confirmBlockUser = async () => {
    if (!selectedUser) return;
    try {
      await friendsService.blockUser(selectedUser.id);
      Alert.alert("Success", "User blocked successfully");
      setSelectedUser(null);
      setBlockConfirmVisible(false);
      // Refresh search results
      if (searchQuery.trim()) {
        const searchResults = await friendsService.searchUsers(searchQuery.trim());
        setResults(searchResults);
      }
    } catch (error: any) {
      console.error("Error blocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to block user");
      setBlockConfirmVisible(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedUser) return;
    
    try {
      await friendsService.unblockUser(selectedUser.id);
      Alert.alert("Success", "User unblocked successfully");
      setFriendMenuVisible(false);
      setSelectedUser(null);
      // Refresh search results with a small delay to ensure DB is updated
      if (searchQuery.trim()) {
        setTimeout(async () => {
          try {
            const searchResults = await friendsService.searchUsers(searchQuery.trim());
            setResults(searchResults);
          } catch (error) {
            console.error("Error refreshing search after unblock:", error);
          }
        }, 300);
      }
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to unblock user");
    }
  };

  const handleRemoveFriend = () => {
    if (!selectedUser) return;
    // Close menu first, then open remove modal after a short delay
    setFriendMenuVisible(false);
    setTimeout(() => {
      setRemoveConfirmVisible(true);
    }, 150);
  };

  const confirmRemoveFriend = async () => {
    if (!selectedUser) return;
    try {
      await friendsService.removeFriend(selectedUser.id);
      Alert.alert("Success", "Friend removed");
      setSelectedUser(null);
      setRemoveConfirmVisible(false);
      // Refresh search results
      if (searchQuery.trim()) {
        const searchResults = await friendsService.searchUsers(searchQuery.trim());
        setResults(searchResults);
      }
    } catch (error: any) {
      console.error("Error removing friend:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to remove friend");
      setRemoveConfirmVisible(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await friendsService.cancelFriendRequest(requestId);
      Alert.alert("Success", "Friend request cancelled");
      // Refresh search results
      if (searchQuery.trim()) {
        const searchResults = await friendsService.searchUsers(searchQuery.trim());
        setResults(searchResults);
      }
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to cancel friend request");
    }
  };

  // Auto-focus search input when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure the screen is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/friends/${item.id}`)}
        style={styles.searchResultRow}
      >
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {(getDisplayName(item)?.[0] || item.username?.[0] || "?").toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
                {getDisplayName(item) || item.username}
              </Text>
              <Text style={[styles.userUsername, { color: theme.colors.textSecondary }]}>@{item.username}</Text>
            </View>
          </View>

          <View style={styles.searchResultActions}>
            {item.isBlockedByMe ? (
              <>
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                  <Feather name="slash" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Blocked</Text>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    setSelectedUser(item);
                    setFriendMenuVisible(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : item.isFriend ? (
              <>
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Feather name="check-circle" size={14} color={theme.colors.primary} />
                  <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>Friends</Text>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    setSelectedUser(item);
                    setFriendMenuVisible(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : item.isPending ? (
              <>
                <View style={styles.pendingStatusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                    <Feather name="clock" size={14} color={theme.colors.textPrimary} />
                    <Text style={[styles.statusBadgeText, { color: theme.colors.textPrimary }]}>Pending</Text>
                  </View>
                  {item.isSentByMe && item.pendingRequestId && (
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: theme.colors.textSecondary + '15' }]}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        handleCancelRequest(item.pendingRequestId!);
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="x" size={14} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    setSelectedUser(item);
                    setFriendMenuVisible(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    handleSendRequest(item.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="user-plus" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    setSelectedUser(item);
                    setFriendMenuVisible(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
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
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Searching...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.resultsContent}
        />
      ) : searchQuery.trim() && !isSearching ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No users found</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Try a different username or name
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="search" size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Find your friends</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Search by name or username to connect with friends
          </Text>
        </View>
      )}

      {/* Friend Menu */}
      {selectedUser && (
        <FriendMenu
          visible={friendMenuVisible}
          onClose={() => {
            setFriendMenuVisible(false);
            setSelectedUser(null);
          }}
          onViewProfile={() => {
            setFriendMenuVisible(false);
            router.push(`/friends/${selectedUser.id}`);
          }}
          onRemoveFriend={handleRemoveFriend}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          areFriends={selectedUser.isFriend}
          isBlockedByMe={selectedUser.isBlockedByMe}
          isBlockedByThem={selectedUser.isBlockedByThem}
        />
      )}

      {/* Block User Confirmation Modal */}
      {selectedUser && (
        <DeleteConfirmModal
          visible={blockConfirmVisible}
          title={getDisplayName(selectedUser) || selectedUser.username || "this user"}
          modalTitle="Block User"
          onConfirm={confirmBlockUser}
          onCancel={() => {
            setBlockConfirmVisible(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Remove Friend Confirmation Modal */}
      {selectedUser && (
        <DeleteConfirmModal
          visible={removeConfirmVisible}
          title={getDisplayName(selectedUser) || selectedUser.username || "this friend"}
          modalTitle="Remove Friend"
          onConfirm={confirmRemoveFriend}
          onCancel={() => {
            setRemoveConfirmVisible(false);
            setSelectedUser(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
  },
  resultsContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  userInfo: {
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
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1,
  },
  userUsername: {
    fontSize: 14,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    padding: 4,
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
  searchResultActions: {
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
  pendingStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelButton: {
    padding: 8,
  },
});

