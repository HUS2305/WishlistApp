export type PrivacyLevel = "PRIVATE" | "FRIENDS_ONLY" | "PUBLIC" | "GROUP";
export type Priority = "MUST_HAVE" | "NICE_TO_HAVE";
export type ItemStatus = "WANTED" | "RESERVED" | "PURCHASED";
export type FriendshipStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface User {
  id: string;
  clerkId: string;
  email: string;
  phone?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string; // Computed from firstName and lastName by backend
  avatar?: string;
  bio?: string;
  birthday?: string; // User's birthday (ISO date string, only month/day used for tracking)
  privacyLevel: PrivacyLevel;
  createdAt: string;
  updatedAt: string;
}

export type CollaboratorRole = "VIEWER" | "EDITOR" | "ADMIN";

export interface Collaborator {
  id: string;
  role: CollaboratorRole;
  createdAt: string;
  wishlistId: string;
  userId: string;
  user: User;
}

export interface Wishlist {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  privacyLevel: PrivacyLevel;
  shareToken?: string;
  viewCount: number;
  allowComments: boolean;
  allowReservations: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isGroupWishlist?: boolean;
  items?: Item[];
  collaborators?: Collaborator[];
  owner?: User;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  addedBy?: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  } | null;
  isReservedByCurrentUser?: boolean;
  hasReservations?: boolean;
  price?: number;
  currency: string;
  url: string;
  imageUrl?: string;
  quantity?: number;
  priority: Priority;
  status: ItemStatus;
  category?: string;
  createdAt: string;
  updatedAt: string;
  wishlistId: string;
  addedById: string;
  addedBy?: User;
}

