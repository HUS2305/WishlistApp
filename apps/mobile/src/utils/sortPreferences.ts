import { Platform } from 'react-native';
import type { SortOption } from '@/components/SortWishlistSheet';

// Declare localStorage for TypeScript when on web
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
} | undefined;

const SORT_PREFERENCE_KEY = 'wishlist-sort-preference';

// Default sort option
export const DEFAULT_SORT: SortOption = 'last_added';

/**
 * Load sort preference from storage
 * Uses SecureStore on mobile, localStorage on web
 */
export const loadSortPreference = async (userId?: string): Promise<SortOption> => {
  try {
    const key = userId ? `${SORT_PREFERENCE_KEY}-${userId}` : SORT_PREFERENCE_KEY;
    let savedSort: string | null = null;
    
    if (Platform.OS === 'web') {
      savedSort = (typeof localStorage !== 'undefined' && localStorage) ? localStorage.getItem(key) : null;
    } else {
      try {
        const SecureStore = require('expo-secure-store');
        savedSort = await SecureStore.getItemAsync(key);
      } catch (error) {
        console.error('Failed to load sort preference:', error);
      }
    }
    
    // Validate that it's a valid sort option
    const validSorts: SortOption[] = ['last_added', 'last_edited', 'added_first', 'alphabetical'];
    if (savedSort && validSorts.includes(savedSort as SortOption)) {
      return savedSort as SortOption;
    }
  } catch (error) {
    console.error('Error loading sort preference:', error);
  }
  
  return DEFAULT_SORT;
};

/**
 * Save sort preference to storage
 * Uses SecureStore on mobile, localStorage on web
 */
export const saveSortPreference = async (sort: SortOption, userId?: string): Promise<void> => {
  try {
    const key = userId ? `${SORT_PREFERENCE_KEY}-${userId}` : SORT_PREFERENCE_KEY;
    
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(key, sort);
      }
    } else {
      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync(key, sort);
      } catch (error) {
        console.error('Failed to save sort preference:', error);
      }
    }
  } catch (error) {
    console.error('Error saving sort preference:', error);
  }
};

/**
 * Sort wishlists based on the selected sort option
 */
export const sortWishlists = <T extends { 
  id: string; 
  title: string; 
  createdAt: string; 
  updatedAt: string;
}>(wishlists: T[], sortOption: SortOption): T[] => {
  // Create a new array to avoid mutating the original
  const sorted = [...wishlists];
  
  switch (sortOption) {
    case 'last_added':
      // Sort by createdAt descending (newest first)
      return sorted.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    
    case 'last_edited':
      // Sort by updatedAt descending (most recently edited first)
      return sorted.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    
    case 'added_first':
      // Sort by createdAt ascending (oldest first)
      return sorted.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    
    case 'alphabetical':
      // Sort alphabetically by title (case-insensitive)
      // Use localeCompare with English locale for consistent sorting
      const alphabeticallySorted = sorted.sort((a, b) => {
        // Handle null/undefined titles
        const titleA = (a.title || '').trim();
        const titleB = (b.title || '').trim();
        
        // Use localeCompare with English locale for consistent, case-insensitive sorting
        // This handles special characters and ensures 'a' comes before 'B'
        return titleA.localeCompare(titleB, 'en', {
          sensitivity: 'base',
          ignorePunctuation: true,
          numeric: true
        });
      });
      
      // Debug logging
      console.log('Alphabetical sort - Input titles:', sorted.map(w => `"${w.title}"`));
      console.log('Alphabetical sort result:', alphabeticallySorted.map(w => `"${w.title}"`));
      return alphabeticallySorted;
    
    default:
      return sorted;
  }
};

