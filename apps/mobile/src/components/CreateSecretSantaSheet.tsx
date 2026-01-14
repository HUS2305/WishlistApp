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
import { secretSantaService } from "@/services/secretSanta";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { SelectFriendsSheet } from "./SelectFriendsSheet";
import { friendsService } from "@/services/friends";
import type { User as FriendUser } from "@/types";
import { getDisplayName } from "@/lib/utils";
import { useUserCurrency } from "@/hooks/useUserCurrency";

interface CreateSecretSantaSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateSecretSantaSheet({ visible, onClose, onSuccess }: CreateSecretSantaSheetProps) {
  const { theme } = useTheme();
  const { userCurrency } = useUserCurrency();
  
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [exchangeDate, setExchangeDate] = useState<Date | null>(null);
  const [drawDate, setDrawDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [showFriendSelectionModal, setShowFriendSelectionModal] = useState(false);

  // Reset form when sheet opens/closes
  React.useEffect(() => {
    if (visible) {
      loadFriends();
      // Set default dates: exchange date = 30 days from now, draw date = 7 days before exchange
      const defaultExchangeDate = new Date();
      defaultExchangeDate.setDate(defaultExchangeDate.getDate() + 30);
      const defaultDrawDate = new Date(defaultExchangeDate);
      defaultDrawDate.setDate(defaultDrawDate.getDate() - 7);
      setExchangeDate(defaultExchangeDate);
      setDrawDate(defaultDrawDate);
    } else {
      // Reset form when closing
      setTitle("");
      setBudget("");
      setSelectedFriends(new Set());
    }
  }, [visible]);

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
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    if (selectedFriends.size === 0) {
      Alert.alert("Error", "Please select at least one participant");
      return;
    }

    if (!exchangeDate || !drawDate) {
      Alert.alert("Error", "Please set exchange and draw dates");
      return;
    }

    if (drawDate >= exchangeDate) {
      Alert.alert("Error", "Draw date must be before exchange date");
      return;
    }

    console.log("🎯 Creating Secret Santa event:", {
      title: title.trim(),
      budget: budget ? parseFloat(budget) : undefined,
      exchangeDate: exchangeDate.toISOString(),
      drawDate: drawDate.toISOString(),
      participantIds: Array.from(selectedFriends),
    });

    setIsLoading(true);
    try {
      const event = await secretSantaService.createEvent({
        title: title.trim(),
        budget: budget ? parseFloat(budget) : undefined,
        currency: userCurrency || "USD",
        exchangeDate: exchangeDate.toISOString(),
        drawDate: drawDate.toISOString(),
        participantIds: Array.from(selectedFriends),
      });

      console.log("✅ Secret Santa event created successfully:", event);
      
      // Reset form
      setTitle("");
      setBudget("");
      setSelectedFriends(new Set());
      
      // Close the sheet first
      onClose();
      
      // Trigger success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Small delay to allow sheet to close
      setTimeout(() => {
        // Navigate to Secret Santa tab to see the new event
        router.push("/(tabs)/discover");
      }, 300);
    } catch (error: any) {
      console.error("❌ Error creating Secret Santa event:", error);
      
      const errorMessage = error.response?.data?.message 
        || error.message 
        || "Failed to create Secret Santa event. Check console for details.";
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTitle("");
    setBudget("");
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

  const formatDate = (date: Date | null): string => {
    if (!date) return "Not set";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
        onClose={handleClose} 
        snapPoints={['90%']}
        index={0}
        stackBehavior="switch"
        keyboardBehavior="extend"
        scrollable={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Create Secret Santa
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
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          bounces={true}
        >
          {/* Image Section */}
          <View style={styles.imageContainer}>
            <View style={[styles.imageWrapper, { 
              backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
              borderColor: theme.colors.textSecondary + '40',
            }]}>
              <Feather name="gift" size={48} color={theme.colors.primary} />
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
              placeholder="Event name"
              placeholderTextColor={theme.colors.textSecondary + '80'}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => setIsTitleFocused(false)}
              autoFocus
            />
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Dates
              </Text>
              
              <View style={styles.datesRow}>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    styles.dateButtonHalf,
                    {
                      backgroundColor: theme.colors.backgroundSecondary || "#F3F4F6",
                      borderColor: theme.colors.textSecondary + '20',
                    },
                  ]}
                >
                  <Feather name="calendar" size={18} color={theme.colors.primary} />
                  <View style={styles.dateButtonContent}>
                    <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
                      Exchange
                    </Text>
                    <Text style={[styles.dateValue, { color: theme.colors.textPrimary }]}>
                      {formatDate(exchangeDate)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    styles.dateButtonHalf,
                    {
                      backgroundColor: theme.colors.backgroundSecondary || "#F3F4F6",
                      borderColor: theme.colors.textSecondary + '20',
                    },
                  ]}
                >
                  <Feather name="calendar" size={18} color={theme.colors.primary} />
                  <View style={styles.dateButtonContent}>
                    <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
                      Draw Names
                    </Text>
                    <Text style={[styles.dateValue, { color: theme.colors.textPrimary }]}>
                      {formatDate(drawDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Budget */}
          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Budget (Optional)
              </Text>
              <View style={styles.budgetContainer}>
                <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                  {userCurrency === "USD" ? "$" : userCurrency || "$"}
                </Text>
                <BottomSheetTextInput
                  style={[
                    styles.budgetInput,
                    {
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.backgroundSecondary || "#F3F4F6",
                      borderColor: theme.colors.textSecondary + '20',
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary + '80'}
                  value={budget}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal point
                    const numericValue = text.replace(/[^0-9.]/g, '');
                    setBudget(numericValue);
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Participants */}
          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Participants
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
                  {selectedFriends.size > 0 ? `Manage participants (${selectedFriends.size})` : `Add participants`}
                </Text>
              </TouchableOpacity>
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
  datesRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  dateButtonHalf: {
    flex: 1,
  },
  dateButtonContent: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  budgetContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderRadius: 12,
    borderWidth: 1,
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
});
