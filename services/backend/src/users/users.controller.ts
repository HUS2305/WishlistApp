import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "../auth/auth.guard";
import { GetUserId } from "../auth/get-user.decorator";
import { PushService } from "../notifications/push.service";
import { CreateUserDto, UpdateUserDto, RegisterPushTokenDto } from "../common/dto/user.dto";

@Controller("users")
@UseGuards(AuthGuard) // 🔒 All user endpoints require authentication
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly pushService: PushService
  ) {}

  @Get("me")
  async getCurrentUser(@GetUserId() userId: string) {
    return this.usersService.findByClerkId(userId);
  }

  @Post("me")
  async createCurrentUser(
    @GetUserId() userId: string,
    @Body() createData: CreateUserDto
  ) {
    return this.usersService.createUser(userId, createData);
  }

  @Patch("me")
  async updateCurrentUser(
    @GetUserId() userId: string,
    @Body() updateData: UpdateUserDto
  ) {
    return this.usersService.updateByClerkId(userId, updateData);
  }

  @Delete("me")
  async deleteCurrentUser(@GetUserId() userId: string) {
    return this.usersService.deleteByClerkId(userId);
  }

  @Post("me/push-token")
  async registerPushToken(
    @GetUserId() clerkUserId: string,
    @Body() body: RegisterPushTokenDto
  ) {
    // Get the user by clerk ID to get the database user ID
    const user = await this.usersService.findByClerkId(clerkUserId);
    if (!user) {
      throw new BadRequestException("User not found");
    }
    
    await this.pushService.registerPushToken(user.id, body.pushToken);
    return { success: true };
  }

  @Delete("me/push-token")
  async unregisterPushToken(@GetUserId() clerkUserId: string) {
    const user = await this.usersService.findByClerkId(clerkUserId);
    if (!user) {
      throw new BadRequestException("User not found");
    }
    
    await this.pushService.unregisterPushToken(user.id);
    return { success: true };
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

