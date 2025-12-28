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
  FlatList,
} from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { wishlistsService } from "@/services/wishlists";
import { friendsService, type User as FriendUser } from "@/services/friends";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { wishlistEvents } from "@/utils/wishlistEvents";
import { ThemedSwitch } from "./ThemedSwitch";
import { getDisplayName } from "@/lib/utils";

interface CreateGroupGiftSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTitle?: string;
  initialFriendId?: string; // Pre-select a friend if creating from their profile
}

export function CreateGroupGiftSheet({ 
  visible, 
  onClose, 
  onSuccess, 
  initialTitle,
  initialFriendId 
}: CreateGroupGiftSheetProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowReservations, setAllowReservations] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [showFriendSelectionModal, setShowFriendSelectionModal] = useState(false);

  // Load friends when sheet opens
  useEffect(() => {
    if (visible) {
      loadFriends();
      // Pre-select friend if provided
      if (initialFriendId) {
        setSelectedFriends(new Set([initialFriendId]));
      }
    }
  }, [visible, initialFriendId]);

  // Pre-fill title when modal opens with initialTitle prop
  useEffect(() => {
    if (visible && initialTitle) {
      setTitle(initialTitle);
    } else if (visible && !initialTitle) {
      setTitle("");
    }
  }, [visible, initialTitle]);

  const loadFriends = async () => {
    setIsLoadingFriends(true);
    try {
      const friendsData = await friendsService.getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelection = new Set(selectedFriends);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriends(newSelection);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a wishlist title");
      return;
    }

    if (selectedFriends.size === 0) {
      Alert.alert("Error", "Please select at least one friend to invite");
      return;
    }

    console.log("🎯 Creating group gift wishlist with data:", {
      title: title.trim(),
      description: description.trim() || undefined,
      allowReservations,
      invitedFriends: Array.from(selectedFriends),
    });

    setIsLoading(true);
    try {
      // Create the wishlist with GROUP privacy level (set automatically when collaborators are provided)
      const collaboratorIds = Array.from(selectedFriends);
      const wishlist = await wishlistsService.createWishlist({
        title: title.trim(),
        description: description.trim() || undefined,
        privacyLevel: "PRIVATE", // Will be changed to GROUP by backend when collaborators are added
        allowReservations,
        collaboratorIds, // Pass collaborator IDs - backend will set privacyLevel to GROUP
      });

      console.log("✅ Group gift wishlist created successfully:", wishlist);

      // Reset form
      setTitle("");
      setDescription("");
      setAllowReservations(true);
      setSelectedFriends(new Set());

      // Close the sheet first
      onClose();

      // Emit event to notify listeners (like wishlists page) to refresh
      wishlistEvents.emit();

      // Trigger success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Navigate to wishlists page after a small delay to allow sheet to close
      setTimeout(() => {
        router.replace("/(tabs)/");
      }, 300);
    } catch (error: any) {
      console.error("❌ Error creating group gift wishlist:", error);
      console.error("Error details:", error.response?.data || error.message);

      const errorMessage = error.response?.data?.message 
        || error.message 
        || "Failed to create group gift wishlist. Check console for details.";

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTitle("");
    setDescription("");
      setAllowReservations(true);
    setSelectedFriends(new Set());
    onClose();
  };

  const renderFriendItem = ({ item, index, total }: { item: FriendUser; index: number; total: number }) => {
    const isSelected = selectedFriends.has(item.id);
    const displayName = getDisplayName(item.firstName, item.lastName) || item.username || item.email;

    return (
      <View key={item.id}>
        <TouchableOpacity
          style={styles.friendItem}
          onPress={() => toggleFriendSelection(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.friendItemLeft}>
            <View style={[styles.friendAvatar, { backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.textSecondary + '20' }]}>
              <Text style={[styles.friendAvatarText, { color: isSelected ? theme.colors.primary : theme.colors.textPrimary }]}>
                {displayName[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.friendItemInfo}>
              <Text style={[styles.friendItemName, { color: theme.colors.textPrimary }]}>
                {displayName}
              </Text>
              {item.username && (
                <Text style={[styles.friendItemUsername, { color: theme.colors.textSecondary }]}>
                  @{item.username}
                </Text>
              )}
            </View>
          </View>
          {isSelected && (
            <View style={[styles.checkIcon, { backgroundColor: theme.colors.primary }]}>
              <Feather name="check" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        {index < total - 1 && (
          <View style={[styles.friendDivider, { backgroundColor: theme.colors.textSecondary + '20' }]} />
        )}
      </View>
    );
  };

  return (
    <>
      {/* Friend Selection Modal */}
      <BottomSheet visible={showFriendSelectionModal} onClose={() => setShowFriendSelectionModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalHeaderTitle, { color: theme.colors.textPrimary }]}>
              Select Friends
            </Text>
          </View>
          
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            {isLoadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading friends...
                </Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="users" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No friends to invite. Add friends first!
                </Text>
              </View>
            ) : (
              friends.map((friend, index) => renderFriendItem({ item: friend, index, total: friends.length }))
            )}
          </ScrollView>

          {/* Bottom Button */}
          <View style={[styles.modalFooter, { 
            backgroundColor: theme.colors.background,
          }]}>
            <TouchableOpacity
              style={[
                styles.modalDoneButton, 
                { 
                  backgroundColor: selectedFriends.size === 0 
                    ? theme.colors.textSecondary + '40' 
                    : theme.colors.primary 
                }
              ]}
              onPress={() => {
                if (selectedFriends.size > 0) {
                  setShowFriendSelectionModal(false);
                }
              }}
              activeOpacity={0.8}
              disabled={selectedFriends.size === 0}
            >
              <Text style={styles.modalDoneButtonText}>
                {selectedFriends.size === 0 
                  ? "Select at least one friend" 
                  : selectedFriends.size === 1 
                    ? "Add friend" 
                    : `Add ${selectedFriends.size} friends`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

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
              Create Group Gift
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
            {/* Title Input */}
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
                placeholder="Title of group gift"
                placeholderTextColor={theme.colors.textSecondary + '80'}
                value={title}
                onChangeText={setTitle}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
                autoFocus
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
                />
              </View>
            </View>

            {/* Invite Friends Section */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Invite Friends
                </Text>
                
                {/* Selected Friends Chips */}
                {selectedFriends.size > 0 && (
                  <View style={styles.selectedFriendsContainer}>
                    {friends
                      .filter(friend => selectedFriends.has(friend.id))
                      .map((friend) => {
                        const displayName = getDisplayName(friend.firstName, friend.lastName) || friend.username || friend.email;
                        return (
                          <View key={friend.id} style={[styles.friendChip, {
                            backgroundColor: theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15',
                          }]}>
                            <View style={[styles.chipAvatar, { backgroundColor: theme.colors.primary + '30' }]}>
                              <Text style={[styles.chipAvatarText, { color: theme.colors.primary }]}>
                                {displayName[0]?.toUpperCase() || "?"}
                              </Text>
                            </View>
                            <Text style={[styles.chipText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                              {displayName}
                            </Text>
                            <TouchableOpacity
                              onPress={() => toggleFriendSelection(friend.id)}
                              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                            >
                              <Feather name="x" size={14} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                  </View>
                )}

                {/* Add/Manage Friends Button */}
                <TouchableOpacity
                  style={styles.addPersonButton}
                  onPress={() => setShowFriendSelectionModal(true)}
                >
                  <Feather name={selectedFriends.size > 0 ? "edit-2" : "plus"} size={16} color={theme.colors.primary} />
                  <Text style={[styles.addPersonText, { color: theme.colors.primary }]}>
                    {selectedFriends.size > 0 ? `Manage friends (${selectedFriends.size})` : `Add friends`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Allow Reservations */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
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
              onPress={handleCreate}
              disabled={isLoading || !title.trim() || selectedFriends.size === 0}
              style={[
                styles.createButton,
                {
                  backgroundColor: (!title.trim() || selectedFriends.size === 0 || isLoading) 
                    ? theme.colors.textSecondary + '40'
                    : theme.colors.primary,
                  opacity: (!title.trim() || selectedFriends.size === 0 || isLoading) ? 0.6 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Group Gift</Text>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
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
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  friendItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  friendItemInfo: {
    flex: 1,
  },
  friendItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  friendItemUsername: {
    fontSize: 12,
    marginTop: 2,
  },
  friendDivider: {
    height: 1,
    marginVertical: 0,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  selectedFriendsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    maxWidth: "100%",
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipAvatarText: {
    fontSize: 10,
    fontWeight: "600",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  addPersonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  addPersonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    flexDirection: "column",
  },
  modalHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingBottom: 16,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  modalDoneButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDoneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  createButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

