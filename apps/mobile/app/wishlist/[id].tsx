import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import type { Item, Wishlist, User } from "@/types";
import { useWishlist, useWishlistItems, useDeleteWishlist, useUpdateItem, useDeleteItem } from "@/hooks/useWishlists";
import { WishlistMenu } from "@/components/WishlistMenu";
import { ItemMenu } from "@/components/ItemMenu";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { wishlistsService } from "@/services/wishlists";
import { FABMenu } from "@/components/FABMenu";
import { useTheme } from "@/contexts/ThemeContext";
import { AddItemSheet } from "@/components/AddItemSheet";
import { EditWishlistSheet } from "@/components/EditWishlistSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/services/api";
import { PriceDisplay } from "@/components/PriceDisplay";

export default function WishlistDetailScreen() {
  const { theme } = useTheme();
  const { userId: clerkUserId, isLoaded: isAuthLoaded } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const wishlistId = id as string;
  
  const { data: wishlist, isLoading: isLoadingWishlist, refetch: refetchWishlist } = useWishlist(wishlistId);
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useWishlistItems(wishlistId);
  const deleteWishlist = useDeleteWishlist();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemMenuVisible, setItemMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemDeleteConfirmVisible, setItemDeleteConfirmVisible] = useState(false);
  const [sortFilter, setSortFilter] = useState<"wanted" | "purchased">("wanted");
  const [editItemSheetVisible, setEditItemSheetVisible] = useState(false);
  const [addToWishlistModalVisible, setAddToWishlistModalVisible] = useState(false);
  const [allWishlists, setAllWishlists] = useState<Wishlist[]>([]);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [addItemSheetVisible, setAddItemSheetVisible] = useState(false);
  const [editWishlistSheetVisible, setEditWishlistSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [addItemFromFriendSheetVisible, setAddItemFromFriendSheetVisible] = useState(false);
  const [itemToAdd, setItemToAdd] = useState<Item | null>(null);
  const [reservedItems, setReservedItems] = useState<Set<string>>(new Set());
  const [reservingItemId, setReservingItemId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Check if current user is the owner of the wishlist
  // Only determine ownership when we have both wishlist and currentUser
  // Use undefined to indicate "unknown" - don't show non-owner UI until we know for sure
  const isOwner = wishlist && currentUser !== null 
    ? wishlist.ownerId === currentUser.id 
    : undefined;

  // Fetch current user to check ownership
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!isAuthLoaded || !clerkUserId) {
        setIsLoadingUser(false);
        return;
      }
      setIsLoadingUser(true);
      try {
        const response = await api.get<User>("/users/me");
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching current user:", error);
        setCurrentUser(null); // Set to null to indicate we tried but failed
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, [isAuthLoaded, clerkUserId]);

  // Load all wishlists for the "Add to Another Wishlist" modal
  useEffect(() => {
    const loadAllWishlists = async () => {
      try {
        const wishlists = await wishlistsService.getWishlists();
        setAllWishlists(wishlists);
      } catch (error) {
        console.error("Error loading wishlists:", error);
      }
    };
    if (addToWishlistModalVisible) {
      loadAllWishlists();
    }
  }, [addToWishlistModalVisible]);

  const handleAddItem = () => {
    setFabMenuVisible(false);
    setAddItemSheetVisible(true);
  };

  const handleEditWishlist = () => {
    setMenuVisible(false);
    setEditWishlistSheetVisible(true);
  };

  const handleEditWishlistSuccess = () => {
    // Refetch wishlist data to update UI
    refetchWishlist();
    setEditWishlistSheetVisible(false);
  };

  const handleShareWishlist = async () => {
    if (!wishlist) return;
    
    try {
      let shareUrl = "";
      let shareToken = wishlist.shareToken;
      
      if (!shareToken) {
        try {
          const shareData = await wishlistsService.shareWishlist(wishlistId);
          shareToken = shareData.shareToken;
          shareUrl = shareData.shareUrl || "";
        } catch (error) {
          console.warn("Share endpoint not available, using existing token");
        }
      }
      
      if (shareToken) {
        const { getApiUrl } = require("@/utils/apiUrl");
        const apiUrl = getApiUrl();
        shareUrl = shareUrl || `${apiUrl}/wishlists/public/${shareToken}`;
      }
      
      await Share.share({
        message: `Check out my wishlist: ${wishlist.title}${shareUrl ? `\n${shareUrl}` : ""}`,
        url: shareUrl || `wishlist://share/${shareToken || wishlistId}`,
      });
    } catch (error: any) {
      console.error("Error sharing wishlist:", error);
      if (error.message !== "User did not share") {
        Alert.alert("Error", "Failed to share wishlist. Please try again.");
      }
    }
  };

  const handleDeleteWishlist = () => {
    if (!wishlist) return;
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!wishlist) return;
    
    try {
      await deleteWishlist.mutateAsync(wishlistId);
      setDeleteConfirmVisible(false);
      router.replace("/(tabs)/");
    } catch (error: any) {
      console.error("❌ Error deleting wishlist:", error);
      setDeleteConfirmVisible(false);
    }
  };


  // For non-owners, only show wanted items. For owners, respect the sortFilter
  // Only filter when we know ownership status (isOwner !== undefined)
  const filteredItems = isOwner !== undefined ? items.filter((item) => {
    if (isOwner === false) {
      // Non-owners only see wanted items
      return item.status !== "PURCHASED";
    }
    // Owners can see both wanted and purchased based on filter
    if (sortFilter === "wanted") {
      return item.status !== "PURCHASED";
    } else {
      return item.status === "PURCHASED";
    }
  }) : [];

  // Calculate stats - only count wanted items (not purchased)
  const wantedItems = items.filter((item) => item.status !== "PURCHASED");
  const activeWishes = wantedItems.length;
  // Calculate total value: price * quantity for each wanted item
  const totalPrice = wantedItems.reduce((sum, item) => {
    const price = item.price || 0;
    const quantity = item.quantity || 1; // Default to 1 if no quantity specified
    return sum + (price * quantity);
  }, 0);
  const currency = items.length > 0 ? items[0].currency : "USD";

  // Get privacy level display
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

  const handleToggleItemStatus = async (item: Item) => {
    setTogglingItemId(item.id);
    try {
      const newStatus = item.status === "PURCHASED" ? "WANTED" : "PURCHASED";
      await updateItem.mutateAsync({
        id: item.id,
        status: newStatus,
        wishlistId: item.wishlistId,
      });
    } catch (error) {
      console.error("Error updating item status:", error);
      Alert.alert("Error", "Failed to update item status");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleItemPress = (item: Item) => {
    // Non-owners can't interact with items (no menu, no status toggle)
    if (isOwner === false) {
      // Just open the item URL if available
      if (item.url) {
        Linking.openURL(item.url);
      }
      return;
    }
    
    // On purchased tab, clicking the item should restore it to wanted
    if (sortFilter === "purchased") {
      handleToggleItemStatus(item);
    } else {
      // On wanted tab, show menu
      setSelectedItem(item);
      setItemMenuVisible(true);
    }
  };

  const handleEditItem = () => {
    if (!selectedItem) {
      console.error("No item selected for editing");
      return;
    }
    console.log("Opening edit modal for item:", selectedItem.id);
    setItemMenuVisible(false);
    // Small delay to ensure menu closes before opening edit sheet
    setTimeout(() => {
      setEditItemSheetVisible(true);
    }, 150);
  };

  const handleGoToLink = async () => {
    if (!selectedItem?.url) {
      return;
    }
    try {
      let url = selectedItem.url.trim();
      // Ensure URL has a protocol
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

  const handleAddToWishlist = () => {
    if (!selectedItem) {
      console.error("No item selected for adding to wishlist");
      return;
    }
    console.log("Opening add to wishlist modal for item:", selectedItem.id);
    setItemMenuVisible(false);
    // Small delay to ensure menu closes before opening wishlist selector
    setTimeout(() => {
      setAddToWishlistModalVisible(true);
    }, 150);
  };

  const handleDuplicateToWishlist = async (targetWishlistId: string) => {
    if (!selectedItem) {
      console.error("No selected item to duplicate");
      Alert.alert("Error", "No item selected");
      return;
    }
    
    try {
      console.log("Duplicating item:", selectedItem.id, "to wishlist:", targetWishlistId);
      // Create a duplicate item in the target wishlist (with new ID)
      await wishlistsService.createItem({
        wishlistId: targetWishlistId,
        title: selectedItem.title,
        description: selectedItem.description || undefined,
        url: selectedItem.url || undefined,
        price: selectedItem.price || undefined,
        currency: selectedItem.currency || "USD", // Keep original currency when copying item
        priority: selectedItem.priority || "NICE_TO_HAVE",
        quantity: selectedItem.quantity || undefined,
      });
      
      console.log("Item duplicated successfully");
      setAddToWishlistModalVisible(false);
      setSelectedItem(null);
      // Refresh items list
      refetchItems();
      Alert.alert("Success", "Item added to wishlist");
    } catch (error: any) {
      console.error("Error duplicating item:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to add item to wishlist";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleEditItemSuccess = () => {
    refetchItems();
    setEditItemSheetVisible(false);
    setSelectedItem(null);
  };

  // Handle adding item from friend's wishlist to own wishlist
  const handleAddItemToWishlist = (item: Item) => {
    setItemToAdd(item);
    setAddItemFromFriendSheetVisible(true);
  };

  const handleAddItemFromFriendSuccess = () => {
    setAddItemFromFriendSheetVisible(false);
    setItemToAdd(null);
    Alert.alert("Success", "Item added to your wishlist!");
  };

  // Handle reserve/unreserve item
  const handleReserveItem = async (item: Item) => {
    if (!currentUser) return;
    
    const isReserved = reservedItems.has(item.id);
    setReservingItemId(item.id);
    
    try {
      if (isReserved) {
        await wishlistsService.unreserveItem(item.id);
        setReservedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      } else {
        await wishlistsService.reserveItem(item.id);
        setReservedItems(prev => new Set(prev).add(item.id));
      }
      // Refresh items to get updated reservation status
      refetchItems();
    } catch (error: any) {
      console.error("Error reserving/unreserving item:", error);
      const errorMessage = error.response?.data?.message || "Failed to reserve item";
      
      // If item is already reserved by us, update local state instead of showing error
      if (errorMessage.includes("already reserved")) {
        setReservedItems(prev => new Set(prev).add(item.id));
        // Still refresh to get latest state
        refetchItems();
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setReservingItemId(null);
    }
  };

  // Initialize reserved items from backend data
  useEffect(() => {
    if (!currentUser || !items.length || isOwner === true) return;
    
    // Initialize reservedItems from items that have isReservedByCurrentUser flag
    const reserved = new Set<string>();
    items.forEach(item => {
      if (item.isReservedByCurrentUser) {
        reserved.add(item.id);
      }
    });
    setReservedItems(reserved);
  }, [items, currentUser]);


  // Check if item is reserved (by anyone - if status is RESERVED or if we've reserved it)
  const isItemReserved = (item: Item) => {
    // Item is reserved if status is RESERVED or if current user has reserved it
    return item.status === "RESERVED" || reservedItems.has(item.id);
  };

  // Check if current user has reserved the item
  const isReservedByMe = (item: Item) => {
    return reservedItems.has(item.id);
  };

  // Check if item is reserved by someone else
  const isReservedBySomeoneElse = (item: Item) => {
    return item.status === "RESERVED" && !reservedItems.has(item.id);
  };

  // Get reserve button text
  const getReserveButtonText = (item: Item) => {
    const isCurrentlyReserving = reservingItemId === item.id;
    const isReservedByCurrentUser = reservedItems.has(item.id);
    
    if (isCurrentlyReserving) return "";
    if (isReservedByCurrentUser) return "Reserved by you";
    if (isReservedBySomeoneElse(item)) return "Already reserved";
    return "Buy this gift";
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch both wishlist and items data
      await Promise.all([refetchWishlist(), refetchItems()]);
    } catch (error) {
      console.error("Error refreshing wishlist:", error);
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleRestoreToWanted = async () => {
    if (!selectedItem) return;
    setItemMenuVisible(false);
    setTogglingItemId(selectedItem.id);
    try {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        status: "WANTED",
        wishlistId: selectedItem.wishlistId,
      });
      setSelectedItem(null);
      // Switch to wanted tab after restoring
      setSortFilter("wanted");
    } catch (error) {
      console.error("Error restoring item:", error);
      Alert.alert("Error", "Failed to restore item");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    
    // If on purchased tab, delete directly without confirmation
    if (sortFilter === "purchased") {
      setItemMenuVisible(false);
      try {
        await deleteItem.mutateAsync(selectedItem.id);
        setSelectedItem(null);
      } catch (error) {
        console.error("Error deleting item:", error);
        Alert.alert("Error", "Failed to delete item");
      }
    } else {
      // On wanted tab, show confirmation
      setItemDeleteConfirmVisible(true);
    }
  };

  const confirmDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      await deleteItem.mutateAsync(selectedItem.id);
      setItemDeleteConfirmVisible(false);
      setItemMenuVisible(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      setItemDeleteConfirmVisible(false);
    }
  };

  const renderItem = ({ item, index }: { item: Item; index: number }) => {
    const isLastItem = index === filteredItems.length - 1;
    const isPurchased = item.status === "PURCHASED";
    const isLoading = togglingItemId === item.id;
    const itemIsReserved = isItemReserved(item);
    const reservedByMe = isReservedByMe(item);
    const isReserving = reservingItemId === item.id;
    
    // Collect filled fields for display
    const hasPrice = item.price !== undefined && item.price !== null;
    const hasUrl = item.url && item.url.trim();
    const isMustHave = item.priority === 'MUST_HAVE';
    const hasImage = item.imageUrl && item.imageUrl.trim();
    
    return (
      <View
        style={[
          styles.itemCard,
          { 
            backgroundColor: theme.isDark ? '#2E2E2E' : '#D3D3D3',
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.itemRow,
            { opacity: itemIsReserved ? 0.5 : 1 }
          ]}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {/* Radio Button - Only show if not purchased AND user is owner */}
          {!isPurchased && isOwner === true && (
            <TouchableOpacity
              style={styles.itemCheckbox}
              onPress={() => handleToggleItemStatus(item)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={[
                  styles.checkboxEmpty,
                  { borderColor: theme.colors.textSecondary }
                ]} />
              )}
            </TouchableOpacity>
          )}
          
          {/* Loading indicator when purchased item is being toggled - Only for owner */}
          {isPurchased && isLoading && isOwner === true && (
            <View style={styles.itemCheckbox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}
          
          {/* Main Content Area */}
          <View style={styles.itemMainContent}>
            {/* Image and Details Row */}
            <View style={styles.itemImageDetailsRow}>
              {/* Image Placeholder - always show */}
              <View style={styles.itemImageContainer}>
                <View style={[styles.itemImageWrapper, { 
                  backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                  borderColor: itemIsReserved 
                    ? theme.colors.textSecondary + '20' 
                    : theme.colors.textSecondary + '40',
                }]}>
                  {hasImage ? (
                    // TODO: Display actual image when imageUrl is available
                    <Feather 
                      name="image" 
                      size={32} 
                      color={itemIsReserved 
                        ? theme.colors.textSecondary + '80' 
                        : theme.colors.textSecondary} 
                    />
                  ) : (
                    <Feather 
                      name="image" 
                      size={32} 
                      color={itemIsReserved 
                        ? theme.colors.textSecondary + '80' 
                        : theme.colors.textSecondary} 
                    />
                  )}
                </View>
              </View>
              
              {/* Content Section */}
              <View style={styles.itemContentDetails}>
                {/* Title - moved down closer to other details */}
                <Text 
                  style={[
                    styles.itemTitle, 
                    { 
                      color: itemIsReserved 
                        ? theme.colors.textSecondary 
                        : theme.colors.textPrimary 
                    }
                  ]} 
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                
                {/* Price */}
                {hasPrice && item.price !== undefined && item.price !== null && (
                  <View style={styles.itemPriceContainer}>
                    <Feather 
                      name="tag" 
                      size={12} 
                      color={itemIsReserved ? theme.colors.textSecondary + '80' : theme.colors.textSecondary} 
                      style={{ marginRight: 4 }} 
                    />
                    <PriceDisplay
                      amount={item.price}
                      currency={item.currency || 'USD'}
                      textStyle={[
                        styles.itemPrice, 
                        { 
                          color: itemIsReserved 
                            ? theme.colors.textSecondary + '80' 
                            : theme.colors.textSecondary 
                        }
                      ]}
                    />
                    <Text style={[
                      styles.itemPrice, 
                      { 
                        color: itemIsReserved 
                          ? theme.colors.textSecondary + '80' 
                          : theme.colors.textSecondary,
                        marginLeft: 6
                      }
                    ]}>
                      / per piece
                    </Text>
                  </View>
                )}
                
                {/* Quantity - always show, default to 1 if not set */}
                <View style={styles.itemQuantityContainer}>
                  <Feather 
                    name="x" 
                    size={12} 
                    color={itemIsReserved ? theme.colors.textSecondary + '80' : theme.colors.textSecondary} 
                    style={{ marginRight: 4 }} 
                  />
                  <Text style={[
                    styles.itemQuantity, 
                    { 
                      color: itemIsReserved 
                        ? theme.colors.textSecondary + '80' 
                        : theme.colors.textSecondary 
                    }
                  ]}>
                    {item.quantity || 1}
                  </Text>
                </View>
                
                {/* Priority - on its own row if present */}
                {isMustHave && (
                  <View style={styles.itemPriorityContainer}>
                    <Feather 
                      name="star" 
                      size={12} 
                      color={itemIsReserved ? theme.colors.textSecondary + '80' : theme.colors.primary} 
                      style={{ marginRight: 4 }} 
                      fill={itemIsReserved ? theme.colors.textSecondary + '80' : theme.colors.primary}
                    />
                    <Text style={[
                      styles.itemPriority, 
                      { 
                        color: itemIsReserved 
                          ? theme.colors.textSecondary + '80' 
                          : theme.colors.primary 
                      }
                    ]}>
                      Must Have
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {/* Action Buttons - Only show for owner */}
          {isOwner === true && (
            <View style={styles.itemOwnerActions}>
              {/* Link Button - only show if item has URL */}
              {hasUrl && (
                <TouchableOpacity
                  style={styles.itemLinkIconButton}
                  onPress={async (e) => {
                    e.stopPropagation();
                    try {
                      let url = item.url?.trim();
                      if (url) {
                        // Ensure URL has a protocol
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                          url = 'https://' + url;
                        }
                        const supported = await Linking.canOpenURL(url);
                        if (supported) {
                          await Linking.openURL(url);
                        } else {
                          Alert.alert("Error", `Cannot open URL: ${url}`);
                        }
                      }
                    } catch (error) {
                      Alert.alert("Error", "Failed to open link");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Feather 
                    name="external-link" 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </TouchableOpacity>
              )}
              {/* Menu Button */}
              <TouchableOpacity
                style={styles.itemMenuButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                  setItemMenuVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Feather 
                  name="more-horizontal" 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Buttons - Only show for non-owners (when we know for sure they're not the owner) */}
        {isOwner === false && (
          <View style={styles.itemActionButtons}>
            {/* Heart Button - Add to Wishlist */}
            <TouchableOpacity
              style={[
                styles.itemActionButton,
                { 
                  borderColor: theme.colors.primary,
                  borderWidth: 2,
                  backgroundColor: 'transparent',
                  opacity: 1, // Always full opacity
                }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleAddItemToWishlist(item);
              }}
              activeOpacity={0.7}
            >
              <Feather 
                name="heart" 
                size={20} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>

            {/* Reserve Button - Text Button (Center) - Only show if reservations are allowed */}
            {wishlist?.allowReservations && (
              <TouchableOpacity
                style={[
                  styles.itemReserveButton,
                  { 
                    borderColor: reservedByMe 
                      ? theme.colors.primary
                      : isReservedBySomeoneElse(item)
                      ? theme.colors.textSecondary
                      : theme.colors.primary,
                    borderWidth: 2,
                    backgroundColor: reservedByMe 
                      ? theme.colors.primary
                      : 'transparent',
                    opacity: 1, // Always full opacity
                  }
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (!isReservedBySomeoneElse(item)) {
                    handleReserveItem(item);
                  }
                }}
                disabled={isReserving || isReservedBySomeoneElse(item)}
                activeOpacity={0.7}
              >
                {isReserving ? (
                  <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                ) : (
                  <Text style={[
                    styles.itemReserveButtonText,
                    { 
                      color: isReservedBySomeoneElse(item)
                        ? theme.colors.textSecondary
                        : theme.colors.textPrimary,
                      fontWeight: '600',
                    }
                  ]}>
                    {getReserveButtonText(item)}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Link Button - only show if item has URL */}
            {hasUrl ? (
              <TouchableOpacity
                style={[
                  styles.itemActionButton,
                  { 
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                    backgroundColor: 'transparent',
                    opacity: 1, // Always full opacity
                  }
                ]}
                onPress={async (e) => {
                  e.stopPropagation();
                  try {
                    let url = item.url?.trim();
                    if (url) {
                      // Ensure URL has a protocol
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'https://' + url;
                      }
                      const supported = await Linking.canOpenURL(url);
                      if (supported) {
                        await Linking.openURL(url);
                      } else {
                        Alert.alert("Error", `Cannot open URL: ${url}`);
                      }
                    }
                  } catch (error) {
                    Alert.alert("Error", "Failed to open link");
                  }
                }}
                activeOpacity={0.7}
              >
                <Feather 
                  name="external-link" 
                  size={20} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.itemActionButtonSpacer} />
            )}
          </View>
        )}
        
        {/* Only show divider if not the last item */}
        {!isLastItem && (
          <View style={[styles.itemDivider, { backgroundColor: theme.colors.textSecondary + '20' }]} />
        )}
      </View>
    );
  };

  // Show loading if we're still determining ownership
  const isLoadingOwnership = isLoadingUser || (wishlist && currentUser === null && isAuthLoaded);
  
  if (isLoadingWishlist || isLoadingItems || isLoadingOwnership) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/");
                }
              }} 
              style={styles.headerButton}
            >
              <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              {wishlist?.title || ""}
            </Text>
            
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton}>
                <Feather 
                  name="send" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading wishlist...</Text>
        </View>
      </View>
    );
  }

  if (!wishlist) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/");
                }
              }} 
              style={styles.headerButton}
            >
              <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Wishlist</Text>
            
            <View style={styles.headerRight} />
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <Feather name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Wishlist not found</Text>
        </View>
      </View>
    );
  }

  const cardBackgroundColor = theme.isDark ? '#2E2E2E' : '#D3D3D3';

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.background,
        }
      ]} 
      collapsable={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/");
              }
            }} 
            style={styles.headerButton}
          >
            <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {wishlist.title}
            </Text>
          </View>
          
          {isOwner === true && (
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={handleShareWishlist} 
                style={styles.headerButton}
              >
                <Feather 
                  name="send" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setMenuVisible(true)} 
                style={styles.headerButton}
              >
                <Feather 
                  name="more-horizontal" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Stats Section */}
      <View style={[styles.statsSection, { backgroundColor: theme.colors.background }]}>
        <View style={styles.statsContentColumn}>
          <View style={[styles.imagePlaceholder, { backgroundColor: cardBackgroundColor }]}>
            <Feather name="image" size={48} color={theme.colors.textSecondary} />
          </View>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active wishes</Text>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{activeWishes}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total value</Text>
              <PriceDisplay
                amount={totalPrice}
                currency={currency}
                textStyle={[styles.statValue, { color: theme.colors.textPrimary }]}
                containerStyle={{ flexShrink: 0 }}
              />
            </View>
          </View>
          
          {isOwner === true && (
            <View style={styles.privacyBadgeInline}>
              <Feather name={getPrivacyInfo(wishlist.privacyLevel).icon as any} size={14} color={theme.colors.primary} />
              <Text style={[styles.privacyText, { color: theme.colors.primary }]}>
                {getPrivacyInfo(wishlist.privacyLevel).label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card Container with rounded top corners */}
      <View 
        style={[styles.cardContainer, { backgroundColor: cardBackgroundColor }]} 
        collapsable={false}
      >
        {/* Filter/Sort Bar (Tabs) - Only show tabs for owner */}
        {isOwner === true && (
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[styles.filterSegment, sortFilter === "wanted" && { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => setSortFilter("wanted")}
            >
              <Feather 
                name="star" 
                size={16} 
                color={sortFilter === "wanted" ? theme.colors.primary : theme.colors.textSecondary} 
                style={{ marginRight: 6 }}
              />
              <Text style={[
                styles.filterText,
                { color: sortFilter === "wanted" ? theme.colors.textPrimary : theme.colors.textSecondary }
              ]}>
                Wanted
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterSegment, sortFilter === "purchased" && { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => setSortFilter("purchased")}
            >
              <Feather 
                name="check-circle" 
                size={16} 
                color={sortFilter === "purchased" ? theme.colors.primary : theme.colors.textSecondary} 
                style={{ marginRight: 6 }}
              />
              <Text style={[
                styles.filterText,
                { color: sortFilter === "purchased" ? theme.colors.textPrimary : theme.colors.textSecondary }
              ]}>
                Purchased
              </Text>
            </TouchableOpacity>
          </View>
        )}


      <WishlistMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEdit={handleEditWishlist}
        onDelete={handleDeleteWishlist}
      />

      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        title={wishlist.title}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        isDeleting={deleteWishlist.isPending}
      />

      <ItemMenu
        visible={itemMenuVisible}
        onClose={() => {
          setItemMenuVisible(false);
          // Don't clear selectedItem immediately - it might be needed for edit/add/delete modals
          // The modals will clear it when they close
        }}
        onEdit={selectedItem && sortFilter === "wanted" ? handleEditItem : undefined}
        onGoToLink={selectedItem?.url ? handleGoToLink : undefined}
        onAddToWishlist={selectedItem && sortFilter === "wanted" ? handleAddToWishlist : undefined}
        onRestoreToWanted={selectedItem && sortFilter === "purchased" ? handleRestoreToWanted : undefined}
        onDelete={handleDeleteItem}
        isPurchased={selectedItem?.status === "PURCHASED"}
        itemUrl={selectedItem?.url || null}
      />

      {/* Wishlist Selector BottomSheet for Duplicating Item */}
      <BottomSheet 
        visible={addToWishlistModalVisible} 
        onClose={() => {
          setAddToWishlistModalVisible(false);
          setSelectedItem(null);
        }}
      >
        <View style={[styles.bottomSheetContainer, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.bottomSheetHeader}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.textPrimary }]}>
              Select Wishlist
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAddToWishlistModalVisible(false);
                setSelectedItem(null);
              }}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Wishlist List */}
          <FlatList
            data={allWishlists.filter(w => w.id !== wishlistId)}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.wishlistOptionRow, { borderBottomColor: theme.colors.textSecondary + '20' }]}
                onPress={() => {
                  if (selectedItem) {
                    handleDuplicateToWishlist(item.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.wishlistOptionText, { color: theme.colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.modalEmptyState}>
                <Text style={[styles.modalEmptyText, { color: theme.colors.textSecondary }]}>
                  No other wishlists available
                </Text>
              </View>
            }
          />
        </View>
      </BottomSheet>

      {/* Edit Item Sheet */}
      <AddItemSheet
        key={selectedItem?.id || 'edit-item'}
        visible={editItemSheetVisible}
        wishlistId={wishlistId}
        item={selectedItem || undefined}
        onClose={() => {
          setEditItemSheetVisible(false);
          setSelectedItem(null);
        }}
        onSuccess={handleEditItemSuccess}
      />

      {/* Add Item Sheet (from FAB menu) */}
      <AddItemSheet
        visible={addItemSheetVisible}
        wishlistId={wishlistId}
        onClose={() => {
          setAddItemSheetVisible(false);
        }}
        onSuccess={() => {
          setAddItemSheetVisible(false);
          refetchItems();
        }}
      />

      {/* Add Item Sheet (from friend's wishlist - heart button) */}
      <AddItemSheet
        visible={addItemFromFriendSheetVisible}
        wishlistId={undefined} // No initial wishlist - user will select
        prefillItem={itemToAdd || undefined} // Prefill with item data but create new item
        title="Add to my Wishlist"
        onClose={() => {
          setAddItemFromFriendSheetVisible(false);
          setItemToAdd(null);
        }}
        onSuccess={handleAddItemFromFriendSuccess}
      />

      {/* Edit Wishlist Sheet */}
      <EditWishlistSheet
        visible={editWishlistSheetVisible}
        wishlist={wishlist}
        onClose={() => {
          setEditWishlistSheetVisible(false);
        }}
        onSuccess={handleEditWishlistSuccess}
      />

      {/* Delete confirmation only for wanted items - purchased items delete directly */}
      {sortFilter === "wanted" && (
        <DeleteConfirmModal
          visible={itemDeleteConfirmVisible}
          title={selectedItem?.title || "Item"}
          type="item"
          onConfirm={confirmDeleteItem}
          onCancel={() => {
            setItemDeleteConfirmVisible(false);
            setItemMenuVisible(false);
            setSelectedItem(null);
          }}
          isDeleting={deleteItem.isPending}
        />
      )}

        {/* Items List - Scrollable content for each tab */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            filteredItems.length === 0 ? { flexGrow: 1, paddingBottom: 0 } : undefined
          ]}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          horizontal={false}
          scrollEnabled={true}
          nestedScrollEnabled={false}
          removeClippedSubviews={false}
          bounces={true}
          alwaysBounceVertical={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh} 
              colors={[theme.colors.primary]} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="gift" size={64} color={theme.colors.primary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                {isOwner === false
                  ? "No items yet" 
                  : isOwner === true && sortFilter === "purchased" 
                    ? "No items purchased yet" 
                    : "No items yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {isOwner === false
                  ? "This wishlist doesn't have any items yet"
                  : isOwner === true && sortFilter === "purchased" 
                    ? "Items you mark as purchased will appear here" 
                    : "Start adding items to your wishlist"}
              </Text>
            </View>
          }
        />
      </View>

      {/* FAB Menu - positioned on the right for add item - Only show for owner */}
      {isOwner === true && (
        <FABMenu
          visible={fabMenuVisible}
          onToggle={() => setFabMenuVisible(!fabMenuVisible)}
          onClose={() => setFabMenuVisible(false)}
          onManualAdd={handleAddItem}
          variant="bottom-right"
          positionStyle="screen"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    position: "relative",
    alignSelf: "stretch",
  },
  headerButton: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 40,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: "100%",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  privacyBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
    marginTop: 8,
    marginBottom: 45,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  statsContentColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statsContent: {
    flex: 1,
    justifyContent: "center",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "center",
    gap: 24,
    flexWrap: "nowrap",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    flexWrap: "nowrap",
    margin: 0,
    padding: 0,
  },
  statDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 14,
    marginRight: 8,
    marginBottom: 0,
    marginTop: 0,
    marginLeft: 0,
    padding: 0,
    lineHeight: 20,
    includeFontPadding: false,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2,
    margin: 0,
    padding: 0,
    lineHeight: 20,
    includeFontPadding: false,
    color: "red",
  },
  privacyText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    minHeight: 0,
    maxHeight: "100%",
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  filterBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 4,
  },
  filterSegment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 6,
  },
  filterSegmentActive: {
    opacity: 0.8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  filterTextActive: {
    color: "#F9FAFB",
    fontWeight: "600",
  },
  list: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 100,
    width: "100%",
  },
  itemCard: {
    marginTop: 12,
    marginBottom: 8,
    width: "100%",
    maxWidth: "100%",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: "100%",
    maxWidth: "100%",
  },
  itemCheckbox: {
    width: 24,
    height: 24,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  checkboxEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4B5563",
  },
  itemMainContent: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 20,
  },
  itemImageDetailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 70,
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContentDetails: {
    flex: 1,
    minHeight: 70,
    justifyContent: "flex-start",
    paddingVertical: 0,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
    minHeight: 20,
  },
  itemPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 12,
    lineHeight: 22,
    fontWeight: "500",
  },
  itemQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
  },
  itemQuantity: {
    fontSize: 12,
    lineHeight: 22,
  },
  itemPriorityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemPriority: {
    fontSize: 11,
    fontWeight: "500",
  },
  itemLinkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 8,
  },
  itemLinkButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemOwnerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  itemLinkIconButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 42,
    minHeight: 42,
    alignSelf: "center",
  },
  itemMenuButton: {
    padding: 8,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 40,
    alignSelf: "center",
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#374151",
  },
  itemActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 24,
    width: "100%",
  },
  itemActionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemActionButtonSpacer: {
    width: 40,
    height: 40,
  },
  itemReserveButton: {
    minWidth: 120,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  itemReserveButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F9FAFB",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  bottomSheetContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    position: "relative",
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerSpacer: {
    width: 24,
  },
  closeButton: {
    padding: 4,
    zIndex: 1,
  },
  wishlistOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  wishlistOptionText: {
    fontSize: 16,
  },
  modalEmptyState: {
    padding: 24,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
  },
});
