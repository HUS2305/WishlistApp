import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WishlistsModule } from "./wishlists/wishlists.module";
import { ItemsModule } from "./items/items.module";
import { FriendsModule } from "./friends/friends.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AffiliateModule } from "./affiliate/affiliate.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 🔒 SECURITY: Rate limiting - 100 requests per 15 minutes per IP
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute in milliseconds
      limit: 100, // 100 requests per minute
    }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WishlistsModule,
    ItemsModule,
    FriendsModule,
    NotificationsModule,
    AffiliateModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

