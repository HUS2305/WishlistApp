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
import { usePendingRequests } from "@/hooks/useFriends";
import { friendsService } from "@/services/friends";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function PendingRequestsScreen() {
  const { theme } = useTheme();
  const { isLoaded: isClerkLoaded } = useAuth();
  const { data: pendingRequests = [], isLoading, refetch, isFetching: isRefreshing } = usePendingRequests();
  const { refreshUnreadNotificationsCount, refreshPendingRequestsCount } = useNotificationContext();
  const [friendMenuVisible, setFriendMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);

  const handleViewProfile = (friendId: string) => {
    router.push(`/friends/${friendId}`);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendsService.acceptFriendRequest(requestId);
      refetch();
      await refreshUnreadNotificationsCount();
      await refreshPendingRequestsCount();
    } catch (error) {
      console.error("❌ Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendsService.rejectFriendRequest(requestId);
      refetch();
      await refreshPendingRequestsCount();
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
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
        title="Pending Requests"
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
        ) : pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={64} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No pending requests</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Friend requests you receive will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {pendingRequests.map((request, index) => (
              <View key={request.id}>
                <TouchableOpacity
                  onPress={() => handleViewProfile(request.user.id)}
                  activeOpacity={0.7}
                  style={styles.requestRow}
                >
                  <View style={styles.friendInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {(getDisplayName(request.user)?.[0] || request.user.username?.[0] || "?").toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                        {getDisplayName(request.user) || request.user.username || "Unknown"}
                      </Text>
                      <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>
                        @{request.user.username}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        handleAcceptRequest(request.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="check" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectButton, { borderColor: theme.colors.textSecondary + '40' }]}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        handleRejectRequest(request.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="x" size={18} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={(e: any) => {
                        e.stopPropagation();
                        setSelectedFriend(request.user);
                        setFriendMenuVisible(true);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                {index < pendingRequests.length - 1 && (
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
          }}
          onViewProfile={() => {
            setFriendMenuVisible(false);
            handleViewProfile(selectedFriend.id);
          }}
          areFriends={false}
          isPending={true}
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
  requestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
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
