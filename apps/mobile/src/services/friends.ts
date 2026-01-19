import api from "./api";
import type { User } from "@/types";

export interface FriendRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "BLOCKED";
  user: User;
  friend: User;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isFriend: boolean;
  isPending: boolean;
  pendingRequestId?: string;
  isSentByMe?: boolean;
  isBlockedByMe?: boolean;
  isBlockedByThem?: boolean;
}

export const friendsService = {
  async getFriends(): Promise<User[]> {
    const response = await api.get("/friends");
    return response.data;
  },

  async getPendingRequests(): Promise<FriendRequest[]> {
    const response = await api.get("/friends/requests/pending");
    return response.data;
  },

  async getSentRequests(): Promise<FriendRequest[]> {
    const response = await api.get("/friends/requests/sent");
    return response.data;
  },

  async searchUsers(query: string): Promise<SearchResult[]> {
    const response = await api.get("/users/search", {
      params: { q: query },
    });
    console.log(`✅ Found ${response.data.length} users`);
    return response.data;
  },

  async sendFriendRequest(userId: string): Promise<FriendRequest> {
    const response = await api.post("/friends/requests", { friendId: userId });
    return response.data;
  },

  async acceptFriendRequest(requestId: string): Promise<void> {
    await api.post(`/friends/requests/${requestId}/accept`);
  },

  async rejectFriendRequest(requestId: string): Promise<void> {
    await api.post(`/friends/requests/${requestId}/reject`);
  },

  async cancelFriendRequest(requestId: string): Promise<void> {
    await api.post(`/friends/requests/${requestId}/cancel`);
  },

  async removeFriend(friendId: string): Promise<void> {
    await api.delete(`/friends/${friendId}`);
  },

  async getFriendWishlists(friendId: string): Promise<any[]> {
    const response = await api.get(`/friends/${friendId}/wishlists`);
    return response.data;
  },

  async getFriendProfile(friendId: string): Promise<{
    profile: User;
    wishlists: any[];
    friendshipSince: string;
  }> {
    const response = await api.get(`/friends/${friendId}/profile`);
    return response.data;
  },

  async getUserProfile(userId: string): Promise<{
    profile: User;
    wishlists: any[];
    areFriends: boolean;
    friendshipSince: string | null;
    pendingRequestId: string | null;
    sentRequestId: string | null;
    isBlockedByMe?: boolean;
    isBlockedByThem?: boolean;
  }> {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  async blockUser(userId: string): Promise<void> {
    await api.post(`/friends/${userId}/block`);
  },

  async unblockUser(userId: string): Promise<void> {
    await api.post(`/friends/${userId}/unblock`);
  },
};

