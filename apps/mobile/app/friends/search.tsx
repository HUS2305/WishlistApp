import { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Card } from "@/components/ui";
import { friendsService, type SearchResult } from "@/services/friends";
import { PageHeader } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { getDisplayName } from "@/lib/utils";
import { FriendMenu } from "@/components/FriendMenu";
import type { User } from "@/types";
import { useCallback } from "react";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function FriendSearchScreen() {
  const { theme } = useTheme();
  const { refreshUnreadNotificationsCount } = useNotificationContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [friendMenuVisible, setFriendMenuVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const searchResults = await friendsService.searchUsers(searchQuery.trim());
      setResults(searchResults);
      console.log("✅ Found", searchResults.length, "users");
    } catch (error) {
      console.error("❌ Error searching users:", error);
      Alert.alert("Error", "Failed to search for users");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    
    const userName = getDisplayName(selectedUser) || selectedUser.username || "this user";
    const confirmMessage = `Are you sure you want to block ${userName}? You won't be able to see their profile or send them friend requests.`;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        return;
      }
      
      try {
        await friendsService.blockUser(selectedUser.id);
        window.alert("User blocked successfully");
        setFriendMenuVisible(false);
        setSelectedUser(null);
        // Refresh search results
        if (searchQuery.trim()) {
          const searchResults = await friendsService.searchUsers(searchQuery.trim());
          setResults(searchResults);
        }
      } catch (error: any) {
        console.error("Error blocking user:", error);
        window.alert(error.response?.data?.message || error.message || "Failed to block user");
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
                await friendsService.blockUser(selectedUser.id);
                Alert.alert("Success", "User blocked successfully");
                setFriendMenuVisible(false);
                setSelectedUser(null);
                // Refresh search results
                if (searchQuery.trim()) {
                  const searchResults = await friendsService.searchUsers(searchQuery.trim());
                  setResults(searchResults);
                }
              } catch (error: any) {
                console.error("Error blocking user:", error);
                Alert.alert("Error", error.response?.data?.message || "Failed to block user");
              }
            },
          },
        ]
      );
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedUser) return;
    
    try {
      await friendsService.unblockUser(selectedUser.id);
      Alert.alert("Success", "User unblocked successfully");
      setFriendMenuVisible(false);
      setSelectedUser(null);
      // Refresh search results
      if (searchQuery.trim()) {
        const searchResults = await friendsService.searchUsers(searchQuery.trim());
        setResults(searchResults);
      }
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to unblock user");
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
      >
        <Card style={styles.resultCard}>
          <View style={styles.resultContent}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarText}>
                  {getDisplayName(item)?.[0] || item.username?.[0] || "?"}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
                  {getDisplayName(item) || item.username}
                </Text>
                <Text style={[styles.userUsername, { color: theme.colors.textSecondary }]}>@{item.username}</Text>
                {item.bio && (
                  <Text style={[styles.userBio, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {item.bio}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.resultActions}>
              {item.isBlockedByMe ? (
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                  <Feather name="slash" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Blocked</Text>
                </View>
              ) : item.isFriend ? (
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Feather name="check-circle" size={16} color={theme.colors.primary} />
                  <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>Friends</Text>
                </View>
              ) : item.isPending ? (
                <View style={styles.pendingStatusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                    <Feather name="clock" size={16} color={theme.colors.textPrimary} />
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
                      <Feather name="x" size={16} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    handleSendRequest(item.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="user-plus" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {/* Three-dot menu for all users */}
              <TouchableOpacity
                style={styles.searchMenuButton}
                onPress={(e: any) => {
                  e.stopPropagation();
                  setSelectedUser(item);
                  setFriendMenuVisible(true);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="more-vertical" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <PageHeader title="Find Friends" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#6B7280" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by username or email"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchButton, !searchQuery.trim() && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!searchQuery.trim() || isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Searching...</Text>
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
          <Feather name="search" size={48} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with a different username or email
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color="#8E8E93" />
          <Text style={styles.emptyTitle}>Find your friends</Text>
          <Text style={styles.emptySubtitle}>
            Search by username or email to connect with friends
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
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          areFriends={selectedUser.isFriend}
          isBlockedByMe={selectedUser.isBlockedByMe}
          isBlockedByThem={selectedUser.isBlockedByThem}
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
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  searchButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    minWidth: 80,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  resultsContent: {
    padding: 16,
  },
  resultCard: {
    marginBottom: 12,
  },
  resultContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
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
    backgroundColor: "#4A90E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textTransform: "uppercase",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    marginBottom: 2,
  },
  userBio: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  friendBadgeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#10B981",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F59E0B",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  resultActions: {
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
    padding: 4,
  },
  searchMenuButton: {
    padding: 4,
  },
});

