import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getDisplayName } from "../common/utils";

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clerkUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Get all accepted friendships where user is either the sender or receiver
    // Exclude BLOCKED friendships
    const friendships = await this.prisma.friendship.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId: user.id, status: "ACCEPTED" },
              { friendId: user.id, status: "ACCEPTED" },
            ],
          },
          {
            status: { not: "BLOCKED" },
          },
        ],
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
        friend: {
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

    // Return the other user (not the current user)
    return friendships.map(f => {
      const otherUser = f.userId === user.id ? f.friend : f.user;
      return {
        ...otherUser,
        displayName: getDisplayName(otherUser.firstName, otherUser.lastName),
      };
    });
  }

  async findRequests(clerkUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Get pending friend requests sent TO this user
    const requests = await this.prisma.friendship.findMany({
      where: {
        friendId: user.id,
        status: "PENDING",
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

    return requests.map(request => ({
      ...request,
      user: {
        ...request.user,
        displayName: getDisplayName(request.user.firstName, request.user.lastName),
      },
    }));
  }

  async sendRequest(clerkUserId: string, friendIdOrClerkId: string) {
    const user = await this.getOrCreateUser(clerkUserId);
    
    // friendIdOrClerkId can be either database ID or Clerk ID
    // Try to find by database ID first (most common from search results)
    let friend = await this.prisma.user.findUnique({
      where: { id: friendIdOrClerkId },
    });
    
    // If not found by database ID, try Clerk ID
    if (!friend) {
      friend = await this.getOrCreateUser(friendIdOrClerkId);
    }
    
    // Prevent self-friend requests
    if (user.id === friend.id) {
      throw new BadRequestException("You cannot send a friend request to yourself");
    }

    // Check if friendship already exists
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: friend.id },
          { userId: friend.id, friendId: user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new BadRequestException("You are already friends");
      }
      if (existing.status === "PENDING") {
        throw new BadRequestException("Friend request already sent");
      }
      if (existing.status === "BLOCKED") {
        throw new ForbiddenException("Cannot send friend request");
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        userId: user.id,
        friendId: friend.id,
        status: "PENDING",
      },
    });

    // Create notification for the friend who received the request
    const senderDisplayName = getDisplayName(user.firstName, user.lastName) || user.username || "Someone";
    await this.prisma.notification.create({
      data: {
        userId: friend.id,
        type: "FRIEND_REQUEST",
        title: "New Friend Request",
        body: `${senderDisplayName} sent you a friend request`,
        data: {
          fromUserId: user.id,
          friendshipId: friendship.id,
        },
        read: false,
      },
    });

    return friendship;
  }

  async acceptRequest(clerkUserId: string, requestId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Get the friend request
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Friend request not found");
    }

    // Verify this request is FOR the current user
    if (request.friendId !== user.id) {
      throw new ForbiddenException("You can only accept requests sent to you");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("This request has already been processed");
    }

    const updatedFriendship = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    // Get the sender's info for the notification
    const sender = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    if (sender) {
      // Create notification for the sender that their request was accepted
      const accepterDisplayName = getDisplayName(user.firstName, user.lastName) || user.username || "Someone";
      await this.prisma.notification.create({
        data: {
          userId: sender.id,
          type: "FRIEND_ACCEPTED",
          title: "Friend Request Accepted",
          body: `${accepterDisplayName} accepted your friend request`,
          data: {
            friendshipId: updatedFriendship.id,
          },
          read: false,
        },
      });
    }

    return updatedFriendship;
  }

  async rejectRequest(clerkUserId: string, requestId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Get the friend request
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Friend request not found");
    }

    // Verify this request is FOR the current user
    if (request.friendId !== user.id) {
      throw new ForbiddenException("You can only reject requests sent to you");
    }

    // Delete the request
    return this.prisma.friendship.delete({
      where: { id: requestId },
    });
  }

  async remove(clerkUserId: string, friendIdOrClerkId: string) {
    const user = await this.getOrCreateUser(clerkUserId);
    
    // friendIdOrClerkId can be either database ID or Clerk ID
    let friend = await this.prisma.user.findUnique({
      where: { id: friendIdOrClerkId },
    });
    
    // If not found by database ID, try Clerk ID
    if (!friend) {
      friend = await this.getOrCreateUser(friendIdOrClerkId);
    }

    // Delete friendship in either direction
    const result = await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: user.id, friendId: friend.id },
          { userId: friend.id, friendId: user.id },
        ],
        status: "ACCEPTED",
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Friendship not found");
    }

    return result;
  }

  async findSentRequests(clerkUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Get pending friend requests sent BY this user
    const requests = await this.prisma.friendship.findMany({
      where: {
        userId: user.id,
        status: "PENDING",
      },
      include: {
        friend: {
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

    return requests.map(request => ({
      ...request,
      friend: {
        ...request.friend,
        displayName: getDisplayName(request.friend.firstName, request.friend.lastName),
      },
    }));
  }

  async cancelRequest(clerkUserId: string, requestId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Get the friend request
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Friend request not found");
    }

    // Verify this request was sent BY the current user
    if (request.userId !== user.id) {
      throw new ForbiddenException("You can only cancel requests you sent");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("This request has already been processed");
    }

    // Delete the request
    return this.prisma.friendship.delete({
      where: { id: requestId },
    });
  }

  async blockUser(clerkUserId: string, targetUserIdOrClerkId: string) {
    const user = await this.getOrCreateUser(clerkUserId);
    
    // targetUserIdOrClerkId can be either database ID or Clerk ID
    let targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserIdOrClerkId },
    });
    
    if (!targetUser) {
      targetUser = await this.getOrCreateUser(targetUserIdOrClerkId);
    }

    // Prevent self-blocking
    if (user.id === targetUser.id) {
      throw new BadRequestException("You cannot block yourself");
    }

    // Check if a friendship record already exists
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: targetUser.id },
          { userId: targetUser.id, friendId: user.id },
        ],
      },
    });

    if (existing) {
      // Update existing record to BLOCKED, ensuring userId is the blocker
      // If the existing record has the opposite order, we need to handle it
      if (existing.userId === user.id) {
        // Already in correct order - just update status
        return this.prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "BLOCKED" },
        });
      } else {
        // Wrong order - delete and recreate with correct order
        await this.prisma.friendship.delete({
          where: { id: existing.id },
        });
        return this.prisma.friendship.create({
          data: {
            userId: user.id,
            friendId: targetUser.id,
            status: "BLOCKED",
          },
        });
      }
    } else {
      // Create new BLOCKED record
      return this.prisma.friendship.create({
        data: {
          userId: user.id,
          friendId: targetUser.id,
          status: "BLOCKED",
        },
      });
    }
  }

  async unblockUser(clerkUserId: string, targetUserIdOrClerkId: string) {
    const user = await this.getOrCreateUser(clerkUserId);
    
    // targetUserIdOrClerkId can be either database ID or Clerk ID
    let targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserIdOrClerkId },
    });
    
    if (!targetUser) {
      targetUser = await this.getOrCreateUser(targetUserIdOrClerkId);
    }

    // Find and delete the BLOCKED friendship record
    const blocked = await this.prisma.friendship.findFirst({
      where: {
        userId: user.id,
        friendId: targetUser.id,
        status: "BLOCKED",
      },
    });

    if (!blocked) {
      throw new NotFoundException("User is not blocked");
    }

    return this.prisma.friendship.delete({
      where: { id: blocked.id },
    });
  }

  async getFriendProfile(clerkUserId: string, friendId: string) {
    const user = await this.getOrCreateUser(clerkUserId);
    
    // friendId can be either database ID or Clerk ID
    let friend = await this.prisma.user.findUnique({
      where: { id: friendId },
    });
    
    if (!friend) {
      friend = await this.getOrCreateUser(friendId);
    }

    // Check if they are friends
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: friend.id, status: "ACCEPTED" },
          { userId: friend.id, friendId: user.id, status: "ACCEPTED" },
        ],
      },
    });

    // Get wishlists (only if friends or public)
    const privacyConditions: any[] = [{ privacyLevel: "PUBLIC" }];
    if (friendship) {
      privacyConditions.push({ privacyLevel: "FRIENDS_ONLY" });
    }
    
    const wishlists = await this.prisma.wishlist.findMany({
      where: {
        ownerId: friend.id,
        OR: privacyConditions,
      },
      include: {
        items: {
          where: { status: "WANTED" },
        },
      },
    });

    return {
      profile: {
        ...friend,
        displayName: getDisplayName(friend.firstName, friend.lastName),
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
      friendshipSince: friendship?.createdAt?.toISOString() || null,
    };
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
}
