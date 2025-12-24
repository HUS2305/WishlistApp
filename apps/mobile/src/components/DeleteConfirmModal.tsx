import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomSheet } from "./BottomSheet";

interface DeleteConfirmModalProps {
  visible: boolean;
  title: string;
  type?: "wishlist" | "item" | "notifications"; // Type of item being deleted
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  modalTitle?: string; // Optional custom modal title
}

export function DeleteConfirmModal({
  visible,
  title,
  type = "wishlist",
  onConfirm,
  onCancel,
  isDeleting = false,
  modalTitle,
}: DeleteConfirmModalProps) {
  const { theme } = useTheme();
  const defaultModalTitle = type === "item" ? "Delete Item" : type === "notifications" ? "Delete All Notifications" : "Delete Wishlist";
  const finalModalTitle = modalTitle || defaultModalTitle;

  return (
    <BottomSheet visible={visible} onClose={onCancel} autoHeight={true}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {finalModalTitle}
          </Text>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isDeleting}
          >
            <Feather 
              name="x" 
              size={24} 
              color={isDeleting ? theme.colors.textSecondary : theme.colors.textPrimary} 
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Warning Icon */}
          <View style={[
            styles.iconContainer,
            { backgroundColor: theme.isDark ? '#EF444420' : '#FEE2E2' }
          ]}>
            <Feather name="alert-triangle" size={32} color="#EF4444" />
          </View>

          {/* Message */}
          <Text style={[styles.message, { color: theme.colors.textPrimary }]}>
            {type === "notifications" 
              ? "Are you sure you want to delete all notifications? This action cannot be undone."
              : modalTitle === "Sign Out"
              ? "Are you sure you want to sign out? You'll need to sign in again to access your account."
              : modalTitle === "Delete Account"
              ? "Are you sure you want to delete your account? This will permanently delete all your wishlists, items, and profile data. This action cannot be undone."
              : modalTitle === "Block User"
              ? `Are you sure you want to block ${title}? You won't be able to see their profile or send them friend requests.`
              : modalTitle === "Remove Friend"
              ? `Are you sure you want to remove ${title}? This action cannot be undone.`
              : `Are you sure you want to delete "${title}"? This action cannot be undone.`
            }
          </Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: theme.isDark ? '#2E2E2E' : '#F3F4F6',
                  borderColor: theme.colors.textSecondary + '40',
                }
              ]}
              onPress={onCancel}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.cancelButtonText,
                { color: theme.colors.textPrimary }
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.deleteButton,
                isDeleting && styles.deleteButtonDisabled
              ]}
              onPress={onConfirm}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>
                  {modalTitle === "Sign Out" ? "Sign Out" : modalTitle === "Block User" ? "Block" : modalTitle === "Remove Friend" ? "Remove" : "Delete"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerSpacer: {
    width: 24, // Same width as close button to center the title
  },
  closeButton: {
    padding: 4,
    zIndex: 1,
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
