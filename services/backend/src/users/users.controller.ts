import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "../auth/auth.guard";
import { GetUserId } from "../auth/get-user.decorator";

@Controller("users")
@UseGuards(AuthGuard) // 🔒 All user endpoints require authentication
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async getCurrentUser(@GetUserId() userId: string) {
    return this.usersService.findByClerkId(userId);
  }

  @Post("me")
  async createCurrentUser(
    @GetUserId() userId: string,
    @Body() createData: {
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
    }
  ) {
    return this.usersService.createUser(userId, createData);
  }

  @Patch("me")
  async updateCurrentUser(
    @GetUserId() userId: string,
    @Body() updateData: any
  ) {
    return this.usersService.updateByClerkId(userId, updateData);
  }

  @Delete("me")
  async deleteCurrentUser(@GetUserId() userId: string) {
    return this.usersService.deleteByClerkId(userId);
  }

  @Get("search")
  async searchUsers(
    @GetUserId() userId: string,
    @Query("q") query: string
  ) {
    return this.usersService.search(userId, query);
  }

  @Get("check-username/:username")
  async checkUsernameAvailability(@Param("username") username: string) {
    return this.usersService.checkUsernameAvailability(username);
  }

  @Get(":id")
  async getUserById(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.usersService.findById(userId, id);
  }

  @Get(":id/profile")
  async getUserProfile(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.usersService.getUserProfile(userId, id);
  }
}

