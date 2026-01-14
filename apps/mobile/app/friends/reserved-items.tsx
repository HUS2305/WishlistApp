import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import type { Item, ItemStatus } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useReservedItems } from "@/hooks/useFriends";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { wishlistsService } from "@/services/wishlists";
import { ItemMenu } from "@/components/ItemMenu";
import { Linking } from "react-native";

export default function ReservedItemsScreen() {
  const { theme } = useTheme();
  const { data: reservedItems = [], isLoading, refetch, isFetching: isRefreshing } = useReservedItems();
  const queryClient = useQueryClient();
  
  // Mutation for updating item status
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, status, wishlistId }: { itemId: string; status: ItemStatus; wishlistId: string }) => {
      return wishlistsService.updateItem({ id: itemId, status, wishlistId });
    },
    onSuccess: () => {
      // Invalidate reserved items query
      queryClient.invalidateQueries({ queryKey: ['items', 'reserved', 'all'] });
      // Also invalidate the wishlist items query for the specific wishlist
      queryClient.invalidateQueries({ queryKey: ['items', 'wishlists'] });
    },
  });
  
  const [reservedItemsTab, setReservedItemsTab] = useState<"reserved" | "purchased">("reserved");
  const [selectedReservedItem, setSelectedReservedItem] = useState<Item | null>(null);
  const [reservedItemMenuVisible, setReservedItemMenuVisible] = useState(false);

  const handleMarkAsPurchased = async (item: Item) => {
    try {
      await updateItemMutation.mutateAsync({
        itemId: item.id,
        status: "PURCHASED",
        wishlistId: item.wishlistId,
      });
      refetch();
    } catch (error: any) {
      console.error("Error marking item as purchased:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to mark item as purchased");
    }
  };

  const handleRestoreToReserved = async (item: Item) => {
    try {
      await updateItemMutation.mutateAsync({
        itemId: item.id,
        status: "WANTED",
        wishlistId: item.wishlistId,
      });
      refetch();
    } catch (error: any) {
      console.error("Error restoring item:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to restore item");
    }
  };

  const handleGoToLinkForReservedItem = async () => {
    if (!selectedReservedItem?.url) return;
    try {
      let url = selectedReservedItem.url.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", `Cannot open URL: ${url}`);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
  };

  const handleOpenWishlist = (item: Item) => {
    if (!item.wishlist?.id) return;
    const ownerId = item.wishlist.ownerId;
    // Navigate to wishlist with itemId as query param for scrolling
    // Include returnTo to indicate we came from reserved items section
    router.push(`/wishlist/${item.wishlist.id}?itemId=${item.id}&returnTo=reserved${ownerId ? `&ownerId=${ownerId}` : ''}`);
  };

  const handleUnreserveItem = async (item: Item) => {
    try {
      await wishlistsService.unreserveItem(item.id);
      refetch();
      // Also invalidate wishlist items to sync
      queryClient.invalidateQueries({ queryKey: ['items', 'wishlists'] });
    } catch (error: any) {
      console.error("Error unreserving item:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to unreserve item");
    }
  };

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredItems = reservedItems.filter(item => 
    reservedItemsTab === "reserved" 
      ? (item.status === "WANTED" || item.status === "RESERVED")
      : item.status === "PURCHASED"
  );

  // Group items into rows of 3
  const rows: Item[][] = [];
  for (let i = 0; i < filteredItems.length; i += 3) {
    rows.push(filteredItems.slice(i, i + 3));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Reserved Items"
        onBack={() => router.back()}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              reservedItemsTab === "reserved" && styles.tabActive,
              reservedItemsTab === "reserved" && { backgroundColor: theme.colors.primary + '15' }
            ]}
            onPress={() => setReservedItemsTab("reserved")}
          >
            <Text style={[
              styles.tabText,
              { color: reservedItemsTab === "reserved" ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              Reserved ({reservedItems.filter(i => i.status === "WANTED" || i.status === "RESERVED").length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              reservedItemsTab === "purchased" && styles.tabActive,
              reservedItemsTab === "purchased" && { backgroundColor: theme.colors.primary + '15' }
            ]}
            onPress={() => setReservedItemsTab("purchased")}
          >
            <Text style={[
              styles.tabText,
              { color: reservedItemsTab === "purchased" ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              Purchased ({reservedItems.filter(i => i.status === "PURCHASED").length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Container Box */}
        <View style={[
          styles.reservedItemsContainer,
          { backgroundColor: theme.isDark ? '#2E2E2E' : '#D9D9D9' }
        ]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyStateSmall}>
              <Feather 
                name={reservedItemsTab === "reserved" ? "bookmark" : "check-circle"} 
                size={40} 
                color={theme.colors.textSecondary} 
              />
              <Text style={[styles.emptyTitleSmall, { color: theme.colors.textPrimary }]}>
                No {reservedItemsTab === "reserved" ? "reserved" : "purchased"} items
              </Text>
              <Text style={[styles.emptySubtitleSmall, { color: theme.colors.textSecondary }]}>
                {reservedItemsTab === "reserved" 
                  ? "Items you've reserved will appear here"
                  : "Items you've purchased will appear here"}
              </Text>
            </View>
          ) : (
            <View style={styles.reservedItemsGrid}>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.reservedItemsRow}>
                  {row.map((item) => {
                    const isPurchased = item.status === "PURCHASED";

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.reservedItemCard,
                          { backgroundColor: theme.isDark ? '#3A3A3A' : '#E8E8E8' }
                        ]}
                        onPress={() => {
                          if (isPurchased) {
                            handleRestoreToReserved(item);
                          } else {
                            handleMarkAsPurchased(item);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Item Image */}
                        <View style={[styles.reservedItemImage, { backgroundColor: theme.colors.textSecondary + '10' }]}>
                          {item.imageUrl ? (
                            <Text style={styles.reservedItemImageText}>🖼️</Text>
                          ) : (
                            <Feather name="gift" size={24} color={theme.colors.textSecondary} />
                          )}
                        </View>

                        {/* Item Title Container - Fixed height for consistent menu button position */}
                        <View style={styles.reservedItemTitleContainer}>
                          <Text 
                            style={[
                              styles.reservedItemTitle,
                              { 
                                color: isPurchased ? theme.colors.textSecondary : theme.colors.textPrimary 
                              }
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                        </View>

                        {/* Three Dot Menu Button */}
                        <TouchableOpacity
                          style={styles.reservedItemMenuButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedReservedItem(item);
                            setReservedItemMenuVisible(true);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather 
                            name="more-horizontal" 
                            size={18} 
                            color={theme.colors.textSecondary} 
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Fill empty slots in row */}
                  {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, idx) => (
                    <View key={`placeholder-${rowIndex}-${idx}`} style={styles.reservedItemCardPlaceholder} />
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Item Menu */}
      {selectedReservedItem && (
        <ItemMenu
          visible={reservedItemMenuVisible}
          onClose={() => {
            setReservedItemMenuVisible(false);
            setSelectedReservedItem(null);
          }}
          onGoToLink={selectedReservedItem?.url ? handleGoToLinkForReservedItem : undefined}
          onOpenWishlist={selectedReservedItem?.wishlist?.id ? () => {
            setReservedItemMenuVisible(false);
            handleOpenWishlist(selectedReservedItem);
          } : undefined}
          onMarkAsPurchased={selectedReservedItem?.status !== "PURCHASED" ? () => {
            setReservedItemMenuVisible(false);
            handleMarkAsPurchased(selectedReservedItem);
          } : undefined}
          onRestoreToWanted={selectedReservedItem?.status === "PURCHASED" ? () => {
            setReservedItemMenuVisible(false);
            handleRestoreToReserved(selectedReservedItem);
          } : undefined}
          onUnreserve={selectedReservedItem && reservedItemsTab === "reserved" ? () => {
            setReservedItemMenuVisible(false);
            handleUnreserveItem(selectedReservedItem);
          } : undefined}
          isPurchased={selectedReservedItem?.status === "PURCHASED"}
          itemUrl={selectedReservedItem?.url || null}
          onEdit={undefined}
          onDelete={undefined}
          onAddToWishlist={undefined}
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
  scrollContent: {
    padding: 16,
  },
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    // Background color applied inline
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  reservedItemsContainer: {
    borderRadius: 12,
    padding: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
  },
  emptyStateSmall: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitleSmall: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitleSmall: {
    fontSize: 14,
    textAlign: "center",
  },
  reservedItemsGrid: {
    gap: 12,
  },
  reservedItemsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-start",
  },
  reservedItemCard: {
    width: "31%", // Approximately 33.33% minus gap spacing (12px gap * 2 / 3 = ~8px per card)
    alignItems: "center",
    justifyContent: "flex-start",
    borderRadius: 12,
    padding: 8,
  },
  reservedItemCardPlaceholder: {
    width: "31%",
  },
  reservedItemImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  reservedItemImageText: {
    fontSize: 32,
  },
  reservedItemTitleContainer: {
    minHeight: 36,
    maxHeight: 36,
    justifyContent: 'center',
    marginBottom: 8,
  },
  reservedItemTitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  reservedItemMenuButton: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
