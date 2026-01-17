import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { HeaderButton } from "@/components/PageHeader";
import { secretSantaService } from "@/services/secretSanta";
import type { SecretSantaEvent, SecretSantaAssignment, SecretSantaParticipant } from "@/types";
import { getDisplayName } from "@/lib/utils";
import { Card } from "@/components/ui";
import { getCurrencyByCode } from "@/utils/currencies";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { PriceDisplay } from "@/components/PriceDisplay";
import { SecretSantaMenu } from "@/components/SecretSantaMenu";
import { DeleteConfirmModal } from "@/components";
import { EditSecretSantaSheet } from "@/components/EditSecretSantaSheet";
import { DrawNamesConfirmSheet } from "@/components/DrawNamesConfirmSheet";
import { DrawNamesSuccessSheet } from "@/components/DrawNamesSuccessSheet";
import { RevealAssignmentSheet } from "@/components/RevealAssignmentSheet";
import { MarkCompleteConfirmSheet } from "@/components/MarkCompleteConfirmSheet";
import { MarkCompleteSuccessSheet } from "@/components/MarkCompleteSuccessSheet";
import { LeaveEventSheet } from "@/components/LeaveEventSheet";
import { DeclineInvitationSheet } from "@/components/DeclineInvitationSheet";

export default function SecretSantaDetailScreen() {
  const { theme } = useTheme();
  const { refreshPendingSecretSantaInvitationsCount } = useNotificationContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as string;
  const { userCurrency } = useUserCurrency();

  const [event, setEvent] = useState<SecretSantaEvent | null>(null);
  const [assignment, setAssignment] = useState<SecretSantaAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [drawConfirmVisible, setDrawConfirmVisible] = useState(false);
  const [drawSuccessVisible, setDrawSuccessVisible] = useState(false);
  const [revealAssignmentVisible, setRevealAssignmentVisible] = useState(false);
  const [markCompleteVisible, setMarkCompleteVisible] = useState(false);
  const [markCompleteSuccessVisible, setMarkCompleteSuccessVisible] = useState(false);
  const [leaveEventVisible, setLeaveEventVisible] = useState(false);
  const [declineInvitationVisible, setDeclineInvitationVisible] = useState(false);

  const loadEvent = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const eventData = await secretSantaService.getEvent(eventId);
      setEvent(eventData);

      // Load assignment if names have been drawn
      if (eventData.status !== "PENDING") {
        try {
          const assignmentData = await secretSantaService.getMyAssignment(eventId);
          setAssignment(assignmentData);
        } catch (error) {
          console.error("Error loading assignment:", error);
        }
      }
    } catch (error) {
      console.error("Error loading event:", error);
      Alert.alert("Error", "Failed to load event details");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadEvent(true);
    }, [loadEvent])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadEvent(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateCompact = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "PENDING":
        return theme.colors.textSecondary;
      case "DRAWN":
        return theme.colors.primary;
      case "IN_PROGRESS":
        return theme.colors.primary;
      case "COMPLETED":
        return "#6B7280";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string, eventData?: SecretSantaEvent | null): string => {
    switch (status) {
      case "PENDING":
        if (eventData) {
          const accepted = eventData.participants?.filter(p => p.status === "ACCEPTED").length || 0;
          const total = eventData.participants?.length || 0;
          const pending = total - accepted;
          if (pending > 0) {
            return `Waiting for ${pending} participant${pending > 1 ? 's' : ''} to accept`;
          }
          if (accepted >= 3) {
            return "Ready to draw names";
          }
          // All invited have accepted, but need at least 3 participants
          if (accepted < 3) {
            return `Need at least 3 participants to draw names (currently ${accepted})`;
          }
        }
        return "Waiting for participants to accept";
      case "DRAWN":
        return "Names drawn!";
      case "IN_PROGRESS":
        return "Gift shopping in progress";
      case "COMPLETED":
        return "Exchange completed";
      default:
        return status;
    }
  };

  const getParticipantStatusColor = (status: string): string => {
    switch (status) {
      case "ACCEPTED":
        return theme.colors.primary;
      case "INVITED":
        return theme.colors.textSecondary;
      case "DECLINED":
        return "#EF4444";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getParticipantStatusLabel = (status: string): string => {
    switch (status) {
      case "ACCEPTED":
        return "Joined";
      case "INVITED":
        return "Pending";
      case "DECLINED":
        return "Declined";
      default:
        return status;
    }
  };

  // Get current user's participant status from backend
  const myParticipantStatus = event?.myParticipantStatus;

  const acceptedParticipants = event?.participants?.filter(p => p.status === "ACCEPTED") || [];
  const canDrawNames = event?.isOrganizer && 
    event?.status === "PENDING" && 
    acceptedParticipants.length >= 3;

  const handleAcceptInvitation = async () => {
    if (!event) return;
    
    setIsActionLoading(true);
    try {
      await secretSantaService.acceptInvitation(eventId);
      await refreshPendingSecretSantaInvitationsCount();
      Alert.alert("Joined!", "You've joined the Secret Santa event.");
      loadEvent(false);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to accept invitation");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeclineInvitation = () => {
    if (!event) return;
    setMenuVisible(false);
    setDeclineInvitationVisible(true);
  };

  const confirmDeclineInvitation = async () => {
    setIsActionLoading(true);
    try {
      await secretSantaService.declineInvitation(eventId);
      await refreshPendingSecretSantaInvitationsCount();
      setDeclineInvitationVisible(false);
      router.back();
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      setDeclineInvitationVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to decline invitation");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDrawNames = () => {
    if (!event) return;
    setDrawConfirmVisible(true);
  };

  const confirmDrawNames = async () => {
    if (!event) return;

    setIsActionLoading(true);
    try {
      await secretSantaService.drawNames(eventId);
      setDrawConfirmVisible(false);
      setDrawSuccessVisible(true);
      loadEvent(false);
    } catch (error: any) {
      console.error("Error drawing names:", error);
      setDrawConfirmVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to draw names");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevealAssignment = () => {
    if (!event) return;
    setRevealAssignmentVisible(true);
  };

  const confirmRevealAssignment = async () => {
    setIsActionLoading(true);
    try {
      const revealed = await secretSantaService.revealAssignment(eventId);
      setAssignment(revealed);
      setRevealAssignmentVisible(false);
      setShowRevealAnimation(true);
      setTimeout(() => setShowRevealAnimation(false), 2000);
    } catch (error: any) {
      console.error("Error revealing assignment:", error);
      setRevealAssignmentVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to reveal assignment");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewReceiverWishlist = () => {
    if (!assignment?.receiver || !event) return;
    
    // Navigate to the friend's profile which shows their wishlists
    // Pass returnTo param so back button returns to this event page
    router.push(`/friends/${assignment.receiver.id}?returnTo=secret-santa-event&eventId=${event.id}`);
  };

  const handleMarkComplete = () => {
    if (!event) return;
    setMenuVisible(false);
    setMarkCompleteVisible(true);
  };

  const confirmMarkComplete = async () => {
    setIsActionLoading(true);
    try {
      await secretSantaService.markAsCompleted(eventId);
      setMarkCompleteVisible(false);
      setMarkCompleteSuccessVisible(true);
      loadEvent(false);
    } catch (error: any) {
      console.error("Error marking complete:", error);
      setMarkCompleteVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to mark as completed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveEvent = () => {
    setMenuVisible(false);
    setLeaveEventVisible(true);
  };

  const confirmLeaveEvent = async () => {
    setIsActionLoading(true);
    try {
      await secretSantaService.declineInvitation(eventId);
      await refreshPendingSecretSantaInvitationsCount();
      setLeaveEventVisible(false);
      router.back();
    } catch (error: any) {
      console.error("Error leaving event:", error);
      setLeaveEventVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to leave event");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    setMenuVisible(false);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    setIsActionLoading(true);
    try {
      await secretSantaService.deleteEvent(eventId);
      setDeleteConfirmVisible(false);
      router.push("/(tabs)/discover");
    } catch (error: any) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to delete event");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditEvent = () => {
    setMenuVisible(false);
    setEditSheetVisible(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StandardPageHeader title="Secret Santa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StandardPageHeader title="Secret Santa" />
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Event not found
          </Text>
        </View>
      </View>
    );
  }

  const currencyInfo = getCurrencyByCode(event.currency || "USD");

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader 
        title={event.title}
        onBack={() => router.push("/(tabs)/discover")}
        rightActions={
          <HeaderButton
            icon="more-horizontal"
            onPress={() => setMenuVisible(true)}
          />
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Invitation Actions (for invited participants) - First section for visibility */}
        {!event.isOrganizer && myParticipantStatus === "INVITED" && (
          <View style={[styles.inviteCard, { backgroundColor: theme.colors.primary + "10", borderColor: theme.colors.primary + "30" }]}>
            <View style={styles.inviteContent}>
              <Feather name="mail" size={20} color={theme.colors.primary} />
              <View style={styles.inviteTextContainer}>
                <Text style={[styles.inviteTitle, { color: theme.colors.textPrimary }]}>You're invited!</Text>
                <Text style={[styles.inviteSubtitle, { color: theme.colors.textSecondary }]}>Join this Secret Santa</Text>
              </View>
            </View>
            <View style={styles.inviteButtons}>
              <TouchableOpacity
                style={[styles.declineBtn, { borderColor: theme.colors.textSecondary + "40" }]}
                onPress={handleDeclineInvitation}
                disabled={isActionLoading}
              >
                <Text style={[styles.declineBtnText, { color: theme.colors.textSecondary }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleAcceptInvitation}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status Chip with inline Draw Names button */}
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(event.status) + "15" }]}>
            <Text style={[styles.statusChipText, { color: getStatusColor(event.status) }]}>
              {getStatusLabel(event.status, event)}
            </Text>
          </View>
          {event.isOrganizer && event.status === "PENDING" && canDrawNames && (
            <TouchableOpacity
              style={[styles.inlineDrawButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleDrawNames}
              disabled={isActionLoading}
              activeOpacity={0.7}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="shuffle" size={14} color="#fff" />
                  <Text style={styles.inlineDrawButtonText}>Draw Names</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Unified Info Row - Draw, Exchange, Budget */}
        <View style={[styles.unifiedInfoRow, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.unifiedInfoSection}>
            <Feather name="shuffle" size={16} color={theme.colors.primary} />
            <Text style={[styles.unifiedInfoLabel, { color: theme.colors.textSecondary }]}>Draw</Text>
            <Text style={[styles.unifiedInfoValue, { color: theme.colors.textPrimary }]}>
              {formatDateCompact(event.drawDate)}
            </Text>
          </View>
          <View style={[styles.unifiedInfoDivider, { backgroundColor: theme.colors.textSecondary + "20" }]} />
          <View style={styles.unifiedInfoSection}>
            <Feather name="gift" size={16} color={theme.colors.primary} />
            <Text style={[styles.unifiedInfoLabel, { color: theme.colors.textSecondary }]}>Exchange</Text>
            <Text style={[styles.unifiedInfoValue, { color: theme.colors.textPrimary }]}>
              {formatDateCompact(event.exchangeDate)}
            </Text>
          </View>
          <View style={[styles.unifiedInfoDivider, { backgroundColor: theme.colors.textSecondary + "20" }]} />
          <View style={styles.unifiedInfoSection}>
            <Feather name="dollar-sign" size={16} color={theme.colors.primary} />
            <Text style={[styles.unifiedInfoLabel, { color: theme.colors.textSecondary }]}>Budget</Text>
            <PriceDisplay 
              amount={event.budget || 0} 
              currency={event.currency || "USD"} 
              textStyle={[styles.unifiedInfoValue, { color: theme.colors.textPrimary }]}
            />
          </View>
        </View>

        {/* Assignment Card (after names drawn) */}
        {event.status !== "PENDING" && myParticipantStatus === "ACCEPTED" && (
          <View style={[styles.assignmentCard, { backgroundColor: theme.colors.surface }]}>
            {!assignment?.revealed ? (
              <TouchableOpacity
                style={styles.revealTouchable}
                onPress={handleRevealAssignment}
                disabled={isActionLoading}
                activeOpacity={0.7}
              >
                <View style={[styles.giftIconContainer, { backgroundColor: theme.colors.primary + "15" }]}>
                  <Feather name="gift" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.revealTextContainer}>
                  <Text style={[styles.revealTitle, { color: theme.colors.textPrimary }]}>Your assignment is ready!</Text>
                  <Text style={[styles.revealSubtitle, { color: theme.colors.textSecondary }]}>Tap to reveal who you're gifting</Text>
                </View>
                {isActionLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.revealedContainer}>
                <View style={styles.revealedRow}>
                  {assignment.receiver?.avatar ? (
                    <Image 
                      source={{ uri: assignment.receiver.avatar }} 
                      style={styles.receiverAvatarSmall}
                    />
                  ) : (
                    <View style={[styles.receiverAvatarSmallPlaceholder, { backgroundColor: theme.colors.primary + "20" }]}>
                      <Text style={[styles.receiverAvatarSmallText, { color: theme.colors.primary }]}>
                        {(assignment.receiver?.firstName?.[0] || assignment.receiver?.username?.[0] || "?").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.receiverTextContainer}>
                    <Text style={[styles.revealedLabel, { color: theme.colors.textSecondary }]}>You're gifting:</Text>
                    <Text style={[styles.receiverNameCompact, { color: theme.colors.textPrimary }]}>
                      {getDisplayName(assignment.receiver?.firstName, assignment.receiver?.lastName) || assignment.receiver?.username || "Unknown"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.viewWishlistBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleViewReceiverWishlist}
                  >
                    <Feather name="list" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Participants Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Participants ({acceptedParticipants.length}/{event.participants?.length || 0})
          </Text>
          
          <Card style={[styles.participantsCard, { borderRadius: 12, padding: 4, backgroundColor: theme.colors.surface }]}>
            {event.participants?.slice(0, 5).map((participant, index) => {
              const displayedParticipants = event.participants!.slice(0, 5);
              const isLast = index === displayedParticipants.length - 1;
              return (
                <View 
                  key={participant.id} 
                  style={[
                    styles.participantRow,
                    !isLast && styles.participantRowBorder,
                    { borderBottomColor: theme.colors.textSecondary + "20" }
                  ]}
                >
                  {participant.user?.avatar ? (
                    <Image source={{ uri: participant.user.avatar }} style={styles.participantAvatar} />
                  ) : (
                    <View style={[styles.participantAvatarPlaceholder, { backgroundColor: theme.colors.primary + "20" }]}>
                      <Text style={[styles.participantAvatarText, { color: theme.colors.primary }]}>
                        {(participant.user?.firstName?.[0] || participant.user?.username?.[0] || "?").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantName, { color: theme.colors.textPrimary }]}>
                      {getDisplayName(participant.user?.firstName, participant.user?.lastName) || participant.user?.username || "Unknown"}
                      {participant.userId === event.organizerId && (
                        <Text style={[styles.organizerBadge, { color: theme.colors.primary }]}> (Organizer)</Text>
                      )}
                    </Text>
                  </View>
                  <View style={[styles.participantStatusBadge, { backgroundColor: getParticipantStatusColor(participant.status) + "20" }]}>
                    <Text style={[styles.participantStatusText, { color: getParticipantStatusColor(participant.status) }]}>
                      {getParticipantStatusLabel(participant.status)}
                    </Text>
                  </View>
                </View>
              );
            })}
            {event.participants && event.participants.length > 5 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => router.push(`/secret-santa/${event.id}/participants`)}
              >
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                  See All Participants
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* Group Wishlist Link */}
        {event.wishlist && myParticipantStatus === "ACCEPTED" && (
          <TouchableOpacity
            style={[styles.wishlistLink, { backgroundColor: theme.colors.surface }]}
            onPress={() => router.push(`/wishlist/${event.wishlistId}?returnTo=secret-santa-event&eventId=${event.id}`)}
          >
            <View style={[styles.wishlistIconContainer, { backgroundColor: theme.colors.primary + "15" }]}>
              <Feather name="gift" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.wishlistLinkContent}>
              <Text style={[styles.wishlistLinkTitle, { color: theme.colors.textPrimary }]}>
                Group Gift Pool
              </Text>
              <Text style={[styles.wishlistLinkSubtitle, { color: theme.colors.textSecondary }]}>
                Shared wishlist
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Organizer Actions - End Event */}
        {event.isOrganizer && (event.status === "DRAWN" || event.status === "IN_PROGRESS") && (
          <View style={styles.organizerActions}>
            <TouchableOpacity
              style={[styles.completeButton, { borderColor: theme.colors.primary }]}
              onPress={handleMarkComplete}
              disabled={isActionLoading}
            >
              <Feather name="check-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.completeButtonText, { color: theme.colors.primary }]}>
                End Event
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Menu */}
      <SecretSantaMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isOrganizer={event.isOrganizer || false}
        participantStatus={myParticipantStatus}
        eventStatus={event.status}
        canDrawNames={canDrawNames}
        onEdit={handleEditEvent}
        onDrawNames={handleDrawNames}
        onMarkComplete={handleMarkComplete}
        onDelete={handleDeleteEvent}
        onLeave={handleLeaveEvent}
        onDecline={handleDeclineInvitation}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        title={event.title}
        modalTitle="Delete Event"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        isDeleting={isActionLoading}
      />

      {/* Edit Event Sheet */}
      <EditSecretSantaSheet
        visible={editSheetVisible}
        onClose={() => setEditSheetVisible(false)}
        onSuccess={() => loadEvent(false)}
        event={event}
      />

      {/* Draw Names Confirmation Sheet */}
      <DrawNamesConfirmSheet
        visible={drawConfirmVisible}
        onClose={() => setDrawConfirmVisible(false)}
        onConfirm={confirmDrawNames}
        participantCount={acceptedParticipants.length}
        isLoading={isActionLoading}
      />

      {/* Draw Names Success Sheet */}
      <DrawNamesSuccessSheet
        visible={drawSuccessVisible}
        onClose={() => setDrawSuccessVisible(false)}
      />

      {/* Reveal Assignment Sheet */}
      <RevealAssignmentSheet
        visible={revealAssignmentVisible}
        onClose={() => setRevealAssignmentVisible(false)}
        onReveal={confirmRevealAssignment}
        isLoading={isActionLoading}
      />

      {/* Mark Complete Confirmation Sheet */}
      <MarkCompleteConfirmSheet
        visible={markCompleteVisible}
        onClose={() => setMarkCompleteVisible(false)}
        onConfirm={confirmMarkComplete}
        isLoading={isActionLoading}
      />

      {/* Mark Complete Success Sheet */}
      <MarkCompleteSuccessSheet
        visible={markCompleteSuccessVisible}
        onClose={() => setMarkCompleteSuccessVisible(false)}
      />

      {/* Leave Event Sheet */}
      <LeaveEventSheet
        visible={leaveEventVisible}
        onClose={() => setLeaveEventVisible(false)}
        onLeave={confirmLeaveEvent}
        isLoading={isActionLoading}
      />

      {/* Decline Invitation Sheet */}
      <DeclineInvitationSheet
        visible={declineInvitationVisible}
        onClose={() => setDeclineInvitationVisible(false)}
        onDecline={confirmDeclineInvitation}
        isLoading={isActionLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Status row
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inlineDrawButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  inlineDrawButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  // Unified info row (Draw, Exchange, Budget)
  unifiedInfoRow: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 12,
  },
  unifiedInfoSection: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  unifiedInfoDivider: {
    width: 1,
    marginVertical: 4,
  },
  unifiedInfoLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  unifiedInfoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Invite card
  inviteCard: {
    flexDirection: "column",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  inviteContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inviteTextContainer: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  inviteSubtitle: {
    fontSize: 13,
  },
  inviteButtons: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Assignment card
  assignmentCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  revealTouchable: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  giftIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  revealTextContainer: {
    flex: 1,
  },
  revealTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  revealSubtitle: {
    fontSize: 13,
  },
  revealedContainer: {
    padding: 14,
  },
  revealedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  revealedLabel: {
    fontSize: 12,
  },
  receiverAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  receiverAvatarSmallPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  receiverAvatarSmallText: {
    fontSize: 18,
    fontWeight: "600",
  },
  receiverTextContainer: {
    flex: 1,
  },
  receiverNameCompact: {
    fontSize: 16,
    fontWeight: "600",
  },
  viewWishlistBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  // Participants
  participantsCard: {
    padding: 0,
    overflow: "hidden",
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  participantRowBorder: {
    borderBottomWidth: 1,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  participantAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  participantAvatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "500",
  },
  organizerBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  participantStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  participantStatusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  seeAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Organizer actions
  organizerActions: {
    marginTop: 4,
    alignItems: "center",
  },
  drawNamesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    width: "100%",
  },
  drawNamesButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  drawNamesHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    width: "100%",
    borderWidth: 1,
    marginTop: 10,
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Wishlist link
  wishlistLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginTop: 4,
  },
  wishlistIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistLinkContent: {
    flex: 1,
  },
  wishlistLinkTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  wishlistLinkSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});
