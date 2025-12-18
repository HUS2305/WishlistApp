import { Controller, Get, Post, Delete, Param, UseGuards, Body } from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { AuthGuard } from "../auth/auth.guard";
import { GetUserId } from "../auth/get-user.decorator";

@Controller("friends")
@UseGuards(AuthGuard) // 🔒 All friend endpoints require authentication
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async getFriends(@GetUserId() userId: string) {
    return this.friendsService.findAll(userId);
  }

  @Get("requests/pending")
  async getFriendRequests(@GetUserId() userId: string) {
    return this.friendsService.findRequests(userId);
  }

  @Post("requests")
  async sendFriendRequest(
    @GetUserId() userId: string,
    @Body() body: { friendId: string }
  ) {
    return this.friendsService.sendRequest(userId, body.friendId);
  }

  @Post("requests/:requestId/accept")
  async acceptFriendRequest(
    @GetUserId() userId: string,
    @Param("requestId") requestId: string
  ) {
    return this.friendsService.acceptRequest(userId, requestId);
  }

  @Post("requests/:requestId/reject")
  async rejectFriendRequest(
    @GetUserId() userId: string,
    @Param("requestId") requestId: string
  ) {
    return this.friendsService.rejectRequest(userId, requestId);
  }

  @Get("requests/sent")
  async getSentFriendRequests(@GetUserId() userId: string) {
    return this.friendsService.findSentRequests(userId);
  }

  @Post("requests/:requestId/cancel")
  async cancelFriendRequest(
    @GetUserId() userId: string,
    @Param("requestId") requestId: string
  ) {
    return this.friendsService.cancelRequest(userId, requestId);
  }

  @Post(":userId/block")
  async blockUser(
    @GetUserId() userId: string,
    @Param("userId") targetUserId: string
  ) {
    return this.friendsService.blockUser(userId, targetUserId);
  }

  @Post(":userId/unblock")
  async unblockUser(
    @GetUserId() userId: string,
    @Param("userId") targetUserId: string
  ) {
    return this.friendsService.unblockUser(userId, targetUserId);
  }

  @Get(":friendId/profile")
  async getFriendProfile(
    @GetUserId() userId: string,
    @Param("friendId") friendId: string
  ) {
    return this.friendsService.getFriendProfile(userId, friendId);
  }

  @Delete(":friendId")
  async removeFriend(
    @GetUserId() userId: string,
    @Param("friendId") friendId: string
  ) {
    return this.friendsService.remove(userId, friendId);
  }
}

