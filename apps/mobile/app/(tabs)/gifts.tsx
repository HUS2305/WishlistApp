import { View, TouchableOpacity, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { friendsService } from "@/services/friends";
import { PageHeader } from "@/components/PageHeader";
import type { Item } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

export default function GiftsScreen() {
  const { theme } = useTheme();
  const [gifts, setGifts] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false to prevent flash
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchGifts = useCallback(async (showLoader = true) => {
    try {
      // Only show loading spinner if we have no data AND it's the first load
      const shouldShowLoader = showLoader && !hasLoadedOnce && gifts.length === 0;
      if (shouldShowLoader) {
        setIsLoading(true);
      }
      // Fetch all friends' wishlists and extract items
      const friends = await friendsService.getFriends();
      const allGifts: Item[] = [];
      
      for (const friend of friends) {
        try {
          const wishlists = await friendsService.getFriendWishlists(friend.id);
          for (const wishlist of wishlists) {
            if (wishlist.items) {
              allGifts.push(...wishlist.items);
            }
          }
        } catch (error) {
          console.error(`Error fetching wishlists for friend ${friend.id}:`, error);
        }
      }
      
      setGifts(allGifts);
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }
      console.log("✅ Loaded", allGifts.length, "gift ideas from friends");
    } catch (error) {
      console.error("❌ Error fetching gifts:", error);
      // If error, just show empty state
      setGifts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce, gifts.length]);

  useFocusEffect(
    useCallback(() => {
      // Only fetch if we haven't loaded yet, or silently refresh if we have data
      if (!hasLoadedOnce) {
        fetchGifts(true); // First load - show spinner
      } else {
        fetchGifts(false); // Subsequent loads - silent refresh
      }
    }, [fetchGifts, hasLoadedOnce])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchGifts(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PageHeader
        title="Gifts"
        backButton={false}
      />

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>Loading gift ideas...</Text>
        </View>
      ) : gifts.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="gift" size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No gift ideas yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Add friends to see their wishlist items and find gift ideas
          </Text>
        </View>
      ) : (
        <FlatList
          data={gifts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                {item.description ? (
                  <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>{item.description}</Text>
                ) : null}
                <View style={styles.cardFooter}>
                  {item.price ? (
                    <Text style={[styles.price, { color: theme.colors.textSecondary }]}>${item.price.toFixed(2)}</Text>
                  ) : (
                    <Text style={[styles.price, { color: theme.colors.textSecondary }]}>Price not set</Text>
                  )}
                  <View style={styles.priorityBadge}>
                    <Feather 
                      name={item.priority === "MUST_HAVE" ? "alert-circle" : item.priority === "NICE_TO_HAVE" ? "minus" : "arrow-down"} 
                      size={14} 
                      color={theme.colors.textSecondary} 
                    />
                    <Text style={[styles.priorityText, { color: theme.colors.textSecondary }]}>{item.priority}</Text>
                  </View>
                  <Feather name="chevron-right" size={24} color={theme.colors.textSecondary} />
                </View>
              </View>
            </Card>
          )}
        />
      )}
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
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 350,
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
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 12,
    fontWeight: "500",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});
