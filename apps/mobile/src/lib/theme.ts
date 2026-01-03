/**
 * Global Design System / Theme Tokens
 * 
 * This file contains all design tokens for the app:
 * - Colors
 * - Typography (fonts, sizes, weights)
 * - Spacing
 * - Border radius
 * - Shadows
 * 
 * Use these tokens throughout the app for consistency.
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: "#4A90E2", // Main brand blue
    dark: "#357ABD",    // Darker blue for gradients
    light: "#EFF6FF",   // Light blue for backgrounds
    foreground: "#FFFFFF", // Text on primary background
  },
  
  // Secondary colors
  secondary: {
    DEFAULT: "#F3F4F6",
    dark: "#E5E7EB",
    light: "#F9FAFB",
    foreground: "#1F2937",
  },
  
  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  
  // Text colors
  text: {
    primary: "#1F2937",      // Main text (dark gray)
    secondary: "#6B7280",    // Secondary text (medium gray)
    tertiary: "#9CA3AF",     // Tertiary text (light gray)
    inverse: "#FFFFFF",      // Text on dark backgrounds
    disabled: "#D1D5DB",     // Disabled text
  },
  
  // Background colors
  background: {
    DEFAULT: "#FFFFFF",      // Main background
    secondary: "#F5F5F7",    // Secondary background (light gray)
    tertiary: "#F9FAFB",     // Tertiary background
    dark: "#1F2937",         // Dark background
    overlay: "rgba(0, 0, 0, 0.5)", // Modal overlay
  },
  
  // Border colors
  border: {
    DEFAULT: "#E5E7EB",
    light: "#F3F4F6",
    dark: "#D1D5DB",
    focus: "#4A90E2",        // Focus state border
  },
  
  // UI element colors
  tabBar: {
    active: "#4A90E2",
    inactive: "#8E8E93",
    background: "#FFFFFF",
  },
  
  // Semantic colors (for compatibility with existing code)
  destructive: {
    DEFAULT: "#EF4444",
    foreground: "#FFFFFF",
  },
  
  muted: {
    DEFAULT: "#F9FAFB",
    foreground: "#6B7280",
  },
  
  accent: {
    DEFAULT: "#F3F4F6",
    foreground: "#1F2937",
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font families (for React Native - use fontFamily strings, not fontWeight)
  fonts: {
    // Default font (currently Playwrite CZ for verification)
    default: "PlaywriteCZ_400Regular",
    
    // Inter font family (for body text)
    inter: {
      regular: "Inter_400Regular",
      medium: "Inter_500Medium",
      semibold: "Inter_600SemiBold",
      bold: "Inter_700Bold",
    },
    
    // Playwrite CZ (handwriting style)
    playwrite: "PlaywriteCZ_400Regular",
    
    // Fallback
    system: "System",
  },
  
  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
    "5xl": 36,
  },
  
  // Line heights (as multipliers)
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
  
  // Font weights mapped to font families (React Native doesn't support fontWeight with custom fonts)
  fontWeight: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    // Numeric weights for convenience
    "400": "Inter_400Regular",
    "500": "Inter_500Medium",
    "600": "Inter_600SemiBold",
    "700": "Inter_700Bold",
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16, // Standardized to 16px for consistency (was 12)
  base: 16, // Alias for md
  lg: 24, // Standardized to 24px (was 20)
  xl: 32,
  "2xl": 40,
  "3xl": 48,
  "4xl": 64,
} as const;

// ============================================================================
// ICON SIZES
// ============================================================================

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  base: 24, // Default icon size
  lg: 28,
  xl: 32,
  "2xl": 40,
} as const;

// ============================================================================
// BUTTON SIZES
// ============================================================================

export const buttonSizes = {
  sm: {
    height: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.sm,
  },
  md: {
    height: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
  },
  lg: {
    height: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: typography.fontSize.md,
  },
} as const;

// ============================================================================
// HEADER SIZES
// ============================================================================

export const headerSizes = {
  height: 44, // Standard header button touch target
  paddingHorizontal: spacing.md, // 16px
  iconSize: iconSizes.base, // 24px
  titleFontSize: typography.fontSize.xl, // 20px
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 9999, // For circular elements
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get font family from fontWeight (for React Native compatibility)
 * 
 * NOTE: Playwrite CZ (our default font) only comes in one weight (400 Regular).
 * If you want different weights, you would need to use Inter explicitly.
 * This function now returns Playwrite CZ as the default for all cases.
 */
export function getFontFamily(fontWeight?: string | number): string {
  // ALWAYS return the default font (Playwrite CZ)
  // The default font only has one weight, so we ignore fontWeight parameter
  return typography.fonts.default;
  
  // If you want to use Inter with different weights, explicitly specify:
  // fontFamily: typography.fonts.inter.regular (or medium, semibold, bold)
}

/**
 * Create text style with font family based on fontWeight
 * React Native doesn't support fontWeight with custom fonts, so we map to fontFamily
 * 
 * NOTE: Now uses Playwrite CZ as the default font for all text.
 */
export function createTextStyle(
  fontSize?: number,
  fontWeight?: string | number,
  color?: string,
  fontFamily?: string
) {
  return {
    fontSize: fontSize || typography.fontSize.base,
    fontFamily: fontFamily || typography.fonts.default, // Always use Playwrite CZ unless explicitly overridden
    color: color || colors.text.primary,
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Color = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Theme = {
  colors: Color;
  typography: Typography;
  spacing: Spacing;
  iconSizes: typeof iconSizes;
  buttonSizes: typeof buttonSizes;
  headerSizes: typeof headerSizes;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
};

// Default export for convenience
export const theme: Theme = {
  colors,
  typography,
  spacing,
  iconSizes,
  buttonSizes,
  headerSizes,
  borderRadius,
  shadows,
};

export default theme;

