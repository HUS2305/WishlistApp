import { View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { PageHeader } from "@/components/PageHeader";
import { ThemeName, themes, getThemeDisplayName } from "@/lib/themes";
import { useTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";

export default function AppearanceScreen() {
  const { themeName, setTheme, theme: currentTheme } = useTheme();

  const handleThemeSelect = async (name: ThemeName) => {
    await setTheme(name);
    // Theme change will be reflected immediately through the context
  };


  const themeOptions: ThemeName[] = [
    'modernLight',
    'darkMode',
    'nature',
    'cyberpunk',
    'sunset',
    'emerald',
  ];

  const getThemePreview = (name: ThemeName) => {
    const theme = themes[name];
    return {
      primary: theme.colors.primary,
      background: theme.colors.background,
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <PageHeader
        title="Appearance"
        backButton={true}
        onBack={() => router.push("/(tabs)/settings")}
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textPrimary }]}>
            Color Theme
          </Text>
          <Text style={[styles.sectionDescription, { color: currentTheme.colors.textSecondary }]}>
            Choose a color theme for the entire app. Changes apply immediately.
          </Text>
        </View>

        <View style={styles.themesGrid}>
          {themeOptions.map((name) => {
            const isSelected = themeName === name;
            const preview = getThemePreview(name);
            const displayName = getThemeDisplayName(name);

            return (
              <TouchableOpacity
                key={name}
                onPress={() => handleThemeSelect(name)}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: currentTheme.colors.surface,
                    borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.surface,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.themePreview}>
                  <View
                    style={[
                      styles.colorPreview,
                      {
                        backgroundColor: preview.primary,
                        borderColor: preview.background,
                        borderWidth: 2,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.colorPreview,
                      {
                        backgroundColor: preview.background,
                        marginLeft: -8,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.themeName,
                    {
                      color: currentTheme.colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {displayName}
                </Text>
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: currentTheme.colors.primary },
                    ]}
                  >
                    <Feather name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 32,
  },
  themeCard: {
    width: "47%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themePreview: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  themeName: {
    fontSize: 14,
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
