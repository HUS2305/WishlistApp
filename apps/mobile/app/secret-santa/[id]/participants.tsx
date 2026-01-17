import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { secretSantaService } from "@/services/secretSanta";
import type { SecretSantaEvent } from "@/types";
import { getDisplayName } from "@/lib/utils";
import { Card } from "@/components/ui";

export default function ParticipantsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as string;

  const [event, setEvent] = useState<SecretSantaEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEvent = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const eventData = await secretSantaService.getEvent(eventId);
      setEvent(eventData);
    } catch (error) {
      console.error("Error loading event:", error);
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

  const getParticipantStatusColor = (status: string): string => {
    switch (status) {
      case "ACCEPTED":
        return "#10B981";
      case "INVITED":
        return theme.colors.primary;
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

  const acceptedParticipants = event?.participants?.filter(p => p.status === "ACCEPTED") || [];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StandardPageHeader 
          title="Participants" 
          onBack={() => router.push(`/secret-santa/${eventId}`)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader 
        title="Participants" 
        onBack={() => router.push(`/secret-santa/${eventId}`)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          {acceptedParticipants.length} of {event?.participants?.length || 0} participants joined
        </Text>

        <Card style={[styles.participantsCard, { borderRadius: 12, backgroundColor: theme.colors.surface }]}>
          {event?.participants?.map((participant, index) => {
            const isLast = index === (event.participants?.length || 0) - 1;
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
                    {participant.userId === event?.organizerId && (
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
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  countText: {
    fontSize: 14,
    marginBottom: 12,
  },
  participantsCard: {
    padding: 4,
    overflow: "hidden",
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  participantRowBorder: {
    borderBottomWidth: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  participantAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  participantAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: "500",
  },
  organizerBadge: {
    fontSize: 13,
    fontWeight: "500",
  },
  participantStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  participantStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
