import React from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

interface QuickActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onCreateWishlist?: () => void;
  onAddItem?: () => void;
  disableAddItem?: boolean;
}

interface ActionButton {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}

export function QuickActionMenu({ visible, onClose, onCreateWishlist, onAddItem, disableAddItem = false }: QuickActionMenuProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const actions: ActionButton[] = [
    {
      label: "Create Wishlist",
      icon: "list",
      color: "#4A90E2",
      onPress: () => {
        onClose();
        if (onCreateWishlist) {
          onCreateWishlist();
        } else {
          router.push("/wishlist/create");
        }
      },
    },
    {
      label: "Add Gift/Item",
      icon: "gift",
      color: "#FFB84D",
      onPress: () => {
        onClose();
        if (onAddItem && !disableAddItem) {
          onAddItem();
        } else {
          console.log("Add gift/item - need to select wishlist first");
        }
      },
      disabled: disableAddItem,
    },
    {
      label: "Search Friends",
      icon: "user-plus",
      color: "#FF6B6B",
      onPress: () => {
        onClose();
        router.push("/(tabs)/friends");
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.actionsContainer}>
            {actions.map((action) => (
              <Animated.View
                key={action.label}
                style={[
                  styles.actionWrapper,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={action.onPress}
                  activeOpacity={0.8}
                  style={[styles.actionButton, action.disabled && styles.actionButtonDisabled]}
                  disabled={action.disabled}
                >
                  <View style={[styles.iconContainer, { backgroundColor: action.disabled ? "#CCCCCC" : action.color }]}>
                    <Feather name={action.icon} size={24} color="#fff" />
                  </View>
                  <Text style={[styles.actionLabel, action.disabled && styles.actionLabelDisabled]}>{action.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 96,
  },
  actionsContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actionWrapper: {
    width: "100%",
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    // Use boxShadow for web compatibility, shadow* props for native
    ...(Platform.OS === 'web' ? {
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    } : {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionLabelDisabled: {
    color: "#999",
  },
});
