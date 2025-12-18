/**
 * @deprecated Use theme.ts instead
 * This file is kept for backwards compatibility
 * Import from '@/lib/theme' or '@/lib/styles' instead
 */

import { typography, getFontFamily as themeGetFontFamily } from "./theme";

// Re-export for backwards compatibility
export const fonts = typography.fonts.inter;

// Re-export helper function
export function getFontFamily(fontWeight?: string | number): string {
  return themeGetFontFamily(fontWeight);
}

// Export all fonts from theme
export { typography };

