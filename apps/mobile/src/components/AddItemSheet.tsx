import { useState } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
} from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import type { Priority, Item } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { wishlistsService } from "@/services/wishlists";
import { useWishlists } from "@/hooks/useWishlists";

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
  const { data: wishlists = [] } = useWishlists();
  const isEditMode = !!item;
  
  const [selectedWishlistId, setSelectedWishlistId] = useState(wishlistId || "");
  const [showWishlistBottomSheet, setShowWishlistBottomSheet] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [quantity, setQuantity] = useState("1");
  const [priority, setPriority] = useState<Priority>("NICE_TO_HAVE");
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // Initialize form with item data when editing
  React.useEffect(() => {
    if (visible && item) {
      // Edit mode - prefill with item data when modal becomes visible
      setTitle(item.title || "");
      setDescription(item.description || "");
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
      setDescription(prefillItem.description || "");
      setUrl(prefillItem.url || "");
      setPrice(prefillItem.price !== undefined && prefillItem.price !== null ? prefillItem.price.toString() : "");
      setCurrency(prefillItem.currency || "USD");
      setQuantity(prefillItem.quantity !== undefined && prefillItem.quantity !== null ? prefillItem.quantity.toString() : "1");
      setPriority(prefillItem.priority || "NICE_TO_HAVE");
    } else if (!visible && !item && !prefillItem) {
      // Reset form when modal closes (only if not in edit/prefill mode)
      setTitle("");
      setDescription("");
      setUrl("");
      setImageUri(null);
      setPrice("");
      setCurrency("USD");
      setQuantity("1");
      setPriority("NICE_TO_HAVE");
    }
  }, [visible, item, prefillItem, wishlistId]);
  
  React.useEffect(() => {
    if (wishlistId && !item) {
      setSelectedWishlistId(wishlistId);
    }
  }, [wishlistId, item]);

  const handleParseUrl = async () => {
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a URL first");
      return;
    }

    setIsParsing(true);
    try {
      // TODO: Call API to parse URL and extract product info
      Alert.alert("Info", "URL parsing will be implemented with the backend");
    } catch (error) {
      Alert.alert("Error", "Failed to parse URL");
    } finally {
      setIsParsing(false);
    }
  };

  const handleAdd = async () => {
    if (!title.trim() && !isEditMode) {
      Alert.alert("Error", "Please enter an item title");
      return;
    }

    if (!selectedWishlistId && !isEditMode) {
      Alert.alert("Error", "Please select a wishlist");
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode && item) {
        // Update existing item - include wishlistId if it changed (to move item)
        const updatePayload: any = {
          id: item.id,
          title: title.trim(),
          description: description.trim() || undefined,
          url: url.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          currency,
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          priority,
        };
        
        // Always include wishlistId - if it changed, it will move the item
        // If it's the same, backend will just use it for cache invalidation
        if (selectedWishlistId) {
          updatePayload.wishlistId = selectedWishlistId;
        } else {
          updatePayload.wishlistId = item.wishlistId;
        }
        
        await wishlistsService.updateItem(updatePayload);
        
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
        
        Alert.alert("Success", "Item updated successfully!");
      } else {
        // Create new item
        await wishlistsService.createItem({
          wishlistId: selectedWishlistId,
          title: title.trim(),
          description: description.trim() || undefined,
          url: url.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          currency,
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          priority,
        });

        // Reset form
        setTitle("");
        setDescription("");
        setUrl("");
        setImageUri(null);
        setPrice("");
        setCurrency("USD");
        setQuantity("1");
        setPriority("NICE_TO_HAVE");
        
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
        
        Alert.alert("Success", "Item added successfully!");
      }
    } catch (error: any) {
      console.error("Error saving item:", error);
      Alert.alert("Error", error.message || `Failed to ${isEditMode ? 'update' : 'add'} item`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing only if not in edit mode
    if (!isEditMode) {
      setTitle("");
      setDescription("");
      setUrl("");
      setImageUri(null);
      setPrice("");
        setCurrency("USD");
        setQuantity("1");
        setPriority("NICE_TO_HAVE");
        setShowWishlistBottomSheet(false);
      if (!wishlistId) {
        setSelectedWishlistId("");
      }
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              {isEditMode ? "Edit Item" : (customTitle || "Add Item")}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
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
                        <TouchableOpacity
                          style={[styles.imageChangeButton, {
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.background,
                          }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="camera" size={14} color="#fff" />
                        </TouchableOpacity>
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
                        <TouchableOpacity
                          style={[styles.imageChangeButton, {
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.background,
                          }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="camera" size={14} color="#fff" />
                        </TouchableOpacity>
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
              <TextInput
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
              <TextInput
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

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                    borderColor: theme.colors.textSecondary + '40',
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Add details about the item..."
                placeholderTextColor={theme.colors.textSecondary + '80'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Price & Quantity */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Price & Quantity
              </Text>
              <View style={styles.row}>
                <View style={styles.priceContainer}>
                  <TextInput
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
                    {currency}
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
                  <TextInput
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
            <View style={styles.section}>
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

            {/* Bottom spacing for button */}
            <View style={{ height: 100 }} />
          </ScrollView>


          {/* Fixed Bottom Button */}
          <View style={[styles.bottomButtonContainer, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={isLoading || (!isEditMode && (!title.trim() || !selectedWishlistId))}
              style={[
                styles.addButton,
                {
                  backgroundColor: (!isEditMode && (!title.trim() || !selectedWishlistId)) || isLoading
                    ? theme.colors.textSecondary + '40'
                    : theme.colors.primary,
                  opacity: (!isEditMode && (!title.trim() || !selectedWishlistId)) || isLoading ? 0.6 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>
                  {isEditMode ? "Save Changes" : "Add Item"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Wishlist Selection Bottom Sheet */}
      <BottomSheet 
          visible={showWishlistBottomSheet} 
          onClose={() => setShowWishlistBottomSheet(false)}
        >
          <View style={[styles.wishlistBottomSheetContainer, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.wishlistBottomSheetHeader}>
              <View style={styles.headerSpacer} />
              <Text style={[styles.wishlistBottomSheetTitle, { color: theme.colors.textPrimary }]}>
                Select Wishlist
              </Text>
              <TouchableOpacity
                onPress={() => setShowWishlistBottomSheet(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Wishlist List */}
            <FlatList
              data={wishlists}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.wishlistOptionRow, { 
                    borderBottomColor: theme.colors.textSecondary + '20',
                    backgroundColor: selectedWishlistId === item.id 
                      ? theme.colors.primary + '10' 
                      : 'transparent',
                  }]}
                  onPress={() => {
                    setSelectedWishlistId(item.id);
                    setShowWishlistBottomSheet(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text 
                    style={[styles.wishlistOptionText, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {selectedWishlistId === item.id ? (
                    <Feather
                      name="check"
                      size={20}
                      color={theme.colors.primary}
                    />
                  ) : (
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmptyState}>
                  <Text style={[styles.modalEmptyText, { color: theme.colors.textSecondary }]}>
                    No wishlists available
                  </Text>
                </View>
              }
            />
          </View>
        </BottomSheet>
    </BottomSheet>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: "relative",
  },
  headerTitle: {
    fontSize: 16,
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
  content: {
    flex: 1,
    overflow: "visible",
  },
  contentContainer: {
    paddingBottom: 0,
    paddingTop: 8,
    overflow: "visible",
  },
  section: {
    marginBottom: 28,
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
    fontSize: 16,
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
  bottomButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  addButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  wishlistBottomSheetContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  wishlistBottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    position: "relative",
  },
  wishlistBottomSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
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
    flex: 1,
    marginRight: 12,
  },
  modalEmptyState: {
    padding: 24,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
  },
});
