import { useState } from "react";
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
import { router } from "expo-router";
import type { PrivacyLevel } from "@/types";
import { wishlistsService } from "@/services/wishlists";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { wishlistEvents } from "@/utils/wishlistEvents";
import { ThemedSwitch } from "./ThemedSwitch";
import { getDisplayName } from "@/lib/utils";
import { SelectFriendsSheet } from "./SelectFriendsSheet";
import { friendsService } from "@/services/friends";
import type { User as FriendUser } from "@/types";

interface CreateWishlistSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTitle?: string;
}

export function CreateWishlistSheet({ visible, onClose, onSuccess, initialTitle }: CreateWishlistSheetProps) {
  const { theme } = useTheme();
  
  React.useEffect(() => {
    console.log("CreateWishlistSheet visible:", visible);
  }, [visible]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("PRIVATE");
  const [allowReservations, setAllowReservations] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [showFriendSelectionModal, setShowFriendSelectionModal] = useState(false);

  // Pre-fill title when modal opens with initialTitle prop
  React.useEffect(() => {
    if (visible && initialTitle) {
      setTitle(initialTitle);
    } else if (visible && !initialTitle) {
      // Reset title if no initialTitle and modal opens
      setTitle("");
    }
    // Load friends when sheet opens
    if (visible) {
      loadFriends();
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
  
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a wishlist title");
      return;
    }

    console.log("🎯 Creating wishlist with data:", {
      title: title.trim(),
      description: description.trim() || undefined,
      privacyLevel,
      allowReservations,
    });

    setIsLoading(true);
    try {
      const collaboratorIds = Array.from(selectedFriends);
      const wishlist = await wishlistsService.createWishlist({
        title: title.trim(),
        description: description.trim() || undefined,
        privacyLevel, // Backend will change to GROUP if collaboratorIds are provided
        allowReservations,
        allowComments: true,
        collaboratorIds: collaboratorIds.length > 0 ? collaboratorIds : undefined,
      });

      console.log("✅ Wishlist created successfully:", wishlist);
      
      // Reset form
      setTitle("");
      setDescription("");
      setPrivacyLevel("PRIVATE");
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
      console.error("❌ Error creating wishlist:", error);
      console.error("Error details:", error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.message 
        || error.message 
        || "Failed to create wishlist. Check console for details.";
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTitle("");
    setDescription("");
    setPrivacyLevel("PRIVATE");
    setAllowReservations(true);
    setSelectedFriends(new Set());
    onClose();
  };

  const handleFriendSelection = (selectedFriendIds: Set<string>) => {
    setSelectedFriends(selectedFriendIds);
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
            Create Wishlist
          </Text>
          <TouchableOpacity
            onPress={handleCreate}
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
                Create
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

            {/* Privacy Settings - Horizontal Row (hidden when friends are selected - becomes GROUP) */}
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
                      },
                    ]}
                    onPress={() => setPrivacyLevel("PRIVATE")}
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
                      },
                    ]}
                    onPress={() => setPrivacyLevel("FRIENDS_ONLY")}
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
                      },
                    ]}
                    onPress={() => setPrivacyLevel("PUBLIC")}
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
                  disabled={isLoading}
                >
                  <Feather name={selectedFriends.size > 0 ? "edit-2" : "plus"} size={16} color={theme.colors.primary} />
                  <Text style={[styles.addPersonText, { color: theme.colors.primary }]}>
                    {selectedFriends.size > 0 ? `Manage friends (${selectedFriends.size})` : `Add person`}
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  required: {
    // Color is set inline using theme
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

