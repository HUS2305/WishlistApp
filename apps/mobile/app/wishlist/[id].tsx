import { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Dimensions,
  Image,
} from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import type { Item, Wishlist } from "@/types";
import { getDisplayName } from "@/lib/utils";
import { useWishlist, useWishlistItems, useDeleteWishlist, useUpdateItem, useDeleteItem } from "@/hooks/useWishlists";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { WishlistMenu } from "@/components/WishlistMenu";
import { ItemMenu } from "@/components/ItemMenu";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { wishlistsService } from "@/services/wishlists";
import { useTheme } from "@/contexts/ThemeContext";
import { AddItemSheet } from "@/components/AddItemSheet";
import { EditWishlistSheet } from "@/components/EditWishlistSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { useAuth } from "@clerk/clerk-expo";
import { PriceDisplay } from "@/components/PriceDisplay";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { HeaderButtons } from "@/lib/navigation";
import { MembersSheet } from "@/components/MembersSheet";
import { friendsService } from "@/services/friends";
import { getWishlistCoverImage } from "@/constants/wishlistCovers";

export default function WishlistDetailScreen() {
  const { theme } = useTheme();
  const { isLoaded: isAuthLoaded } = useAuth();
  const { id, ownerId: ownerIdParam, itemId: itemIdParam, returnTo: returnToParam, eventId: eventIdParam } = useLocalSearchParams<{ id: string; ownerId?: string; itemId?: string; returnTo?: string; eventId?: string }>();
  const wishlistId = id as string;
  const scrollToItemId = itemIdParam as string | undefined;
  const returnTo = returnToParam as string | undefined;
  
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
  const [addItemSheetVisible, setAddItemSheetVisible] = useState(false);
  const [editWishlistSheetVisible, setEditWishlistSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const [addItemFromFriendSheetVisible, setAddItemFromFriendSheetVisible] = useState(false);
  const [itemToAdd, setItemToAdd] = useState<Item | null>(null);
  const [reservedItems, setReservedItems] = useState<Set<string>>(new Set());
  const [reservingItemId, setReservingItemId] = useState<string | null>(null);
  const [collaboratorsModalVisible, setCollaboratorsModalVisible] = useState(false);
  const [shouldAutoOpenFriendSelection, setShouldAutoOpenFriendSelection] = useState(false);
  const [leaveWishlistModalVisible, setLeaveWishlistModalVisible] = useState(false);
  const [areFriendsWithOwner, setAreFriendsWithOwner] = useState<boolean | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const itemRefs = useRef<{ [key: string]: number }>({});

  // Check if current user is the owner of the wishlist
  // Only determine ownership when we have both wishlist and currentUser
  // Use undefined to indicate "unknown" - don't show non-owner UI until we know for sure
  const isOwner = wishlist && currentUser
    ? wishlist.ownerId === currentUser.id 
    : undefined;

  // Check if current user is a collaborator (not owner)
  const isCollaborator = wishlist && currentUser && isOwner === false
    ? wishlist.collaborators?.some(collab => collab.userId === currentUser.id)
    : false;

  // Check if current user is an admin (owner OR collaborator with ADMIN role)
  const isAdmin = wishlist && currentUser
    ? (isOwner === true || wishlist.collaborators?.some(collab => 
        collab.userId === currentUser.id && collab.role === "ADMIN"
      ))
    : false;

  // Check if user can add items (owner or collaborator)
  const canAddItems = isOwner === true || isCollaborator === true;

  // Current user is now fetched via useCurrentUser hook (with React Query caching)

  // Check friendship status with owner when viewing other users' wishlists
  useEffect(() => {
    const checkFriendship = async () => {
      if (!wishlist || !currentUser || isOwner === true) {
        setAreFriendsWithOwner(null);
        return;
      }

      // Only check for public or friends-only wishlists
      if (wishlist.privacyLevel !== "PUBLIC" && wishlist.privacyLevel !== "FRIENDS_ONLY") {
        setAreFriendsWithOwner(null);
        return;
      }

      try {
        const profile = await friendsService.getUserProfile(wishlist.ownerId);
        setAreFriendsWithOwner(profile.areFriends);
      } catch (error) {
        console.error("Error checking friendship:", error);
        setAreFriendsWithOwner(false);
      }
    };

    if (wishlist && currentUser && isOwner === false) {
      checkFriendship();
    }
  }, [wishlist, currentUser, isOwner]);

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

  // Handle leaving wishlist (for collaborators)
  const handleLeaveWishlist = () => {
    setMenuVisible(false);
    // Small delay to let menu close before opening confirmation modal
    setTimeout(() => {
      setLeaveWishlistModalVisible(true);
    }, 200);
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

  // Scroll to item when itemId is provided
  useEffect(() => {
    if (scrollToItemId && items.length > 0 && scrollViewRef.current) {
      const targetItem = items.find(item => item.id === scrollToItemId);
      if (targetItem) {
        // Switch to correct tab if needed
        if (targetItem.status === "PURCHASED" && sortFilter !== "purchased") {
          setSortFilter("purchased");
        } else if (targetItem.status !== "PURCHASED" && sortFilter !== "wanted") {
          setSortFilter("wanted");
        }
        
        // Wait for layout and scroll to item
        setTimeout(() => {
          const itemY = itemRefs.current[scrollToItemId];
          if (itemY !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: Math.max(0, itemY - 100), animated: true });
          }
        }, 500);
      }
    }
  }, [scrollToItemId, items.length, sortFilter]);

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
      
      // Before updating, check if this is the last purchased item
      // (only relevant when moving from purchased to wanted)
      const isLastPurchasedItem = newStatus === "WANTED" && 
        items.filter((i) => i.status === "PURCHASED").length === 1;
      
      await updateItem.mutateAsync({
        id: item.id,
        status: newStatus,
        wishlistId: item.wishlistId,
      });
      
      // Show success modal based on the action
      if (newStatus === "WANTED") {
        // Moving from purchased to wanted
        // Only switch to wanted tab if this was the last purchased item
        if (isLastPurchasedItem) {
          setSortFilter("wanted");
        }
      } else {
        // Moving from wanted to purchased
      }
    } catch (error) {
      console.error("Error updating item status:", error);
      Alert.alert("Error", "Failed to update item status");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleMarkAsPurchased = async (item: Item) => {
    if (!currentUser) return;
    
    // Only mark as purchased if item is currently WANTED
    if (item.status !== "WANTED") {
      return;
    }
    
    // Check permissions: only admin can mark any item as purchased, else only item owners can mark their own items
    const itemAddedByMe = item.addedById === currentUser.id || item.addedBy?.id === currentUser.id;
    const canMarkAsPurchased = isAdmin || itemAddedByMe;
    
    if (!canMarkAsPurchased) {
      Alert.alert("Permission Denied", "You can only mark items you created as purchased. Only admins can mark any item as purchased.");
      return;
    }
    
    try {
      await updateItem.mutateAsync({
        id: item.id,
        status: "PURCHASED",
        wishlistId: item.wishlistId,
      });
      // Show success modal
    } catch (error) {
      console.error("Error marking item as purchased:", error);
      Alert.alert("Error", "Failed to mark item as purchased");
    }
  };

  const handleItemPress = async (item: Item) => {
    // When viewing other users' wishlists, open the menu instead of marking as purchased
    if (isOwner === false) {
      setSelectedItem(item);
      setItemMenuVisible(true);
      return;
    }
    
    // If item is WANTED, mark it as purchased (if user has permission)
    if (item.status === "WANTED") {
      await handleMarkAsPurchased(item);
      return;
    }
    
    // Check if user can edit this item (only if they added it themselves, and they're owner or collaborator)
    // Check both addedById and addedBy?.id since addedById can be null/undefined
    const canEditItem = (item.addedById === currentUser?.id || item.addedBy?.id === currentUser?.id) && (isOwner === true || isCollaborator === true);
    
    // If user can't edit items, just open URL if available
    if (!canEditItem) {
      if (item.url) {
        try {
          let url = item.url.trim();
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
      }
      return;
    }
    
    // On purchased tab, clicking the item should restore it to wanted (only for owners)
    if (sortFilter === "purchased" && isOwner === true) {
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
    if (!selectedItem || !wishlist || !currentUser) {
      console.error("Missing required data for adding to wishlist");
      return;
    }
    
    setItemMenuVisible(false);
    
    // Determine the action based on context (same logic as heart icon)
    const isGroupWishlist = wishlist.privacyLevel === "GROUP";
    const isAddedByMe = selectedItem.addedById === currentUser.id || selectedItem.addedBy?.id === currentUser.id;
    const isViewingOtherUsersWishlist = wishlist.ownerId !== currentUser.id;
    
    if (isViewingOtherUsersWishlist) {
      // Viewing other users' wishlists - always add to my wishlist
      handleAddItemToWishlist(selectedItem);
    } else if (isGroupWishlist && isAddedByMe) {
      // Group wishlist owned by me, item added by me - add to another wishlist
      setTimeout(() => {
        setAddToWishlistModalVisible(true);
      }, 150);
    } else if (isGroupWishlist && !isAddedByMe) {
      // Group wishlist owned by me, item added by friend - add to my wishlist
      handleAddItemToWishlist(selectedItem);
    } else {
      // Personal wishlist owned by me - add to another wishlist
      setTimeout(() => {
        setAddToWishlistModalVisible(true);
      }, 150);
    }
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
    if (!currentUser || !items.length) return;
    
    // Initialize reservedItems from items that have isReservedByCurrentUser flag
    const reserved = new Set<string>();
    items.forEach(item => {
      // @ts-ignore - isReservedByCurrentUser may exist on item but not in type definition
      if (item.isReservedByCurrentUser) {
        reserved.add(item.id);
      }
    });
    setReservedItems(reserved);
  }, [items, currentUser, isOwner]);


  // Check if item is reserved (by anyone - if hasReservations flag is true or if we've reserved it)
  const isItemReserved = (item: Item) => {
    // Item is reserved if hasReservations is true or if current user has reserved it
    return item.hasReservations === true || reservedItems.has(item.id);
  };

  // Check if current user has reserved the item
  const isReservedByMe = (item: Item) => {
    return reservedItems.has(item.id);
  };

  // Check if item is reserved by someone else
  const isReservedBySomeoneElse = (item: Item) => {
    // Item is reserved by someone else if hasReservations is true but current user hasn't reserved it
    return item.hasReservations === true && !reservedItems.has(item.id);
  };

  // Get reserve button text
  const getReserveButtonText = (item: Item) => {
    const isCurrentlyReserving = reservingItemId === item.id;
    const isReservedByCurrentUser = reservedItems.has(item.id);
    
    if (isCurrentlyReserving) return "";
    if (isReservedByCurrentUser) return "Reserved by you";
    if (isReservedBySomeoneElse(item)) return "Already reserved";
    return "Reserve";
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
      // Before updating, check if this is the last purchased item
      const isLastPurchasedItem = 
        items.filter((i) => i.status === "PURCHASED").length === 1;
      
      await updateItem.mutateAsync({
        id: selectedItem.id,
        status: "WANTED",
        wishlistId: selectedItem.wishlistId,
      });
      setSelectedItem(null);
      
      // Only switch to wanted tab if this was the last purchased item
      if (isLastPurchasedItem) {
        setSortFilter("wanted");
      }
      
      // Show success modal
    } catch (error) {
      console.error("Error restoring item:", error);
      Alert.alert("Error", "Failed to restore item");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem || !currentUser) return;
    
    // Check delete permissions: only admins can delete any item, others can only delete their own items
    const itemAddedByMe = selectedItem.addedById === currentUser.id || selectedItem.addedBy?.id === currentUser.id;
    const canDelete = isAdmin || itemAddedByMe;
    
    if (!canDelete) {
      Alert.alert("Permission Denied", "You can only delete items you created. Only admins can delete any item.");
      return;
    }
    
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
    if (!selectedItem || !currentUser) return;
    
    // Check delete permissions again (defense in depth)
    const itemAddedByMe = selectedItem.addedById === currentUser.id || selectedItem.addedBy?.id === currentUser.id;
    const canDelete = isAdmin || itemAddedByMe;
    
    if (!canDelete) {
      Alert.alert("Permission Denied", "You can only delete items you created. Only admins can delete any item.");
      setItemDeleteConfirmVisible(false);
      setItemMenuVisible(false);
      setSelectedItem(null);
      return;
    }
    
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
    const isLoading = togglingItemId === item.id;
    const itemIsReserved = isItemReserved(item);
    const reservedByMe = isReservedByMe(item);
    const isReserving = reservingItemId === item.id;
    
    // Collect filled fields for display
    const hasPrice = item.price !== undefined && item.price !== null;
    const hasUrl = item.url && item.url.trim();
    const isMustHave = item.priority === 'MUST_HAVE';
    const hasImage = item.imageUrl && item.imageUrl.trim();
    
    // Determine if this is a group wishlist OR viewing other users' wishlists
    // Use compact group layout for: GROUP wishlists OR when viewing other users' wishlists (friends-only/public)
    const isGroupWishlist = wishlist?.privacyLevel === "GROUP";
    const useCompactLayout = isGroupWishlist || isOwner === false;
    
    // For group wishlists, determine item type:
    // Check both addedById and addedBy?.id since addedById can be null/undefined
    const isAddedByMe = useCompactLayout && (
      item.addedById === currentUser?.id || 
      item.addedBy?.id === currentUser?.id
    );
    
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
          {/* Main Content Area */}
          {useCompactLayout ? (
            // Group wishlist: 3-row layout with image aligned to rows 1-2, row 3 independent
            <View style={styles.itemMainContentGroup}>
              {/* Image and rows 1-2 - aligned together */}
              <View style={styles.itemImageAndRowsGroup}>
                {/* Image */}
                <View style={styles.itemImageContainerGroup3Row}>
                  <View style={[styles.itemImageWrapperGroup, { 
                    backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                    borderColor: itemIsReserved 
                      ? theme.colors.textSecondary + '20' 
                      : theme.colors.textSecondary + '40',
                    overflow: 'hidden',
                  }]}>
                    {hasImage ? (
                      <Image 
                        source={{ uri: item.imageUrl! }} 
                        style={{ width: 70, height: 70, opacity: itemIsReserved ? 0.5 : 1 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather 
                        name="image" 
                        size={24} 
                        color={itemIsReserved 
                          ? theme.colors.textSecondary + '80' 
                          : theme.colors.textSecondary} 
                      />
                    )}
                  </View>
                </View>
                
                {/* Content rows - starts after image */}
                <View style={styles.itemContentRowsGroup}>
                  {/* Row 1: Title */}
                  <View style={styles.itemRow1Group3Row}>
                    <View style={styles.itemTitleContainerGroup3Row}>
                      <Text 
                        style={[
                          styles.itemTitleGroup3Row, 
                          { 
                            color: itemIsReserved 
                              ? theme.colors.textSecondary 
                              : theme.colors.textPrimary 
                          }
                        ]} 
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                    </View>
                    
                    {/* Spacer for menu button alignment - same width as menu button */}
                    {/* Show spacer if menu button will be shown (always show for other users' wishlists, or when owner/collaborator) */}
                    {(isOwner === false || (isOwner === true || isCollaborator === true)) && (
                      <View style={styles.itemMenuButtonGroup3RowSpacer} />
                    )}
                  </View>
                  
                  {/* Row 2: Price · Quantity · Must Have · Owner */}
                  <View style={styles.itemRow2Group3Row}>
                    <View style={styles.itemMetadataRowGroup3Row}>
                      {/* Price */}
                      {hasPrice && item.price !== undefined && item.price !== null && (
                        <>
                          <PriceDisplay
                            amount={item.price}
                            currency={item.currency || 'USD'}
                            textStyle={[
                              styles.itemPriceGroup3Row, 
                              { 
                                color: itemIsReserved 
                                  ? theme.colors.textSecondary + '80' 
                                  : theme.colors.textSecondary 
                              }
                            ]}
                          />
                          {item.quantity && item.quantity > 1 && (
                            <Text style={[
                              styles.itemPriceGroup3Row, 
                              { 
                                color: itemIsReserved 
                                  ? theme.colors.textSecondary + '80' 
                                  : theme.colors.textSecondary,
                                marginLeft: 6
                              }
                            ]}>
                              x{item.quantity}
                            </Text>
                          )}
                        </>
                      )}
                      
                      {/* Priority/Tag */}
                      {isMustHave && (
                        <View style={[
                          styles.itemPriorityContainerGroupInline3Row,
                          { marginLeft: 6 }
                        ]}>
                          <Feather 
                            name="star" 
                            size={9} 
                            color={itemIsReserved ? theme.colors.textSecondary + '80' : theme.colors.primary} 
                            style={{ marginRight: 3 }} 
                            fill={itemIsReserved ? theme.colors.textSecondary + '80' : theme.colors.primary}
                          />
                          <Text style={[
                            styles.itemPriorityGroupInline3Row, 
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
                      
                      {/* Owner - Badge style - Only show for group wishlists */}
                      {item.addedBy && isGroupWishlist && (
                        <View style={[
                          styles.itemOwnerBadgeGroup3Row,
                          { 
                            backgroundColor: itemIsReserved 
                              ? theme.colors.textSecondary + '15'
                              : theme.colors.textSecondary + '20',
                            marginLeft: 6
                          }
                        ]}>
                          <Text style={[
                            styles.itemOwnerBadgeTextGroup3Row,
                            { 
                              color: itemIsReserved 
                                ? theme.colors.textSecondary + '80' 
                                : theme.colors.textSecondary 
                            }
                          ]}>
                            {isAddedByMe ? 'You' : (item.addedBy.displayName || item.addedBy.username || item.addedBy.firstName || 'Someone')}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Menu Button - on right side, vertically aligned to Row 2 */}
                    {/* Show menu for all items - always show when viewing other users' wishlists, or when owner/collaborator */}
                    {(isOwner === false || (isOwner === true || isCollaborator === true)) && (
                      <TouchableOpacity
                        style={styles.itemMenuButtonGroup3Row}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setItemMenuVisible(true);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather 
                          name="more-horizontal" 
                          size={16} 
                          color={theme.colors.textSecondary} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              
              {/* Row 3: Action buttons (centered independently, below image and rows 1-2) */}
              <View style={styles.itemRow3Group3Row}>
                <View style={styles.itemActionButtonsRow3Row}>
                  {/* Left spacer or heart button - ensures Reserve button stays centered */}
                  {/* Show heart when: viewing other users' wishlists OR any group wishlist item */}
                  {(() => {
                    // Always show heart when viewing other users' wishlists (any wishlist where we're not the owner)
                    if (wishlist && currentUser && wishlist.ownerId !== currentUser.id) {
                      return true;
                    }
                    // For group wishlists, always show heart for all items (both added by you and by others)
                    if (isGroupWishlist) {
                      return true;
                    }
                    return false;
                  })() ? (
                    <TouchableOpacity
                      style={styles.itemActionButtonGroup3Row}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (isOwner === false) {
                          // Viewing other users' wishlists - always add to my wishlist
                          handleAddItemToWishlist(item);
                        } else if (isAddedByMe) {
                          // Group wishlist owned by me, item added by me - add to another wishlist
                          setSelectedItem(item);
                          setAddToWishlistModalVisible(true);
                        } else {
                          // Group wishlist owned by me, item added by friend - add to my wishlist
                          handleAddItemToWishlist(item);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather 
                        name="heart" 
                        size={20} 
                        color={theme.colors.primary} 
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.itemActionButtonGroup3Row} />
                  )}
                  
                  {/* Reserve button (centered) */}
                  {/* Show reserve button only for:
                      - Group wishlists (user is collaborator)
                      - Friends-only wishlists where user is friends with owner
                      - Public wishlists where user is friends with owner
                      - Own wishlists (isOwner === true) */}
                  {wishlist?.allowReservations && (() => {
                    // Always show for own wishlists
                    if (isOwner === true) {
                      return true;
                    }
                    // For group wishlists, show if user is collaborator
                    if (isGroupWishlist && isCollaborator === true) {
                      return true;
                    }
                    // For friends-only wishlists, show if user is friends with owner
                    if (isOwner === false && wishlist.privacyLevel === "FRIENDS_ONLY" && areFriendsWithOwner === true) {
                      return true;
                    }
                    // For public wishlists, show only if user is friends with owner
                    if (isOwner === false && wishlist.privacyLevel === "PUBLIC" && areFriendsWithOwner === true) {
                      return true;
                    }
                    return false;
                  })() && (
                    <TouchableOpacity
                      style={[
                        styles.itemBuyButtonGroup3Row,
                        { 
                          backgroundColor: theme.colors.primary,
                          borderWidth: 0,
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
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={[
                          styles.itemBuyButtonTextGroup3Row,
                          { 
                            color: '#FFFFFF',
                          }
                        ]}>
                          {getReserveButtonText(item)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {/* Right spacer or link button - ensures Reserve button stays centered */}
                  {hasUrl ? (
                    <TouchableOpacity
                      style={styles.itemActionButtonGroup3Row}
                      onPress={async (e) => {
                        e.stopPropagation();
                        try {
                          let url = item.url?.trim();
                          if (url) {
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
                    <View style={styles.itemActionButtonGroup3Row} />
                  )}
                </View>
              </View>
            </View>
          ) : (
            // Personal wishlist: Original layout
            <>
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
                  overflow: 'hidden',
                }]}>
                  {hasImage ? (
                    <Image 
                      source={{ uri: item.imageUrl! }} 
                      style={{ width: 70, height: 70, opacity: itemIsReserved ? 0.5 : 1 }}
                      resizeMode="cover"
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
                
                {/* Price and Quantity - inline layout matching group wishlists */}
                <View style={styles.itemPriceQuantityContainer}>
                  {/* Price */}
                  {hasPrice && item.price !== undefined && item.price !== null && (
                    <>
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
                      {item.quantity && item.quantity > 1 && (
                        <Text style={[
                          styles.itemPrice, 
                          { 
                            color: itemIsReserved 
                              ? theme.colors.textSecondary + '80' 
                              : theme.colors.textSecondary,
                            marginLeft: 6
                          }
                        ]}>
                          x{item.quantity}
                        </Text>
                      )}
                    </>
                  )}
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
                
                {/* Added By - Only show for group wishlists */}
                {item.addedBy && isGroupWishlist && (
                  <View style={[styles.itemAddedByChip, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Feather 
                      name="user" 
                      size={10} 
                      color={theme.colors.primary} 
                      style={{ marginRight: 4 }} 
                    />
                    <Text style={[
                      styles.itemAddedByChipText, 
                      { 
                        color: theme.colors.primary
                      }
                    ]}>
                      {item.addedBy.displayName || item.addedBy.username || item.addedBy.firstName || 'Someone'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {/* Action Buttons - Show for owner or collaborator (Personal wishlists only) */}
          {/* Menu button shows for all items - menu will show appropriate options based on permissions */}
          {(isOwner === true || isCollaborator === true) && (
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
              {/* Menu Button - Show for all items when user is owner or collaborator */}
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
              
              {/* Reserve Button - Show only for:
                  - Group wishlists (user is collaborator)
                  - Friends-only wishlists where user is friends with owner
                  - Public wishlists where user is friends with owner
                  - Own wishlists (isOwner === true), but hide for owners in non-group wishlists who created the item */}
              {/* Check both addedById and addedBy?.id since addedById can be null/undefined */}
              {wishlist?.allowReservations && (() => {
                // For own wishlists, hide if owner created the item in non-group wishlist
                if (isOwner === true && wishlist?.privacyLevel !== "GROUP" && (item.addedById === currentUser?.id || item.addedBy?.id === currentUser?.id)) {
                  return false;
                }
                // Always show for own wishlists (if above condition doesn't apply)
                if (isOwner === true) {
                  return true;
                }
                // For group wishlists, show if user is collaborator
                if (isGroupWishlist && isCollaborator === true) {
                  return true;
                }
                // For friends-only wishlists, show if user is friends with owner
                if (isOwner === false && wishlist.privacyLevel === "FRIENDS_ONLY" && areFriendsWithOwner === true) {
                  return true;
                }
                // For public wishlists, show only if user is friends with owner
                if (isOwner === false && wishlist.privacyLevel === "PUBLIC" && areFriendsWithOwner === true) {
                  return true;
                }
                return false;
              })() && (
                <TouchableOpacity
                  style={[
                    styles.itemReserveButtonOwner,
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
                    }
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleReserveItem(item);
                  }}
                  disabled={isReserving}
                  activeOpacity={0.7}
                >
                  {isReserving ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text style={[
                      styles.itemReserveButtonText,
                      { 
                        color: reservedByMe 
                          ? '#FFFFFF'
                          : isReservedBySomeoneElse(item)
                          ? theme.colors.textSecondary
                          : theme.colors.primary,
                        fontSize: 12,
                      }
                    ]}>
                      {getReserveButtonText(item)}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          </>
          )}
        </TouchableOpacity>

        {/* Action Buttons - Only show for non-owners/collaborators who can't edit this item (Personal wishlists only) */}
        {/* This section is now handled in the compact layout, so only show for personal wishlists owned by user */}
        {/* Check both addedById and addedBy?.id since addedById can be null/undefined */}
        {!useCompactLayout && isOwner !== true && !(isCollaborator === true && (item.addedById === currentUser?.id || item.addedBy?.id === currentUser?.id)) && (
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

            {/* Reserve Button - Text Button (Center) - Only show if reservations are allowed and user has permission */}
            {/* Show reserve button only for:
                - Group wishlists (user is collaborator)
                - Friends-only wishlists where user is friends with owner
                - Public wishlists where user is friends with owner */}
            {wishlist?.allowReservations && (() => {
              // For group wishlists, show if user is collaborator
              if (isGroupWishlist && isCollaborator === true) {
                return true;
              }
              // For friends-only wishlists, show if user is friends with owner
              if (isOwner === false && wishlist.privacyLevel === "FRIENDS_ONLY" && areFriendsWithOwner === true) {
                return true;
              }
              // For public wishlists, show only if user is friends with owner
              if (isOwner === false && wishlist.privacyLevel === "PUBLIC" && areFriendsWithOwner === true) {
                return true;
              }
              return false;
            })() && (
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
  const isLoadingOwnership = isLoadingUser || (wishlist && !currentUser && isAuthLoaded);
  
  // Build header buttons dynamically
  const headerButtons = [];
  if (wishlist && (isOwner === true || isCollaborator === true)) {
    if (isOwner === true) {
      headerButtons.push({
        icon: "send" as const,
        onPress: handleShareWishlist,
      });
    }
    headerButtons.push({
      icon: "more-horizontal" as const,
      onPress: () => setMenuVisible(true),
    });
  }
  
  if (isLoadingWishlist || isLoadingItems || isLoadingOwnership) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StandardPageHeader
          title={wishlist?.title || "Wishlist"}
          backButton={true}
          onBack={() => router.push("/(tabs)/")}
          rightActions={
            headerButtons.length > 0 ? <HeaderButtons buttons={headerButtons} /> : null
          }
        />
        
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
        <StandardPageHeader
          title="Wishlist"
          backButton={true}
          onBack={() => router.push("/(tabs)/")}
        />
        
        <View style={styles.loadingContainer}>
          <Feather name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Wishlist not found</Text>
        </View>
      </View>
    );
  }

  const cardBackgroundColor = theme.isDark ? '#2E2E2E' : '#D3D3D3';
  const screenHeight = Dimensions.get('window').height;

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
      <StandardPageHeader
        title={wishlist.title}
        backButton={true}
        onBack={() => {
          // Handle navigation based on returnTo parameter (priority order)
          if (returnTo === "reserved") {
            // Came from reserved items section on friends page
            router.push("/(tabs)/friends");
            return;
          }
          if (returnTo === "wishlists") {
            // Came from main wishlists page
            router.push("/(tabs)/");
            return;
          }
          if (returnTo === "profile" && ownerIdParam) {
            // Came from a user's profile page - use the ownerId from the param
            router.push(`/friends/${ownerIdParam}`);
            return;
          }
          if (returnTo === "notifications") {
            // Came from notifications page
            router.push("/notifications");
            return;
          }
          if (returnTo === "discover") {
            // Came from discover page
            router.push("/(tabs)/discover");
            return;
          }
          if (returnTo === "secret-santa-event" && eventIdParam) {
            // Came from Secret Santa event details page
            router.push(`/secret-santa/${eventIdParam}`);
            return;
          }
          // Fallback: If we have ownerId param or we're viewing another user's wishlist, go to their profile
          // Only use this if returnTo is not set, to avoid going to wrong user's profile
          if (!returnTo && (ownerIdParam || (isOwner === false && wishlist.ownerId))) {
            const ownerId = ownerIdParam || wishlist.ownerId;
            router.push(`/friends/${ownerId}`);
          } else {
            // Default: go to main wishlists page
            router.push("/(tabs)/");
          }
        }}
        rightActions={
          headerButtons.length > 0 ? <HeaderButtons buttons={headerButtons} /> : null
        }
      />

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          flexGrow: 1,
          minHeight: screenHeight - 100, // Ensure content fills viewport minus header
          paddingBottom: 0,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={[theme.colors.primary]} 
          />
        }
      >
        {/* Stats Section */}
        <View style={[styles.statsSection, { backgroundColor: theme.colors.background }]}>
          <View style={styles.statsContentColumn}>
            <View style={[styles.imagePlaceholder, { backgroundColor: cardBackgroundColor, overflow: 'hidden' }]}>
              {wishlist?.coverImage ? (
                <Image
                  source={getWishlistCoverImage(wishlist.coverImage)}
                  style={styles.coverImageDetail}
                  resizeMode="cover"
                />
              ) : (
                <Feather name="image" size={48} color={theme.colors.textSecondary} />
              )}
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

        {/* Collaborators Section - Show for group wishlists */}
        {wishlist?.collaborators && wishlist.collaborators.length > 0 && (
          <TouchableOpacity
            style={styles.collaboratorsSection}
            onPress={() => setCollaboratorsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="users" size={18} strokeWidth={2.5} color={theme.colors.primary} />
            <Text style={[styles.collaboratorsTitle, { color: theme.colors.textPrimary, marginLeft: 8 }]}>
              Members
            </Text>
            <View style={styles.collaboratorsPreview}>
              {/* Owner */}
              {wishlist.owner && (
                <View style={[styles.collaboratorBadge, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB', borderColor: theme.colors.background }]}>
                  <Text style={[styles.collaboratorBadgeText, { color: theme.colors.primary }]}>
                    {getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName)?.[0]?.toUpperCase() || wishlist.owner.username?.[0]?.toUpperCase() || 'O'}
                  </Text>
                </View>
              )}
              {/* Collaborators preview (first 3) */}
              {wishlist.collaborators.slice(0, 3).map((collab) => (
                <View 
                  key={collab.id} 
                  style={[
                    styles.collaboratorBadge, 
                    { 
                      backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                      borderColor: theme.colors.background, // Border matches background for clean overlap
                      marginLeft: -8, // Overlap to the right
                    }
                  ]}
                >
                  <Text style={[styles.collaboratorBadgeText, { color: theme.colors.textPrimary }]}>
                    {getDisplayName(collab.user.firstName, collab.user.lastName)?.[0]?.toUpperCase() || collab.user.username?.[0]?.toUpperCase() || collab.user.email?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              ))}
              {wishlist.collaborators.length > 3 && (
                <>
                  <Text style={[styles.collaboratorMore, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
                    +{wishlist.collaborators.length - 3}
                  </Text>
                  <Feather name="chevron-right" size={16} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
                </>
              )}
            </View>
            {wishlist.collaborators.length <= 3 && (
              <Feather name="chevron-right" size={16} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        {/* Card Container with rounded top corners */}
        <View 
          style={[
            styles.cardContainer, 
            { 
              backgroundColor: cardBackgroundColor,
              // Use flex: 1 to fill remaining space in ScrollView when there are items
              flex: filteredItems.length > 0 ? 1 : undefined,
              // Ensure minHeight for both empty and non-empty states to extend grey background to bottom
              minHeight: Math.max(screenHeight - 350, 600),
              // Add paddingBottom for FAB spacing when there are items
              paddingBottom: filteredItems.length > 0 ? 100 : 0,
            }
          ]} 
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

          {/* Items List - Render items directly in ScrollView */}
          {filteredItems.length === 0 ? (
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
          ) : (
            <View style={styles.listContent}>
              {filteredItems.map((item, index) => (
                <View 
                  key={item.id}
                  onLayout={(event) => {
                    event.target.measureInWindow((_x, y) => {
                      itemRefs.current[item.id] = y;
                    });
                  }}
                >
                  {renderItem({ item, index })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <WishlistMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEdit={isOwner === true ? handleEditWishlist : undefined}
        onDelete={isOwner === true ? handleDeleteWishlist : undefined}
        onViewMembers={() => setCollaboratorsModalVisible(true)}
        showMembersOption={wishlist?.collaborators && wishlist.collaborators.length > 0}
        onLeave={isCollaborator === true ? handleLeaveWishlist : undefined}
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
        onEdit={selectedItem && sortFilter === "wanted" && (selectedItem.addedById === currentUser?.id || selectedItem.addedBy?.id === currentUser?.id) && (isOwner === true || isCollaborator === true) ? handleEditItem : undefined}
        onGoToLink={selectedItem?.url ? handleGoToLink : undefined}
        onAddToWishlist={selectedItem && sortFilter === "wanted" ? handleAddToWishlist : undefined}
        onMarkAsPurchased={selectedItem && sortFilter === "wanted" && currentUser && (isAdmin || (selectedItem.addedById === currentUser.id || selectedItem.addedBy?.id === currentUser.id)) ? () => handleMarkAsPurchased(selectedItem) : undefined}
        onRestoreToWanted={selectedItem && sortFilter === "purchased" && isOwner === true ? handleRestoreToWanted : undefined}
        onDelete={selectedItem && currentUser && (isAdmin || (selectedItem.addedById === currentUser.id || selectedItem.addedBy?.id === currentUser.id)) ? handleDeleteItem : undefined}
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
        autoHeight={true}
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
        autoOpenFriendSelection={false}
      />

      {/* Members Sheet */}
      <MembersSheet
        visible={collaboratorsModalVisible}
        onClose={() => setCollaboratorsModalVisible(false)}
        wishlist={wishlist}
        currentUserId={currentUser?.id}
        isOwner={isOwner === true}
        hideManage={returnTo === "secret-santa-event" && !!eventIdParam}
        onOpenEditWishlist={() => {
          // Close members sheet first
          setCollaboratorsModalVisible(false);
          // Set flag to auto-open friend selection
          setShouldAutoOpenFriendSelection(true);
          // Small delay to ensure members sheet closes before opening edit sheet
          setTimeout(() => {
            setEditWishlistSheetVisible(true);
          }, 300);
        }}
      />

      {/* Edit Wishlist Sheet */}
      <EditWishlistSheet
        visible={editWishlistSheetVisible}
        wishlist={wishlist}
        onClose={() => {
          setEditWishlistSheetVisible(false);
          setShouldAutoOpenFriendSelection(false);
        }}
        onSuccess={handleEditWishlistSuccess}
        autoOpenFriendSelection={shouldAutoOpenFriendSelection}
      />

      {/* Success Modal */}

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

      {/* Leave Wishlist Confirmation Modal */}
      <DeleteConfirmModal
        visible={leaveWishlistModalVisible}
        title={wishlist?.title || "this wishlist"}
        modalTitle="Leave Wishlist"
        onConfirm={async () => {
          if (!wishlist || !currentUser) return;
          
          try {
            // Find the collaborator record for current user
            const collaborator = wishlist.collaborators?.find(c => c.userId === currentUser.id);
            if (!collaborator) {
              Alert.alert("Error", "You are not a collaborator of this wishlist");
              setLeaveWishlistModalVisible(false);
              return;
            }
            
            await wishlistsService.removeCollaborator(wishlistId, collaborator.userId);
            setLeaveWishlistModalVisible(false);
            Alert.alert("Success", "You have left the wishlist");
            router.replace("/(tabs)/");
          } catch (error: any) {
            console.error("❌ Error leaving wishlist:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to leave wishlist");
            setLeaveWishlistModalVisible(false);
          }
        }}
        onCancel={() => {
          setLeaveWishlistModalVisible(false);
        }}
        isDeleting={false}
      />



      {/* FAB Button - directly opens add item sheet - Show for owner or collaborator */}
      {canAddItems && (
        <TouchableOpacity
          style={[
            styles.fabButton,
            {
              backgroundColor: theme.colors.primary,
            }
          ]}
          onPress={handleAddItem}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={32} color="#FFFFFF" />
        </TouchableOpacity>
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
    marginBottom: 0,
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
  coverImageDetail: {
    width: '100%',
    height: '100%',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
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
    paddingBottom: 0, // Padding handled inline based on content
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
  itemPriceQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  itemAddedByContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  itemAddedBy: {
    fontSize: 10,
    fontStyle: "italic",
  },
  itemAddedByChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  itemAddedByChipText: {
    fontSize: 10,
    fontWeight: "500",
  },
  // Group wishlist 3-row layout styles
  itemMainContentGroup: {
    flex: 1,
    flexDirection: "column",
  },
  itemImageAndRowsGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemImageContainerGroup3Row: {
    width: 70,
    height: 70,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImageWrapperGroup: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContentRowsGroup: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0, // Allow shrinking
    overflow: "hidden", // Prevent content from overflowing
  },
  itemRow1Group3Row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    minHeight: 20, // Ensure consistent height
    overflow: "hidden", // Prevent text from overflowing
    width: "100%", // Ensure full width
  },
  itemRow2Group3Row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemRow3Group3Row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    width: "100%",
  },
  itemTitleContainerGroup3Row: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
    // Reserve space for menu button on Row 2 (32px width + 8px margin = 40px)
    paddingRight: 40,
  },
  itemTitleGroup3Row: {
    fontSize: 14,
    fontWeight: "600",
    width: "100%",
  },
  itemMetadataRowGroup3Row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  },
  itemPriceGroup3Row: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "500",
  },
  itemPriorityContainerGroupInline3Row: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemPriorityGroupInline3Row: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemOwnerBadgeGroup3Row: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemOwnerBadgeTextGroup3Row: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemActionButtonsRow3Row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  itemActionButtonGroup3Row: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBuyButtonGroup3Row: {
    minWidth: 100,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  itemBuyButtonTextGroup3Row: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemMenuButtonGroup3Row: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  itemMenuButtonGroup3RowSpacer: {
    width: 32,
    marginLeft: 8,
  },
  collaboratorsSection: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 10,
    paddingVertical: 8,
  },
  collaboratorsTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  collaboratorsPreview: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  collaboratorBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  collaboratorBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  collaboratorMore: {
    fontSize: 12,
    fontWeight: "500",
  },
  collaboratorsModal: {
    padding: 20,
    paddingTop: 0,
    maxHeight: '80%',
  },
  collaboratorsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    position: "relative",
  },
  collaboratorsModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  collaboratorsModalContent: {
    maxHeight: 400,
  },
  collaboratorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  collaboratorDivider: {
    height: 1,
    marginVertical: 0,
  },
  collaboratorItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  collaboratorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  collaboratorAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  collaboratorItemInfo: {
    flex: 1,
  },
  collaboratorItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  collaboratorItemUsername: {
    fontSize: 12,
    marginTop: 2,
  },
  collaboratorItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  collaboratorRemoveButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
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
  itemReserveButtonOwner: {
    minWidth: 100,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginLeft: 8,
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
  fabButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
