import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "../notifications/push.service";
import { CreateWishlistDto } from "../common/dto/create-wishlist.dto";
import { getDisplayName } from "../common/utils";

@Injectable()
export class WishlistsService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService
  ) {}

  async findAll(clerkUserId: string, _query: any) {
    // Get or create user first
    const user = await this.getOrCreateUser(clerkUserId);
    console.log(`🔍 Finding wishlists for user: ${user.id} (Clerk ID: ${clerkUserId})`);
    
    // Get wishlists where user is owner OR collaborator
    const ownedWishlists = await this.prisma.wishlist.findMany({
      where: {
        ownerId: user.id,
      },
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        secretSantaEvent: {
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get wishlists where user is a collaborator
    const collaboratorWishlists = await this.prisma.wishlist.findMany({
      where: {
        collaborators: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        secretSantaEvent: {
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Combine and deduplicate (in case user is both owner and collaborator)
    const allWishlists = [...ownedWishlists];
    const ownedIds = new Set(ownedWishlists.map(w => w.id));
    collaboratorWishlists.forEach(w => {
      if (!ownedIds.has(w.id)) {
        allWishlists.push(w);
      }
    });
    
    console.log(`✅ Found ${allWishlists.length} wishlists for user ${user.id} (${ownedWishlists.length} owned, ${collaboratorWishlists.length} as collaborator)`);
    return allWishlists.map(wishlist => ({
      ...wishlist,
      owner: {
        ...wishlist.owner,
        displayName: getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName),
      },
      collaborators: wishlist.collaborators.map(collab => ({
        ...collab,
        user: {
          ...collab.user,
          displayName: getDisplayName(collab.user.firstName, collab.user.lastName),
        },
      })),
    }));
  }

  async findById(clerkUserId: string, id: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            addedBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        secretSantaEvent: {
          select: { id: true },
        },
      },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    const user = await this.getOrCreateUser(clerkUserId);

    // Check if user is owner or collaborator
    const isOwner = wishlist.ownerId === user.id;
    const isCollaborator = wishlist.collaborators.some(c => c.userId === user.id);

    if (!isOwner && !isCollaborator) {
      // Not owner or collaborator, check privacy level
      if (wishlist.privacyLevel === "PRIVATE") {
        throw new ForbiddenException("You don't have access to this wishlist");
      }
      if (wishlist.privacyLevel === "FRIENDS_ONLY") {
        // Check if users are friends
        const areFriends = await this.areFriends(user.id, wishlist.ownerId);
        if (!areFriends) {
          throw new ForbiddenException("You must be friends to view this wishlist");
        }
      }
      // PUBLIC wishlists are accessible to anyone
    }

    return {
      ...wishlist,
      owner: {
        ...wishlist.owner,
        displayName: getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName),
      },
      collaborators: wishlist.collaborators.map(collab => ({
        ...collab,
        user: {
          ...collab.user,
          displayName: getDisplayName(collab.user.firstName, collab.user.lastName),
        },
      })),
      items: wishlist.items.map(item => ({
        ...item,
        addedBy: item.addedBy ? {
          ...item.addedBy,
          displayName: getDisplayName(item.addedBy.firstName, item.addedBy.lastName),
        } : null,
      })),
    };
  }

  async create(clerkUserId: string, data: CreateWishlistDto & { collaboratorIds?: string[] }) {
    // Get or create user based on Clerk user ID
    const user = await this.getOrCreateUser(clerkUserId);

    // Generate a unique share token
    const shareToken = this.generateShareToken();

    // If collaborators are provided, set privacyLevel to GROUP
    const { collaboratorIds, ...wishlistData } = data;
    const privacyLevel = collaboratorIds && collaboratorIds.length > 0 ? "GROUP" : (data.privacyLevel || "PRIVATE");

    const wishlist = await this.prisma.wishlist.create({
      data: {
        title: wishlistData.title,
        privacyLevel: privacyLevel as "PRIVATE" | "FRIENDS_ONLY" | "PUBLIC" | "GROUP",
        allowComments: wishlistData.allowComments,
        allowReservations: wishlistData.allowReservations,
        shareToken,
        ownerId: user.id,
      },
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Invite collaborators if provided
    if (collaboratorIds && collaboratorIds.length > 0) {
      for (const inviteeUserId of collaboratorIds) {
        await this.inviteCollaborator(clerkUserId, wishlist.id, inviteeUserId);
      }
    }

    return {
      ...wishlist,
      owner: {
        ...wishlist.owner,
        displayName: getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName),
      },
    };
  }

  async update(clerkUserId: string, id: string, data: any) {
    // Get wishlist first
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    const user = await this.getOrCreateUser(clerkUserId);

    // Only owner or admin collaborator can update wishlist
    const isOwner = wishlist.ownerId === user.id;
    const isAdmin = await this.isAdmin(clerkUserId, id);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Only the owner or admin collaborators can update this wishlist");
    }

    const updated = await this.prisma.wishlist.update({
      where: { id },
      data,
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...updated,
      owner: {
        ...updated.owner,
        displayName: getDisplayName(updated.owner.firstName, updated.owner.lastName),
      },
    };
  }

  async delete(clerkUserId: string, id: string) {
    // Get wishlist first
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    const user = await this.getOrCreateUser(clerkUserId);

    // Only owner can delete wishlist (not even admin collaborators)
    if (wishlist.ownerId !== user.id) {
      throw new ForbiddenException("Only the owner can delete this wishlist");
    }

    // Delete wishlist (cascade will handle items due to schema)
    return this.prisma.wishlist.delete({
      where: { id },
    });
  }

  async findByShareToken(shareToken: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { shareToken },
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    // Share tokens are public, no access control needed
    return {
      ...wishlist,
      owner: {
        ...wishlist.owner,
        displayName: getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName),
      },
    };
  }

  private async getOrCreateUser(clerkUserId: string) {
    // DO NOT auto-create - only return existing users
    console.log(`🔍 Looking up user with Clerk ID: ${clerkUserId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });
    
    if (!user) {
      throw new Error("User profile not found. Please complete your profile setup.");
    }
    
    console.log(`✅ User found: ${user.id} for Clerk ID: ${clerkUserId}`);
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

  // Collaborator management methods
  async inviteCollaborator(clerkUserId: string, wishlistId: string, inviteeUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);
    
    // inviteeUserId is the database user ID from the friends list
    const invitee = await this.prisma.user.findUnique({
      where: { id: inviteeUserId },
    });
    
    if (!invitee) {
      throw new NotFoundException("User not found");
    }

    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true, title: true, secretSantaEvent: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    // Check if wishlist is linked to a Secret Santa event
    if (wishlist.secretSantaEvent) {
      throw new ForbiddenException("Cannot modify members of a Secret Santa event wishlist. Manage participants through the event instead.");
    }

    // Only owner can invite collaborators
    if (wishlist.ownerId !== user.id) {
      throw new ForbiddenException("Only the wishlist owner can invite collaborators");
    }

    // Can't invite yourself
    if (user.id === invitee.id) {
      throw new ForbiddenException("You cannot invite yourself");
    }

    // Check if already a collaborator
    const existingCollab = await this.prisma.wishlistCollaborator.findUnique({
      where: {
        wishlistId_userId: {
          wishlistId,
          userId: invitee.id,
        },
      },
    });

    if (existingCollab) {
      throw new ForbiddenException("User is already a collaborator");
    }

    // Create collaborator record
    await this.prisma.wishlistCollaborator.create({
      data: {
        wishlistId,
        userId: invitee.id,
        role: "EDITOR",
      },
    });

    // Update wishlist privacyLevel to GROUP when first collaborator is added
    const collaboratorCount = await this.prisma.wishlistCollaborator.count({
      where: { wishlistId },
    });

    if (collaboratorCount === 1) {
      // This is the first collaborator, update privacyLevel to GROUP
      await this.prisma.wishlist.update({
        where: { id: wishlistId },
        data: { privacyLevel: "GROUP" as "PRIVATE" | "FRIENDS_ONLY" | "PUBLIC" | "GROUP" },
      });
    }

    // Create notification for invitation
    const ownerDisplayName = getDisplayName(user.firstName, user.lastName) || user.username || "Someone";
    const notificationTitle = "Group Gift Invitation";
    const notificationBody = `${ownerDisplayName} invited you to collaborate on "${wishlist.title}"`;
    
    await this.prisma.notification.create({
      data: {
        userId: invitee.id,
        type: "WISHLIST_SHARED",
        title: notificationTitle,
        body: notificationBody,
        data: {
          wishlistId,
          fromUserId: user.id,
          type: "COLLABORATOR_INVITATION",
        },
        read: false,
      },
    });

    // Send push notification
    await this.pushService.sendPushNotification({
      userId: invitee.id,
      title: notificationTitle,
      body: notificationBody,
      data: {
        type: "WISHLIST_SHARED",
        wishlistId,
        fromUserId: user.id,
      },
    });

    return { message: "Invitation sent" };
  }

  async acceptCollaboration(clerkUserId: string, wishlistId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { id: true, ownerId: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    // Can't accept if you're the owner
    if (wishlist.ownerId === user.id) {
      throw new ForbiddenException("You are already the owner of this wishlist");
    }

    // Check if already a collaborator
    const existingCollab = await this.prisma.wishlistCollaborator.findUnique({
      where: {
        wishlistId_userId: {
          wishlistId,
          userId: user.id,
        },
      },
    });

    if (existingCollab) {
      return existingCollab; // Already a collaborator
    }

    // Create collaborator record with EDITOR role (default)
    const collaborator = await this.prisma.wishlistCollaborator.create({
      data: {
        wishlistId,
        userId: user.id,
        role: "EDITOR",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...collaborator,
      user: {
        ...collaborator.user,
        displayName: getDisplayName(collaborator.user.firstName, collaborator.user.lastName),
      },
    };
  }

  async removeCollaborator(clerkUserId: string, wishlistId: string, collaboratorUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true, privacyLevel: true, secretSantaEvent: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    // Check if wishlist is linked to a Secret Santa event
    if (wishlist.secretSantaEvent) {
      throw new ForbiddenException("Cannot modify members of a Secret Santa event wishlist. Manage participants through the event instead.");
    }

    // Only owner or the collaborator themselves can remove
    const isOwner = wishlist.ownerId === user.id;
    const isRemovingSelf = user.id === collaboratorUserId;

    if (!isOwner && !isRemovingSelf) {
      throw new ForbiddenException("Only the owner or the collaborator themselves can remove a collaborator");
    }

    // Owner can't remove themselves
    if (isOwner && wishlist.ownerId === collaboratorUserId) {
      throw new ForbiddenException("Owner cannot be removed");
    }

    await this.prisma.wishlistCollaborator.delete({
      where: {
        wishlistId_userId: {
          wishlistId,
          userId: collaboratorUserId,
        },
      },
    });

    // Check if there are any remaining collaborators
    const remainingCollaborators = await this.prisma.wishlistCollaborator.count({
      where: { wishlistId },
    });

    // If no collaborators remain and wishlist is GROUP, change to PRIVATE
    if (remainingCollaborators === 0 && wishlist.privacyLevel === "GROUP") {
      await this.prisma.wishlist.update({
        where: { id: wishlistId },
        data: { privacyLevel: "PRIVATE" },
      });
    }

    return { message: "Collaborator removed" };
  }

  async updateCollaboratorRole(clerkUserId: string, wishlistId: string, collaboratorUserId: string, role: "VIEWER" | "EDITOR" | "ADMIN") {
    const user = await this.getOrCreateUser(clerkUserId);

    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true, secretSantaEvent: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    // Check if wishlist is linked to a Secret Santa event
    if (wishlist.secretSantaEvent) {
      throw new ForbiddenException("Cannot modify members of a Secret Santa event wishlist. Manage participants through the event instead.");
    }

    // Only owner can update roles
    if (wishlist.ownerId !== user.id) {
      throw new ForbiddenException("Only the owner can update collaborator roles");
    }

    // Can't change owner's role
    if (wishlist.ownerId === collaboratorUserId) {
      throw new ForbiddenException("Cannot change owner's role");
    }

    const updated = await this.prisma.wishlistCollaborator.update({
      where: {
        wishlistId_userId: {
          wishlistId,
          userId: collaboratorUserId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...updated,
      user: {
        ...updated.user,
        displayName: getDisplayName(updated.user.firstName, updated.user.lastName),
      },
    };
  }

  async getCollaborators(clerkUserId: string, wishlistId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true },
    });

    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }

    // Only owner or collaborators can view the list
    const isOwner = wishlist.ownerId === user.id;
    const isCollaborator = await this.prisma.wishlistCollaborator.findUnique({
      where: {
        wishlistId_userId: {
          wishlistId,
          userId: user.id,
        },
      },
    });

    if (!isOwner && !isCollaborator) {
      throw new ForbiddenException("You don't have access to this wishlist");
    }

    const collaborators = await this.prisma.wishlistCollaborator.findMany({
      where: { wishlistId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return collaborators.map(collab => ({
      ...collab,
      user: {
        ...collab.user,
        displayName: getDisplayName(collab.user.firstName, collab.user.lastName),
      },
    }));
  }

  // Helper method to check if user can edit wishlist
  async canEditWishlist(clerkUserId: string, wishlistId: string): Promise<boolean> {
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

  // Helper method to check if user is admin (owner or ADMIN collaborator)
  async isAdmin(clerkUserId: string, wishlistId: string): Promise<boolean> {
    const user = await this.getOrCreateUser(clerkUserId);
    
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      select: { ownerId: true },
    });

    if (!wishlist) {
      return false;
    }

    // Owner is always admin
    if (wishlist.ownerId === user.id) {
      return true;
    }

    // Check if user is a collaborator with ADMIN role
    const collaborator = await this.prisma.wishlistCollaborator.findUnique({
      where: {
        wishlistId_userId: {
          wishlistId,
          userId: user.id,
        },
      },
    });

    return collaborator?.role === "ADMIN";
  }

  private generateShareToken(): string {
    // 🔒 SECURITY FIX: Use cryptographically secure random instead of Math.random()
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64url'); // Base64url is URL-safe
  }
}
