import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "@/components/Text";
import { useSignUp } from "@clerk/clerk-expo";
import { useState } from "react";
import { router } from "expo-router";
import { Button, Input, SafeAreaView } from "@/components/ui";

export default function VerifyScreen() {
  let signUpHook: ReturnType<typeof useSignUp> | null = null;
  try {
    signUpHook = useSignUp();
  } catch (error) {
    // Clerk not configured
  }

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onVerifyPress = async () => {
    if (!signUpHook?.isLoaded) {
      // If Clerk isn't configured, just navigate to tabs for testing
      router.replace("/(tabs)");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const completeSignUp = await signUpHook.signUp.attemptEmailAddressVerification({
        code,
      });

      await signUpHook.setActive({ session: completeSignUp.createdSessionId });
      // Small delay to ensure session is fully active before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      router.replace("/(auth)/create-profile");
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid verification code");
      console.error("Error verifying:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify Email</Text>
            <Text style={styles.subtitle}>
              Enter the verification code sent to your email
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Verification Code"
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title={signUpHook ? "Verify" : "Continue (Testing Mode)"}
              onPress={onVerifyPress}
              loading={loading}
              disabled={signUpHook ? !code || code.length !== 6 : false}
              style={styles.button}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#86868B",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
});

