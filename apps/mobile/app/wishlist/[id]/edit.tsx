import { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import type { PrivacyLevel } from "@/types";
import { useWishlist, useUpdateWishlist } from "@/hooks/useWishlists";
import { useTheme } from "@/contexts/ThemeContext";
import { getHeaderOptions } from "@/lib/navigation";

export default function EditWishlistScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: wishlist, isLoading: isLoadingWishlist } = useWishlist(id as string);
  const updateWishlist = useUpdateWishlist();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("PRIVATE");
  const [allowComments, setAllowComments] = useState(true);
  const [allowReservations, setAllowReservations] = useState(true);

  // Configure native header
  useLayoutEffect(() => {
    navigation.setOptions(
      getHeaderOptions(theme, {
        title: "Edit Wishlist",
        headerRight: () => (
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateWishlist.isPending || !title.trim()}
            style={[
              styles.saveButton,
              {
                backgroundColor: theme.colors.surface,
                opacity: (!title.trim() || updateWishlist.isPending) ? 0.5 : 1,
              },
            ]}
          >
            {updateWishlist.isPending ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        ),
      })
    );
  }, [navigation, theme, updateWishlist.isPending, title]);

  useEffect(() => {
    if (wishlist) {
      setTitle(wishlist.title || "");
      setDescription(wishlist.description || "");
      setPrivacyLevel(wishlist.privacyLevel);
      setAllowComments(wishlist.allowComments ?? true);
      setAllowReservations(wishlist.allowReservations ?? true);
    }
  }, [wishlist]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a wishlist title");
      return;
    }

    if (!id) {
      Alert.alert("Error", "Invalid wishlist ID");
      return;
    }

    updateWishlist.mutate(
      {
        id: id as string,
        title: title.trim(),
        description: description.trim() || undefined,
        privacyLevel,
        allowComments,
        allowReservations,
      },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  };

  if (isLoadingWishlist) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading wishlist...</Text>
      </View>
    );
  }

  if (!wishlist) {
    return (
      <View style={styles.loadingContainer}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.loadingText}>Wishlist not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Basic Info */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Birthday 2025"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </Card>

        {/* Privacy Settings */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Privacy</Text>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                privacyLevel === "PRIVATE" && styles.privacyOptionActive,
              ]}
              onPress={() => setPrivacyLevel("PRIVATE")}
            >
              <View style={styles.privacyOptionLeft}>
                <Feather
                  name="lock"
                  size={24}
                  color={privacyLevel === "PRIVATE" ? "#4A90E2" : "#8E8E93"}
                />
                <View style={styles.privacyOptionText}>
                  <Text style={styles.privacyOptionTitle}>Private</Text>
                  <Text style={styles.privacyOptionDescription}>Only you can see this</Text>
                </View>
              </View>
              {privacyLevel === "PRIVATE" && (
                <Feather name="check-circle" size={24} color="#4A90E2" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                privacyLevel === "FRIENDS_ONLY" && styles.privacyOptionActive,
              ]}
              onPress={() => setPrivacyLevel("FRIENDS_ONLY")}
            >
              <View style={styles.privacyOptionLeft}>
                <Feather
                  name="users"
                  size={24}
                  color={privacyLevel === "FRIENDS_ONLY" ? "#4A90E2" : "#8E8E93"}
                />
                <View style={styles.privacyOptionText}>
                  <Text style={styles.privacyOptionTitle}>Friends Only</Text>
                  <Text style={styles.privacyOptionDescription}>Only friends can see this</Text>
                </View>
              </View>
              {privacyLevel === "FRIENDS_ONLY" && (
                <Feather name="check-circle" size={24} color="#4A90E2" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                privacyLevel === "PUBLIC" && styles.privacyOptionActive,
              ]}
              onPress={() => setPrivacyLevel("PUBLIC")}
            >
              <View style={styles.privacyOptionLeft}>
                <Feather
                  name="globe"
                  size={24}
                  color={privacyLevel === "PUBLIC" ? "#4A90E2" : "#8E8E93"}
                />
                <View style={styles.privacyOptionText}>
                  <Text style={styles.privacyOptionTitle}>Public</Text>
                  <Text style={styles.privacyOptionDescription}>Anyone can see this</Text>
                </View>
              </View>
              {privacyLevel === "PUBLIC" && (
                <Feather name="check-circle" size={24} color="#4A90E2" />
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Additional Settings */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="message-circle" size={24} color="#4A90E2" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Allow Comments</Text>
                  <Text style={styles.settingDescription}>Let others comment on items</Text>
                </View>
              </View>
              <Switch value={allowComments} onValueChange={setAllowComments} />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="bookmark" size={24} color="#4A90E2" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Allow Reservations</Text>
                  <Text style={styles.settingDescription}>Let others reserve items</Text>
                </View>
              </View>
              <Switch value={allowReservations} onValueChange={setAllowReservations} />
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5F5F7",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#4A90E2",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  privacyOptionActive: {
    borderColor: "#4A90E2",
    backgroundColor: "#EFF6FF",
  },
  privacyOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  privacyOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  privacyOptionDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
});

