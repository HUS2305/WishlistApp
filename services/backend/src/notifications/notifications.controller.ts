import { Controller, Get, Patch, Post, Param, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { AuthGuard } from "../auth/auth.guard";
import { GetUserId } from "../auth/get-user.decorator";

@Controller("notifications")
@UseGuards(AuthGuard) // 🔒 All notification endpoints require authentication
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@GetUserId() userId: string) {
    return this.notificationsService.findAll(userId);
  }

  @Get("unread-count")
  async getUnreadCount(@GetUserId() userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(":id/read")
  async markAsRead(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post("mark-all-read")
  async markAllAsRead(@GetUserId() userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Post("delete-all")
  async deleteAll(@GetUserId() userId: string) {
    return this.notificationsService.deleteAll(userId);
  }
}

