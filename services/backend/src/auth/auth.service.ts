import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Webhook } from "svix";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async handleWebhook(
    body: any,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
    webhookSecret: string
  ) {
    // Verify webhook signature
    if (!webhookSecret) {
      throw new UnauthorizedException("Webhook secret not configured");
    }

    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(JSON.stringify(body), {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Webhook verification failed:", err);
      throw new UnauthorizedException("Invalid webhook signature");
    }

    const { id, email_addresses, phone_numbers, username, first_name, last_name, image_url } = evt.data;

    // Handle different webhook event types
    switch (evt.type) {
      case "user.created":
        // Don't auto-create users from webhook - they will be created when they complete profile
        console.log(`User created in Clerk: ${id} - waiting for profile completion`);
        return { received: true, message: "User will be created after profile completion" };

      case "user.updated":
        // Only update if user already exists in our database
        return await this.updateUserIfExists({
          clerkId: id,
          email: email_addresses[0]?.email_address || "",
          phone: phone_numbers[0]?.phone_number || null,
          username: username || null,
          firstName: first_name || null,
          lastName: last_name || null,
          avatar: image_url || null,
        });

      case "user.deleted":
        return await this.deleteUser(id);

      default:
        console.log(`Unhandled webhook event type: ${evt.type}`);
        return { received: true, message: `Event type ${evt.type} not handled` };
    }
  }

  private async updateUserIfExists(data: {
    clerkId: string;
    email: string;
    phone: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  }) {
    try {
      // Check if user exists first
      const existingUser = await this.prisma.user.findUnique({
        where: { clerkId: data.clerkId },
      });

      if (!existingUser) {
        console.log(`User ${data.clerkId} not found in database - skipping webhook update`);
        return { success: true, message: "User not in database yet" };
      }

      // Only update if user exists
      const user = await this.prisma.user.update({
        where: { clerkId: data.clerkId },
        data: {
          email: data.email,
          phone: data.phone,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          avatar: data.avatar,
        },
      });
      console.log("User updated from webhook:", user.id);
      return { success: true, userId: user.id };
    } catch (error: any) {
      console.error("Error updating user from webhook:", error);
      // Don't throw - webhook failures shouldn't block Clerk operations
      return { success: false, error: error.message };
    }
  }

  private async deleteUser(clerkId: string) {
    try {
      await this.prisma.user.delete({
        where: { clerkId },
      });
      console.log("User deleted:", clerkId);
      return { success: true };
    } catch (error: any) {
      if (error.code === "P2025") {
        console.log("User not found for deletion");
        return { success: true, message: "User already deleted" };
      }
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Public method for creating user after profile completion
  async createUserAfterProfileCompletion(data: {
    clerkId: string;
    email: string;
    phone?: string | null;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  }) {
    try {
      const user = await this.prisma.user.create({
        data: {
          clerkId: data.clerkId,
          email: data.email,
          phone: data.phone || null,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          avatar: data.avatar || null,
        },
      });
      console.log("User created after profile completion:", user.id);
      return { success: true, userId: user.id, user };
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === "P2002") {
        const field = error.meta?.target?.[0];
        if (field === "username") {
          throw new Error("Username already taken");
        } else if (field === "email") {
          throw new Error("Email already in use");
        }
        throw new Error("User already exists");
      }
      console.error("Error creating user:", error);
      throw error;
    }
  }
}

