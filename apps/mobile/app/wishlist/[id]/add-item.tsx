import { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import type { Priority } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { getCurrencyByCode } from "@/utils/currencies";
import { getHeaderOptions } from "@/lib/navigation";

export default function AddItemScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { userCurrency } = useUserCurrency();
  const { id: wishlistId } = useLocalSearchParams<{ id: string }>();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD"); // Initialize with USD, will be updated when userCurrency loads
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>("NICE_TO_HAVE");
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Configure native header
  useLayoutEffect(() => {
    navigation.setOptions(
      getHeaderOptions(theme, {
        title: "Add Item",
        headerRight: () => (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading || !title.trim() || !url.trim()}
            style={[
              styles.saveButton,
              {
                backgroundColor: theme.colors.surface,
                opacity: (isLoading || !title.trim() || !url.trim()) ? 0.5 : 1,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>Add</Text>
            )}
          </TouchableOpacity>
        ),
      })
    );
  }, [navigation, theme, isLoading, title, url]);

  // Update currency when userCurrency loads (if form is empty and currency is still default)
  useEffect(() => {
    if (userCurrency && userCurrency !== "USD" && currency === "USD" && !title && !price) {
      setCurrency(userCurrency);
    }
  }, [userCurrency, currency, title, price]);

  const handleParseUrl = async () => {
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a URL first");
      return;
    }

    setIsParsing(true);
    try {
      // TODO: Call API to parse URL and extract product info
      // const response = await api.parseProductUrl(url);
      // setTitle(response.title);
      // setDescription(response.description);
      // setPrice(response.price?.toString() || "");
      // setImageUrl(response.imageUrl);
      
      Alert.alert("Info", "URL parsing will be implemented with the backend");
    } catch (error) {
      Alert.alert("Error", "Failed to parse URL");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an item title");
      return;
    }

    if (!url.trim()) {
      Alert.alert("Error", "Please enter a product URL");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to create item with wishlistId
      // const response = await api.createItem({
      //   wishlistId: wishlistId,
      //   title,
      //   description,
      //   url,
      //   price: price ? parseFloat(price) : undefined,
      //   currency,
      //   category,
      console.log("Creating item for wishlist:", wishlistId);
      //   priority,
      // });
      
      Alert.alert("Success", "Item added!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* URL Input */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Product URL</Text>

            <View style={styles.urlInputContainer}>
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/product"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.parseButton, isParsing && styles.parseButtonDisabled]}
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
            <Text style={styles.helpText}>
              Paste a link and tap Parse to automatically extract product details
            </Text>
          </View>
        </Card>

        {/* Basic Info */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Item Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Wireless Headphones"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add details about the item..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Price</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.currencyInput]}>
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  style={styles.input}
                  placeholder={userCurrency || "USD"}
                  value={currency}
                  onChangeText={setCurrency}
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Electronics, Books"
                value={category}
                onChangeText={setCategory}
              />
            </View>
          </View>
        </Card>

        {/* Priority */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Priority</Text>

            <TouchableOpacity
              style={[
                styles.priorityOption,
                priority === "MUST_HAVE" && styles.priorityOptionActive,
              ]}
              onPress={() => setPriority("MUST_HAVE")}
            >
              <View style={styles.priorityOptionLeft}>
                <Feather
                  name="star"
                  size={24}
                  color={priority === "MUST_HAVE" ? "#EF4444" : "#8E8E93"}
                />
                <View style={styles.priorityOptionText}>
                  <Text style={styles.priorityOptionTitle}>Must Have</Text>
                  <Text style={styles.priorityOptionDescription}>
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
                priority === "NICE_TO_HAVE" && styles.priorityOptionActive,
              ]}
              onPress={() => setPriority("NICE_TO_HAVE")}
            >
              <View style={styles.priorityOptionLeft}>
                <Feather
                  name="star"
                  size={24}
                  color={priority === "NICE_TO_HAVE" ? "#4A90E2" : "#8E8E93"}
                />
                <View style={styles.priorityOptionText}>
                  <Text style={styles.priorityOptionTitle}>Nice to Have</Text>
                  <Text style={styles.priorityOptionDescription}>
                    Would be nice but not essential
                  </Text>
                </View>
              </View>
              {priority === "NICE_TO_HAVE" && (
                <Feather name="check-circle" size={24} color="#4A90E2" />
              )}
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
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
    color: "#1F2937",
    marginBottom: 16,
  },
  urlInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
  },
  parseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
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
  },
  helpText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1F2937",
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
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  priorityOptionActive: {
    borderColor: "#4A90E2",
    backgroundColor: "#EFF6FF",
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
    color: "#1F2937",
    marginBottom: 2,
  },
  priorityOptionDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
});

