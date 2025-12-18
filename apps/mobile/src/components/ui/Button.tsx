import React from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { Text } from "../Text";
import { cn } from "@/lib/utils";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

const variantStyles = {
  default: "bg-primary text-primary-foreground active:bg-primary/90",
  primary: "bg-primary text-primary-foreground active:bg-primary/90", // Alias for default
  secondary: "bg-secondary text-secondary-foreground active:bg-secondary/80",
  outline: "border-2 border-primary bg-transparent text-primary active:bg-primary/10",
  ghost: "bg-transparent text-primary active:bg-primary/10",
  destructive: "bg-destructive text-destructive-foreground active:bg-destructive/90",
};

const sizeStyles = {
  sm: "px-4 py-2 h-9",
  small: "px-4 py-2 h-9", // Alias
  md: "px-6 py-3 h-11",
  medium: "px-6 py-3 h-11", // Alias
  lg: "px-8 py-4 h-14",
  large: "px-8 py-4 h-14", // Alias
};

const textSizeStyles = {
  sm: "text-sm",
  small: "text-sm",
  md: "text-base",
  medium: "text-base",
  lg: "text-lg",
  large: "text-lg",
};

export function Button({
  title,
  onPress,
  variant = "primary", // Default to "primary" for backward compatibility
  size = "medium", // Default to "medium" for backward compatibility
  loading = false,
  disabled = false,
  className,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  // Normalize variant (primary -> default for internal use)
  const normalizedVariant = variant === "primary" ? "default" : variant;

  return (
    <TouchableOpacity
      className={cn(
        "rounded-lg items-center justify-center flex-row font-semibold",
        variantStyles[normalizedVariant as keyof typeof variantStyles],
        sizeStyles[size as keyof typeof sizeStyles],
        isDisabled && "opacity-50",
        className
      )}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          color={normalizedVariant === "outline" || normalizedVariant === "ghost" ? "#007AFF" : "#fff"}
          size="small"
        />
      ) : (
        <Text
          className={cn(
            "font-semibold",
            textSizeStyles[size as keyof typeof textSizeStyles],
            normalizedVariant === "outline" || normalizedVariant === "ghost"
              ? "text-primary"
              : normalizedVariant === "secondary"
              ? "text-secondary-foreground"
              : normalizedVariant === "destructive"
              ? "text-destructive-foreground"
              : "text-primary-foreground"
          )}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

