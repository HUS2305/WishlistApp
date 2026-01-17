import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { HeaderButton } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { CreateSecretSantaSheet } from "@/components/CreateSecretSantaSheet";
import { EditSecretSantaSheet } from "@/components/EditSecretSantaSheet";
import { secretSantaService } from "@/services/secretSanta";
import type { SecretSantaEvent } from "@/types";
import { useFocusEffect, router } from "expo-router";
import { SecretSantaMenu } from "@/components/SecretSantaMenu";
import { DeleteConfirmModal } from "@/components";
import { DrawNamesConfirmSheet } from "@/components/DrawNamesConfirmSheet";
import { DrawNamesSuccessSheet } from "@/components/DrawNamesSuccessSheet";
import { LeaveEventSheet } from "@/components/LeaveEventSheet";
import { DeclineInvitationSheet } from "@/components/DeclineInvitationSheet";
import { MarkCompleteConfirmSheet } from "@/components/MarkCompleteConfirmSheet";
import { MarkCompleteSuccessSheet } from "@/components/MarkCompleteSuccessSheet";
import { PriceDisplay } from "@/components/PriceDisplay";

export default function SecretSantaScreen() {
  const { theme } = useTheme();
  const { refreshPendingSecretSantaInvitationsCount } = useNotificationContext();
  const [events, setEvents] = useState<SecretSantaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<SecretSantaEvent | null>(null);
  const [drawConfirmVisible, setDrawConfirmVisible] = useState(false);
  const [drawSuccessVisible, setDrawSuccessVisible] = useState(false);
  const [eventToDrawNames, setEventToDrawNames] = useState<SecretSantaEvent | null>(null);
  const [leaveEventVisible, setLeaveEventVisible] = useState(false);
  const [eventToLeave, setEventToLeave] = useState<string | null>(null);
  const [declineInvitationVisible, setDeclineInvitationVisible] = useState(false);
  const [eventToDecline, setEventToDecline] = useState<string | null>(null);
  const [markCompleteVisible, setMarkCompleteVisible] = useState(false);
  const [markCompleteSuccessVisible, setMarkCompleteSuccessVisible] = useState(false);
  const [eventToMarkComplete, setEventToMarkComplete] = useState<string | null>(null);

  const loadEvents = useCallback(async (showLoader = true) => {
    try {
      if (showLoader && events.length === 0) {
        setIsLoading(true);
      }
      const data = await secretSantaService.getEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error loading Secret Santa events:", error);
      setEvents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [events.length]);

  useFocusEffect(
    useCallback(() => {
      loadEvents(true);
    }, [loadEvents])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadEvents(false);
  };

  const handleAcceptInvitation = async (eventId: string) => {
    setIsActionLoading(true);
    try {
      await secretSantaService.acceptInvitation(eventId);
      await refreshPendingSecretSantaInvitationsCount();
      loadEvents(false);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to accept invitation");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeclineInvitation = (eventId: string) => {
    setMenuEventId(null);
    setEventToDecline(eventId);
    setDeclineInvitationVisible(true);
  };

  const confirmDeclineInvitation = async () => {
    if (!eventToDecline) return;

    setIsActionLoading(true);
    try {
      await secretSantaService.declineInvitation(eventToDecline);
      await refreshPendingSecretSantaInvitationsCount();
      setDeclineInvitationVisible(false);
      setEventToDecline(null);
      loadEvents(false);
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      setDeclineInvitationVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to decline invitation");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveEvent = (eventId: string) => {
    setMenuEventId(null);
    setEventToLeave(eventId);
    setLeaveEventVisible(true);
  };

  const confirmLeaveEvent = async () => {
    if (!eventToLeave) return;

    setIsActionLoading(true);
    try {
      await secretSantaService.declineInvitation(eventToLeave);
      setLeaveEventVisible(false);
      setEventToLeave(null);
      loadEvents(false);
    } catch (error: any) {
      console.error("Error leaving event:", error);
      setLeaveEventVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to leave event");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkComplete = (eventId: string) => {
    setMenuEventId(null);
    setEventToMarkComplete(eventId);
    setMarkCompleteVisible(true);
  };

  const confirmMarkComplete = async () => {
    if (!eventToMarkComplete) return;

    setIsActionLoading(true);
    try {
      await secretSantaService.markAsCompleted(eventToMarkComplete);
      setMarkCompleteVisible(false);
      setMarkCompleteSuccessVisible(true);
      loadEvents(false);
    } catch (error: any) {
      console.error("Error marking complete:", error);
      setMarkCompleteVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to mark as completed");
    } finally {
      setIsActionLoading(false);
      setEventToMarkComplete(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setMenuEventId(null);
    setEventToDelete(eventId);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    setIsActionLoading(true);
    try {
      await secretSantaService.deleteEvent(eventToDelete);
      setDeleteConfirmVisible(false);
      setEventToDelete(null);
      loadEvents(false);
    } catch (error: any) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to delete event");
    } finally {
      setIsActionLoading(false);
    }
  };

  const getMenuEvent = () => events.find(e => e.id === menuEventId);

  const handleEditEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setMenuEventId(null);
      setEventToEdit(event);
      setEditSheetVisible(true);
    }
  };

  const handleDrawNames = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setMenuEventId(null);
    setEventToDrawNames(event);
    setDrawConfirmVisible(true);
  };

  const confirmDrawNames = async () => {
    if (!eventToDrawNames) return;

    setIsActionLoading(true);
    try {
      await secretSantaService.drawNames(eventToDrawNames.id);
      setDrawConfirmVisible(false);
      setDrawSuccessVisible(true);
      loadEvents(false);
    } catch (error: any) {
      console.error("Error drawing names:", error);
      setDrawConfirmVisible(false);
      Alert.alert("Error", error.response?.data?.message || "Failed to draw names");
    } finally {
      setIsActionLoading(false);
    }
  };

  const canDrawNamesForEvent = (event: SecretSantaEvent) => {
    const acceptedCount = event.participants?.filter(p => p.status === "ACCEPTED").length || 0;
    return event.isOrganizer && event.status === "PENDING" && acceptedCount >= 3;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "DRAWN":
        return "Names Drawn";
      case "IN_PROGRESS":
        return "In Progress";
      case "COMPLETED":
        return "Completed";
      default:
        return status;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            Loading events...
          </Text>
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="gift" size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Secret Santa events yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Create your first Secret Santa event and invite your friends
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setCreateSheetVisible(true)}
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isInvited = (event: SecretSantaEvent) => event.myParticipantStatus === "INVITED";

    return (
      <View style={styles.listContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        >
          {events.map((event, index) => (
            <View key={event.id}>
              <TouchableOpacity
                onPress={() => router.push(`/secret-santa/${event.id}`)}
                activeOpacity={0.7}
                style={styles.card}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.titleRow}>
                      <Text 
                        style={[styles.cardTitle, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {event.title}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + "20" }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
                          {getStatusLabel(event.status)}
                        </Text>
                      </View>
                    </View>
                    {/* Row 1: Budget + Participants */}
                    <View style={styles.metricsRow}>
                      {event.budget && (
                        <>
                          <PriceDisplay
                            amount={event.budget}
                            currency={event.currency}
                            textStyle={[styles.metricText, { color: theme.colors.textSecondary }]}
                          />
                          <View style={[styles.metricDivider, { backgroundColor: theme.colors.textSecondary + '40' }]} />
                        </>
                      )}
                      <Feather name="users" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.metricText, { color: theme.colors.textSecondary }]}>
                        {event.participants?.length || 0}
                      </Text>
                    </View>
                    {/* Row 2: Dates */}
                    <View style={styles.metricsRow}>
                      <Feather name="shuffle" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.metricText, { color: theme.colors.textSecondary }]}>
                        {formatDate(event.drawDate)}
                      </Text>
                      <View style={[styles.metricDivider, { backgroundColor: theme.colors.textSecondary + '40' }]} />
                      <Feather name="gift" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.metricText, { color: theme.colors.textSecondary }]}>
                        {formatDate(event.exchangeDate)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setMenuEventId(event.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.menuButton}
                  >
                    <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Inline Accept/Decline for invited events */}
                {isInvited(event) && (
                  <View style={styles.inviteActions}>
                    <TouchableOpacity
                      style={[styles.declineBtn, { borderColor: theme.colors.textSecondary + "40" }]}
                      onPress={() => handleDeclineInvitation(event.id)}
                      disabled={isActionLoading}
                    >
                      <Text style={[styles.declineBtnText, { color: theme.colors.textSecondary }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }]}
                      onPress={() => handleAcceptInvitation(event.id)}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
              {index < events.length - 1 && (
                <View style={[styles.cardDivider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Event Menu */}
        <SecretSantaMenu
          visible={!!menuEventId}
          onClose={() => setMenuEventId(null)}
          isOrganizer={getMenuEvent()?.isOrganizer || false}
          participantStatus={getMenuEvent()?.myParticipantStatus}
          eventStatus={getMenuEvent()?.status}
          canDrawNames={getMenuEvent() ? canDrawNamesForEvent(getMenuEvent()!) : false}
          onViewDetails={() => {
            if (menuEventId) {
              router.push(`/secret-santa/${menuEventId}`);
            }
          }}
          onEdit={() => {
            if (menuEventId) {
              handleEditEvent(menuEventId);
            }
          }}
          onDrawNames={() => {
            if (menuEventId) {
              handleDrawNames(menuEventId);
            }
          }}
          onMarkComplete={() => {
            if (menuEventId) {
              handleMarkComplete(menuEventId);
            }
          }}
          onDelete={() => {
            if (menuEventId) {
              handleDeleteEvent(menuEventId);
            }
          }}
          onLeave={() => {
            if (menuEventId) {
              handleLeaveEvent(menuEventId);
            }
          }}
          onDecline={() => {
            if (menuEventId) {
              handleDeclineInvitation(menuEventId);
            }
          }}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          visible={deleteConfirmVisible}
          title={events.find(e => e.id === eventToDelete)?.title || "this event"}
          modalTitle="Delete Event"
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteConfirmVisible(false);
            setEventToDelete(null);
          }}
          isDeleting={isActionLoading}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Secret Santa"
        backButton={false}
        extraTopPadding={8}
        rightActions={
          <HeaderButton
            icon="plus"
            onPress={() => setCreateSheetVisible(true)}
          />
        }
      />

      {renderContent()}

      <CreateSecretSantaSheet
        visible={createSheetVisible}
        onClose={() => setCreateSheetVisible(false)}
        onSuccess={() => {
          loadEvents(false);
        }}
      />

      <EditSecretSantaSheet
        visible={editSheetVisible}
        onClose={() => {
          setEditSheetVisible(false);
          setEventToEdit(null);
        }}
        onSuccess={() => {
          loadEvents(false);
        }}
        event={eventToEdit}
      />

      <DrawNamesConfirmSheet
        visible={drawConfirmVisible}
        onClose={() => {
          setDrawConfirmVisible(false);
          setEventToDrawNames(null);
        }}
        onConfirm={confirmDrawNames}
        participantCount={eventToDrawNames?.participants?.filter(p => p.status === "ACCEPTED").length || 0}
        isLoading={isActionLoading}
      />

      <DrawNamesSuccessSheet
        visible={drawSuccessVisible}
        onClose={() => {
          setDrawSuccessVisible(false);
          setEventToDrawNames(null);
        }}
      />

      <LeaveEventSheet
        visible={leaveEventVisible}
        onClose={() => {
          setLeaveEventVisible(false);
          setEventToLeave(null);
        }}
        onLeave={confirmLeaveEvent}
        isLoading={isActionLoading}
      />

      <DeclineInvitationSheet
        visible={declineInvitationVisible}
        onClose={() => {
          setDeclineInvitationVisible(false);
          setEventToDecline(null);
        }}
        onDecline={confirmDeclineInvitation}
        isLoading={isActionLoading}
      />

      <MarkCompleteConfirmSheet
        visible={markCompleteVisible}
        onClose={() => {
          setMarkCompleteVisible(false);
          setEventToMarkComplete(null);
        }}
        onConfirm={confirmMarkComplete}
        isLoading={isActionLoading}
      />

      <MarkCompleteSuccessSheet
        visible={markCompleteSuccessVisible}
        onClose={() => {
          setMarkCompleteSuccessVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    paddingVertical: 12,
  },
  cardContent: {
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
  },
  cardLeft: {
    flex: 1,
    marginRight: 16,
  },
  cardDivider: {
    height: 1,
    width: "95%",
    alignSelf: "center",
    marginVertical: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metricText: {
    fontSize: 12,
    marginLeft: 4,
  },
  metricDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 8,
  },
  menuButton: {
    padding: 4,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
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
});




