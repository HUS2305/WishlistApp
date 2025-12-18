import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getDisplayName } from "../common/utils";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByClerkId(clerkUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        privacyLevel: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...user,
      displayName: getDisplayName(user.firstName, user.lastName),
    };
  }

  async updateByClerkId(clerkUserId: string, updateData: any) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Sanitize update data - only allow certain fields
    const allowedFields = ['firstName', 'lastName', 'bio', 'avatar', 'privacyLevel'];
    const sanitizedData: any = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: sanitizedData,
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        privacyLevel: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      displayName: getDisplayName(updated.firstName, updated.lastName),
    };
  }

  async findById(requestingClerkUserId: string, targetUserId: string) {
    const requestingUser = await this.getOrCreateUser(requestingClerkUserId);
    
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        privacyLevel: true,
        createdAt: true,
        email: true, // Will filter based on privacy
      },
    });

    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    const displayName = getDisplayName(targetUser.firstName, targetUser.lastName);

    // If looking at own profile, return everything
    if (requestingUser.id === targetUserId) {
      return {
        ...targetUser,
        displayName,
      };
    }

    // Check friendship status
    const areFriends = await this.areFriends(requestingUser.id, targetUserId);

    // Filter data based on privacy level
    if (targetUser.privacyLevel === "PRIVATE" && !areFriends) {
      // Only show basic info for private profiles to non-friends
      return {
        id: targetUser.id,
        username: targetUser.username,
        displayName,
        avatar: targetUser.avatar,
      };
    }

    if (targetUser.privacyLevel === "FRIENDS_ONLY" && !areFriends) {
      // Show some info but not email for friends-only profiles
      return {
        id: targetUser.id,
        username: targetUser.username,
        displayName,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
      };
    }

    // Public profile or friend - show everything except email
    const { email, ...publicData } = targetUser;
    return {
      ...publicData,
      displayName,
    };
  }

  async search(requestingClerkUserId: string, query: string) {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const requestingUser = await this.getOrCreateUser(requestingClerkUserId);
    const queryTrimmed = query.trim();

    // 🔒 SECURITY FIX: Removed email from search to prevent email enumeration attacks
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: queryTrimmed, mode: "insensitive" } },
              { firstName: { contains: queryTrimmed, mode: "insensitive" } },
              { lastName: { contains: queryTrimmed, mode: "insensitive" } },
              // ❌ REMOVED: email search (privacy violation)
            ],
          },
          {
            id: { not: requestingUser.id }, // Don't include yourself
          },
        ],
      },
      take: 20,
      select: {
        id: true,
        clerkId: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        // ❌ NEVER include email in search results
      },
    });

    // For each user, check if they're friends, pending, or blocked
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const friendships = await this.prisma.friendship.findMany({
          where: {
            OR: [
              { userId: requestingUser.id, friendId: user.id },
              { userId: user.id, friendId: requestingUser.id },
            ],
          },
        });

        const accepted = friendships.find(f => f.status === "ACCEPTED");
        const pending = friendships.find(f => f.status === "PENDING");
        const blockedByMe = friendships.find(f => f.status === "BLOCKED" && f.userId === requestingUser.id);
        const blockedByThem = friendships.find(f => f.status === "BLOCKED" && f.userId === user.id);

        // Get pending request ID if exists
        let pendingRequestId: string | undefined;
        let isSentByMe: boolean | undefined;
        if (pending) {
          pendingRequestId = pending.id;
          isSentByMe = pending.userId === requestingUser.id;
        }

        return {
          ...user,
          displayName: getDisplayName(user.firstName, user.lastName),
          isFriend: !!accepted,
          isPending: !!pending,
          pendingRequestId,
          isSentByMe,
          isBlockedByMe: !!blockedByMe,
          isBlockedByThem: !!blockedByThem,
        };
      })
    );

    // Filter out users who have blocked the requesting user
    return enrichedUsers.filter(user => !user.isBlockedByThem);
  }

  async getUserProfile(requestingClerkUserId: string, targetUserId: string) {
    const requestingUser = await this.getOrCreateUser(requestingClerkUserId);
    
    // targetUserId can be either database ID or Clerk ID
    let targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    
    if (!targetUser) {
      targetUser = await this.getOrCreateUser(targetUserId);
    }

    // Check if target user has blocked requesting user
    const blockedByThem = await this.prisma.friendship.findFirst({
      where: {
        userId: targetUser.id,
        friendId: requestingUser.id,
        status: "BLOCKED",
      },
    });

    if (blockedByThem) {
      throw new ForbiddenException("Access denied");
    }

    // Check friendship status
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId: requestingUser.id, friendId: targetUser.id },
          { userId: targetUser.id, friendId: requestingUser.id },
        ],
      },
    });

    const accepted = friendships.find(f => f.status === "ACCEPTED");
    const pending = friendships.find(f => f.status === "PENDING" && f.friendId === requestingUser.id);
    const sent = friendships.find(f => f.status === "PENDING" && f.userId === requestingUser.id);
    const blockedByMe = friendships.find(f => f.status === "BLOCKED" && f.userId === requestingUser.id);

    // Get wishlists (only if friends or public)
    const privacyConditions: any[] = [{ privacyLevel: "PUBLIC" }];
    if (accepted) {
      privacyConditions.push({ privacyLevel: "FRIENDS_ONLY" });
    }
    
    const wishlists = await this.prisma.wishlist.findMany({
      where: {
        ownerId: targetUser.id,
        OR: privacyConditions,
      },
      include: {
        items: {
          where: { status: "WANTED" },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return {
      profile: {
        ...targetUser,
        displayName: getDisplayName(targetUser.firstName, targetUser.lastName),
      },
      wishlists: wishlists.map((w) => {
        const items = w.items || [];
        return {
          ...w,
          activeWishes: items.length,
          totalPrice: items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        };
      }),
      areFriends: !!accepted,
      friendshipSince: accepted?.createdAt?.toISOString() || null,
      pendingRequestId: pending?.id || null,
      sentRequestId: sent?.id || null,
      isBlockedByMe: !!blockedByMe,
      isBlockedByThem: false,
    };
  }

  private async getOrCreateUser(clerkUserId: string) {
    let user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: `${clerkUserId}@clerk.temp`,
          username: `user_${clerkUserId.slice(0, 8)}`,
        },
      });
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
