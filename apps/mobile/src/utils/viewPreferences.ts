import { Platform } from 'react-native';

// Declare localStorage for TypeScript when on web
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
} | undefined;

export type ViewMode = 'normal' | 'compact';

const VIEW_MODE_KEY = 'wishlist-view-mode';

// Default view mode
export const DEFAULT_VIEW_MODE: ViewMode = 'normal';

/**
 * Load view mode preference from storage
 * Uses SecureStore on mobile, localStorage on web
 */
export const loadViewModePreference = async (userId?: string): Promise<ViewMode> => {
  try {
    const key = userId ? `${VIEW_MODE_KEY}-${userId}` : VIEW_MODE_KEY;
    let savedMode: string | null = null;
    
    if (Platform.OS === 'web') {
      savedMode = (typeof localStorage !== 'undefined' && localStorage) ? localStorage.getItem(key) : null;
    } else {
      try {
        const SecureStore = require('expo-secure-store');
        savedMode = await SecureStore.getItemAsync(key);
      } catch (error) {
        console.error('Failed to load view mode preference:', error);
      }
    }
    
    // Validate that it's a valid view mode
    const validModes: ViewMode[] = ['normal', 'compact'];
    if (savedMode && validModes.includes(savedMode as ViewMode)) {
      return savedMode as ViewMode;
    }
  } catch (error) {
    console.error('Error loading view mode preference:', error);
  }
  
  return DEFAULT_VIEW_MODE;
};

/**
 * Save view mode preference to storage
 * Uses SecureStore on mobile, localStorage on web
 */
export const saveViewModePreference = async (mode: ViewMode, userId?: string): Promise<void> => {
  try {
    const key = userId ? `${VIEW_MODE_KEY}-${userId}` : VIEW_MODE_KEY;
    
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(key, mode);
      }
    } else {
      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync(key, mode);
      } catch (error) {
        console.error('Failed to save view mode preference:', error);
      }
    }
  } catch (error) {
    console.error('Error saving view mode preference:', error);
  }
};




