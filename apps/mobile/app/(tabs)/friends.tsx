import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, Platform } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { useState, useCallback } from "react";
import { friendsService, type FriendRequest, type SearchResult } from "@/services/friends";
import { PageHeader, HeaderButton } from "@/components/PageHeader";
import type { User } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { getDisplayName } from "@/lib/utils";
import { FriendMenu } from "@/components/FriendMenu";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function FriendsScreen() {
  const { theme } = useTheme();
  const { refreshUnreadNotificationsCount } = useNotificationContext();
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [friendMenuVisible, setFriendMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);

  const fetchData = useCallback(async (showLoader = true) => {
    try {
      // Only show loading spinner if we have no data AND it's the first load
      const shouldShowLoader = showLoader && !hasLoadedOnce && friends.length === 0 && pendingRequests.length === 0;
      if (shouldShowLoader) {
        setIsLoading(true);
      }
      const [friendsData, requestsData, sentRequestsData] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getPendingRequests(),
        friendsService.getSentRequests(),
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
      setSentRequests(sentRequestsData);
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }
      console.log("✅ Loaded", friendsData.length, "friends,", requestsData.length, "pending requests, and", sentRequestsData.length, "sent requests");
    } catch (error) {
      console.error("❌ Error fetching friends:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce, friends.length, pendingRequests.length]);

  useFocusEffect(
    useCallback(() => {
      // Only fetch if we haven't loaded yet, or silently refresh if we have data
      if (!hasLoadedOnce) {
        fetchData(true); // First load - show spinner
      } else {
        fetchData(false); // Subsequent loads - silent refresh
      }
    }, [fetchData, hasLoadedOnce])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendsService.acceptFriendRequest(requestId);
      Alert.alert("Success", "Friend request accepted!");
      fetchData(false);
      await refreshUnreadNotificationsCount();
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendsService.rejectFriendRequest(requestId);
      Alert.alert("Success", "Friend request rejected");
      fetchData(false);
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const handleViewProfile = (friendId: string) => {
    router.push(`/friends/${friendId}`);
  };

  const handleRemoveFriend = () => {
    setFriendMenuVisible(false);
    if (!selectedFriend) return;
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${getDisplayName(selectedFriend) || selectedFriend.username || "this friend"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await friendsService.removeFriend(selectedFriend.id);
              Alert.alert("Success", "Friend removed");
              setSelectedFriend(null);
              fetchData(false);
            } catch (error: any) {
              console.error("Error removing friend:", error);
              Alert.alert("Error", error.response?.data?.message || "Failed to remove friend");
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    if (!selectedFriend) return;
    
    const userName = getDisplayName(selectedFriend) || selectedFriend.username || "this user";
    const confirmMessage = `Are you sure you want to block ${userName}? You won't be able to see their profile or send them friend requests.`;
    
    if (Platform.OS === 'web') {
      const win = (globalThis as any).window as { confirm: (msg: string) => boolean; alert: (msg: string) => void } | undefined;
      const confirmed = win ? win.confirm(confirmMessage) : false;
      if (!confirmed) {
        return;
      }
      
      try {
        await friendsService.blockUser(selectedFriend.id);
        if (win) {
          win.alert("User blocked successfully");
        }
        setFriendMenuVisible(false);
        setSelectedFriend(null);
        fetchData(false);
      } catch (error: any) {
        console.error("Error blocking user:", error);
        if (win) {
          win.alert(error.response?.data?.message || error.message || "Failed to block user");
        }
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
                await friendsService.blockUser(selectedFriend.id);
                Alert.alert("Success", "User blocked successfully");
                setFriendMenuVisible(false);
                setSelectedFriend(null);
                fetchData(false);
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
    if (!selectedFriend) return;
    
    try {
      await friendsService.unblockUser(selectedFriend.id);
      Alert.alert("Success", "User unblocked successfully");
      setFriendMenuVisible(false);
      setSelectedFriend(null);
      fetchData(false);
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to unblock user");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await friendsService.cancelFriendRequest(requestId);
      Alert.alert("Success", "Friend request cancelled");
      fetchData(false);
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to cancel friend request");
    }
  };

  const handleSearchPress = () => {
    router.push("/friends/search");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PageHeader
        title="Friends"
        backButton={false}
        rightActions={
          <HeaderButton
            icon="search"
            onPress={handleSearchPress}
          />
        }
      />

      {/* Pending friend requests section */}
      {!isLoading && pendingRequests.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          {pendingRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              onPress={() => handleViewProfile(request.user.id)}
              activeOpacity={0.7}
            >
              <Card style={styles.requestCard}>
                <View style={styles.cardContent}>
                  <View style={styles.friendInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getDisplayName(request.user)?.[0] || request.user.username?.[0] || "?"}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>
                        {getDisplayName(request.user) || request.user.username || "Unknown"}
                      </Text>
                      <Text style={styles.friendUsername}>@{request.user.username}</Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={styles.acceptButton}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        handleAcceptRequest(request.id);
                      }}
                    >
                      <Feather name="check" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.rejectButton}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        handleRejectRequest(request.id);
                      }}
                    >
                      <Feather name="x" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sent friend requests section */}
      {!isLoading && sentRequests.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Sent Requests</Text>
          {sentRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              onPress={() => handleViewProfile(request.friend.id)}
              activeOpacity={0.7}
            >
              <Card style={styles.requestCard}>
                <View style={styles.cardContent}>
                  <View style={styles.friendInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getDisplayName(request.friend)?.[0] || request.friend.username?.[0] || "?"}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <View style={styles.sentRequestHeader}>
                        <Text style={styles.friendName}>
                          {getDisplayName(request.friend) || request.friend.username || "Unknown"}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                          <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                          <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Pending</Text>
                        </View>
                      </View>
                      <Text style={styles.friendUsername}>@{request.friend.username}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleCancelRequest(request.id);
                    }}
                  >
                    <Feather name="x" size={18} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#A8D8EA" />
          <Text style={[styles.emptySubtitle, { marginTop: 16 }]}>Loading friends...</Text>
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Feather name="users" size={48} color="#8E8E93" />
          </View>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>
            Search for friends to connect and share wishlists
          </Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#A8D8EA"]} />
          }
        >
          {friends.map((friend) => (
            <TouchableOpacity
              key={friend.id}
              onPress={() => handleViewProfile(friend.id)}
              activeOpacity={0.7}
            >
              <Card style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.friendInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                      {friend.avatar ? (
                        <Text style={styles.avatarText}>🖼️</Text>
                      ) : (
                        <Text style={styles.avatarText}>
                          {getDisplayName(friend)?.[0] || friend.username?.[0] || "?"}
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
                      setSelectedFriend(friend);
                      setFriendMenuVisible(true);
                    }}
                    style={styles.menuButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="more-vertical" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <Feather name="chevron-right" size={24} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Friend Menu */}
      {selectedFriend && (
        <FriendMenu
          visible={friendMenuVisible}
          onClose={() => {
            setFriendMenuVisible(false);
            setSelectedFriend(null);
          }}
          onViewProfile={() => {
            setFriendMenuVisible(false);
            handleViewProfile(selectedFriend.id);
          }}
          onRemoveFriend={handleRemoveFriend}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          areFriends={friends.some(f => f.id === selectedFriend.id)}
          isBlockedByMe={false}
          isBlockedByThem={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pendingSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  requestCard: {
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
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
    backgroundColor: "#4A90E2",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
  },
  sentRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
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
  cancelButton: {
    padding: 8,
  },
  menuButton: {
    padding: 4,
  },
});
