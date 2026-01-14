import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { HeaderButton } from "@/components/PageHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { CreateSecretSantaSheet } from "@/components/CreateSecretSantaSheet";
import { secretSantaService } from "@/services/secretSanta";
import type { SecretSantaEvent } from "@/types";
import { useFocusEffect } from "expo-router";
import { Card } from "@/components/ui";

export default function SecretSantaScreen() {
  const { theme } = useTheme();
  const [events, setEvents] = useState<SecretSantaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);

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
        return "#10B981";
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

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {events.map((event) => (
          <Card key={event.id} style={styles.eventCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                // TODO: Navigate to event detail
                console.log("Navigate to event:", event.id);
              }}
            >
              <View style={styles.eventHeader}>
                <View style={styles.eventHeaderLeft}>
                  <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>
                    {event.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + "20" }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
                      {getStatusLabel(event.status)}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
              </View>
              
              <View style={styles.eventInfo}>
                <View style={styles.eventInfoRow}>
                  <Feather name="calendar" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.eventInfoText, { color: theme.colors.textSecondary }]}>
                    Exchange: {formatDate(event.exchangeDate)}
                  </Text>
                </View>
                
                {event.participants && (
                  <View style={styles.eventInfoRow}>
                    <Feather name="users" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.eventInfoText, { color: theme.colors.textSecondary }]}>
                      {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {event.budget && (
                  <View style={styles.eventInfoRow}>
                    <Feather name="dollar-sign" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.eventInfoText, { color: theme.colors.textSecondary }]}>
                      Budget: {event.currency || "USD"} {event.budget.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setCreateSheetVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eventHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  eventInfo: {
    gap: 8,
  },
  eventInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventInfoText: {
    fontSize: 14,
  },
  fabButton: {
    position: "absolute",
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});




