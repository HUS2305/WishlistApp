import { View, StyleSheet, Animated, Dimensions, Image, TouchableOpacity } from "react-native";
import { Text } from "@/components/Text";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");
const BOTTOM_CONTAINER_HEIGHT = height * 0.2; // ~28% of screen for bottom container

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Top Section - Text Content */}
      <View style={[styles.topSection, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>Never miss a gift idea again!</Text>
          <Text style={styles.subtitle}>
            Create and share your wishlists with friends and family.
          </Text>
        </Animated.View>
      </View>

      {/* Hero Image - Positioned behind bottom container, rotated clockwise */}
      <Animated.View
        style={[
          styles.heroImageContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Image
          source={require("../../assets/welcome-hero.png")}
          style={[styles.heroImage, { transform: [{ rotate: '10deg' }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Bottom Container - Dark gray with auth buttons */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Sign Up Button - Outlined style */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>

          {/* Sign In Button - Primary colored */}
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: "#f4f4f6",
  },
  topSection: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 2,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  heroImageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 20,
    marginBottom: -40, // Overlap with bottom container
    zIndex: 1, // Behind the bottom container
  },
  heroImage: {
    width: width * 0.9,
    height: height * 0.4,
  },
  bottomContainer: {
    backgroundColor: "#dfdfdf", // Lighter dark gray
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 20,
    minHeight: BOTTOM_CONTAINER_HEIGHT,
    zIndex: 3, // On top of the hero image
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  signUpButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  signUpButtonText: {
    color: "#1a1a1a",
    fontSize: 18,
    fontWeight: "600",
  },
  signInButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});



