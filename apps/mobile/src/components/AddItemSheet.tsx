import { useState } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { Priority, Item } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { SelectWishlistSheet } from "./SelectWishlistSheet";
import { wishlistsService } from "@/services/wishlists";
import { useWishlists, wishlistKeys, useUpdateItem, useCreateItem } from "@/hooks/useWishlists";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { getCurrencyByCode } from "@/utils/currencies";
import { useQueryClient } from "@tanstack/react-query";
import { wishlistEvents } from "@/utils/wishlistEvents";
import { uploadItemImage } from "@/services/imageUpload";

interface AddItemSheetProps {
  visible: boolean;
  onClose: () => void;
  wishlistId?: string;
  item?: Item;
  onSuccess?: () => void;
  prefillItem?: Item;
  title?: string;
}

export function AddItemSheet({ visible, onClose, wishlistId, item, onSuccess, prefillItem, title: customTitle }: AddItemSheetProps) {
  const { theme } = useTheme();
  const { data: wishlists = [], refetch: refetchWishlists } = useWishlists();
  const { userCurrency, isLoading: isLoadingCurrency } = useUserCurrency();
  const queryClient = useQueryClient();
  const updateItem = useUpdateItem();
  const createItem = useCreateItem();
  const isEditMode = !!item;
  
  // Refetch wishlists when sheet opens to ensure we have the latest data including group wishlists
  React.useEffect(() => {
    if (visible) {
      refetchWishlists();
    }
  }, [visible, refetchWishlists]);
  
  const [selectedWishlistId, setSelectedWishlistId] = useState(wishlistId || "");
  const [showWishlistBottomSheet, setShowWishlistBottomSheet] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD"); // Will be updated when userCurrency loads
  const [quantity, setQuantity] = useState("1");
  const [priority, setPriority] = useState<Priority>("NICE_TO_HAVE");
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form with item data when editing or prefilling
  React.useEffect(() => {
    if (visible && item) {
      // Edit mode - prefill with item data when modal becomes visible
      setTitle(item.title || "");
      setUrl(item.url || "");
      setImageUri(item.imageUrl || null);
      setPrice(item.price !== undefined && item.price !== null ? item.price.toString() : "");
      setCurrency(item.currency || "USD");
      setQuantity(item.quantity !== undefined && item.quantity !== null ? item.quantity.toString() : "1");
      setPriority(item.priority || "NICE_TO_HAVE");
      setSelectedWishlistId(item.wishlistId || wishlistId || "");
    } else if (visible && prefillItem) {
      // Prefill mode (e.g., adding from friend's wishlist)
      setTitle(prefillItem.title || "");
      setUrl(prefillItem.url || "");
      setImageUri(prefillItem.imageUrl || null);
      setPrice(prefillItem.price !== undefined && prefillItem.price !== null ? prefillItem.price.toString() : "");
      setCurrency(prefillItem.currency || "USD");
      setQuantity(prefillItem.quantity !== undefined && prefillItem.quantity !== null ? prefillItem.quantity.toString() : "1");
      setPriority(prefillItem.priority || "NICE_TO_HAVE");
    } else if (visible && !item && !prefillItem) {
      // Add mode - reset form and set currency to user's preference
      setTitle("");
      setUrl("");
      setImageUri(null);
      setPrice("");
      setCurrency(userCurrency); // Use userCurrency directly (will be "USD" if not loaded yet)
      setQuantity("1");
      setPriority("NICE_TO_HAVE");
      setSelectedWishlistId(wishlistId || "");
    }
  }, [visible, item, prefillItem, wishlistId, userCurrency]);
  
  React.useEffect(() => {
    if (wishlistId && !item) {
      setSelectedWishlistId(wishlistId);
    }
  }, [wishlistId, item]);

  // Update currency when userCurrency loads (if in add mode and currency is still default)
  React.useEffect(() => {
    if (visible && !isEditMode && !prefillItem && !item && userCurrency && currency === "USD" && !isLoadingCurrency) {
      setCurrency(userCurrency);
    }
  }, [visible, userCurrency, isEditMode, prefillItem, item, currency, isLoadingCurrency]);

  const handleAdd = async () => {
    // Title validation is now handled by button disabled state
    // Only check wishlist selection for create mode
    if (!selectedWishlistId && !isEditMode) {
      Alert.alert("Error", "Please select a wishlist");
      return;
    }

    // Validate price if provided
    if (price.trim()) {
      const priceValue = parseFloat(price);
      if (isNaN(priceValue)) {
        Alert.alert("Error", "Please enter a valid price");
        return;
      }
      if (priceValue < 0) {
        Alert.alert("Error", "Price cannot be negative");
        return;
      }
      if (priceValue > 1000000) {
        Alert.alert("Error", "Price cannot exceed 1,000,000");
        return;
      }
    }

    // Validate quantity if provided
    if (quantity.trim()) {
      const quantityValue = parseInt(quantity, 10);
      if (isNaN(quantityValue)) {
        Alert.alert("Error", "Please enter a valid quantity");
        return;
      }
      if (quantityValue < 1) {
        Alert.alert("Error", "Quantity must be at least 1");
        return;
      }
      if (quantityValue > 10000) {
        Alert.alert("Error", "Quantity cannot exceed 10,000");
        return;
      }
    }

    setIsLoading(true);
    try {
      // Upload image if it's a local file
      let uploadedImageUrl: string | undefined = undefined;
      if (imageUri) {
        if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
          try {
            uploadedImageUrl = await uploadItemImage(imageUri);
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            Alert.alert(
              'Image Upload Failed',
              'Failed to upload image. The item will be saved without an image.',
              [{ text: 'OK' }]
            );
            // Continue without image
          }
        } else {
          // Already a remote URL
          uploadedImageUrl = imageUri;
        }
      }

      if (isEditMode && item) {
        // Update existing item - include wishlistId if it changed (to move item)
        const updatePayload: any = {
          id: item.id,
          title: title.trim(),
          // Backend expects empty string to clear URL (sets to null), undefined means don't change
          url: url.trim() || '',
          // Always send price and quantity - parse to number if provided, or null to clear
          price: price.trim() ? parseFloat(price) : null,
          currency,
          quantity: quantity.trim() ? parseInt(quantity, 10) : null,
          priority,
          // Include image URL if we have one (uploaded or existing)
          imageUrl: uploadedImageUrl || null,
        };
        
        // Always include wishlistId - if it changed, it will move the item
        // If it's the same, backend will just use it for cache invalidation
        if (selectedWishlistId) {
          updatePayload.wishlistId = selectedWishlistId;
        } else {
          updatePayload.wishlistId = item.wishlistId;
        }
        
        // Use React Query mutation hook for proper cache invalidation
        const updatedItem = await updateItem.mutateAsync(updatePayload);
        
        // If item was moved to a different wishlist, also invalidate the old wishlist cache
        if (selectedWishlistId && selectedWishlistId !== item.wishlistId) {
          queryClient.invalidateQueries({ queryKey: wishlistKeys.items(item.wishlistId) });
        }
        
        // Also invalidate wishlist detail cache to update item counts
        queryClient.invalidateQueries({ queryKey: wishlistKeys.detail(updatedItem.wishlistId) });
        queryClient.invalidateQueries({ queryKey: wishlistKeys.lists() });
        
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      } else {
        // Create new item
        const createPayload = {
          wishlistId: selectedWishlistId,
          title: title.trim(),
          url: url.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          currency,
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          priority,
          imageUrl: uploadedImageUrl,
        };

        // Use React Query mutation hook for proper cache invalidation
        await createItem.mutateAsync(createPayload);

        // Also invalidate wishlists list query to refresh the wishlists page with updated item counts
        queryClient.invalidateQueries({ queryKey: wishlistKeys.lists() });
        // Emit event to notify wishlists page to refresh (for pages using custom state management)
        wishlistEvents.emit();

        // Reset form
        setTitle("");
        setUrl("");
        setImageUri(null);
        setPrice("");
        setCurrency(userCurrency); // Use userCurrency directly (will be "USD" if not loaded yet)
        setQuantity("1");
        setPriority("NICE_TO_HAVE");
        
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }
    } catch (error: any) {
      console.error("Error saving item:", error);
      
      // Extract error message from backend response
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'add'} item`;
      
      if (error.response?.data) {
        const errorData = error.response.data;
        // Backend returns message as array or string
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(", ");
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate bottom padding - minimal padding for keyboard scrolling
  const bottomPadding = 0; // No extra padding - let content determine its own height

  return (
    <>
      <BottomSheet 
        visible={visible} 
        onClose={onClose} 
        snapPoints={['90%']}
        index={0}
        stackBehavior="switch" 
        keyboardBehavior="extend"
        scrollable={true}
      >
        {/* Header - Title with action button on right */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {isEditMode ? "Edit Item" : (customTitle || "Add Item")}
          </Text>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={isLoading || !title.trim() || (!isEditMode && !selectedWishlistId)}
            activeOpacity={0.6}
            style={styles.headerButton}
          >
            {isLoading ? (
              <ActivityIndicator 
                size="small" 
                color={theme.colors.textSecondary} 
              />
            ) : (
              <Text style={[
                styles.headerButtonText,
                {
                  color: (!title.trim() || (!isEditMode && !selectedWishlistId))
                    ? theme.colors.textSecondary
                    : theme.colors.primary,
                }
              ]}>
                {isEditMode ? "Save" : "Add"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Scrollable Content - Using BottomSheetScrollView with gorhom's built-in keyboard handling */}
        <BottomSheetScrollView 
            style={styles.content} 
            contentContainerStyle={[
              styles.contentContainer, 
              { 
                paddingBottom: bottomPadding,
              }
            ]}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            bounces={true}
          >
            {/* Image and Wishlist Row - Centered */}
            {!isEditMode && (
              <View style={styles.section}>
                <View style={styles.imageWishlistRow}>
                  {/* Image Upload - Square */}
                  <TouchableOpacity
                    style={[styles.imageContainer, {
                      backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                      borderColor: theme.colors.textSecondary + '40',
                    }]}
                    onPress={async () => {
                      try {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert("Permission needed", "Please grant camera roll permissions to upload images");
                          return;
                        }
                        
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.8,
                        });
                        
                        if (!result.canceled && result.assets[0]) {
                          setImageUri(result.assets[0].uri);
                        }
                      } catch (error) {
                        console.error("Error picking image:", error);
                        Alert.alert("Error", "Failed to pick image");
                      }
                    }}
                  >
                    {imageUri ? (
                      <View style={styles.imagePreview}>
                        <Image source={{ uri: imageUri }} style={styles.imagePreviewImage} />
                        <TouchableOpacity
                          onPress={() => setImageUri(null)}
                          style={[styles.removeImageButton, {
                            backgroundColor: theme.colors.error,
                          }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <Feather name="image" size={32} color={theme.colors.textSecondary} />
                        <View
                          style={[styles.imageChangeButton, {
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.background,
                          }]}
                        >
                          <Feather name="camera" size={14} color="#fff" />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Wishlist Selection - Pill Button */}
                  <View style={styles.wishlistSection}>
                    <Text style={[styles.wishlistLabel, { color: theme.colors.textSecondary }]}>
                      Wishlist
                    </Text>
                    <TouchableOpacity
                      style={[styles.wishlistPill, {
                        backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                        borderColor: theme.colors.textSecondary + '40',
                      }]}
                      onPress={() => setShowWishlistBottomSheet(true)}
                    >
                      <Text style={[styles.wishlistPillText, { color: theme.colors.textPrimary }]}>
                        {selectedWishlistId && wishlists?.length
                          ? (wishlists.find(w => w.id === selectedWishlistId)?.title || "Select wishlist")
                          : "Select wishlist"}
                      </Text>
                      <Feather 
                        name="chevron-right" 
                        size={16} 
                        color={theme.colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Image and Wishlist Row - Centered (Edit Mode) */}
            {isEditMode && (
              <View style={styles.section}>
                <View style={styles.imageWishlistRow}>
                  {/* Image Upload - Square */}
                  <TouchableOpacity
                    style={[styles.imageContainer, {
                      backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                      borderColor: theme.colors.textSecondary + '40',
                    }]}
                    onPress={async () => {
                      try {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert("Permission needed", "Please grant camera roll permissions to upload images");
                          return;
                        }
                        
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.8,
                        });
                        
                        if (!result.canceled && result.assets[0]) {
                          setImageUri(result.assets[0].uri);
                        }
                      } catch (error) {
                        console.error("Error picking image:", error);
                        Alert.alert("Error", "Failed to pick image");
                      }
                    }}
                  >
                    {imageUri ? (
                      <View style={styles.imagePreview}>
                        <Image source={{ uri: imageUri }} style={styles.imagePreviewImage} />
                        <TouchableOpacity
                          onPress={() => setImageUri(null)}
                          style={[styles.removeImageButton, {
                            backgroundColor: theme.colors.error,
                          }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <Feather name="image" size={32} color={theme.colors.textSecondary} />
                        <View
                          style={[styles.imageChangeButton, {
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.background,
                          }]}
                        >
                          <Feather name="camera" size={14} color="#fff" />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Wishlist Selection - Pill Button */}
                  <View style={styles.wishlistSection}>
                    <Text style={[styles.wishlistLabel, { color: theme.colors.textSecondary }]}>
                      Wishlist
                    </Text>
                    <TouchableOpacity
                      style={[styles.wishlistPill, {
                        backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                        borderColor: theme.colors.textSecondary + '40',
                      }]}
                      onPress={() => setShowWishlistBottomSheet(true)}
                    >
                      <Text style={[styles.wishlistPillText, { color: theme.colors.textPrimary }]}>
                        {selectedWishlistId && wishlists?.length
                          ? (wishlists.find(w => w.id === selectedWishlistId)?.title || "Select wishlist")
                          : "Select wishlist"}
                      </Text>
                      <Feather 
                        name="chevron-right" 
                        size={16} 
                        color={theme.colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Title - Centered with underline */}
            <View style={styles.titleSection}>
              <BottomSheetTextInput
                style={[
                  styles.titleInput,
                  {
                    color: title ? theme.colors.textPrimary : theme.colors.textSecondary,
                    borderBottomColor: theme.colors.textSecondary + '40',
                    fontSize: 24,
                    fontWeight: title ? "600" : "500",
                  },
                ]}
                placeholder="Name of item"
                placeholderTextColor={theme.colors.textSecondary + '60'}
                value={title}
                onChangeText={setTitle}
                textAlign="center"
              />
            </View>

            {/* URL Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Product URL
              </Text>
              <BottomSheetTextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                    borderColor: theme.colors.textSecondary + '40',
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="https://example.com/product"
                placeholderTextColor={theme.colors.textSecondary + '80'}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
            </View>

            {/* Price & Quantity */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Price & Quantity
              </Text>
              <View style={styles.row}>
                <View style={styles.priceContainer}>
                  <BottomSheetTextInput
                    style={[
                      styles.input,
                      styles.priceInput,
                      {
                        backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                        borderColor: theme.colors.textSecondary + '40',
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSecondary + '80'}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.currencyLabel, { color: theme.colors.textSecondary }]}>
                    {getCurrencyByCode(currency)?.symbol || currency}
                  </Text>
                </View>

                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      {
                        backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                        borderColor: theme.colors.textSecondary + '40',
                      },
                    ]}
                    onPress={() => {
                      const currentQty = parseInt(quantity) || 1;
                      if (currentQty > 1) {
                        setQuantity((currentQty - 1).toString());
                      }
                    }}
                  >
                    <Feather
                      name="minus"
                      size={18}
                      color={theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <BottomSheetTextInput
                    style={[
                      styles.input,
                      styles.quantityInput,
                      {
                        backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                        borderColor: theme.colors.textSecondary + '40',
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholder="1"
                    placeholderTextColor={theme.colors.textSecondary + '80'}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      {
                        backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                        borderColor: theme.colors.textSecondary + '40',
                      },
                    ]}
                    onPress={() => {
                      const currentQty = parseInt(quantity) || 1;
                      setQuantity((currentQty + 1).toString());
                    }}
                  >
                    <Feather
                      name="plus"
                      size={18}
                      color={theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Priority - Horizontal */}
            <View style={styles.lastSection}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Priority
              </Text>
              <View style={styles.priorityRow}>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    {
                      borderColor: priority === "MUST_HAVE" 
                        ? theme.colors.primary 
                        : theme.colors.textSecondary + '40',
                      backgroundColor: priority === "MUST_HAVE"
                        ? (theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15')
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setPriority("MUST_HAVE")}
                >
                  <Feather
                    name="star"
                    size={20}
                    color={priority === "MUST_HAVE" ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[
                    styles.priorityButtonText, 
                    { 
                      color: priority === "MUST_HAVE" 
                        ? theme.colors.primary 
                        : theme.colors.textPrimary 
                    }
                  ]}>
                    Must Have
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    {
                      borderColor: priority === "NICE_TO_HAVE" 
                        ? theme.colors.primary 
                        : theme.colors.textSecondary + '40',
                      backgroundColor: priority === "NICE_TO_HAVE"
                        ? (theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15')
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setPriority("NICE_TO_HAVE")}
                >
                  <Feather
                    name="star"
                    size={20}
                    color={priority === "NICE_TO_HAVE" ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[
                    styles.priorityButtonText, 
                    { 
                      color: priority === "NICE_TO_HAVE" 
                        ? theme.colors.primary 
                        : theme.colors.textPrimary 
                    }
                  ]}>
                    Nice to Have
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BottomSheetScrollView>
      </BottomSheet>

      {/* Wishlist Selection Sheet */}
      <SelectWishlistSheet
        visible={showWishlistBottomSheet}
        onClose={() => setShowWishlistBottomSheet(false)}
        onSelect={(wishlistId) => {
          setSelectedWishlistId(wishlistId);
          setShowWishlistBottomSheet(false);
        }}
        emptyMessage="No wishlists available"
      />
    </>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  headerButton: {
    position: "absolute",
    right: 20,
    top: 0,
    bottom: 16,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 8,
    // paddingBottom is set dynamically via inline style
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
    overflow: "visible",
  },
  lastSection: {
    marginBottom: 0, // No bottom margin for last section
    paddingHorizontal: 20,
    overflow: "visible",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  imageWishlistRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  wishlistSection: {
    width: 160,
    position: "relative",
  },
  wishlistLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  wishlistPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
  },
  wishlistPillText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  imagePreviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  imageChangeButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    marginBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  titleInput: {
    width: "100%",
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    fontSize: 24,
    fontWeight: "400",
    minHeight: 40,
    textAlign: "center",
  },
  urlInputContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  parseButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  parseButtonDisabled: {
    opacity: 0.6,
  },
  parseButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 0,
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  priceContainer: {
    width: 185,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  priceInput: {
    width: "100%",
    paddingRight: 50,
  },
  currencyLabel: {
    position: "absolute",
    right: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityInput: {
    width: 80,
    textAlign: "center",
  },
  quantityButton: {
    width: 40,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 0, // Spacing above button - uses padding so background covers it
    paddingBottom: 30, // Extra padding to ensure background covers bottomInset space
    backgroundColor: "transparent", // Will be overridden by inline style
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    width: "100%",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
