import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useTheme } from "@/contexts/ThemeContext";

export default function PreferencesScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Preferences"
        backButton={true}
        onBack={() => router.push("/(tabs)/settings")}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.menuContainer}>
          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Notifications
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Manage your notification preferences
            </Text>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="bell" size={24} color={theme.colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
                Push Notifications
              </Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                Receive push notifications on your device
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Appearance Section */}
          <View style={[styles.section, styles.sectionSpacing]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Appearance
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Customize the look and feel of the app
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/appearance")}
          >
            <Feather name="sliders" size={24} color={theme.colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
                Theme
              </Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
                Choose your color theme
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuContainer: {
    marginBottom: 32,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionSpacing: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 16,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginLeft: 20,
    marginRight: 16,
    opacity: 1,
  },
});

