import { Module } from "@nestjs/common";
import { SecretSantaController } from "./secret-santa.controller";
import { SecretSantaService } from "./secret-santa.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [SecretSantaController],
  providers: [SecretSantaService],
  exports: [SecretSantaService],
})
export class SecretSantaModule {}
