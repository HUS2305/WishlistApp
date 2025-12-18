import { Controller, Get, Delete, Param, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";

@Controller("admin")
@UseGuards(AuthGuard, AdminGuard) // 🔒 PROTECTED - Admin only!
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  async getUsers(@Query() query: any) {
    return this.adminService.getUsers(query);
  }

  @Get("wishlists")
  async getWishlists(@Query() query: any) {
    return this.adminService.getWishlists(query);
  }

  @Delete("content/:type/:id")
  async moderateContent(
    @Param("type") type: string,
    @Param("id") id: string
  ) {
    return this.adminService.moderateContent(type, id);
  }
}

