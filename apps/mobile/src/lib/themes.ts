// Theme + color role types

export type ThemeName =
  | 'modernLight'
  | 'darkMode'
  | 'nature'
  | 'cyberpunk'
  | 'sunset'
  | 'emerald';

export type ColorRole =
  | 'primary'
  | 'primaryVariant'
  | 'secondary'
  | 'background'
  | 'surface'
  | 'textPrimary'
  | 'textSecondary'
  | 'success'
  | 'warning'
  | 'error';

export type ThemeColors = Record<ColorRole, string>;

export interface Theme {
  name: ThemeName;
  isDark: boolean;
  colors: ThemeColors;
}

// All themes in a single object
export const themes: Record<ThemeName, Theme> = {
  modernLight: {
    name: 'modernLight',
    isDark: false,
    colors: {
      primary: '#90CAF9',
      primaryVariant: '#64B5F6',
      secondary: '#F5A623',
      background: '#E4E4E4',
      surface: '#FFFFFF',
      textPrimary: '#1A1A1A',
      textSecondary: '#5C5C5C',
      success: '#4CAF50',
      warning: '#FFC107',
      error: '#E53935',
    },
  },
  darkMode: {
    name: 'darkMode',
    isDark: true,
    colors: {
      primary: '#90CAF9',
      primaryVariant: '#64B5F6',
      secondary: '#FFD54F',
      background: '#1E1E1E',
      surface: '#2E2E2E',
      textPrimary: '#FFFFFF',
      textSecondary: '#B3B3B3',
      success: '#81C784',
      warning: '#FFCA28',
      error: '#EF5350',
    },
  },
  nature: {
    name: 'nature',
    isDark: false,
    colors: {
      primary: '#6D9F71',
      primaryVariant: '#4F7F53',
      secondary: '#C2B280',
      background: '#E4E4E4',
      surface: '#FFFFFF',
      textPrimary: '#2E2E2E',
      textSecondary: '#696969',
      success: '#7CB342',
      warning: '#FBC02D',
      error: '#D84315',
    },
  },
  cyberpunk: {
    name: 'cyberpunk',
    isDark: true,
    colors: {
      primary: '#FF0080',
      primaryVariant: '#CC0066',
      secondary: '#00E5FF',
      background: '#1E1E1E',
      surface: '#2E2E2E',
      textPrimary: '#FFFFFF',
      textSecondary: '#A3A3A3',
      success: '#00FF9D',
      warning: '#FFEA00',
      error: '#FF1744',
    },
  },
  sunset: {
    name: 'sunset',
    isDark: false,
    colors: {
      primary: '#FF6F61',
      primaryVariant: '#E85A4F',
      secondary: '#FFD65C',
      background: '#E4E4E4',
      surface: '#FFFFFF',
      textPrimary: '#342E2E',
      textSecondary: '#6A5E5E',
      success: '#8BC34A',
      warning: '#FFB300',
      error: '#D32F2F',
    },
  },
  emerald: {
    name: 'emerald',
    isDark: true,
    colors: {
        primary: '#6D9F71',
        primaryVariant: '#6D9F71',
        secondary: '#FFD54F',
        background: '#1E1E1E',
        surface: '#2E2E2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#B3B3B3',
        success: '#81C784',
        warning: '#FFCA28',
        error: '#EF5350',
    },
  },
};

export const defaultThemeName: ThemeName = 'sunset';

// Helper to get one theme
export const getTheme = (name: ThemeName): Theme => themes[name];

// Get theme display name
export const getThemeDisplayName = (name: ThemeName): string => {
  switch (name) {
    case 'modernLight':
      return 'Modern Light';
    case 'darkMode':
      return 'Dark Mode';
    case 'nature':
      return 'Nature';
    case 'cyberpunk':
      return 'Cyberpunk';
    case 'sunset':
      return 'Sunset';
    case 'emerald':
      return 'Emerald';
    default:
      return name;
  }
};

