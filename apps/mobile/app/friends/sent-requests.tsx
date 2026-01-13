import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import type { User } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { getDisplayName } from "@/lib/utils";
import { FriendMenu } from "@/components/FriendMenu";
import { useAuth } from "@clerk/clerk-expo";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useSentRequests } from "@/hooks/useFriends";
import { friendsService } from "@/services/friends";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function SentRequestsScreen() {
  const { theme } = useTheme();
  const { isLoaded: isClerkLoaded } = useAuth();
  const { data: sentRequests = [], isLoading, refetch, isFetching: isRefreshing } = useSentRequests();
  const { refreshUnreadNotificationsCount } = useNotificationContext();
  const [friendMenuVisible, setFriendMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [selectedFriendBlockStatus, setSelectedFriendBlockStatus] = useState<{ isBlockedByMe?: boolean; isBlockedByThem?: boolean }>({});

  const handleViewProfile = (friendId: string) => {
    router.push(`/friends/${friendId}`);
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await friendsService.cancelFriendRequest(requestId);
      refetch();
      await refreshUnreadNotificationsCount();
    } catch (error: any) {
      console.error("Error cancelling request:", error);
    }
  };

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      if (isClerkLoaded) {
        refetch();
      }
    }, [isClerkLoaded, refetch])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Sent Requests"
        backButton={true}
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>
              Loading requests...
            </Text>
          </View>
        ) : sentRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="send" size={64} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No sent requests</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Friend requests you send will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {sentRequests.map((request, index) => (
              <View key={request.id}>
                <TouchableOpacity
                  onPress={() => handleViewProfile(request.friend.id)}
                  activeOpacity={0.7}
                  style={styles.requestRow}
                >
                  <View style={styles.friendInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {(getDisplayName(request.friend)?.[0] || request.friend.username?.[0] || "?").toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                        {getDisplayName(request.friend) || request.friend.username || "Unknown"}
                      </Text>
                      <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>
                        @{request.friend.username}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sentRequestActions}>
                    <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                      <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Pending</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.cancelButtonBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        handleCancelRequest(request.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="x" size={14} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        setSelectedFriend(request.friend);
                        setSelectedFriendBlockStatus({});
                        setFriendMenuVisible(true);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                {index < sentRequests.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
            handleViewProfile(selectedFriend.id);
          }}
          areFriends={false}
          isPending={true}
          isBlockedByMe={selectedFriendBlockStatus.isBlockedByMe}
          isBlockedByThem={selectedFriendBlockStatus.isBlockedByThem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  requestsList: {
    width: "100%",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
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
  sentRequestActions: {
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
  cancelButtonBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  menuButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
