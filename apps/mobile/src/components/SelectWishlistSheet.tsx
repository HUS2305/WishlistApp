import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "./BottomSheet";
import type { Wishlist } from "@/types";
import { wishlistsService } from "@/services/wishlists";

interface SelectWishlistSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (wishlistId: string) => void;
  excludeWishlistId?: string; // Wishlist to exclude from the list (e.g., current wishlist)
  emptyMessage?: string;
}

/**
 * Reusable bottom sheet for selecting a wishlist
 * 
 * Features:
 * - List of wishlists
 * - Uses BottomSheetFlatList for performance
 * - Dynamic sizing (autoHeight)
 * - Stackable (stackBehavior="push" - pushes on top, parent stays visible)
 * - Standard header pattern (no X button)
 */
export function SelectWishlistSheet({
  visible,
  onClose,
  onSelect,
  excludeWishlistId,
  emptyMessage = "No other wishlists available",
}: SelectWishlistSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load wishlists when sheet opens
  useEffect(() => {
    if (visible) {
      loadWishlists();
    }
  }, [visible]);

  const loadWishlists = async () => {
    setIsLoading(true);
    try {
      const wishlistsData = await wishlistsService.getWishlists();
      // Filter out excluded wishlist if provided
      const filtered = excludeWishlistId
        ? wishlistsData.filter(w => w.id !== excludeWishlistId)
        : wishlistsData;
      setWishlists(filtered);
    } catch (error) {
      console.error("Error loading wishlists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWishlist = (wishlistId: string) => {
    onSelect(wishlistId);
    onClose();
  };

  const renderWishlistItem = ({ item }: { item: Wishlist }) => {
    return (
      <TouchableOpacity
        style={[styles.wishlistItem, { borderBottomColor: theme.colors.textSecondary + '20' }]}
        onPress={() => handleSelectWishlist(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.wishlistItemText, { color: theme.colors.textPrimary }]}>
          {item.title}
        </Text>
        <Feather
          name="chevron-right"
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  const bottomPadding = Math.max(20, insets.bottom + 30);

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight={true} stackBehavior="push">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header - Standard pattern: centered title, no X button */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Select Wishlist
          </Text>
        </View>

        {/* Content - Using BottomSheetFlatList for performance */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading wishlists...
            </Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={wishlists}
            keyExtractor={(item) => item.id}
            renderItem={renderWishlistItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="list" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  {emptyMessage}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    // With dynamic sizing, let content determine size
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  wishlistItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  wishlistItemText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});

