import React from "react";
import {
  TextInput,
  View,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { Text } from "../Text";
import { cn } from "@/lib/utils";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  containerStyle?: ViewStyle;
  className?: string;
}

export function Input({
  label,
  error,
  containerClassName,
  containerStyle,
  className,
  style,
  ...props
}: InputProps) {
  return (
    <View className={cn("mb-4", containerClassName)} style={containerStyle}>
      {label && (
        <Text className="text-sm text-foreground mb-2">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          "flex h-11 w-full rounded-lg bg-background px-4 py-2 text-base text-foreground",
          "placeholder:text-muted-foreground",
          className
        )}
        placeholderTextColor="#999"
        style={[{ borderWidth: 0 }, style]}
        {...props}
      />
      {error && (
        <Text className="text-xs text-destructive mt-1">
          {error}
        </Text>
      )}
    </View>
  );
}

