import { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/Text";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import type { PrivacyLevel } from "@/types";
import { wishlistsService } from "@/services/wishlists";
import { useTheme } from "@/contexts/ThemeContext";
import { StandardPageHeader } from "@/components/StandardPageHeader";

export default function CreateWishlistScreen() {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("PRIVATE");
  const [allowComments, setAllowComments] = useState(true);
  const [allowReservations, setAllowReservations] = useState(true);
  const [isLoading, setIsLoading] = useState(false);


  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a wishlist title");
      return;
    }

    console.log("🎯 Creating wishlist with data:", {
      title: title.trim(),
      description: description.trim() || undefined,
      privacyLevel,
      allowComments,
      allowReservations,
    });

    setIsLoading(true);
    try {
      const wishlist = await wishlistsService.createWishlist({
        title: title.trim(),
        description: description.trim() || undefined,
        privacyLevel,
        allowComments,
        allowReservations,
      });

      console.log("✅ Wishlist created successfully:", wishlist);
      
      // Navigate directly to the wishlist detail page
      router.replace(`/wishlist/${wishlist.id}`);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Create Wishlist"
        backButton={true}
        rightActions={
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isLoading || !title.trim()}
            style={[
              styles.saveButton,
              {
                backgroundColor: theme.colors.surface,
                opacity: (!title.trim() || isLoading) ? 0.5 : 1,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>Create</Text>
            )}
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Basic Info */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Title <Text style={[styles.required, { color: theme.colors.error }]}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB',
                    borderColor: theme.colors.textSecondary + '40',
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="e.g., Birthday 2025"
                placeholderTextColor={theme.colors.textSecondary + '80'}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Description</Text>
              <TextInput
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
        </Card>

        {/* Privacy Settings */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Privacy</Text>

            <TouchableOpacity
              style={[
                styles.privacyOption,
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
              <View style={styles.privacyOptionLeft}>
                <Feather
                  name="lock"
                  size={24}
                  color={privacyLevel === "PRIVATE" ? theme.colors.primary : theme.colors.textSecondary}
                />
                <View style={styles.privacyOptionText}>
                  <Text style={[styles.privacyOptionTitle, { color: theme.colors.textPrimary }]}>Private</Text>
                  <Text style={[styles.privacyOptionDescription, { color: theme.colors.textSecondary }]}>Only you can see this</Text>
                </View>
              </View>
              {privacyLevel === "PRIVATE" && (
                <Feather name="check-circle" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
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
              <View style={styles.privacyOptionLeft}>
                <Feather
                  name="users"
                  size={24}
                  color={privacyLevel === "FRIENDS_ONLY" ? theme.colors.primary : theme.colors.textSecondary}
                />
                <View style={styles.privacyOptionText}>
                  <Text style={[styles.privacyOptionTitle, { color: theme.colors.textPrimary }]}>Friends Only</Text>
                  <Text style={[styles.privacyOptionDescription, { color: theme.colors.textSecondary }]}>Only friends can see this</Text>
                </View>
              </View>
              {privacyLevel === "FRIENDS_ONLY" && (
                <Feather name="check-circle" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
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
              <View style={styles.privacyOptionLeft}>
                <Feather
                  name="globe"
                  size={24}
                  color={privacyLevel === "PUBLIC" ? theme.colors.primary : theme.colors.textSecondary}
                />
                <View style={styles.privacyOptionText}>
                  <Text style={[styles.privacyOptionTitle, { color: theme.colors.textPrimary }]}>Public</Text>
                  <Text style={[styles.privacyOptionDescription, { color: theme.colors.textSecondary }]}>Anyone can see this</Text>
                </View>
              </View>
              {privacyLevel === "PUBLIC" && (
                <Feather name="check-circle" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Additional Settings */}
        <Card style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="message-circle" size={24} color={theme.colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>Allow Comments</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Let others comment on items</Text>
                </View>
              </View>
              <Switch 
                value={allowComments} 
                onValueChange={setAllowComments}
                trackColor={{ false: theme.colors.textSecondary + '40', true: theme.colors.primary + '80' }}
                thumbColor={allowComments ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '40' }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="bookmark" size={24} color={theme.colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>Allow Reservations</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Let others reserve items</Text>
                </View>
              </View>
              <Switch 
                value={allowReservations} 
                onValueChange={setAllowReservations}
                trackColor={{ false: theme.colors.textSecondary + '40', true: theme.colors.primary + '80' }}
                thumbColor={allowReservations ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
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
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  privacyOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  privacyOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  privacyOptionDescription: {
    fontSize: 12,
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

