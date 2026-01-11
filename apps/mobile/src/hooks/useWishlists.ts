/**
 * Custom hooks for wishlist operations using React Query
 * 
 * Example usage:
 * 
 * ```tsx
 * import { useWishlists, useCreateWishlist } from '@/hooks/useWishlists';
 * 
 * function MyComponent() {
 *   const { data: wishlists, isLoading } = useWishlists();
 *   const createWishlist = useCreateWishlist();
 * 
 *   const handleCreate = () => {
 *     createWishlist.mutate({
 *       title: 'My Wishlist',
 *       privacyLevel: 'PRIVATE',
 *       allowComments: true,
 *       allowReservations: true,
 *     });
 *   };
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wishlistsService } from "@/services/wishlists";
import { Alert } from "react-native";
import { useAuth } from "@clerk/clerk-expo";

// Query keys
export const wishlistKeys = {
  all: ["wishlists"] as const,
  lists: () => [...wishlistKeys.all, "list"] as const,
  list: (filters?: any) => [...wishlistKeys.lists(), { filters }] as const,
  details: () => [...wishlistKeys.all, "detail"] as const,
  detail: (id: string) => [...wishlistKeys.details(), id] as const,
  items: (id: string) => [...wishlistKeys.detail(id), "items"] as const,
};

// Get all wishlists
export function useWishlists() {
  const { isLoaded: isAuthLoaded } = useAuth();
  return useQuery({
    queryKey: wishlistKeys.lists(),
    queryFn: () => wishlistsService.getWishlists(),
    enabled: isAuthLoaded,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get single wishlist
export function useWishlist(id: string) {
  const { isLoaded: isAuthLoaded } = useAuth();
  return useQuery({
    queryKey: wishlistKeys.detail(id),
    queryFn: () => wishlistsService.getWishlist(id),
    enabled: !!id && isAuthLoaded,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get wishlist items
export function useWishlistItems(wishlistId: string) {
  const { isLoaded: isAuthLoaded } = useAuth();
  return useQuery({
    queryKey: wishlistKeys.items(wishlistId),
    queryFn: () => wishlistsService.getWishlistItems(wishlistId),
    enabled: !!wishlistId && isAuthLoaded,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Create wishlist
export function useCreateWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsService.createWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.lists() });
      Alert.alert("Success", "Wishlist created!");
    },
    onError: () => {
      Alert.alert("Error", "Failed to create wishlist");
    },
  });
}

// Update wishlist
export function useUpdateWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsService.updateWishlist,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.lists() });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.detail(data.id) });
    },
    onError: () => {
      Alert.alert("Error", "Failed to update wishlist");
    },
  });
}

// Delete wishlist
export function useDeleteWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsService.deleteWishlist,
    onSuccess: (_, deletedId) => {
      console.log("🎯 useDeleteWishlist onSuccess - deletedId:", deletedId);
      // Invalidate all wishlist-related queries
      queryClient.invalidateQueries({ queryKey: wishlistKeys.lists() });
      if (deletedId) {
        queryClient.invalidateQueries({ queryKey: wishlistKeys.detail(deletedId) });
        queryClient.removeQueries({ queryKey: wishlistKeys.detail(deletedId) });
      }
      // Invalidate all detail queries to be safe
      queryClient.invalidateQueries({ queryKey: wishlistKeys.details() });
    },
    onError: (error: any) => {
      console.error("❌ useDeleteWishlist onError:", error);
      console.error("Error response:", error.response);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete wishlist";
      Alert.alert("Error", errorMessage);
    },
  });
}

// Create item
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsService.createItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.items(data.wishlistId) });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.detail(data.wishlistId) });
    },
    onError: () => {
      Alert.alert("Error", "Failed to add item");
    },
  });
}

// Update item
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsService.updateItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.items(data.wishlistId) });
    },
    onError: () => {
      Alert.alert("Error", "Failed to update item");
    },
  });
}

// Delete item
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsService.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete item");
    },
  });
}

// Parse product URL
export function useParseProductUrl() {
  return useMutation({
    mutationFn: wishlistsService.parseProductUrl,
    onError: () => {
      Alert.alert("Error", "Failed to parse URL");
    },
  });
}

