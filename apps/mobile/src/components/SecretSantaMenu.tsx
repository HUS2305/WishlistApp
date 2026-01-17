import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";

interface SecretSantaMenuProps {
  visible: boolean;
  onClose: () => void;
  isOrganizer: boolean;
  participantStatus?: "INVITED" | "ACCEPTED" | "DECLINED" | null;
  eventStatus?: string;
  canDrawNames?: boolean;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDrawNames?: () => void;
  onMarkComplete?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
  onDecline?: () => void;
}

export function SecretSantaMenu({ 
  visible, 
  onClose, 
  isOrganizer,
  participantStatus,
  eventStatus,
  canDrawNames,
  onViewDetails,
  onEdit,
  onDrawNames,
  onMarkComplete,
  onDelete,
  onLeave,
  onDecline,
}: SecretSantaMenuProps) {
  const { theme } = useTheme();

  const handleViewDetails = () => {
    onClose();
    setTimeout(() => {
      onViewDetails?.();
    }, 100);
  };

  const handleEdit = () => {
    onClose();
    setTimeout(() => {
      onEdit?.();
    }, 100);
  };

  const handleDrawNames = () => {
    onClose();
    setTimeout(() => {
      onDrawNames?.();
    }, 100);
  };

  const handleMarkComplete = () => {
    onClose();
    setTimeout(() => {
      onMarkComplete?.();
    }, 100);
  };

  const handleDelete = () => {
    onClose();
    setTimeout(() => {
      onDelete?.();
    }, 100);
  };

  const handleLeave = () => {
    onClose();
    setTimeout(() => {
      onLeave?.();
    }, 100);
  };

  const handleDecline = () => {
    onClose();
    setTimeout(() => {
      onDecline?.();
    }, 100);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} autoHeight>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header - Standard pattern: centered title */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Options
          </Text>
        </View>

        {/* Menu Options */}
        <View style={styles.content}>
          {onViewDetails && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleViewDetails}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="eye" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  View Details
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* For organizers: Edit Event option (when PENDING) */}
          {isOrganizer && eventStatus === "PENDING" && onEdit && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="edit-2" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Edit Event
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* For organizers: Draw Names option (when PENDING and enough participants) */}
          {isOrganizer && eventStatus === "PENDING" && canDrawNames && onDrawNames && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleDrawNames}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="shuffle" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Draw Names
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* For organizers: End Event option (when DRAWN or IN_PROGRESS) */}
          {isOrganizer && (eventStatus === "DRAWN" || eventStatus === "IN_PROGRESS") && onMarkComplete && (
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.textSecondary + '20',
                },
              ]}
              onPress={handleMarkComplete}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="check-circle" 
                  size={20} 
                  color={theme.colors.textPrimary} 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  End Event
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* For organizers: Delete option */}
          {isOrganizer && onDelete && (
            <TouchableOpacity
              style={styles.optionRowLast}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="trash-2" 
                  size={20} 
                  color="#EF4444" 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: "#EF4444" },
                  ]}
                >
                  Delete Event
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* For participants who haven't accepted yet: Decline option */}
          {!isOrganizer && participantStatus === "INVITED" && onDecline && (
            <TouchableOpacity
              style={styles.optionRowLast}
              onPress={handleDecline}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="x-circle" 
                  size={20} 
                  color="#EF4444" 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: "#EF4444" },
                  ]}
                >
                  Decline Invitation
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* For participants who have accepted: Leave option */}
          {!isOrganizer && participantStatus === "ACCEPTED" && onLeave && (
            <TouchableOpacity
              style={styles.optionRowLast}
              onPress={handleLeave}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Feather 
                  name="log-out" 
                  size={20} 
                  color="#EF4444" 
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: "#EF4444" },
                  ]}
                >
                  Leave Event
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionRowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "400",
  },
});
