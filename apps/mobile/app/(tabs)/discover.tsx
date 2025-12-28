import { View, TouchableOpacity, FlatList, StyleSheet, RefreshControl, ActivityIndicator, ScrollView, TextInput } from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { Card, Button } from "@/components/ui";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { friendsService } from "@/services/friends";
import { wishlistsService } from "@/services/wishlists";
import { PageHeader, HeaderButton } from "@/components/PageHeader";
import type { Item, User, Priority } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

interface GiftItem extends Item {
  friend: User;
  wishlistTitle: string;
  wishlistId: string;
}

type SortOption = "priority" | "price_asc" | "price_desc" | "friend" | "date";
type FilterOption = "all" | "available" | "reserved_by_me" | "must_have" | "nice_to_have";

export default function DiscoverScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [groupByFriend, setGroupByFriend] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [reservedItems, setReservedItems] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<"gifts" | "trending" | "forYou" | "categories">("gifts");

  const fetchGifts = useCallback(async (showLoader = true) => {
    try {
      const shouldShowLoader = showLoader && !hasLoadedOnce && gifts.length === 0;
      if (shouldShowLoader) {
        setIsLoading(true);
      }
      
      const friends = await friendsService.getFriends();
      const allGifts: GiftItem[] = [];
      
      for (const friend of friends) {
        try {
          const wishlists = await friendsService.getFriendWishlists(friend.id);
          for (const wishlist of wishlists) {
            if (wishlist.items) {
              for (const item of wishlist.items) {
                if (item.status !== "PURCHASED") {
                  allGifts.push({
                    ...item,
                    friend,
                    wishlistTitle: wishlist.title,
                    wishlistId: wishlist.id,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching wishlists for friend ${friend.id}:`, error);
        }
      }
      
      // Initialize reserved items
      const reserved = new Set<string>();
      for (const item of allGifts) {
        if (item.status === "RESERVED") {
          // TODO: Check if current user reserved it via backend
        }
      }
      setReservedItems(reserved);
      
      setGifts(allGifts);
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }
      console.log("✅ Loaded", allGifts.length, "gift ideas from friends");
    } catch (error) {
      console.error("❌ Error fetching gifts:", error);
      setGifts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce, gifts.length]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce) {
        fetchGifts(true);
      } else {
        fetchGifts(false);
      }
    }, [fetchGifts, hasLoadedOnce])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchGifts(false);
  };

  const handleReserveItem = async (item: GiftItem) => {
    try {
      if (reservedItems.has(item.id)) {
        await wishlistsService.unreserveItem(item.id);
        setReservedItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } else {
        await wishlistsService.reserveItem(item.id);
        setReservedItems(prev => new Set(prev).add(item.id));
      }
      fetchGifts(false);
    } catch (error: any) {
      console.error("Error reserving item:", error);
      if (error?.response?.data?.message?.includes("already reserved")) {
        setReservedItems(prev => new Set(prev).add(item.id));
      }
    }
  };

  const handleItemPress = (item: GiftItem) => {
    router.push(`/wishlist/${item.wishlistId}?itemId=${item.id}`);
  };

  // Calculate trending items (most reserved)
  const trendingItems = useMemo(() => {
    const itemCounts = new Map<string, { item: GiftItem; count: number }>();
    gifts.forEach(item => {
      if (item.status === "RESERVED") {
        const key = item.title.toLowerCase();
        const existing = itemCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          itemCounts.set(key, { item, count: 1 });
        }
      }
    });
    return Array.from(itemCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(entry => entry.item);
  }, [gifts]);

  // Recently added items
  const recentlyAdded = useMemo(() => {
    return [...gifts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [gifts]);

  const filteredAndSortedGifts = useMemo(() => {
    let filtered = [...gifts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.friend.displayName?.toLowerCase().includes(query) ||
        item.friend.firstName?.toLowerCase().includes(query) ||
        item.friend.lastName?.toLowerCase().includes(query)
      );
    }

    switch (filterBy) {
      case "available":
        filtered = filtered.filter(item => item.status === "WANTED" && !reservedItems.has(item.id));
        break;
      case "reserved_by_me":
        filtered = filtered.filter(item => reservedItems.has(item.id));
        break;
      case "must_have":
        filtered = filtered.filter(item => item.priority === "MUST_HAVE");
        break;
      case "nice_to_have":
        filtered = filtered.filter(item => item.priority === "NICE_TO_HAVE");
        break;
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return (a.price || 0) - (b.price || 0);
        case "price_desc":
          return (b.price || 0) - (a.price || 0);
        case "priority":
          const priorityOrder = { "MUST_HAVE": 1, "NICE_TO_HAVE": 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "friend":
          const nameA = a.friend.displayName || a.friend.firstName || "";
          const nameB = b.friend.displayName || b.friend.firstName || "";
          return nameA.localeCompare(nameB);
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [gifts, searchQuery, sortBy, filterBy, reservedItems]);

  const groupedGifts = useMemo(() => {
    if (!groupByFriend) return null;
    const grouped: Record<string, GiftItem[]> = {};
    for (const item of filteredAndSortedGifts) {
      const friendId = item.friend.id;
      if (!grouped[friendId]) {
        grouped[friendId] = [];
      }
      grouped[friendId].push(item);
    }
    return grouped;
  }, [filteredAndSortedGifts, groupByFriend]);

  const renderGiftItem = (item: GiftItem, showFriendInfo = true) => {
    const isReserved = reservedItems.has(item.id) || item.status === "RESERVED";
    const isReservedByMe = reservedItems.has(item.id);

    return (
      <Card style={[styles.card, isReserved && !isReservedByMe && { opacity: 0.6 }]}>
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
        >
          {showFriendInfo && (
            <View style={styles.friendInfo}>
              <View style={styles.friendInfoLeft}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary + "20" }]}>
                  <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                    {item.friend.firstName?.[0] || item.friend.displayName?.[0] || "?"}
                  </Text>
                </View>
                <View style={styles.friendTextContainer}>
                  <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                    {item.friend.displayName || item.friend.firstName || "Friend"}
                  </Text>
                  <Text style={[styles.wishlistName, { color: theme.colors.textSecondary }]}>
                    {item.wishlistTitle}
                  </Text>
                </View>
              </View>
              {isReserved && (
                <View style={[styles.reservedBadge, { backgroundColor: isReservedByMe ? theme.colors.primary + "20" : "#F3F4F6" }]}>
                  <Feather 
                    name={isReservedByMe ? "check-circle" : "lock"} 
                    size={12} 
                    color={isReservedByMe ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.reservedText, { color: isReservedByMe ? theme.colors.primary : theme.colors.textSecondary }]}>
                    {isReservedByMe ? "Reserved by you" : "Reserved"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              {item.price ? (
                <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
                  ${item.price.toFixed(2)}
                </Text>
              ) : (
                <Text style={[styles.price, { color: theme.colors.textSecondary }]}>Price not set</Text>
              )}
              <View style={[styles.priorityBadge, { backgroundColor: theme.colors.backgroundSecondary || "#F3F4F6" }]}>
                <Feather 
                  name={item.priority === "MUST_HAVE" ? "alert-circle" : "minus"} 
                  size={12} 
                  color={theme.colors.textSecondary} 
                />
                <Text style={[styles.priorityText, { color: theme.colors.textSecondary }]}>
                  {item.priority === "MUST_HAVE" ? "Must Have" : "Nice to Have"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleReserveItem(item);
              }}
              style={[
                styles.reserveButton,
                { 
                  backgroundColor: isReservedByMe ? theme.colors.primary : "transparent",
                  borderColor: theme.colors.primary,
                }
              ]}
              disabled={isReserved && !isReservedByMe}
            >
              <Feather 
                name={isReservedByMe ? "check" : "bookmark"} 
                size={16} 
                color={isReservedByMe ? "#fff" : theme.colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderSectionHeader = (title: string, icon: keyof typeof Feather.glyphMap, onViewAll?: () => void) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Feather name={icon} size={20} color={theme.colors.primary} />
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      </View>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderContent = () => {
    if (isLoading && !hasLoadedOnce) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            Loading gift ideas...
          </Text>
        </View>
      );
    }

    if (gifts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="compass" size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No gift ideas yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Add friends to see their wishlist items and find gift ideas
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary }]}
            onPress={() => router.push("/(tabs)/friends?action=secretSanta")}
          >
            <Feather name="gift" size={20} color={theme.colors.primary} />
            <Text style={[styles.quickActionText, { color: theme.colors.primary }]}>Secret Santa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary }]}
            onPress={() => router.push("/(tabs)/friends?action=groupGift")}
          >
            <Feather name="users" size={20} color={theme.colors.primary} />
            <Text style={[styles.quickActionText, { color: theme.colors.primary }]}>Group Gift</Text>
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          {[
            { id: "gifts" as const, label: "Gift Ideas", icon: "gift" },
            { id: "trending" as const, label: "Trending", icon: "trending-up" },
            { id: "forYou" as const, label: "For You", icon: "star" },
            { id: "categories" as const, label: "Categories", icon: "grid" },
          ].map((section) => (
            <TouchableOpacity
              key={section.id}
              onPress={() => setActiveSection(section.id)}
              style={[
                styles.sectionTab,
                activeSection === section.id && { backgroundColor: theme.colors.primary },
              ]}
            >
              <Feather
                name={section.icon as keyof typeof Feather.glyphMap}
                size={16}
                color={activeSection === section.id ? "#fff" : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.sectionTabText,
                  { color: activeSection === section.id ? "#fff" : theme.colors.textSecondary },
                ]}
              >
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gift Ideas Section */}
        {activeSection === "gifts" && (
          <>
            {filteredAndSortedGifts.length === 0 ? (
              <View style={styles.emptySection}>
                <Feather name="gift" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptySectionText, { color: theme.colors.textSecondary }]}>
                  {searchQuery || filterBy !== "all" ? "No gifts match your filters" : "No gift ideas available"}
                </Text>
              </View>
            ) : (
              filteredAndSortedGifts.map((item) => (
                <View key={item.id}>{renderGiftItem(item)}</View>
              ))
            )}
          </>
        )}

        {/* Trending Section */}
        {activeSection === "trending" && (
          <>
            {renderSectionHeader("Most Reserved", "trending-up")}
            {trendingItems.length === 0 ? (
              <View style={styles.emptySection}>
                <Feather name="trending-up" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptySectionText, { color: theme.colors.textSecondary }]}>
                  No trending items yet
                </Text>
              </View>
            ) : (
              trendingItems.map((item) => (
                <View key={item.id}>{renderGiftItem(item)}</View>
              ))
            )}
          </>
        )}

        {/* For You Section */}
        {activeSection === "forYou" && (
          <>
            {renderSectionHeader("Personalized Recommendations", "star")}
            <View style={styles.emptySection}>
              <Feather name="star" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptySectionText, { color: theme.colors.textSecondary }]}>
                Personalized recommendations coming soon
              </Text>
              <Text style={[styles.emptySectionSubtext, { color: theme.colors.textSecondary }]}>
                We'll suggest gifts based on your interests and friend preferences
              </Text>
            </View>
          </>
        )}

        {/* Categories Section */}
        {activeSection === "categories" && (
          <>
            {renderSectionHeader("Browse by Category", "grid")}
            <View style={styles.categoriesGrid}>
              {[
                { name: "Tech", icon: "smartphone", color: "#3B82F6" },
                { name: "Fashion", icon: "shopping-bag", color: "#EC4899" },
                { name: "Books", icon: "book", color: "#10B981" },
                { name: "Home", icon: "home", color: "#F59E0B" },
                { name: "Sports", icon: "activity", color: "#EF4444" },
                { name: "Games", icon: "play", color: "#8B5CF6" },
              ].map((category) => (
                <TouchableOpacity
                  key={category.name}
                  style={[styles.categoryCard, { backgroundColor: theme.colors.backgroundSecondary || "#F3F4F6" }]}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + "20" }]}>
                    <Feather name={category.icon as keyof typeof Feather.glyphMap} size={24} color={category.color} />
                  </View>
                  <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recently Added Section (always visible at bottom) */}
        {recentlyAdded.length > 0 && activeSection === "gifts" && (
          <>
            {renderSectionHeader("Recently Added", "clock")}
            {recentlyAdded.slice(0, 5).map((item) => (
              <View key={`recent-${item.id}`}>{renderGiftItem(item)}</View>
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PageHeader
        title="Discover"
        backButton={false}
        rightActions={
          <View style={styles.headerActions}>
            <HeaderButton
              icon={showFilters ? "x" : "filter"}
              onPress={() => setShowFilters(!showFilters)}
            />
          </View>
        }
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.backgroundSecondary || "#F3F4F6" }]}>
        <Feather name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search gifts, friends..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Feather name="x" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: theme.colors.backgroundSecondary || "#F3F4F6" }]}>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Sort by:</Text>
            <View style={styles.filterButtons}>
              {[
                { value: "priority" as SortOption, label: "Priority" },
                { value: "price_asc" as SortOption, label: "Price ↑" },
                { value: "price_desc" as SortOption, label: "Price ↓" },
                { value: "friend" as SortOption, label: "Friend" },
                { value: "date" as SortOption, label: "Newest" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSortBy(option.value)}
                  style={[
                    styles.filterButton,
                    sortBy === option.value && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      { color: sortBy === option.value ? "#fff" : theme.colors.textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Filter:</Text>
            <View style={styles.filterButtons}>
              {[
                { value: "all" as FilterOption, label: "All" },
                { value: "available" as FilterOption, label: "Available" },
                { value: "reserved_by_me" as FilterOption, label: "My Picks" },
                { value: "must_have" as FilterOption, label: "Must Have" },
                { value: "nice_to_have" as FilterOption, label: "Nice to Have" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setFilterBy(option.value)}
                  style={[
                    styles.filterButton,
                    filterBy === option.value && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      { color: filterBy === option.value ? "#fff" : theme.colors.textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 100,
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
  emptySection: {
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptySectionText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySectionSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  cardContent: {
    padding: 16,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  friendInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  friendTextContainer: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: "600",
  },
  wishlistName: {
    fontSize: 12,
    marginTop: 2,
  },
  reservedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reservedText: {
    fontSize: 10,
    fontWeight: "500",
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
    marginTop: 8,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  reserveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    width: "30%",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});




