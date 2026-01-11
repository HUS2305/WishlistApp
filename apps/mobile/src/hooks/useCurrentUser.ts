/**
 * Hook to get the current user's profile data
 * Uses React Query for caching to prevent redundant API calls
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import api from '@/services/api';
import type { User } from '@/types';

export function useCurrentUser() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await api.get<User>('/users/me');
      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

