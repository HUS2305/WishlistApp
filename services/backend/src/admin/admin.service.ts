import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(query: any) {
    // TODO: Add admin auth check
    return this.prisma.user.findMany({
      take: query.limit || 50,
      skip: query.offset || 0,
    });
  }

  async getWishlists(query: any) {
    // TODO: Add admin auth check
    return this.prisma.wishlist.findMany({
      take: query.limit || 50,
      skip: query.offset || 0,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }

  async moderateContent(type: string, id: string) {
    // TODO: Add admin auth check
    switch (type) {
      case "wishlist":
        return this.prisma.wishlist.delete({ where: { id } });
      case "item":
        return this.prisma.item.delete({ where: { id } });
      case "user":
        return this.prisma.user.delete({ where: { id } });
      default:
        throw new Error("Invalid content type");
    }
  }
}

