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
} from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import type { Priority } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { itemsService } from "@/services/api";
import { useWishlists } from "@/hooks/useWishlists";

interface AddItemSheetProps {
  visible: boolean;
  onClose: () => void;
  wishlistId?: string;
}

export function AddItemSheet({ visible, onClose, wishlistId }: AddItemSheetProps) {
  const { theme } = useTheme();
  const { wishlists } = useWishlists();
  
  const [selectedWishlistId, setSelectedWishlistId] = useState(wishlistId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>("NICE_TO_HAVE");
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  React.useEffect(() => {
    if (wishlistId) {
      setSelectedWishlistId(wishlistId);
    }
  }, [wishlistId]);

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
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an item title");
      return;
    }

    if (!selectedWishlistId) {
      Alert.alert("Error", "Please select a wishlist");
      return;
    }

    setIsLoading(true);
    try {
      await itemsService.createItem(selectedWishlistId, {
        title: title.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        currency,
        category: category.trim() || undefined,
        priority,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setUrl("");
      setPrice("");
      setCurrency("USD");
      setCategory("");
      setPriority("NICE_TO_HAVE");
      
      // Close the sheet
      onClose();
      
      Alert.alert("Success", "Item added successfully!");
    } catch (error: any) {
      console.error("Error adding item:", error);
      Alert.alert("Error", error.message || "Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTitle("");
    setDescription("");
    setUrl("");
    setPrice("");
    setCurrency("USD");
    setCategory("");
    setPriority("NICE_TO_HAVE");
    if (!wishlistId) {
      setSelectedWishlistId("");
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
              Add Item
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
          >
            {/* Wishlist Selection (if no wishlistId provided) */}
            {!wishlistId && (
              <View style={styles.section}>
                <View style={styles.sectionContent}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                    Wishlist
                  </Text>
                  <View style={[styles.selectContainer, {
                    backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                    borderColor: theme.colors.textSecondary + '40',
                  }]}>
                    <Text style={[styles.selectText, { color: theme.colors.textPrimary }]}>
                      {selectedWishlistId 
                        ? wishlists.find(w => w.id === selectedWishlistId)?.title || "Select wishlist"
                        : "Select wishlist"}
                    </Text>
                    <Feather name="chevron-down" size={20} color={theme.colors.textSecondary} />
                  </View>
                </View>
              </View>
            )}

            {/* URL Input */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Product URL
                </Text>
                <View style={styles.urlInputContainer}>
                  <TextInput
                    style={[
                      styles.urlInput,
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
                  <TouchableOpacity
                    style={[
                      styles.parseButton,
                      {
                        backgroundColor: theme.colors.primary,
                      },
                      isParsing && styles.parseButtonDisabled,
                    ]}
                    onPress={handleParseUrl}
                    disabled={isParsing}
                  >
                    {isParsing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Feather name="zap" size={18} color="#fff" />
                        <Text style={styles.parseButtonText}>Parse</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Item Details
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                    Title <Text style={{ color: theme.colors.error }}>*</Text>
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
                    placeholder="e.g., Wireless Headphones"
                    placeholderTextColor={theme.colors.textSecondary + '80'}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View style={styles.inputGroup}>
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

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                      Price
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
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textSecondary + '80'}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.currencyInput]}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                      Currency
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
                      placeholder="USD"
                      placeholderTextColor={theme.colors.textSecondary + '80'}
                      value={currency}
                      onChangeText={setCurrency}
                      autoCapitalize="characters"
                      maxLength={3}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                    Category
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
                    placeholder="e.g., Electronics, Books"
                    placeholderTextColor={theme.colors.textSecondary + '80'}
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>
              </View>
            </View>

            {/* Priority */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Priority
                </Text>

                <TouchableOpacity
                  style={[
                    styles.priorityOption,
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
                  <View style={styles.priorityOptionLeft}>
                    <Feather
                      name="star"
                      size={24}
                      color={priority === "MUST_HAVE" ? "#EF4444" : theme.colors.textSecondary}
                    />
                    <View style={styles.priorityOptionText}>
                      <Text style={[styles.priorityOptionTitle, { color: theme.colors.textPrimary }]}>
                        Must Have
                      </Text>
                      <Text style={[styles.priorityOptionDescription, { color: theme.colors.textSecondary }]}>
                        This is a top priority item
                      </Text>
                    </View>
                  </View>
                  {priority === "MUST_HAVE" && (
                    <Feather name="check-circle" size={24} color="#EF4444" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.priorityOption,
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
                  <View style={styles.priorityOptionLeft}>
                    <Feather
                      name="star"
                      size={24}
                      color={priority === "NICE_TO_HAVE" ? "#4A90E2" : theme.colors.textSecondary}
                    />
                    <View style={styles.priorityOptionText}>
                      <Text style={[styles.priorityOptionTitle, { color: theme.colors.textPrimary }]}>
                        Nice to Have
                      </Text>
                      <Text style={[styles.priorityOptionDescription, { color: theme.colors.textSecondary }]}>
                        Would be nice but not essential
                      </Text>
                    </View>
                  </View>
                  {priority === "NICE_TO_HAVE" && (
                    <Feather name="check-circle" size={24} color="#4A90E2" />
                  )}
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
              disabled={isLoading || !title.trim() || !selectedWishlistId}
              style={[
                styles.addButton,
                {
                  backgroundColor: (!title.trim() || isLoading || !selectedWishlistId) 
                    ? theme.colors.textSecondary + '40'
                    : theme.colors.primary,
                  opacity: (!title.trim() || isLoading || !selectedWishlistId) ? 0.6 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Add Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
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
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  section: {
    marginBottom: 16,
  },
  sectionContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectText: {
    fontSize: 16,
  },
  urlInputContainer: {
    flexDirection: "row",
    gap: 8,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  currencyInput: {
    width: 100,
  },
  priorityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  priorityOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priorityOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  priorityOptionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  priorityOptionDescription: {
    fontSize: 12,
  },
  bottomButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
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
});
