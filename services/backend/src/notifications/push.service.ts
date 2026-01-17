import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private expo: Expo;

  constructor(private prisma: PrismaService) {
    this.expo = new Expo();
  }

  /**
   * Send a push notification to a single user
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<void> {
    const { userId, title, body, data } = payload;

    try {
      // Get user's push token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      });

      if (!user?.pushToken) {
        this.logger.log(`⚠️ No push token for user ${userId}, skipping push notification`);
        return;
      }

      this.logger.log(`📤 Attempting to send push notification to user ${userId} (token: ${user.pushToken.substring(0, 20)}...)`);

      // Validate the push token
      if (!Expo.isExpoPushToken(user.pushToken)) {
        this.logger.warn(`Invalid Expo push token for user ${userId}: ${user.pushToken}`);
        // Remove invalid token
        await this.prisma.user.update({
          where: { id: userId },
          data: { pushToken: null },
        });
        return;
      }

      // Create the message
      const message: ExpoPushMessage = {
        to: user.pushToken,
        sound: "default",
        title,
        body,
        data: data as ExpoPushMessage["data"],
      };

      // Send the notification
      this.logger.log(`🚀 Sending push notification to Expo: ${JSON.stringify({ title, body, to: user.pushToken.substring(0, 30) + '...' })}`);
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      this.logger.log(`✅ Push notification ticket received: ${JSON.stringify(tickets[0])}`);
      await this.handleTickets(tickets, [userId]);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error);
    }
  }

  /**
   * Send push notifications to multiple users
   */
  async sendPushNotifications(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Get users with push tokens
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          pushToken: { not: null },
        },
        select: { id: true, pushToken: true },
      });

      if (users.length === 0) {
        this.logger.debug("No users with push tokens found, skipping notifications");
        return;
      }

      // Create messages for valid tokens
      const messages: ExpoPushMessage[] = [];
      const validUserIds: string[] = [];

      for (const user of users) {
        if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
          messages.push({
            to: user.pushToken,
            sound: "default",
            title,
            body,
            data: data as ExpoPushMessage["data"],
          });
          validUserIds.push(user.id);
        } else if (user.pushToken) {
          // Invalid token, remove it
          this.logger.warn(`Invalid Expo push token for user ${user.id}`);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { pushToken: null },
          });
        }
      }

      if (messages.length === 0) {
        return;
      }

      // Send in chunks (Expo recommends max 100 per request)
      const chunks = this.expo.chunkPushNotifications(messages);
      
      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(tickets, validUserIds);
      }

      this.logger.log(`Sent ${messages.length} push notifications`);
    } catch (error) {
      this.logger.error("Failed to send push notifications:", error);
    }
  }

  /**
   * Handle push notification tickets and remove invalid tokens
   */
  private async handleTickets(
    tickets: ExpoPushTicket[],
    userIds: string[]
  ): Promise<void> {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const userId = userIds[i];

      if (ticket.status === "ok") {
        this.logger.log(`✅ Push notification sent successfully to user ${userId}`);
      } else if (ticket.status === "error") {
        this.logger.error(
          `❌ Push notification error for user ${userId}: ${ticket.message}`
        );

        // Handle specific error types
        if (
          ticket.details?.error === "DeviceNotRegistered" ||
          ticket.details?.error === "InvalidCredentials"
        ) {
          // Remove invalid token
          this.logger.log(`Removing invalid push token for user ${userId}`);
          await this.prisma.user.update({
            where: { id: userId },
            data: { pushToken: null },
          });
        }
      }
    }
  }

  /**
   * Store a user's push token
   */
  async registerPushToken(userId: string, pushToken: string): Promise<void> {
    // Validate the token
    if (!Expo.isExpoPushToken(pushToken)) {
      this.logger.warn(`Invalid Expo push token provided: ${pushToken}`);
      throw new Error("Invalid Expo push token");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });

    this.logger.log(`Registered push token for user ${userId}`);
  }

  /**
   * Remove a user's push token (e.g., on logout)
   */
  async unregisterPushToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: null },
    });

    this.logger.log(`Unregistered push token for user ${userId}`);
  }
}
