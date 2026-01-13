/**
 * Custom hooks for friends operations using React Query
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { friendsService, type FriendRequest } from '@/services/friends';
import { wishlistsService } from '@/services/wishlists';
import type { User, Item } from '@/types';

// Query keys
export const friendKeys = {
  all: ['friends'] as const,
  lists: () => [...friendKeys.all, 'list'] as const,
  list: () => [...friendKeys.lists()] as const,
  requests: () => [...friendKeys.all, 'requests'] as const,
  pending: () => [...friendKeys.requests(), 'pending'] as const,
  sent: () => [...friendKeys.requests(), 'sent'] as const,
  detail: (id: string) => [...friendKeys.all, 'detail', id] as const,
  profile: (id: string) => [...friendKeys.detail(id), 'profile'] as const,
};

// Get all friends
export function useFriends() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.list(),
    queryFn: () => friendsService.getFriends(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get pending friend requests
export function usePendingRequests() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.pending(),
    queryFn: () => friendsService.getPendingRequests(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get sent friend requests
export function useSentRequests() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.sent(),
    queryFn: () => friendsService.getSentRequests(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get friend profile (from /friends/:id/profile endpoint)
export function useFriendProfile(friendId: string) {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.profile(friendId),
    queryFn: () => friendsService.getFriendProfile(friendId),
    enabled: !!friendId && isLoaded && isSignedIn,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get user profile (from /users/:id/profile endpoint)
export function useUserProfile(userId: string) {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['users', userId, 'profile'],
    queryFn: () => friendsService.getUserProfile(userId),
    enabled: !!userId && isLoaded && isSignedIn,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get all reserved items
export function useReservedItems() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery<Item[]>({
    queryKey: ['items', 'reserved', 'all'],
    queryFn: () => wishlistsService.getReservedItems(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

