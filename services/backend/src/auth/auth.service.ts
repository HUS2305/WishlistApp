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
        return await this.createUser({
          clerkId: id,
          email: email_addresses[0]?.email_address || "",
          phone: phone_numbers[0]?.phone_number || null,
          username: username || null,
          firstName: first_name || null,
          lastName: last_name || null,
          avatar: image_url || null,
        });

      case "user.updated":
        return await this.updateUser({
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

  private async createUser(data: {
    clerkId: string;
    email: string;
    phone: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  }) {
    try {
      const user = await this.prisma.user.create({
        data: {
          clerkId: data.clerkId,
          email: data.email,
          phone: data.phone,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          avatar: data.avatar,
        },
      });
      console.log("User created:", user.id);
      return { success: true, userId: user.id };
    } catch (error: any) {
      // Handle unique constraint violations (user might already exist)
      if (error.code === "P2002") {
        console.log("User already exists, updating instead");
        return await this.updateUser(data);
      }
      console.error("Error creating user:", error);
      throw error;
    }
  }

  private async updateUser(data: {
    clerkId: string;
    email: string;
    phone: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  }) {
    try {
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
      console.log("User updated:", user.id);
      return { success: true, userId: user.id };
    } catch (error: any) {
      if (error.code === "P2025") {
        // User doesn't exist, create instead
        console.log("User not found, creating instead");
        return await this.createUser(data);
      }
      console.error("Error updating user:", error);
      throw error;
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
}

