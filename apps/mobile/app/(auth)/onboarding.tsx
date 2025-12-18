import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { Text } from "@/components/Text";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Button, SafeAreaView } from "@/components/ui";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Animated Icon/Image Section */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🎁</Text>
            </View>
          </Animated.View>

          {/* Animated Text Section */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>Welcome to WishlistApp</Text>
            <Text style={styles.subtitle}>
              Create and share your wishlists with friends and family. Never miss
              a gift idea again!
            </Text>
          </Animated.View>

          {/* Animated Buttons */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Button
              title="Sign Up"
              onPress={() => router.push("/(auth)/signup")}
              variant="primary"
              size="large"
              style={styles.button}
            />
            <Button
              title="Sign In"
              onPress={() => router.push("/(auth)/login")}
              variant="outline"
              size="large"
              style={[styles.button, styles.signInButton]}
            />
          </Animated.View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    width: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 48,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconEmoji: {
    fontSize: 64,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  button: {
    width: "100%",
  },
  signInButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});



