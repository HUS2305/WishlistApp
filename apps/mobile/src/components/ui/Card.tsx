import React from "react";
import { View, ViewStyle, TextStyle } from "react-native";
import { Text } from "../Text";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  padding?: boolean;
}

export function Card({ 
  children, 
  className, 
  style, 
  padding = true 
}: CardProps) {
  const { theme } = useTheme();
  const cardBackgroundColor = theme.isDark ? '#2E2E2E' : '#D3D3D3';
  
  return (
    <View
      className={cn(
        "bg-card rounded-xl shadow-sm border border-border",
        padding && "p-4"
      )}
      style={[
        { backgroundColor: cardBackgroundColor },
        style
      ]}
    >
      {children}
    </View>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function CardHeader({ children, className, style }: CardHeaderProps) {
  return (
    <View className={cn("flex flex-col space-y-1.5 p-6", className)} style={style}>
      {children}
    </View>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle;
}

export function CardTitle({ children, className, style }: CardTitleProps) {
  return (
    <Text className={cn("text-2xl leading-none tracking-tight text-card-foreground", className)} style={style}>
      {children}
    </Text>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle;
}

export function CardDescription({ children, className, style }: CardDescriptionProps) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)} style={style}>
      {children}
    </Text>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function CardContent({ children, className, style }: CardContentProps) {
  return (
    <View className={cn("p-6 pt-0", className)} style={style}>
      {children}
    </View>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function CardFooter({ children, className, style }: CardFooterProps) {
  return (
    <View className={cn("flex flex-row items-center p-6 pt-0", className)} style={style}>
      {children}
    </View>
  );
}

