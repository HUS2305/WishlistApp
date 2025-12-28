import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { WishlistsService } from "./wishlists.service";
import { AuthGuard } from "../auth/auth.guard";
import { GetUserId } from "../auth/get-user.decorator";

@Controller("wishlists")
@UseGuards(AuthGuard)
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  async getWishlists(@GetUserId() userId: string, @Query() query: any) {
    return this.wishlistsService.findAll(userId, query);
  }

  @Post()
  async createWishlist(@GetUserId() userId: string, @Body() createData: any) {
    return this.wishlistsService.create(userId, createData);
  }

  @Get(":id")
  async getWishlistById(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.wishlistsService.findById(userId, id);
  }

  @Patch(":id")
  async updateWishlist(
    @GetUserId() userId: string,
    @Param("id") id: string,
    @Body() updateData: any
  ) {
    return this.wishlistsService.update(userId, id, updateData);
  }

  @Delete(":id")
  async deleteWishlist(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.wishlistsService.delete(userId, id);
  }

  @Get("public/:shareToken")
  async getPublicWishlist(@Param("shareToken") shareToken: string) {
    return this.wishlistsService.findByShareToken(shareToken);
  }

  // Collaborator endpoints
  @Post(":id/collaborators/invite")
  async inviteCollaborator(
    @GetUserId() userId: string,
    @Param("id") wishlistId: string,
    @Body() body: { inviteeUserId: string }
  ) {
    return this.wishlistsService.inviteCollaborator(userId, wishlistId, body.inviteeUserId);
  }

  @Post(":id/collaborators/accept")
  async acceptCollaboration(
    @GetUserId() userId: string,
    @Param("id") wishlistId: string
  ) {
    return this.wishlistsService.acceptCollaboration(userId, wishlistId);
  }

  @Delete(":id/collaborators/:collaboratorId")
  async removeCollaborator(
    @GetUserId() userId: string,
    @Param("id") wishlistId: string,
    @Param("collaboratorId") collaboratorId: string
  ) {
    return this.wishlistsService.removeCollaborator(userId, wishlistId, collaboratorId);
  }

  @Patch(":id/collaborators/:collaboratorId/role")
  async updateCollaboratorRole(
    @GetUserId() userId: string,
    @Param("id") wishlistId: string,
    @Param("collaboratorId") collaboratorId: string,
    @Body() body: { role: "VIEWER" | "EDITOR" | "ADMIN" }
  ) {
    return this.wishlistsService.updateCollaboratorRole(userId, wishlistId, collaboratorId, body.role);
  }

  @Get(":id/collaborators")
  async getCollaborators(
    @GetUserId() userId: string,
    @Param("id") wishlistId: string
  ) {
    return this.wishlistsService.getCollaborators(userId, wishlistId);
  }
}

