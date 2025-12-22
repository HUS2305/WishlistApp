import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clerkUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Return only notifications for THIS user
    return this.prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getUnreadCount(clerkUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    const count = await this.prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    return { count };
  }

  async markAsRead(clerkUserId: string, id: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Get notification
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    // Verify ownership
    if (notification.userId !== user.id) {
      throw new ForbiddenException("You can only mark your own notifications as read");
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(clerkUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Only mark THIS user's notifications as read
    return this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: { read: true },
    });
  }

  async deleteAll(clerkUserId: string) {
    const user = await this.getOrCreateUser(clerkUserId);

    // Delete all notifications for THIS user
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId: user.id,
      },
    });
    
    return { 
      success: true, 
      deletedCount: result.count 
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
