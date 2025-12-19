import { useState, useEffect } from "react";
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
import type { PrivacyLevel, Wishlist } from "@/types";
import { useUpdateWishlist } from "@/hooks/useWishlists";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { ThemedSwitch } from "./ThemedSwitch";

interface EditWishlistSheetProps {
  visible: boolean;
  onClose: () => void;
  wishlist: Wishlist | null;
  onSuccess?: () => void;
}

export function EditWishlistSheet({ visible, onClose, wishlist, onSuccess }: EditWishlistSheetProps) {
  const { theme } = useTheme();
  const updateWishlist = useUpdateWishlist();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("PRIVATE");
  const [allowComments, setAllowComments] = useState(true);
  const [allowReservations, setAllowReservations] = useState(true);
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  // Load wishlist data when it becomes available
  useEffect(() => {
    if (wishlist && visible) {
      setTitle(wishlist.title || "");
      setDescription(wishlist.description || "");
      setPrivacyLevel(wishlist.privacyLevel);
      setAllowComments(wishlist.allowComments ?? true);
      setAllowReservations(wishlist.allowReservations ?? true);
    }
  }, [wishlist, visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a wishlist title");
      return;
    }

    if (!wishlist?.id) {
      Alert.alert("Error", "Invalid wishlist ID");
      return;
    }

    updateWishlist.mutate(
      {
        id: wishlist.id,
        title: title.trim(),
        description: description.trim() || undefined,
        privacyLevel,
        allowComments,
        allowReservations,
      },
      {
        onSuccess: () => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: (error: any) => {
          console.error("❌ Error updating wishlist:", error);
          const errorMessage = error.response?.data?.message 
            || error.message 
            || "Failed to update wishlist. Please try again.";
          Alert.alert("Error", errorMessage);
        },
      }
    );
  };

  const handleClose = () => {
    // Reset to original values when closing without saving
    if (wishlist) {
      setTitle(wishlist.title || "");
      setDescription(wishlist.description || "");
      setPrivacyLevel(wishlist.privacyLevel);
      setAllowComments(wishlist.allowComments ?? true);
      setAllowReservations(wishlist.allowReservations ?? true);
    }
    onClose();
  };

  const isLoading = updateWishlist.isPending;

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Edit Wishlist
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isLoading}
            >
              <Feather 
                name="x" 
                size={24} 
                color={isLoading ? theme.colors.textSecondary : theme.colors.textPrimary} 
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Wishlist Image */}
            <View style={styles.imageContainer}>
              <View style={[styles.imageWrapper, { 
                backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                borderColor: theme.colors.textSecondary + '40',
              }]}>
                <Feather name="image" size={48} color={theme.colors.textSecondary} />
                <TouchableOpacity 
                  style={[styles.imageChangeButton, { 
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.background,
                  }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="camera" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Title Input - Centered */}
            <View style={styles.titleContainer}>
              <TextInput
                style={[
                  styles.titleInput,
                  {
                    color: theme.colors.textPrimary,
                    borderBottomColor: isTitleFocused 
                      ? theme.colors.textPrimary 
                      : theme.colors.textSecondary + '40',
                  },
                ]}
                placeholder="Title of wishlist"
                placeholderTextColor={theme.colors.textSecondary + '80'}
                value={title}
                onChangeText={setTitle}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
                editable={!isLoading}
              />
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
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
                  placeholder="Add a description..."
                  placeholderTextColor={theme.colors.textSecondary + '80'}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Privacy Settings - Horizontal Row */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Privacy</Text>
                <View style={styles.privacyRow}>
                  <TouchableOpacity
                    style={[
                      styles.privacyOptionHorizontal,
                      {
                        borderColor: privacyLevel === "PRIVATE" 
                          ? theme.colors.primary 
                          : theme.colors.textSecondary + '40',
                        backgroundColor: privacyLevel === "PRIVATE"
                          ? (theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15')
                          : 'transparent',
                        opacity: isLoading ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => !isLoading && setPrivacyLevel("PRIVATE")}
                    disabled={isLoading}
                  >
                    <Feather
                      name="lock"
                      size={20}
                      color={privacyLevel === "PRIVATE" ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.privacyOptionTitleHorizontal, { 
                      color: privacyLevel === "PRIVATE" ? theme.colors.primary : theme.colors.textPrimary 
                    }]}>
                      Private
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.privacyOptionHorizontal,
                      {
                        borderColor: privacyLevel === "FRIENDS_ONLY" 
                          ? theme.colors.primary 
                          : theme.colors.textSecondary + '40',
                        backgroundColor: privacyLevel === "FRIENDS_ONLY"
                          ? (theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15')
                          : 'transparent',
                        opacity: isLoading ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => !isLoading && setPrivacyLevel("FRIENDS_ONLY")}
                    disabled={isLoading}
                  >
                    <Feather
                      name="users"
                      size={20}
                      color={privacyLevel === "FRIENDS_ONLY" ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.privacyOptionTitleHorizontal, { 
                      color: privacyLevel === "FRIENDS_ONLY" ? theme.colors.primary : theme.colors.textPrimary 
                    }]}>
                      Friends
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.privacyOptionHorizontal,
                      {
                        borderColor: privacyLevel === "PUBLIC" 
                          ? theme.colors.primary 
                          : theme.colors.textSecondary + '40',
                        backgroundColor: privacyLevel === "PUBLIC"
                          ? (theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15')
                          : 'transparent',
                        opacity: isLoading ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => !isLoading && setPrivacyLevel("PUBLIC")}
                    disabled={isLoading}
                  >
                    <Feather
                      name="globe"
                      size={20}
                      color={privacyLevel === "PUBLIC" ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.privacyOptionTitleHorizontal, { 
                      color: privacyLevel === "PUBLIC" ? theme.colors.primary : theme.colors.textPrimary 
                    }]}>
                      Public
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Share With Section */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Share with</Text>
                <TouchableOpacity
                  style={[
                    styles.addPersonButton,
                    {
                      backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                      borderColor: theme.colors.textSecondary + '40',
                      opacity: isLoading ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => {
                    // TODO: Implement add person functionality
                    console.log("Add person pressed");
                  }}
                  disabled={isLoading}
                >
                  <Feather name="plus" size={20} color={theme.colors.primary} />
                  <Text style={[styles.addPersonText, { color: theme.colors.primary }]}>
                    Add person
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Additional Settings */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Settings</Text>

                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Feather name="message-circle" size={24} color={theme.colors.primary} />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                        Allow Comments
                      </Text>
                      <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                        Let others comment on items
                      </Text>
                    </View>
                  </View>
                  <ThemedSwitch 
                    value={allowComments} 
                    onValueChange={setAllowComments}
                    disabled={isLoading}
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '40' }]} />

                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Feather name="bookmark" size={24} color={theme.colors.primary} />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                        Allow Reservations
                      </Text>
                      <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                        Let others reserve items
                      </Text>
                    </View>
                  </View>
                  <ThemedSwitch 
                    value={allowReservations} 
                    onValueChange={setAllowReservations}
                    disabled={isLoading}
                  />
                </View>
              </View>
            </View>

            {/* Bottom spacing for button */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Fixed Bottom Button */}
          <View style={[styles.bottomButtonContainer, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading || !title.trim()}
              style={[
                styles.saveButton,
                {
                  backgroundColor: (!title.trim() || isLoading) 
                    ? theme.colors.textSecondary + '40'
                    : theme.colors.primary,
                  opacity: (!title.trim() || isLoading) ? 0.6 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
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
  imageContainer: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: -4,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  imageChangeButton: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  titleInput: {
    width: "100%",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    borderBottomWidth: 1,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 0,
  },
  sectionContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
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
  privacyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  privacyOptionHorizontal: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  privacyOptionTitleHorizontal: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  addPersonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  addPersonText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
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
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
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
  saveButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});




