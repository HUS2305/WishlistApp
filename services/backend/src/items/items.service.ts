import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateItemDto } from "../common/dto/create-item.dto";
import { UpdateItemDto } from "../common/dto/update-item.dto";
import { getDisplayName } from "../common/utils";

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findByWishlistId(userId: string, wishlistId: string) {
    // First, verify user has access to this wishlist
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true, privacyLevel: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    // Get user from database
    const user = await this.getOrCreateUser(userId);

    // Check access: owner OR friend (if FRIENDS_ONLY) OR anyone (if PUBLIC) OR collaborator (if GROUP)
    if (wishlist.ownerId !== user.id) {
      if (wishlist.privacyLevel === "PRIVATE") {
        throw new ForbiddenException("You don't have access to this wishlist");
      }
      if (wishlist.privacyLevel === "FRIENDS_ONLY") {
        // Check if users are friends
        const areFriends = await this.areFriends(user.id, wishlist.ownerId);
        if (!areFriends) {
          throw new ForbiddenException("You don't have access to this wishlist");
        }
      }
      if (wishlist.privacyLevel === "GROUP") {
        // Check if user is a collaborator
        const isCollaborator = await this.prisma.wishlistCollaborator.findFirst({
          where: {
            wishlistId: wishlistId,
            userId: user.id,
          },
        });
        if (!isCollaborator) {
          throw new ForbiddenException("You don't have access to this wishlist");
        }
      }
    }

    const items = await this.prisma.item.findMany({
      where: { wishlistId },
      include: {
        addedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        reservations: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrich items with displayName, isReservedByCurrentUser flag, and hasReservations flag
    return items.map(item => {
      const { reservations, ...itemWithoutReservations } = item;
      const hasReservations = reservations.length > 0;
      const isReservedByCurrentUser = reservations.some(r => r.userId === user.id);
      return {
        ...itemWithoutReservations,
        addedBy: item.addedBy ? {
          ...item.addedBy,
          displayName: getDisplayName(item.addedBy.firstName, item.addedBy.lastName),
        } : null,
        isReservedByCurrentUser,
        hasReservations, // Indicates if anyone has reserved this item
      };
    });
  }

  async findById(userId: string, id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        wishlist: {
          select: {
            ownerId: true,
            privacyLevel: true,
          },
        },
        addedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Item not found");
    }

    // Check access permissions
    const user = await this.getOrCreateUser(userId);
    if (item.wishlist.ownerId !== user.id) {
      if (item.wishlist.privacyLevel === "PRIVATE") {
        throw new ForbiddenException("You don't have access to this item");
      }
      if (item.wishlist.privacyLevel === "FRIENDS_ONLY") {
        const areFriends = await this.areFriends(user.id, item.wishlist.ownerId);
        if (!areFriends) {
          throw new ForbiddenException("You don't have access to this item");
        }
      }
    }

    return {
      ...item,
      addedBy: item.addedBy ? {
        ...item.addedBy,
        displayName: getDisplayName(item.addedBy.firstName, item.addedBy.lastName),
      } : null,
    };
  }

  async create(userId: string, wishlistId: string, data: CreateItemDto) {
    // Verify wishlist exists and user can edit it
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    const user = await this.getOrCreateUser(userId);

    // Check if user is owner or can edit (collaborator with EDITOR/ADMIN role)
    const isOwner = wishlist.ownerId === user.id;
    const canEdit = await this.canEditWishlist(userId, wishlistId);

    if (!isOwner && !canEdit) {
      throw new ForbiddenException("You don't have permission to add items to this wishlist");
    }

    // Use ItemUncheckedCreateInput since we're providing wishlistId directly
    // Build data object, only including fields that are defined
    const itemData: any = {
      title: data.title,
      wishlistId, // Direct relation ID
      addedById: user.id,
      priority: data.priority,
    };

    // Only include optional fields if they are provided
    if (data.description !== undefined && data.description !== null) {
      itemData.description = data.description;
    }
    if (data.url !== undefined && data.url !== null && data.url !== '') {
      itemData.url = data.url;
    }
    if (data.price !== undefined && data.price !== null) {
      itemData.price = data.price;
    }
    if (data.currency !== undefined && data.currency !== null) {
      itemData.currency = data.currency;
    } else {
      itemData.currency = 'USD';
    }
    if (data.category !== undefined && data.category !== null) {
      itemData.category = data.category;
    }
    if (data.imageUrl !== undefined && data.imageUrl !== null) {
      itemData.imageUrl = data.imageUrl;
    }
    if (data.quantity !== undefined && data.quantity !== null) {
      itemData.quantity = data.quantity;
    }

    return this.prisma.item.create({
      data: itemData,
    });
  }

  // Helper method to check if user can edit wishlist
  private async canEditWishlist(clerkUserId: string, wishlistId: string): Promise<boolean> {
    const user = await this.getOrCreateUser(clerkUserId);
    
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true },
    });

    if (!wishlist) {
      return false;
    }

    // Owner can always edit
    if (wishlist.ownerId === user.id) {
      return true;
    }

    // Check if user is a collaborator with EDITOR or ADMIN role
    const collaborator = await this.prisma.wishlistCollaborator.findUnique({
      where: {
        wishlistId_userId: {
          wishlistId,
          userId: user.id,
        },
      },
    });

    return collaborator ? (collaborator.role === "EDITOR" || collaborator.role === "ADMIN") : false;
  }

  async update(userId: string, id: string, data: UpdateItemDto) {
    // Get item with wishlist owner
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        wishlist: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Item not found");
    }

    const user = await this.getOrCreateUser(userId);

    // Check if user can edit this wishlist (owner or collaborator with EDITOR/ADMIN role)
    const isOwner = item.wishlist.ownerId === user.id;
    const canEdit = await this.canEditWishlist(userId, item.wishlistId);

    if (!isOwner && !canEdit) {
      throw new ForbiddenException("You don't have permission to update items in this wishlist");
    }

    // If wishlistId is being changed, verify user can edit the target wishlist
    if (data.wishlistId !== undefined && data.wishlistId !== item.wishlistId) {
      const targetWishlist = await this.prisma.wishlist.findUnique({
        where: { id: data.wishlistId },
        select: { ownerId: true },
      });

      if (!targetWishlist) {
        throw new NotFoundException("Target wishlist not found");
      }

      const canEditTarget = targetWishlist.ownerId === user.id || await this.canEditWishlist(userId, data.wishlistId);
      if (!canEditTarget) {
        throw new ForbiddenException("You don't have permission to move items to that wishlist");
      }
    }

    // Build update data object, handling optional fields properly
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.url !== undefined && data.url !== null && data.url !== '') {
      updateData.url = data.url;
    } else if (data.url === '') {
      // Allow setting url to null to clear it
      updateData.url = null;
    }
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.wishlistId !== undefined && data.wishlistId !== item.wishlistId) {
      updateData.wishlistId = data.wishlistId;
    }

    return this.prisma.item.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(userId: string, id: string) {
    // Get item with wishlist owner
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        wishlist: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Item not found");
    }

    const user = await this.getOrCreateUser(userId);

    // Check if user can edit this wishlist (owner or collaborator with EDITOR/ADMIN role)
    const isOwner = item.wishlist.ownerId === user.id;
    const canEdit = await this.canEditWishlist(userId, item.wishlistId);

    if (!isOwner && !canEdit) {
      throw new ForbiddenException("You don't have permission to delete items from this wishlist");
    }

    return this.prisma.item.delete({
      where: { id },
    });
  }

  async parseFromUrl(url: string) {
    // TODO: Implement URL scraping/parsing with proper validation
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    return {
      url,
      title: "Product from URL",
      description: "URL parsing coming soon",
      price: 0,
    };
  }

  async reserve(userId: string, itemId: string) {
    // Get item with wishlist owner
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: {
        wishlist: {
          select: {
            ownerId: true,
            allowReservations: true,
            privacyLevel: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Item not found");
    }

    if (!item.wishlist.allowReservations) {
      throw new ForbiddenException("Reservations are not allowed for this wishlist");
    }

    const user = await this.getOrCreateUser(userId);

    // Check if user has access to reserve items
    const isOwner = item.wishlist.ownerId === user.id;
    
    // For GROUP wishlists, check if user is owner or collaborator
    if (item.wishlist.privacyLevel === "GROUP") {
      if (!isOwner) {
        const isCollaborator = await this.prisma.wishlistCollaborator.findFirst({
          where: {
            wishlistId: item.wishlistId,
            userId: user.id,
          },
        });
        if (!isCollaborator) {
          throw new ForbiddenException("You don't have access to reserve items in this wishlist");
        }
      }
      // In group wishlists, owners and collaborators can reserve any item
    } else {
      // For non-group wishlists: owners can't reserve their own items
      if (isOwner) {
        throw new ForbiddenException("You cannot reserve your own items");
      }
      
      // Check access for non-group wishlists (friends or public)
      if (item.wishlist.privacyLevel === "PRIVATE") {
        throw new ForbiddenException("Cannot reserve items from private wishlists");
      }
      if (item.wishlist.privacyLevel === "FRIENDS_ONLY") {
        const areFriends = await this.areFriends(user.id, item.wishlist.ownerId);
        if (!areFriends) {
          throw new ForbiddenException("You must be friends to reserve this item");
        }
      }
    }

    // Check if already reserved
    const existing = await this.prisma.itemReservation.findFirst({
      where: { itemId, userId: user.id },
    });

    if (existing) {
      throw new ForbiddenException("You have already reserved this item");
    }

    return this.prisma.itemReservation.create({
      data: {
        itemId,
        userId: user.id,
      },
    });
  }

  async unreserve(userId: string, itemId: string) {
    const user = await this.getOrCreateUser(userId);

    // Can only unreserve your own reservations
    const result = await this.prisma.itemReservation.deleteMany({
      where: {
        itemId,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("No reservation found");
    }

    return result;
  }

  private async getOrCreateUser(clerkUserId: string) {
    // DO NOT auto-create - only return existing users
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });
    
    if (!user) {
      throw new Error("User profile not found. Please complete your profile setup.");
    }
    
    return user;
  }

  private async areFriends(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: "ACCEPTED" },
          { userId: friendId, friendId: userId, status: "ACCEPTED" },
        ],
      },
    });

    return !!friendship;
  }
}
