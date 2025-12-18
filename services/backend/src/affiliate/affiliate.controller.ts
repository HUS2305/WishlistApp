import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { AffiliateService } from "./affiliate.service";

@Controller("redirect")
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get(":itemId")
  async redirect(
    @Param("itemId") itemId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const url = await this.affiliateService.trackAndRedirect(
      itemId,
      req.ip,
      req.get("user-agent")
    );
    return res.redirect(url);
  }
}

