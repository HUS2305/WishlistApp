import api from "./api";
import type { Wishlist, Item, PrivacyLevel, Priority, ItemStatus } from "@/types";

interface CreateWishlistPayload {
  title: string;
  privacyLevel: PrivacyLevel;
  allowComments: boolean;
  allowReservations: boolean;
  coverImage?: string; // Optional: identifier for wishlist cover image
  collaboratorIds?: string[]; // Optional: if provided, wishlist becomes GROUP privacy level
}

interface UpdateWishlistPayload extends Partial<CreateWishlistPayload> {
  id: string;
}

interface CreateItemPayload {
  wishlistId: string;
  title: string;
  url?: string;
  price?: number;
  currency?: string;
  category?: string;
  quantity?: number;
  priority: Priority;
}

interface UpdateItemPayload {
  id: string;
  wishlistId?: string; // Required for cache invalidation
  title?: string;
  url?: string;
  price?: number;
  currency?: string;
  category?: string;
  quantity?: number;
  priority?: Priority;
  status?: ItemStatus;
}

export const wishlistsService = {
  // Wishlist operations
  async getWishlists(): Promise<Wishlist[]> {
    const response = await api.get("/wishlists");
    return response.data;
  },

  async getWishlist(id: string): Promise<Wishlist> {
    const response = await api.get(`/wishlists/${id}`);
    return response.data;
  },

  async createWishlist(payload: CreateWishlistPayload): Promise<Wishlist> {
    const response = await api.post("/wishlists", payload);
    return response.data;
  },

  async updateWishlist(payload: UpdateWishlistPayload): Promise<Wishlist> {
    const { id, ...data } = payload;
    const response = await api.patch(`/wishlists/${id}`, data);
    return response.data;
  },

  async deleteWishlist(id: string): Promise<void> {
    console.log("📡 API: Deleting wishlist", id);
    const response = await api.delete(`/wishlists/${id}`);
    console.log("✅ API: Wishlist deleted", response.status);
    return;
  },

  async shareWishlist(id: string): Promise<{ shareToken: string; shareUrl: string }> {
    const response = await api.post(`/wishlists/${id}/share`);
    return response.data;
  },

  // Item operations
  async getWishlistItems(wishlistId: string): Promise<Item[]> {
    const response = await api.get(`/items/wishlists/${wishlistId}/items`);
    return response.data;
  },

  async createItem(payload: CreateItemPayload): Promise<Item> {
    const { wishlistId, ...itemData } = payload;
    const response = await api.post(`/items/wishlists/${wishlistId}/items`, itemData);
    return response.data;
  },

  async updateItem(payload: UpdateItemPayload): Promise<Item> {
    const { id, ...data } = payload; // Include wishlistId if provided (to move item between wishlists)
    const response = await api.patch(`/items/${id}`, data);
    return response.data;
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },

  async parseProductUrl(url: string): Promise<{
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    imageUrl?: string;
  }> {
    const response = await api.post("/items/from-url", { url });
    return response.data;
  },

  async reserveItem(itemId: string): Promise<void> {
    await api.post(`/items/${itemId}/reserve`);
  },

  async unreserveItem(itemId: string): Promise<void> {
    await api.delete(`/items/${itemId}/reserve`);
  },

  // Collaborator operations
  async inviteCollaborator(wishlistId: string, inviteeUserId: string): Promise<void> {
    await api.post(`/wishlists/${wishlistId}/collaborators/invite`, { inviteeUserId });
  },

  async acceptCollaboration(wishlistId: string): Promise<void> {
    await api.post(`/wishlists/${wishlistId}/collaborators/accept`);
  },

  async removeCollaborator(wishlistId: string, collaboratorId: string): Promise<void> {
    await api.delete(`/wishlists/${wishlistId}/collaborators/${collaboratorId}`);
  },

  async updateCollaboratorRole(
    wishlistId: string,
    collaboratorId: string,
    role: "VIEWER" | "EDITOR" | "ADMIN"
  ): Promise<void> {
    await api.patch(`/wishlists/${wishlistId}/collaborators/${collaboratorId}/role`, { role });
  },

  async getCollaborators(wishlistId: string) {
    const response = await api.get(`/wishlists/${wishlistId}/collaborators`);
    return response.data;
  },

  async getReservedItems(): Promise<Item[]> {
    const response = await api.get("/items/reserved/all");
    return response.data;
  },
};

