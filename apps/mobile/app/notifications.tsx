import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageHeader, HeaderButton } from "@/components/PageHeader";
import { useState, useCallback } from "react";
import { notificationsService, type Notification } from "@/services/notifications";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { refreshUnreadNotificationsCount } = useNotificationContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false to prevent flash
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNotifications = useCallback(async (showLoader = true) => {
    try {
      // Only show loading spinner if we have no data AND it's the first load
      const shouldShowLoader = showLoader && !hasLoadedOnce && notifications.length === 0;
      if (shouldShowLoader) {
        setIsLoading(true);
      }
      const data = await notificationsService.getNotifications();
      setNotifications(data);
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }
      console.log("✅ Loaded", data.length, "notifications");
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce, notifications.length]);

  useFocusEffect(
    useCallback(() => {
      // Only fetch if we haven't loaded yet, or silently refresh if we have data
      if (!hasLoadedOnce) {
        fetchNotifications(true); // First load - show spinner
      } else {
        fetchNotifications(false); // Subsequent loads - silent refresh
      }
    }, [fetchNotifications, hasLoadedOnce])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.read) {
        await notificationsService.markAsRead(notification.id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        await refreshUnreadNotificationsCount();
      }

      // Navigate based on type
      switch (notification.type) {
        case "FRIEND_REQUEST":
          router.push("/(tabs)/friends");
          break;
        case "WISHLIST_SHARED":
          if (notification.data?.wishlistId) {
            router.push(`/wishlist/${notification.data.wishlistId}`);
          }
          break;
        case "ITEM_RESERVED":
        case "ITEM_PURCHASED":
        case "COMMENT_ADDED":
          // Navigate to specific item or wishlist
          console.log("Navigate to:", notification.data);
          break;
        default:
          console.log("Notification pressed:", notification);
      }
    } catch (error) {
      console.error("❌ Error handling notification:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await refreshUnreadNotificationsCount();
    } catch (error) {
      console.error("❌ Error marking all as read:", error);
    }
  };

  const handleDeleteAll = () => {
    console.log("🗑️ handleDeleteAll called");
    // Don't show confirmation if there are no notifications
    if (notifications.length === 0) {
      console.log("ℹ️ No notifications to delete");
      return;
    }
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteAll = async () => {
    try {
      setIsDeleting(true);
      console.log("🗑️ Attempting to delete all notifications...");
      await notificationsService.deleteAll();
      console.log("✅ Delete all completed");
      setNotifications([]);
      await refreshUnreadNotificationsCount();
      console.log("✅ UI updated after delete");
      setDeleteConfirmVisible(false);
    } catch (error: any) {
      console.error("❌ Error deleting all notifications:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "FRIEND_REQUEST":
        return "user-plus";
      case "FRIEND_ACCEPTED":
        return "check-circle"; // Changed to check-circle
      case "WISHLIST_SHARED":
        return "share";
      case "ITEM_RESERVED":
        return "bookmark";
      case "ITEM_PURCHASED":
        return "shopping-bag";
      case "COMMENT_ADDED":
        return "message-circle";
      default:
        return "bell";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const iconName = getNotificationIcon(item.type);
    // All notifications use primary color at full opacity
    const iconBackgroundColor = theme.colors.primary;
    // Icon itself is white
    const iconColor = "#FFFFFF";

    return (
      <View>
        <TouchableOpacity
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
          style={styles.notificationRow}
        >
          <View style={styles.notificationContent}>
            <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
              <Feather name={iconName} size={20} color={iconColor} />
            </View>

            <View style={styles.notificationText}>
              <Text style={[
                styles.notificationTitle, 
                { 
                  color: theme.colors.textPrimary,
                  fontWeight: item.read ? "500" : "600" // Only unread are bold
                }
              ]}>
                {item.title}
              </Text>
              <Text style={[styles.notificationBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {index < notifications.length - 1 && (
          <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '20' }]} />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <PageHeader
        title="Notifications"
        rightActions={
          <>
            <HeaderButton
              icon="trash-2"
              onPress={() => {
                console.log("🗑️ Delete all button pressed");
                handleDeleteAll();
              }}
            />
            <HeaderButton
              icon="check"
              onPress={handleMarkAllRead}
            />
          </>
        }
      />

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptySubtitle, { marginTop: 16, color: theme.colors.textSecondary }]}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Feather name="bell" size={48} color={theme.colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No notifications</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            You're all caught up! We'll notify you when something new happens.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#4A90E2"]} />
          }
        />
      )}

      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={confirmDeleteAll}
        title=""
        type="notifications"
        isDeleting={isDeleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center", // Vertically center the icon with the text
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    width: "90%",
    alignSelf: "center", // Center the divider
    marginVertical: 0,
  },
});

