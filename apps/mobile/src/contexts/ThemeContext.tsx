import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { Theme, ThemeName } from '@/lib/themes';
import { getTheme, defaultThemeName } from '@/lib/themes';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (name: ThemeName) => Promise<void>;
  themeName: ThemeName;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-preference';

const validThemes: ThemeName[] = ['modernLight', 'darkMode', 'nature', 'cyberpunk', 'sunset', 'emerald'];

// Synchronously load theme from storage (only works on web with localStorage)
const loadThemeFromStorageSync = (userId?: string | null): ThemeName => {
  try {
    // If userId is null/undefined, don't load unscoped theme (might be stale from previous user)
    // Use default theme instead to avoid flash of wrong user's theme
    if (!userId) {
      return defaultThemeName;
    }
    
    // Scope the key by userId to prevent cross-account data mixing
    const key = `${THEME_STORAGE_KEY}-${userId}`;
    if (Platform.OS === 'web') {
      const savedTheme = localStorage.getItem(key);
      if (savedTheme && validThemes.includes(savedTheme as ThemeName)) {
        return savedTheme as ThemeName;
      }
    }
  } catch (error) {
    console.error('Failed to load theme synchronously:', error);
  }
  return defaultThemeName;
};

// Asynchronously load theme from storage with userId scoping
const loadThemeFromStorage = async (userId?: string | null): Promise<ThemeName> => {
  try {
    // If userId is null/undefined, don't load unscoped theme (might be stale from previous user)
    // Use default theme instead to avoid flash of wrong user's theme
    if (!userId) {
      return defaultThemeName;
    }
    
    // Scope the key by userId to prevent cross-account data mixing
    const key = `${THEME_STORAGE_KEY}-${userId}`;
    let savedTheme: string | null = null;
    if (Platform.OS === 'web') {
      // On web, use synchronous localStorage
      savedTheme = localStorage.getItem(key);
    } else {
      try {
        const SecureStore = require('expo-secure-store');
        savedTheme = await SecureStore.getItemAsync(key);
      } catch (error) {
        // SecureStore not available, use default
      }
    }
    if (savedTheme && validThemes.includes(savedTheme as ThemeName)) {
      return savedTheme as ThemeName;
    }
  } catch (error) {
    console.error('Failed to load theme:', error);
  }
  return defaultThemeName;
};

// Simple theme provider that doesn't depend on Zustand to avoid web bundling issues
// Accepts optional userId prop - if not provided, theme is not scoped to a user
export function ThemeProvider({ children, userId }: { children: ReactNode; userId?: string | null }) {
  // Initialize with synchronous load on web (to avoid flash), async load will update for native
  const [themeName, setThemeNameState] = useState<ThemeName>(() => {
    // Try to load synchronously on web to prevent theme flash
    // On native, this will return defaultThemeName, and the useEffect will load the real theme
    return loadThemeFromStorageSync(userId);
  });
  
  // Load theme from storage when userId changes (on sign in/out) or on mount
  // Use useLayoutEffect to start loading synchronously before paint (minimizes flash)
  React.useLayoutEffect(() => {
    // Always load theme to ensure we have the latest, especially important:
    // 1. On mount - to get the real theme on native (since sync load returns default)
    // 2. When userId changes - to get the correct scoped theme for the new user
    const loadTheme = async () => {
      const saved = await loadThemeFromStorage(userId);
      // Only update if different to avoid unnecessary re-renders
      setThemeNameState((current) => {
        if (current !== saved) {
          console.log(`🎨 Loaded theme for user ${userId || 'anonymous'}: ${saved}`);
          return saved;
        }
        return current;
      });
    };
    loadTheme();
  }, [userId]);

  // Listen for app state changes to reload theme (when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadThemeFromStorage(userId).then((saved) => {
          setThemeNameState(saved);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userId]);

  // Listen for storage changes on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const key = userId ? `${THEME_STORAGE_KEY}-${userId}` : THEME_STORAGE_KEY;
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key && e.newValue) {
          const validThemes: ThemeName[] = ['modernLight', 'darkMode', 'nature', 'cyberpunk', 'sunset', 'emerald'];
          if (validThemes.includes(e.newValue as ThemeName)) {
            setThemeNameState(e.newValue as ThemeName);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);
      // Also listen for custom event for same-window updates
      const handleCustomStorage = () => {
        loadThemeFromStorage(userId).then((saved) => {
          setThemeNameState(saved);
        });
      };
      window.addEventListener('theme-changed', handleCustomStorage);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('theme-changed', handleCustomStorage);
      };
    }
  }, [userId]);

  // Set theme function with userId scoping
  const setTheme = useCallback(async (name: ThemeName) => {
    setThemeNameState(name);
    try {
      // Scope the key by userId to prevent cross-account data mixing
      const key = userId ? `${THEME_STORAGE_KEY}-${userId}` : THEME_STORAGE_KEY;
      if (Platform.OS === 'web') {
        localStorage.setItem(key, name);
        // Dispatch custom event for same-window updates
        window.dispatchEvent(new Event('theme-changed'));
      } else {
        try {
          const SecureStore = require('expo-secure-store');
          await SecureStore.setItemAsync(key, name);
        } catch (error) {
          console.error('Failed to save theme:', error);
        }
      }
      console.log(`🎨 Saved theme for user ${userId || 'anonymous'}: ${name}`);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [userId]);

  // Get current theme based on theme name
  const getCurrentTheme = (): Theme => {
    return getTheme(themeName);
  };

  const theme = getCurrentTheme();

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme.isDark, setTheme, themeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

