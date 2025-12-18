import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ItemsService } from "./items.service";
import { AuthGuard } from "../auth/auth.guard";
import { GetUserId } from "../auth/get-user.decorator";
import { CreateItemDto } from "../common/dto/create-item.dto";
import { UpdateItemDto } from "../common/dto/update-item.dto";

@Controller("items")
@UseGuards(AuthGuard) // 🔒 All item endpoints require authentication
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get("wishlists/:wishlistId/items")
  async getItemsByWishlist(
    @GetUserId() userId: string,
    @Param("wishlistId") wishlistId: string
  ) {
    return this.itemsService.findByWishlistId(userId, wishlistId);
  }

  @Post("wishlists/:wishlistId/items")
  async createItem(
    @GetUserId() userId: string,
    @Param("wishlistId") wishlistId: string,
    @Body() createData: CreateItemDto
  ) {
    return this.itemsService.create(userId, wishlistId, createData);
  }

  @Post("from-url")
  async parseFromUrl(@Body() body: { url: string }) {
    return this.itemsService.parseFromUrl(body.url);
  }

  @Get(":id")
  async getItemById(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.itemsService.findById(userId, id);
  }

  @Patch(":id")
  async updateItem(
    @GetUserId() userId: string,
    @Param("id") id: string,
    @Body() updateData: UpdateItemDto
  ) {
    return this.itemsService.update(userId, id, updateData);
  }

  @Delete(":id")
  async deleteItem(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.itemsService.delete(userId, id);
  }

  @Post(":id/reserve")
  async reserveItem(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.itemsService.reserve(userId, id);
  }

  @Delete(":id/reserve")
  async unreserveItem(
    @GetUserId() userId: string,
    @Param("id") id: string
  ) {
    return this.itemsService.unreserve(userId, id);
  }
}

