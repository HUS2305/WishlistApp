import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AffiliateService {
  constructor(private prisma: PrismaService) {}

  async trackAndRedirect(itemId: string, ipAddress?: string, userAgent?: string) {
    // Get item URL
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: { url: true },
    });

    if (!item) {
      throw new NotFoundException("Item not found");
    }

    // Validate URL to prevent open redirect attacks
    try {
      const url = new URL(item.url);
      // Only allow http and https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new BadRequestException("Invalid URL protocol");
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Invalid URL format");
    }

    // Track click (don't await to improve redirect speed)
    this.prisma.affiliateClick.create({
      data: {
        itemId,
        ipAddress: ipAddress?.substring(0, 45), // Limit IP length
        userAgent: userAgent?.substring(0, 500), // Limit user agent length
      },
    }).catch(err => {
      console.error("Error tracking affiliate click:", err);
    });

    return item.url;
  }
}

