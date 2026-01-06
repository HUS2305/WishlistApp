import React from "react";
import { TouchableOpacity, ViewStyle, ActivityIndicator } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Text } from "./Text";

type SocialProvider = "google" | "apple" | "facebook";

interface SocialSignInButtonProps {
  provider: SocialProvider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const providerConfig = {
  google: {
    label: "Google",
    backgroundColor: "#FFFFFF",
    textColor: "#1A1A1A",
    borderColor: "#E5E7EB",
    iconName: "google" as const,
  },
  apple: {
    label: "Apple",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    borderColor: "#000000",
    iconName: "apple" as const,
  },
  facebook: {
    label: "Facebook",
    backgroundColor: "#1877F2",
    textColor: "#FFFFFF",
    borderColor: "#1877F2",
    iconName: "facebook-f" as const,
  },
};

export function SocialSignInButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  style,
}: SocialSignInButtonProps) {
  const config = providerConfig[provider];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          height: 44,
          borderRadius: 8,
          backgroundColor: config.backgroundColor,
          borderWidth: 1,
          borderColor: config.borderColor,
          paddingHorizontal: 16,
          paddingVertical: 8,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={config.textColor}
        />
      ) : (
        <>
          <FontAwesome5
            name={config.iconName}
            size={18}
            color={config.textColor}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontSize: 15,
              fontWeight: "500",
              color: config.textColor,
            }}
          >
            {config.label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

