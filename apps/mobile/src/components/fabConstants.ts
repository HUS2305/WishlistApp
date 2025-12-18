import { Platform } from "react-native";

export const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 100 : 80;
export const FAB_SIZE = 60;
export const FAB_PADDING = 20; // Padding from edges
export const NOTCH_DEPTH = 15; // Depth of notch in tab bar

// FAB center position from screen bottom
// The FAB should be positioned so its center is above the tab bar center
// For a nice notch effect, position it about 28px above tab bar center
// Formula: FAB center = TAB_BAR_HEIGHT + NOTCH_DEPTH - (FAB_SIZE / 2) + offset
// Reduced offset to move entire tab bar and FAB up
// Negative offset moves everything up (closer to screen bottom = higher on screen)
export const FAB_CENTER_POSITION = TAB_BAR_HEIGHT + NOTCH_DEPTH - (FAB_SIZE / 2) - 10;

// Calculate the bottom position for absolute positioning (container bottom edge)
// This is used for detail pages where FAB is positioned absolutely
// Formula: container bottom = FAB center - FAB_SIZE/2
export const FAB_BOTTOM_POSITION = FAB_CENTER_POSITION - FAB_SIZE / 2;

