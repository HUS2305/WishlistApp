import React from "react";
import { TextInput, View, TextInputProps, ViewStyle, StyleSheet } from "react-native";
import { Text } from "../Text";
import { useTheme } from "@/contexts/ThemeContext";

interface HeroInputProps extends TextInputProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  variant?: "flat" | "bordered" | "faded" | "underlined";
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  labelPlacement?: "inside" | "outside" | "outside-left" | "outside-top";
}

export function HeroInput({
  label,
  description,
  errorMessage,
  isRequired = false,
  isInvalid = false,
  startContent,
  endContent,
  variant = "bordered",
  size = "md",
  radius = "md",
  labelPlacement = "outside-top",
  style,
  ...props
}: HeroInputProps) {
  const { theme } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { paddingVertical: 8, paddingHorizontal: 12, fontSize: 14 };
      case "lg":
        return { paddingVertical: 14, paddingHorizontal: 16, fontSize: 16 };
      default:
        return { paddingVertical: 10, paddingHorizontal: 16, fontSize: 16 };
    }
  };

  const getRadius = () => {
    switch (radius) {
      case "none":
        return 0;
      case "sm":
        return 4;
      case "lg":
        return 16;
      case "full":
        return 9999;
      default:
        return 12;
    }
  };

  const getVariantStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderWidth: variant === "underlined" ? 0 : 1.5,
      borderBottomWidth: variant === "underlined" ? 1.5 : undefined,
      borderColor: isInvalid
        ? theme.colors.error || "#EF4444"
        : theme.colors.textSecondary + "40",
      backgroundColor:
        variant === "flat" || variant === "underlined"
          ? "transparent"
          : theme.colors.background,
    };

    return baseStyle;
  };

  const sizeStyles = getSizeStyles();
  const isLabelOutsideLeft = labelPlacement === "outside-left";
  const isLabelInside = labelPlacement === "inside";
  const isLabelOutsideTop = labelPlacement === "outside-top" || labelPlacement === "outside";

  // For inside placement, show label as placeholder when empty
  const placeholder = isLabelInside && !props.value && !props.placeholder
    ? `${label}${isRequired ? " *" : ""}`
    : props.placeholder;

  return (
    <View style={[
      styles.container,
      isLabelOutsideLeft && styles.containerHorizontal
    ]}>
      {label && isLabelOutsideTop && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              { color: theme.colors.textPrimary },
              size === "sm" && styles.labelSm,
              size === "lg" && styles.labelLg,
            ]}
          >
            {label}
            {isRequired && (
              <Text style={{ color: theme.colors.error || "#EF4444" }}> *</Text>
            )}
          </Text>
        </View>
      )}

      {label && isLabelOutsideLeft && (
        <View style={styles.labelLeftContainer}>
          <Text
            style={[
              styles.labelLeft,
              { color: theme.colors.textPrimary },
              size === "sm" && styles.labelSm,
              size === "lg" && styles.labelLg,
            ]}
          >
            {label}
            {isRequired && (
              <Text style={{ color: theme.colors.error || "#EF4444" }}> *</Text>
            )}
          </Text>
        </View>
      )}

      <View style={styles.inputWrapperContainer}>
        <View
          style={[
            styles.inputWrapper,
            getVariantStyles(),
            {
              borderRadius: getRadius(),
              minHeight: size === "sm" ? 36 : size === "lg" ? 48 : 44,
              flex: isLabelOutsideLeft ? 1 : undefined,
            },
          ]}
        >
          {startContent && (
            <View style={styles.startContent}>{startContent}</View>
          )}
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                ...sizeStyles,
              },
              style,
            ]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            {...props}
          />
          {endContent && <View style={styles.endContent}>{endContent}</View>}
        </View>

        {(description || (isInvalid && errorMessage)) && (
          <View style={styles.helperContainer}>
            {description && !isInvalid && (
              <Text
                style={[
                  styles.description,
                  { color: theme.colors.textSecondary },
                  size === "sm" && styles.descriptionSm,
                ]}
              >
                {description}
              </Text>
            )}

            {isInvalid && errorMessage && (
              <Text
                style={[
                  styles.errorMessage,
                  { color: theme.colors.error || "#EF4444" },
                  size === "sm" && styles.errorMessageSm,
                ]}
              >
                {errorMessage}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },
  containerHorizontal: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  labelLeftContainer: {
    marginRight: 12,
    minWidth: 110,
    justifyContent: "center",
  },
  labelLeft: {
    fontSize: 14,
    fontWeight: "600",
  },
  labelSm: {
    fontSize: 12,
  },
  labelLg: {
    fontSize: 16,
  },
  inputWrapperContainer: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
  },
  helperContainer: {
    marginTop: 4,
  },
  startContent: {
    marginLeft: 12,
    marginRight: 8,
  },
  endContent: {
    marginRight: 12,
    marginLeft: 8,
  },
  description: {
    fontSize: 12,
    marginTop: 4,
  },
  descriptionSm: {
    fontSize: 11,
  },
  errorMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  errorMessageSm: {
    fontSize: 11,
  },
});

