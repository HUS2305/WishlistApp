/**
 * Hook to get the current user's currency preference
 * Uses React Query for caching to prevent multiple API calls
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import api from '@/services/api';

export const useUserCurrency = () => {
  const { isSignedIn, isLoaded } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', 'currency'],
    queryFn: async () => {
      const response = await api.get('/users/me');
      return response.data?.currency || 'USD';
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
    retry: 2, // Retry up to 2 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Return USD as default if loading, error, or no data
  const userCurrency = data || 'USD';

  return { userCurrency, isLoading };
};

