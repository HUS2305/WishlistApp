// This is now the Wishlists screen (home screen)
import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import { wishlistsService } from "@/services/wishlists";
import type { Wishlist } from "@/types";
import { PageHeader, HeaderButton } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { Badge } from "@/components/Badge";
import { SortWishlistSheet, type SortOption } from "@/components/SortWishlistSheet";
import { loadSortPreference, saveSortPreference, sortWishlists } from "@/utils/sortPreferences";
import { loadViewModePreference, saveViewModePreference, type ViewMode } from "@/utils/viewPreferences";
import { useAuth } from "@clerk/clerk-expo";
import { wishlistEvents } from "@/utils/wishlistEvents";

export default function WishlistsScreen() {
  const { theme } = useTheme();
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { unreadNotificationsCount, refreshUnreadNotificationsCount } = useNotificationContext();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false to prevent flash
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>("last_added");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");

  // Reset hasLoadedOnce when auth state changes (e.g., after login)
  useEffect(() => {
    if (!isSignedIn || !userId) {
      // User signed out or not authenticated - reset state
      setHasLoadedOnce(false);
      setWishlists([]);
    }
  }, [isSignedIn, userId]);

  // Fetch wishlists when auth becomes ready (handles case where user signs in while already on screen)
  useEffect(() => {
    if (isLoaded && isSignedIn && userId && !hasLoadedOnce) {
      console.log("🔐 Auth ready - triggering wishlist fetch");
      // Call fetchWishlists directly here to avoid dependency issues
      const loadWishlists = async () => {
        if (!isLoaded || !isSignedIn || !userId) return;
        try {
          setIsLoading(true);
          const data = await wishlistsService.getWishlists();
          setWishlists(data);
          setHasLoadedOnce(true);
          console.log("✅ Loaded", data.length, "wishlists");
        } catch (error) {
          console.error("❌ Error fetching wishlists:", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadWishlists();
    }
  }, [isLoaded, isSignedIn, userId, hasLoadedOnce]);

  const fetchWishlists = useCallback(async (showLoader = true) => {
    // Don't fetch if auth is not ready or user is not signed in
    if (!isLoaded || !isSignedIn || !userId) {
      console.log("⏳ Skipping wishlist fetch - auth not ready");
      // Make sure to clear refreshing state if we're not fetching
      setIsRefreshing(false);
      return;
    }

    try {
      // Only show loading spinner if we have no data AND it's the first load
      if (showLoader && !hasLoadedOnce && wishlists.length === 0) {
        setIsLoading(true);
      }
      const data = await wishlistsService.getWishlists();
      setWishlists(data);
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }
      console.log("✅ Loaded", data.length, "wishlists");
    } catch (error) {
      console.error("❌ Error fetching wishlists:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce, wishlists.length, isLoaded, isSignedIn, userId]);

  // Fetch wishlists when screen comes into focus (but don't show spinner if already loaded)
  useFocusEffect(
    useCallback(() => {
      // Wait for auth to be ready before fetching
      if (!isLoaded || !isSignedIn || !userId) {
        console.log("⏳ Waiting for authentication to be ready");
        return;
      }

      // Only fetch if we haven't loaded yet, or silently refresh if we have data
      if (!hasLoadedOnce) {
        fetchWishlists(true); // First load - show spinner
      } else {
        fetchWishlists(false); // Subsequent loads - silent refresh
      }
      
      // Refresh notification count when page comes into focus
      refreshUnreadNotificationsCount();
    }, [fetchWishlists, hasLoadedOnce, isLoaded, isSignedIn, userId, refreshUnreadNotificationsCount])
  );

  // Subscribe to wishlist creation events to refresh the list
  useEffect(() => {
    const unsubscribe = wishlistEvents.subscribe(() => {
      // Refresh wishlists when a new one is created
      fetchWishlists(false);
    });
    return unsubscribe;
  }, [fetchWishlists]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchWishlists(false);
  };

  // Load sort preference on mount
  useEffect(() => {
    const loadSort = async () => {
      const savedSort = await loadSortPreference(userId || undefined);
      setCurrentSort(savedSort);
    };
    loadSort();
  }, [userId]);

  // Load view mode preference on mount
  useEffect(() => {
    const loadViewMode = async () => {
      const savedMode = await loadViewModePreference(userId || undefined);
      setViewMode(savedMode);
    };
    loadViewMode();
  }, [userId]);

  // Sort wishlists based on current sort option
  const sortedWishlists = useMemo(() => {
    return sortWishlists(wishlists, currentSort);
  }, [wishlists, currentSort]);

  // Handle sort change
  const handleSortChange = useCallback(async (sort: SortOption) => {
    setCurrentSort(sort);
    await saveSortPreference(sort, userId || undefined);
  }, [userId]);

  // Handle view mode toggle
  const handleViewModeToggle = useCallback(async () => {
    const newMode: ViewMode = viewMode === 'normal' ? 'compact' : 'normal';
    setViewMode(newMode);
    await saveViewModePreference(newMode, userId || undefined);
  }, [viewMode, userId]);

  // Calculate metrics for a wishlist
  const getWishlistMetrics = (wishlist: Wishlist) => {
    const items = wishlist.items || [];
    // Only count wanted items (not purchased)
    const wantedItems = items.filter((item) => item.status !== "PURCHASED");
    const activeWishes = wantedItems.length;
    // Calculate total value: price * quantity for each wanted item
    const totalPrice = wantedItems.reduce((sum, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 1; // Default to 1 if no quantity specified
      return sum + (price * quantity);
    }, 0);
    const currency = items.length > 0 ? items[0].currency : "$";
    return { activeWishes, totalPrice, currency };
  };

  // Get privacy level display info
  const getPrivacyInfo = (privacyLevel: string) => {
    switch (privacyLevel) {
      case "PUBLIC":
        return { icon: "globe", label: "Public", color: "#10B981" };
      case "FRIENDS_ONLY":
        return { icon: "users", label: "Friends Only", color: "#3B82F6" };
      case "PRIVATE":
        return { icon: "lock", label: "Private", color: "#6B7280" };
      default:
        return { icon: "lock", label: "Private", color: "#6B7280" };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header - matching details page design */}
      <PageHeader
        title="Wishlists"
        backButton={false}
        rightActions={
          <>
            <HeaderButton materialCommunityIcon="swap-vertical" onPress={() => setSortModalVisible(true)} />
            <HeaderButton 
              materialCommunityIcon={viewMode === 'normal' ? 'view-list' : 'view-grid'} 
              onPress={handleViewModeToggle} 
            />
            <View style={{ position: 'relative' }}>
              <HeaderButton icon="bell" onPress={() => router.push("/notifications")} />
              {unreadNotificationsCount > 0 && (
                <Badge count={unreadNotificationsCount} style={{ top: -2, right: -2 }} />
              )}
            </View>
          </>
        }
      />

      {!isLoaded || (isSignedIn && !userId) ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>Loading...</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>Loading wishlists...</Text>
        </View>
      ) : wishlists.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="list" size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No wishlists yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Create your first wishlist by tapping the "+" button at the bottom
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedWishlists}
          keyExtractor={(item) => item.id}
          key={`wishlist-list-${currentSort}-${viewMode}`}
          extraData={currentSort + viewMode}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#4A90E2"]} />
          }
          renderItem={({ item }) => {
            const { activeWishes, totalPrice, currency } = getWishlistMetrics(item);
            const privacyInfo = getPrivacyInfo(item.privacyLevel);
            
            // Compact view - only title and smaller image
            if (viewMode === 'compact') {
              return (
                <TouchableOpacity
                  onPress={() => router.push(`/wishlist/${item.id}`)}
                  activeOpacity={0.7}
                  style={[
                    styles.compactCard,
                    { backgroundColor: theme.isDark ? '#2E2E2E' : '#D3D3D3' }
                  ]}
                >
                  <View style={styles.compactCardContent}>
                    <Text 
                      style={[styles.cardTitle, styles.compactCardTitle, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.title}
                    </Text>
                    <View style={styles.compactImagePlaceholder}>
                      <Feather name="image" size={24} color={theme.colors.textSecondary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
            
            // Normal view - full card with all details
            return (
              <TouchableOpacity
                onPress={() => router.push(`/wishlist/${item.id}`)}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  { backgroundColor: theme.isDark ? '#2E2E2E' : '#D3D3D3' }
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.titleRow}>
                      <Text 
                        style={[styles.cardTitle, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                    </View>
                    <View style={styles.privacyBadge}>
                      <Feather 
                        name={privacyInfo.icon as any} 
                        size={14} 
                        color={privacyInfo.color} 
                      />
                      <Text style={[styles.privacyText, { color: privacyInfo.color }]}>
                        {privacyInfo.label}
                      </Text>
                    </View>
                    <View style={styles.metricsContainer}>
                      <View style={styles.metricRow}>
                        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Active wishes</Text>
                        <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{activeWishes}</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Total value</Text>
                        <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
                          {currency} {totalPrice.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.imagePlaceholder}>
                    <Feather name="image" size={32} color={theme.colors.textSecondary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  cardLeft: {
    flex: 1,
    marginRight: 16,
  },
  titleRow: {
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  metricsContainer: {
    marginBottom: 0,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#4B5563",
    alignItems: "center",
    justifyContent: "center",
  },
  compactCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  compactCardContent: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactCardTitle: {
    flex: 1,
    marginRight: 12,
  },
  compactImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#4B5563",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
