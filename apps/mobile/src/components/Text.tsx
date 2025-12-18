/**
 * CUSTOM TEXT COMPONENT - Global Font Override
 * 
 * This is the REAL solution that actually works.
 * It wraps React Native's Text and forces the font we want.
 */
import React from "react";
import { Text as RNText, TextProps, StyleSheet } from "react-native";

// ⭐ CHANGE FONT HERE - This ONE line controls the ENTIRE app's font
const FONT_NAME = "Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold";

export function Text({ style, ...props }: TextProps) {
  // Check if this is an icon (icons have specific font families)
  const flatStyle = StyleSheet.flatten(style);
  const hasIconFont = flatStyle?.fontFamily && (
    flatStyle.fontFamily.includes('Feather') ||
    flatStyle.fontFamily.includes('MaterialIcons') ||
    flatStyle.fontFamily.includes('FontAwesome') ||
    flatStyle.fontFamily.includes('Ionicons')
  );
  
  // Don't override icon fonts
  if (hasIconFont) {
    return <RNText style={style} {...props} />;
  }
  
  // Apply our font to all regular text
  const forcedStyle = {
    ...flatStyle,
    fontFamily: FONT_NAME,
  };
  
  return <RNText style={forcedStyle} {...props} />;
}

