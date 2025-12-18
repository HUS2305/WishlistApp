import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWishlistDto } from "../common/dto/create-wishlist.dto";
import { getDisplayName } from "../common/utils";

@Injectable()
export class WishlistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clerkUserId: string, _query: any) {
    // Get or create user first
    const user = await this.getOrCreateUser(clerkUserId);
    console.log(`🔍 Finding wishlists for user: ${user.id} (Clerk ID: ${clerkUserId})`);
    
    // Return only wishlists owned by THIS user
    const wishlists = await this.prisma.wishlist.findMany({
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`✅ Found ${wishlists.length} wishlists for user ${user.id}`);
    return wishlists.map(wishlist => ({
      ...wishlist,
      owner: {
        ...wishlist.owner,
        displayName: getDisplayName(wishlist.owner.firstName, wishlist.owner.lastName),
      },
    }));
  }

  async findById(clerkUserId: string, id: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
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

    const user = await this.getOrCreateUser(clerkUserId);

    // Check access permissions
    if (wishlist.ownerId !== user.id) {
      // Not the owner, check privacy level
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
    };
  }

  async create(clerkUserId: string, data: CreateWishlistDto) {
    // Get or create user based on Clerk user ID
    const user = await this.getOrCreateUser(clerkUserId);

    // Generate a unique share token
    const shareToken = this.generateShareToken();

    const wishlist = await this.prisma.wishlist.create({
      data: {
        title: data.title,
        description: data.description,
        privacyLevel: data.privacyLevel,
        allowComments: data.allowComments,
        allowReservations: data.allowReservations,
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

    // Only owner can update their wishlist
    if (wishlist.ownerId !== user.id) {
      throw new ForbiddenException("You can only update your own wishlists");
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

    // Only owner can delete their wishlist
    if (wishlist.ownerId !== user.id) {
      throw new ForbiddenException("You can only delete your own wishlists");
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
    // Try to find user by Clerk ID
    console.log(`🔍 Looking up user with Clerk ID: ${clerkUserId}`);
    let user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      // Create new user if doesn't exist
      console.log(`⚠️ User not found for Clerk ID: ${clerkUserId}, creating new user...`);
      user = await this.prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: `${clerkUserId}@clerk.temp`, // Temporary email, will be updated by webhook
          username: `user_${clerkUserId.slice(0, 8)}`,
        },
      });
      console.log('✅ Created new user:', user.id, 'for Clerk ID:', clerkUserId);
    } else {
      console.log(`✅ Found existing user: ${user.id} for Clerk ID: ${clerkUserId}`);
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

  private generateShareToken(): string {
    // 🔒 SECURITY FIX: Use cryptographically secure random instead of Math.random()
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64url'); // Base64url is URL-safe
  }
}
