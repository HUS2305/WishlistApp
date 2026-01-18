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
        birthday: true,
        theme: true,
        language: true,
        currency: true,
        timezone: true,
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
      birthday: user.birthday?.toISOString().split('T')[0] || null,
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

    // Sanitize update data - allow profile fields including username and email
    const allowedFields = ['firstName', 'lastName', 'username', 'email', 'bio', 'avatar', 'privacyLevel', 'theme', 'language', 'currency', 'timezone', 'birthday'];
    const sanitizedData: any = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        // Convert birthday string to Date object if it's provided, allow null to clear it
        if (field === 'birthday') {
          sanitizedData[field] = updateData[field] ? new Date(updateData[field]) : null;
        } else {
          sanitizedData[field] = updateData[field];
        }
      }
    }

    try {
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
          birthday: true,
          theme: true,
          privacyLevel: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        ...updated,
        birthday: updated.birthday?.toISOString().split('T')[0] || null,
        displayName: getDisplayName(updated.firstName, updated.lastName),
      };
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === "P2002") {
        const field = error.meta?.target?.[0];
        if (field === "username") {
          throw new Error("Username already taken");
        } else if (field === "email") {
          throw new Error("Email already in use");
        }
      }
      throw error;
    }
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
        birthday: true,
        privacyLevel: true,
        createdAt: true,
        email: true, // Will filter based on privacy
      },
    });

    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    const displayName = getDisplayName(targetUser.firstName, targetUser.lastName);
    const birthdayISO = targetUser.birthday?.toISOString().split('T')[0] || null;

    // If looking at own profile, return everything
    if (requestingUser.id === targetUserId) {
      return {
        ...targetUser,
        birthday: birthdayISO,
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
      // Show some info but not email or birthday for friends-only profiles to non-friends
      return {
        id: targetUser.id,
        username: targetUser.username,
        displayName,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
      };
    }

    // Public profile or friend - show everything except email, include birthday only for friends
    const { email, ...publicData } = targetUser;
    return {
      ...publicData,
      birthday: areFriends ? birthdayISO : null, // Birthday only visible to friends
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
        // Check friendships in both directions
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
        // Check if YOU blocked them (userId is you, friendId is them)
        const blockedByMe = friendships.find(f => 
          f.status === "BLOCKED" && 
          ((f.userId === requestingUser.id && f.friendId === user.id))
        );
        // Check if THEY blocked you (userId is them, friendId is you)
        const blockedByThem = friendships.find(f => 
          f.status === "BLOCKED" && 
          ((f.userId === user.id && f.friendId === requestingUser.id))
        );

        // Get pending request ID if exists
        let pendingRequestId: string | undefined;
        let isSentByMe: boolean | undefined;
        if (pending) {
          pendingRequestId = pending.id;
          isSentByMe = pending.userId === requestingUser.id;
        }

        // Debug: Log avatar field for search results
        console.log(`🔍 Backend search: user ${user.username} avatar = ${user.avatar || 'NULL'}`);

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

  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: { id: true },
    });

    return { available: !existingUser };
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

    const birthdayISO = targetUser.birthday?.toISOString().split('T')[0] || null;
    const areFriends = !!accepted;

    return {
      profile: {
        ...targetUser,
        birthday: areFriends ? birthdayISO : null, // Birthday only visible to friends
        displayName: getDisplayName(targetUser.firstName, targetUser.lastName),
      },
      wishlists: wishlists.map((w) => {
        const items = w.items || [];
        // Get currency from first item, or default to target user's currency, or USD
        const currency = items.length > 0 ? items[0].currency : (targetUser.currency || "USD");
        return {
          ...w,
          activeWishes: items.length,
          totalPrice: items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
          currency, // Include currency for proper conversion on frontend
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        };
      }),
      areFriends,
      friendshipSince: accepted?.createdAt?.toISOString() || null,
      pendingRequestId: pending?.id || null,
      sentRequestId: sent?.id || null,
      isBlockedByMe: !!blockedByMe,
      isBlockedByThem: false,
    };
  }

  private async getOrCreateUser(clerkUserId: string) {
    // Try to find user - DO NOT auto-create
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });
    
    if (!user) {
      // User hasn't completed profile creation yet
      throw new NotFoundException("User profile not found. Please complete your profile setup.");
    }
    
    return user;
  }

  async createUser(clerkUserId: string, data: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    theme?: string;
    language?: string;
    currency?: string;
    timezone?: string;
    birthday?: string;
  }) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (existingUser) {
        // User exists - update with the new profile data instead
        console.log(`User with Clerk ID ${clerkUserId} already exists - updating profile instead`);
        const updateData: any = {
          email: data.email,
          phone: data.phone || null,
          username: data.username.trim(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          avatar: data.avatar || null,
          theme: data.theme || null,
          language: data.language || null,
          currency: data.currency || null,
          timezone: data.timezone || null,
        };
        
        if (data.birthday) {
          updateData.birthday = new Date(data.birthday);
        }

        const updated = await this.prisma.user.update({
          where: { clerkId: clerkUserId },
          data: updateData,
          select: {
            id: true,
            clerkId: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            birthday: true,
            privacyLevel: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return {
          ...updated,
          birthday: updated.birthday?.toISOString().split('T')[0] || null,
          displayName: getDisplayName(updated.firstName, updated.lastName),
        };
      }

      // Create new user
      const createData: any = {
        clerkId: clerkUserId,
        email: data.email,
        phone: data.phone || null,
        username: data.username.toLowerCase().trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        avatar: data.avatar || null,
        theme: data.theme || null,
        language: data.language || null,
        currency: data.currency || null,
        timezone: data.timezone || null,
      };

      if (data.birthday) {
        createData.birthday = new Date(data.birthday);
      }

      const user = await this.prisma.user.create({
        data: createData,
        select: {
          id: true,
          clerkId: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          bio: true,
          birthday: true,
          privacyLevel: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        ...user,
        birthday: user.birthday?.toISOString().split('T')[0] || null,
        displayName: getDisplayName(user.firstName, user.lastName),
      };
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === "P2002") {
        const field = error.meta?.target?.[0];
        if (field === "username") {
          throw new Error("Username already taken");
        } else if (field === "email") {
          throw new Error("Email already in use");
        }
      }
      throw error;
    }
  }

  async deleteByClerkId(clerkUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Delete user - Prisma will cascade delete all related records
    // (wishlists, items, friendships, notifications, etc.)
    await this.prisma.user.delete({
      where: { id: user.id },
    });

    return { message: "User account deleted successfully" };
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
