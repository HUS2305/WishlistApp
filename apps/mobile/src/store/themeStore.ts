import { create } from 'zustand';
import { Platform } from 'react-native';
import { ThemeName, Theme, getTheme, defaultThemeName } from '@/lib/themes';

const THEME_STORAGE_KEY = 'theme-preference';

// Platform-specific storage helpers
const storageGetItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    // For native, use SecureStore - dynamic import to avoid web bundling issues
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Failed to load SecureStore:', error);
      return null;
    }
  }
};

const storageSetItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    // For native, use SecureStore
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Failed to save to SecureStore:', error);
    }
  }
};

interface ThemeStore {
  themeName: ThemeName;
  setTheme: (name: ThemeName) => Promise<void>;
  getCurrentTheme: () => Theme;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  themeName: defaultThemeName,
  setTheme: async (name: ThemeName) => {
    set({ themeName: name });
    try {
      await storageSetItem(THEME_STORAGE_KEY, name);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  },
  loadTheme: async () => {
    try {
      const savedTheme = await storageGetItem(THEME_STORAGE_KEY);
      const validThemes: ThemeName[] = ['modernLight', 'darkMode', 'nature', 'cyberpunk', 'sunset', 'emerald'];
      if (savedTheme && validThemes.includes(savedTheme as ThemeName)) {
        set({ themeName: savedTheme as ThemeName });
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  },
  getCurrentTheme: () => {
    const { themeName } = get();
    return getTheme(themeName);
  },
}));

