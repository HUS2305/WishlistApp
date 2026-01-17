import { Module } from "@nestjs/common";
import { WishlistsController } from "./wishlists.controller";
import { WishlistsService } from "./wishlists.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}

