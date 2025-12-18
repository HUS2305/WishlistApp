/**
 * Style Utilities
 * 
 * Helper functions for creating consistent styles using the theme
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { theme, colors, typography, spacing, borderRadius, shadows } from "./theme";
import { getFontFamily } from "./theme";

// ============================================================================
// TYPE HELPERS
// ============================================================================

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

// ============================================================================
// TEXT STYLE HELPERS
// ============================================================================

/**
 * Create a text style with font family from fontWeight
 * React Native doesn't support fontWeight with custom fonts
 */
export function textStyle(options: {
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "right" | "center" | "justify" | "auto";
  marginBottom?: number;
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
}): TextStyle {
  const {
    fontSize = typography.fontSize.base,
    fontWeight,
    color = colors.text.primary,
    fontFamily,
    lineHeight,
    letterSpacing,
    textAlign,
    marginBottom,
    textTransform,
  } = options;

  return {
    fontSize,
    fontFamily: fontFamily || getFontFamily(fontWeight),
    color,
    ...(lineHeight !== undefined && { lineHeight }),
    ...(letterSpacing !== undefined && { letterSpacing }),
    ...(textAlign !== undefined && { textAlign }),
    ...(marginBottom !== undefined && { marginBottom }),
    ...(textTransform !== undefined && { textTransform }),
  };
}

/**
 * Common text styles using theme
 */
export const textStyles = StyleSheet.create({
  // Headings
  h1: textStyle({
    fontSize: typography.fontSize["3xl"],
    fontWeight: "700",
    color: colors.text.primary,
  }),
  h2: textStyle({
    fontSize: typography.fontSize["2xl"],
    fontWeight: "700",
    color: colors.text.primary,
  }),
  h3: textStyle({
    fontSize: typography.fontSize.xl,
    fontWeight: "600",
    color: colors.text.primary,
  }),
  h4: textStyle({
    fontSize: typography.fontSize.lg,
    fontWeight: "600",
    color: colors.text.primary,
  }),
  
  // Body text
  body: textStyle({
    fontSize: typography.fontSize.base,
    fontWeight: "400",
    color: colors.text.primary,
  }),
  bodySmall: textStyle({
    fontSize: typography.fontSize.sm,
    fontWeight: "400",
    color: colors.text.secondary,
  }),
  
  // Labels
  label: textStyle({
    fontSize: typography.fontSize.sm,
    fontWeight: "500",
    color: colors.text.secondary,
  }),
  
  // Captions
  caption: textStyle({
    fontSize: typography.fontSize.xs,
    fontWeight: "400",
    color: colors.text.tertiary,
  }),
});

// ============================================================================
// COMMON STYLE PATTERNS
// ============================================================================

/**
 * Create a button style using theme colors
 */
export function buttonStyle(
  variant: "primary" | "secondary" | "outline" = "primary"
): ViewStyle {
  const base: ViewStyle = {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  };

  switch (variant) {
    case "primary":
      return {
        ...base,
        backgroundColor: colors.primary.DEFAULT,
      };
    case "secondary":
      return {
        ...base,
        backgroundColor: colors.secondary.DEFAULT,
      };
    case "outline":
      return {
        ...base,
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
      };
    default:
      return base;
  }
}

/**
 * Create a card style using theme
 */
export function cardStyle(elevated: boolean = false): ViewStyle {
  return {
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    ...(elevated ? shadows.md : {}),
  };
}

/**
 * Create container style
 */
export function containerStyle(): ViewStyle {
  return {
    flex: 1,
    backgroundColor: colors.background.secondary,
  };
}

/**
 * Create header style
 */
export function headerStyle(): ViewStyle {
  return {
    paddingTop: spacing["3xl"],
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  };
}

// ============================================================================
// SPACING HELPERS
// ============================================================================

/**
 * Get spacing value by key
 */
export function space(key: keyof typeof spacing): number {
  return spacing[key];
}

/**
 * Create padding style
 */
export function padding(
  top: keyof typeof spacing,
  right?: keyof typeof spacing,
  bottom?: keyof typeof spacing,
  left?: keyof typeof spacing
): ViewStyle {
  return {
    paddingTop: spacing[top],
    paddingRight: spacing[right || top],
    paddingBottom: spacing[bottom || top],
    paddingLeft: spacing[left || right || top],
  };
}

/**
 * Create margin style
 */
export function margin(
  top: keyof typeof spacing,
  right?: keyof typeof spacing,
  bottom?: keyof typeof spacing,
  left?: keyof typeof spacing
): ViewStyle {
  return {
    marginTop: spacing[top],
    marginRight: spacing[right || top],
    marginBottom: spacing[bottom || top],
    marginLeft: spacing[left || right || top],
  };
}

// ============================================================================
// EXPORT THEME FOR CONVENIENCE
// ============================================================================

export { theme, colors, typography, spacing, borderRadius, shadows };
export default theme;

