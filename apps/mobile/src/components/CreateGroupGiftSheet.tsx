import { useState, useEffect } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { wishlistsService } from "@/services/wishlists";
import { friendsService } from "@/services/friends";
import type { User as FriendUser } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { wishlistEvents } from "@/utils/wishlistEvents";
import { ThemedSwitch } from "./ThemedSwitch";
import { getDisplayName } from "@/lib/utils";
import { SelectFriendsSheet } from "./SelectFriendsSheet";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";

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
  const [showFriendSelectionModal, setShowFriendSelectionModal] = useState(false);

  // Load friends when sheet opens (for displaying chips)
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
    try {
      const friendsData = await friendsService.getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const handleFriendSelection = (selectedFriendIds: Set<string>) => {
    setSelectedFriends(selectedFriendIds);
  };

  const handleRemoveFromSelection = (userId: string) => {
    const newSelected = new Set(selectedFriends);
    newSelected.delete(userId);
    setSelectedFriends(newSelected);
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

  return (
    <>
      {/* Friend Selection Sheet */}
      <SelectFriendsSheet
        visible={showFriendSelectionModal}
        onClose={() => setShowFriendSelectionModal(false)}
        onConfirm={handleFriendSelection}
        initialSelection={selectedFriends}
        emptyMessage="No friends to invite. Add friends first!"
      />

      <BottomSheet 
        visible={visible} 
        onClose={handleClose} 
        snapPoints={['90%']}
        index={0}
        stackBehavior="switch"
        keyboardBehavior="extend"
        scrollable={true}
      >
        {/* Header - Title with action button on right */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Create Group Gift
          </Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isLoading || !title.trim() || selectedFriends.size === 0}
            activeOpacity={0.6}
            style={styles.headerButton}
          >
            {isLoading ? (
              <ActivityIndicator 
                size="small" 
                color={(!title.trim() || selectedFriends.size === 0 || isLoading)
                  ? theme.colors.textSecondary
                  : theme.colors.primary} 
              />
            ) : (
              <Text style={[
                styles.headerButtonText,
                {
                  color: (!title.trim() || selectedFriends.size === 0 || isLoading)
                    ? theme.colors.textSecondary
                    : theme.colors.primary,
                }
              ]}>
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

          {/* Scrollable Content */}
          <BottomSheetScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Input */}
            <View style={styles.titleContainer}>
              <BottomSheetTextInput
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
                <BottomSheetTextInput
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
                              onPress={() => handleRemoveFromSelection(friend.id)}
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

          </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
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
    alignItems: "flex-end",
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
    padding: 16,
    paddingTop: 0,
    paddingBottom: 20,
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
});

