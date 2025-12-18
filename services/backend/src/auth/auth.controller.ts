import { Controller, Post, Body, Headers } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post("webhook")
  async handleWebhook(
    @Body() body: any,
    @Headers("svix-id") svixId: string,
    @Headers("svix-timestamp") svixTimestamp: string,
    @Headers("svix-signature") svixSignature: string
  ) {
    const webhookSecret = this.configService.get<string>("CLERK_WEBHOOK_SECRET");
    
    return this.authService.handleWebhook(
      body,
      svixId,
      svixTimestamp,
      svixSignature,
      webhookSecret || ""
    );
  }
}

