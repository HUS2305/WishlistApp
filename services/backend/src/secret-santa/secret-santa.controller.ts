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
import { SecretSantaService } from "./secret-santa.service";
import { AuthGuard } from "../auth/auth.guard";
import { GetUserId } from "../auth/get-user.decorator";
import {
  CreateSecretSantaEventDto,
  UpdateSecretSantaEventDto,
  InviteParticipantDto,
} from "../common/dto/secret-santa.dto";

@Controller("secret-santa")
@UseGuards(AuthGuard)
export class SecretSantaController {
  constructor(private readonly secretSantaService: SecretSantaService) {}

  // ========== EVENT ENDPOINTS ==========

  @Get("invitations/pending/count")
  async getPendingInvitationsCount(@GetUserId() userId: string) {
    const count = await this.secretSantaService.getPendingInvitationsCount(userId);
    return { count };
  }

  @Get("events")
  async getEvents(@GetUserId() userId: string) {
    return this.secretSantaService.findAll(userId);
  }

  @Get("events/:id")
  async getEvent(@GetUserId() userId: string, @Param("id") id: string) {
    return this.secretSantaService.findById(userId, id);
  }

  @Post("events")
  async createEvent(@GetUserId() userId: string, @Body() createData: CreateSecretSantaEventDto) {
    return this.secretSantaService.create(userId, createData);
  }

  @Patch("events/:id")
  async updateEvent(
    @GetUserId() userId: string,
    @Param("id") id: string,
    @Body() updateData: UpdateSecretSantaEventDto
  ) {
    return this.secretSantaService.update(userId, id, updateData);
  }

  @Delete("events/:id")
  async deleteEvent(@GetUserId() userId: string, @Param("id") id: string) {
    return this.secretSantaService.delete(userId, id);
  }

  // ========== PARTICIPANT ENDPOINTS ==========

  @Get("events/:id/participants")
  async getParticipants(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.getParticipants(userId, eventId);
  }

  @Post("events/:id/participants/invite")
  async inviteParticipant(
    @GetUserId() userId: string,
    @Param("id") eventId: string,
    @Body() body: InviteParticipantDto
  ) {
    return this.secretSantaService.inviteParticipant(userId, eventId, body.userId);
  }

  @Post("events/:id/participants/accept")
  async acceptInvitation(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.acceptInvitation(userId, eventId);
  }

  @Post("events/:id/participants/decline")
  async declineInvitation(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.declineInvitation(userId, eventId);
  }

  @Delete("events/:id/participants/:participantUserId")
  async removeParticipant(
    @GetUserId() userId: string,
    @Param("id") eventId: string,
    @Param("participantUserId") participantUserId: string
  ) {
    return this.secretSantaService.removeParticipant(userId, eventId, participantUserId);
  }

  // ========== ASSIGNMENT ENDPOINTS ==========

  @Post("events/:id/draw")
  async drawNames(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.drawNames(userId, eventId);
  }

  @Get("events/:id/assignment")
  async getMyAssignment(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.getMyAssignment(userId, eventId);
  }

  @Post("events/:id/assignment/reveal")
  async revealAssignment(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.revealAssignment(userId, eventId);
  }

  @Get("events/:id/assignments")
  async getAllAssignments(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.getAllAssignments(userId, eventId);
  }

  // ========== PROGRESS ENDPOINTS ==========

  @Get("events/:id/progress")
  async getProgress(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.getProgress(userId, eventId);
  }

  @Post("events/:id/complete")
  async markAsCompleted(@GetUserId() userId: string, @Param("id") eventId: string) {
    return this.secretSantaService.markAsCompleted(userId, eventId);
  }
}
