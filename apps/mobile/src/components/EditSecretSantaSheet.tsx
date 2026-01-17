import { useState } from "react";
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { secretSantaService } from "@/services/secretSanta";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";
import { SelectFriendsSheet } from "./SelectFriendsSheet";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { getCurrencyByCode } from "@/utils/currencies";
import { getDisplayName } from "@/lib/utils";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SecretSantaEvent } from "@/types";

interface EditSecretSantaSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  event: SecretSantaEvent | null;
}

export function EditSecretSantaSheet({ visible, onClose, onSuccess, event }: EditSecretSantaSheetProps) {
  const { theme } = useTheme();
  const { userCurrency } = useUserCurrency();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [exchangeDate, setExchangeDate] = useState<Date | null>(null);
  const [drawDate, setDrawDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  
  // Participant management state
  const [showFriendSelectionModal, setShowFriendSelectionModal] = useState(false);
  const [participantsToAdd, setParticipantsToAdd] = useState<Set<string>>(new Set());
  const [participantsToRemove, setParticipantsToRemove] = useState<Set<string>>(new Set());
  
  // Date picker state
  const [showExchangeDatePicker, setShowExchangeDatePicker] = useState(false);
  const [showDrawDatePicker, setShowDrawDatePicker] = useState(false);
  
  // Get currency info for proper symbol display
  const currencyInfo = getCurrencyByCode(event?.currency || userCurrency || "USD");
  
  // Check if event is still in PENDING status (can modify participants)
  const canModifyParticipants = event?.status === "PENDING";
  
  // Get current participants (excluding those marked for removal, plus those marked for addition)
  const currentParticipantIds = React.useMemo(() => {
    if (!event?.participants) return new Set<string>();
    const ids = new Set(event.participants.map(p => p.userId));
    // Remove those marked for removal
    participantsToRemove.forEach(id => ids.delete(id));
    // Add those marked for addition
    participantsToAdd.forEach(id => ids.add(id));
    return ids;
  }, [event?.participants, participantsToRemove, participantsToAdd]);
  
  // Get participant display info
  const displayParticipants = React.useMemo(() => {
    if (!event?.participants) return [];
    return event.participants
      .filter(p => !participantsToRemove.has(p.userId))
      .map(p => ({
        id: p.userId,
        displayName: getDisplayName(p.user?.firstName, p.user?.lastName) || p.user?.username || "Unknown",
        isOrganizer: p.userId === event.organizerId,
        status: p.status,
      }));
  }, [event?.participants, participantsToRemove, event?.organizerId]);

  // Pre-fill form when sheet opens with event data
  React.useEffect(() => {
    if (visible && event) {
      setTitle(event.title || "");
      setBudget(event.budget ? String(event.budget) : "");
      setExchangeDate(event.exchangeDate ? new Date(event.exchangeDate) : null);
      setDrawDate(event.drawDate ? new Date(event.drawDate) : null);
      // Reset participant changes
      setParticipantsToAdd(new Set());
      setParticipantsToRemove(new Set());
    }
  }, [visible, event]);

  const handleSave = async () => {
    if (!event) return;
    
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an event title");
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

    console.log("🎯 Updating Secret Santa event:", {
      id: event.id,
      title: title.trim(),
      budget: budget ? parseFloat(budget) : undefined,
      exchangeDate: exchangeDate.toISOString(),
      drawDate: drawDate.toISOString(),
      participantsToAdd: Array.from(participantsToAdd),
      participantsToRemove: Array.from(participantsToRemove),
    });

    setIsLoading(true);
    try {
      // Update event details
      await secretSantaService.updateEvent({
        id: event.id,
        title: title.trim(),
        budget: budget ? parseFloat(budget) : undefined,
        exchangeDate: exchangeDate.toISOString(),
        drawDate: drawDate.toISOString(),
      });

      // Handle participant changes (only if event is PENDING)
      if (canModifyParticipants) {
        // Remove participants
        for (const userId of participantsToRemove) {
          try {
            await secretSantaService.removeParticipant(event.id, userId);
          } catch (error) {
            console.error("Error removing participant:", error);
          }
        }
        
        // Invite new participants
        for (const userId of participantsToAdd) {
          try {
            await secretSantaService.inviteParticipant(event.id, userId);
          } catch (error) {
            console.error("Error inviting participant:", error);
          }
        }
      }

      console.log("✅ Secret Santa event updated successfully");
      
      // Close the sheet first
      onClose();
      
      // Trigger success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("❌ Error updating Secret Santa event:", error);
      
      const errorMessage = error.response?.data?.message 
        || error.message 
        || "Failed to update Secret Santa event. Check console for details.";
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleFriendSelection = (selectedFriendIds: Set<string>) => {
    if (!event?.participants) return;
    
    const existingParticipantIds = new Set(event.participants.map(p => p.userId));
    
    // Ensure organizer is always in the selection (they can't be removed)
    const finalSelection = new Set(selectedFriendIds);
    finalSelection.add(event.organizerId);
    
    // Find new participants to add (in selection but not in existing)
    const newToAdd = new Set<string>();
    finalSelection.forEach(id => {
      if (!existingParticipantIds.has(id)) {
        newToAdd.add(id);
      }
    });
    
    // Find participants to remove (in existing but not in selection, excluding organizer)
    const newToRemove = new Set<string>();
    existingParticipantIds.forEach(id => {
      if (!finalSelection.has(id) && id !== event.organizerId) {
        newToRemove.add(id);
      }
    });
    
    setParticipantsToAdd(newToAdd);
    setParticipantsToRemove(newToRemove);
  };

  const toggleParticipantRemoval = (userId: string) => {
    if (!event || userId === event.organizerId) return; // Can't remove organizer
    
    const newToRemove = new Set(participantsToRemove);
    if (newToRemove.has(userId)) {
      newToRemove.delete(userId);
    } else {
      newToRemove.add(userId);
    }
    setParticipantsToRemove(newToRemove);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "Not set";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!event) return null;

  return (
    <>
      {/* Friend Selection Sheet for adding participants */}
      <SelectFriendsSheet
        visible={showFriendSelectionModal}
        onClose={() => setShowFriendSelectionModal(false)}
        onConfirm={handleFriendSelection}
        initialSelection={currentParticipantIds}
      />

      <BottomSheet 
        visible={visible} 
        onClose={handleClose} 
        snapPoints={['85%']}
        index={0}
        stackBehavior="switch"
        keyboardBehavior="extend"
        scrollable={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Edit Event
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
                      backgroundColor: theme.isDark ? '#2E2E2E' : '#F3F4F6',
                      borderColor: theme.colors.textSecondary + '20',
                    },
                  ]}
                  onPress={() => setShowDrawDatePicker(true)}
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

                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    styles.dateButtonHalf,
                    {
                      backgroundColor: theme.isDark ? '#2E2E2E' : '#F3F4F6',
                      borderColor: theme.colors.textSecondary + '20',
                    },
                  ]}
                  onPress={() => setShowExchangeDatePicker(true)}
                >
                  <Feather name="calendar" size={18} color={theme.colors.primary} />
                  <View style={styles.dateButtonContent}>
                    <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
                      Gift Exchange
                    </Text>
                    <Text style={[styles.dateValue, { color: theme.colors.textPrimary }]}>
                      {formatDate(exchangeDate)}
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
                Budget per Person (Optional)
              </Text>
              <View style={[styles.budgetContainer, {
                backgroundColor: theme.isDark ? '#2E2E2E' : '#F3F4F6',
                borderColor: theme.colors.textSecondary + '20',
              }]}>
                <Text style={[styles.currencySymbol, { color: theme.colors.textPrimary }]}>
                  {currencyInfo?.symbol || event?.currency || "$"}
                </Text>
                <BottomSheetTextInput
                  style={[
                    styles.budgetInput,
                    {
                      color: theme.colors.textPrimary,
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
              <Text style={[styles.budgetHint, { color: theme.colors.textSecondary }]}>
                Suggested spending limit for each gift
              </Text>
            </View>
          </View>

          {/* Participants */}
          <View style={styles.section}>
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Participants ({currentParticipantIds.size})
              </Text>
              
              {/* Current Participants */}
              {displayParticipants.length > 0 && (
                <View style={styles.participantsContainer}>
                  {displayParticipants.map((participant) => (
                    <View key={participant.id} style={[styles.participantChip, {
                      backgroundColor: theme.isDark ? theme.colors.primary + '20' : theme.colors.primary + '15',
                    }]}>
                      <View style={[styles.chipAvatar, { backgroundColor: theme.colors.primary + '30' }]}>
                        <Text style={[styles.chipAvatarText, { color: theme.colors.primary }]}>
                          {participant.displayName[0]?.toUpperCase() || "?"}
                        </Text>
                      </View>
                      <Text style={[styles.chipText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {participant.displayName}
                        {participant.isOrganizer && " (You)"}
                      </Text>
                      {!participant.isOrganizer && canModifyParticipants && (
                        <TouchableOpacity
                          onPress={() => toggleParticipantRemoval(participant.id)}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Feather name="x" size={14} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Add/Manage Participants Button - Only when PENDING */}
              {canModifyParticipants ? (
                <TouchableOpacity
                  style={styles.addParticipantButton}
                  onPress={() => setShowFriendSelectionModal(true)}
                  disabled={isLoading}
                >
                  <Feather name="user-plus" size={16} color={theme.colors.primary} />
                  <Text style={[styles.addParticipantText, { color: theme.colors.primary }]}>
                    Manage participants
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10' }]}>
                  <Feather name="info" size={16} color={theme.colors.primary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    Participants cannot be changed after names have been drawn.
                  </Text>
                </View>
              )}
            </View>
          </View>

        </BottomSheetScrollView>
      </BottomSheet>

      {/* Exchange Date Picker */}
      {Platform.OS === "ios" ? (
        <BottomSheet 
          visible={showExchangeDatePicker} 
          onClose={() => setShowExchangeDatePicker(false)} 
          autoHeight
          stackBehavior="push"
        >
          <View style={[styles.datePickerContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.datePickerHeader}>
              <View style={styles.datePickerHeaderSpacer} />
              <Text style={[styles.datePickerTitle, { color: theme.colors.textPrimary }]}>
                Gift Exchange Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowExchangeDatePicker(false)}
                style={styles.datePickerDoneButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.datePickerDoneText, { color: theme.colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.datePickerWrapper, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
              <DateTimePicker
                value={exchangeDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(pickerEvent, selectedDate) => {
                  if (selectedDate) {
                    setExchangeDate(selectedDate);
                    // If draw date is after exchange date, adjust it
                    if (drawDate && drawDate >= selectedDate) {
                      const newDrawDate = new Date(selectedDate);
                      newDrawDate.setDate(newDrawDate.getDate() - 7);
                      setDrawDate(newDrawDate);
                    }
                  }
                  if (pickerEvent?.type === "dismissed") {
                    setShowExchangeDatePicker(false);
                  }
                }}
                minimumDate={new Date()}
                style={styles.datePicker}
                themeVariant={theme.isDark ? "dark" : "light"}
              />
            </View>
          </View>
        </BottomSheet>
      ) : (
        showExchangeDatePicker && (
          <DateTimePicker
            value={exchangeDate || new Date()}
            mode="date"
            display="default"
            onChange={(pickerEvent, selectedDate) => {
              setShowExchangeDatePicker(false);
              if (selectedDate) {
                setExchangeDate(selectedDate);
                if (drawDate && drawDate >= selectedDate) {
                  const newDrawDate = new Date(selectedDate);
                  newDrawDate.setDate(newDrawDate.getDate() - 7);
                  setDrawDate(newDrawDate);
                }
              }
            }}
            minimumDate={new Date()}
            themeVariant={theme.isDark ? "dark" : "light"}
          />
        )
      )}

      {/* Draw Names Date Picker */}
      {Platform.OS === "ios" ? (
        <BottomSheet 
          visible={showDrawDatePicker} 
          onClose={() => setShowDrawDatePicker(false)} 
          autoHeight
          stackBehavior="push"
        >
          <View style={[styles.datePickerContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.datePickerHeader}>
              <View style={styles.datePickerHeaderSpacer} />
              <Text style={[styles.datePickerTitle, { color: theme.colors.textPrimary }]}>
                Draw Names Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowDrawDatePicker(false)}
                style={styles.datePickerDoneButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.datePickerDoneText, { color: theme.colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.datePickerWrapper, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
              <DateTimePicker
                value={drawDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(pickerEvent, selectedDate) => {
                  if (selectedDate) {
                    setDrawDate(selectedDate);
                  }
                  if (pickerEvent?.type === "dismissed") {
                    setShowDrawDatePicker(false);
                  }
                }}
                minimumDate={new Date()}
                maximumDate={exchangeDate || undefined}
                style={styles.datePicker}
                themeVariant={theme.isDark ? "dark" : "light"}
              />
            </View>
          </View>
        </BottomSheet>
      ) : (
        showDrawDatePicker && (
          <DateTimePicker
            value={drawDate || new Date()}
            mode="date"
            display="default"
            onChange={(pickerEvent, selectedDate) => {
              setShowDrawDatePicker(false);
              if (selectedDate) {
                setDrawDate(selectedDate);
              }
            }}
            minimumDate={new Date()}
            maximumDate={exchangeDate || undefined}
            themeVariant={theme.isDark ? "dark" : "light"}
          />
        )
      )}
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
    paddingBottom: 40,
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
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontSize: 18,
  },
  budgetHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  participantsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  participantChip: {
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
  addParticipantButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  addParticipantText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  // Date picker styles
  datePickerContainer: {
    paddingTop: 8,
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  datePickerHeaderSpacer: {
    width: 50,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  datePickerDoneButton: {
    width: 50,
    alignItems: "flex-end",
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerWrapper: {
    alignItems: "center",
  },
  datePicker: {
    width: "100%",
    height: 200,
  },
});
