import { useState, useEffect } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import type { PrivacyLevel, Wishlist } from "@/types";
import { useUpdateWishlist } from "@/hooks/useWishlists";
import { friendsService } from "@/services/friends";
import type { User as FriendUser } from "@/types";
import { wishlistsService } from "@/services/wishlists";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { ThemedSwitch } from "./ThemedSwitch";
import { getDisplayName } from "@/lib/utils";
import { SelectFriendsSheet } from "./SelectFriendsSheet";

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
  const [allowReservations, setAllowReservations] = useState(true);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [showFriendSelectionModal, setShowFriendSelectionModal] = useState(false);

  // Load wishlist data when it becomes available
  useEffect(() => {
    if (wishlist && visible) {
      setTitle(wishlist.title || "");
      setDescription(wishlist.description || "");
      setPrivacyLevel(wishlist.privacyLevel);
      setAllowReservations(wishlist.allowReservations ?? true);
      
      // Pre-select existing collaborators in the selection
      const existingIdsSet = new Set(wishlist.collaborators?.map(c => c.userId) || []);
      setSelectedFriends(existingIdsSet);
      
      // Load friends for displaying chips
      loadFriends();
    }
  }, [wishlist, visible]);

  const loadFriends = async () => {
    try {
      const friendsData = await friendsService.getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const handleRemoveFromSelection = (userId: string) => {
    // Just remove from selection - actual removal happens on save
    const newSelected = new Set(selectedFriends);
    newSelected.delete(userId);
    setSelectedFriends(newSelected);
  };

  const handleFriendSelection = (selectedFriendIds: Set<string>) => {
    setSelectedFriends(selectedFriendIds);
  };

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
        allowReservations,
      },
      {
        onSuccess: async () => {
          // Get the original existing collaborator IDs (from when modal opened)
          const originalExistingIds = new Set(wishlist.collaborators?.map(c => c.userId) || []);
          
          // Find collaborators that were removed (were in original, not in selected)
          const removedUserIds: string[] = [];
          originalExistingIds.forEach(userId => {
            if (!selectedFriends.has(userId)) {
              removedUserIds.push(userId);
            }
          });
          
          // Remove collaborators that were deselected
          for (const userId of removedUserIds) {
            try {
              await wishlistsService.removeCollaborator(wishlist.id, userId);
            } catch (error: any) {
              console.warn(`Failed to remove collaborator ${userId}:`, error);
            }
          }
          
          // Add new collaborators (were not in original, but are in selected)
          const newFriendIds = Array.from(selectedFriends).filter(
            friendId => !originalExistingIds.has(friendId)
          );
          
          for (const friendId of newFriendIds) {
            try {
              await wishlistsService.inviteCollaborator(wishlist.id, friendId);
            } catch (error: any) {
              // Continue even if one invite fails (e.g., already a collaborator)
              console.warn(`Failed to invite friend ${friendId}:`, error);
            }
          }

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


  const isLoading = updateWishlist.isPending;

  return (
    <>
      {/* Friend Selection Sheet */}
      <SelectFriendsSheet
        visible={showFriendSelectionModal}
        onClose={() => setShowFriendSelectionModal(false)}
        onConfirm={handleFriendSelection}
        initialSelection={selectedFriends}
      />

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
            Edit Wishlist
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading || !title.trim()}
            activeOpacity={0.6}
            style={styles.headerButton}
          >
            {isLoading ? (
              <ActivityIndicator 
                size="small" 
                color={(!title.trim() || isLoading)
                  ? theme.colors.textSecondary
                  : theme.colors.primary} 
              />
            ) : (
              <Text style={[
                styles.headerButtonText,
                {
                  color: (!title.trim() || isLoading)
                    ? theme.colors.textSecondary
                    : theme.colors.primary,
                }
              ]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Scrollable Content - Using BottomSheetScrollView with gorhom's built-in keyboard handling */}
        <BottomSheetScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            bounces={true}
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
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Privacy Settings - Horizontal Row (hidden when friends/collaborators are selected - becomes GROUP) */}
            {selectedFriends.size === 0 && (
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
            )}

            {/* Share With Section */}
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Share with
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
                  disabled={isLoading}
                >
                  <Feather name={selectedFriends.size > 0 ? "edit-2" : "plus"} size={16} color={theme.colors.primary} />
                  <Text style={[styles.addPersonText, { color: theme.colors.primary }]}>
                    {selectedFriends.size > 0 
                      ? `Manage friends (${selectedFriends.size})` 
                      : `Add person`}
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
                    disabled={isLoading}
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
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  addPersonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
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





