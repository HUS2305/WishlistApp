import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getDisplayName } from "../common/utils";

interface CreateEventDto {
  title: string;
  drawDate: string;
  exchangeDate: string;
  budget?: number;
  currency?: string;
  participantIds: string[];
}

interface UpdateEventDto {
  title?: string;
  drawDate?: string;
  exchangeDate?: string;
  budget?: number;
  currency?: string;
}

@Injectable()
export class SecretSantaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all Secret Santa events where user is organizer or participant
   */
  async findAll(clerkUserId: string) {
    const user = await this.getUser(clerkUserId);
    console.log(`🎄 Finding Secret Santa events for user: ${user.id}`);

    // Get events where user is organizer
    const organizedEvents = await this.prisma.secretSantaEvent.findMany({
      where: { organizerId: user.id },
      include: this.getEventInclude(),
      orderBy: { createdAt: 'desc' },
    });

    // Get events where user is a participant
    const participatingEvents = await this.prisma.secretSantaEvent.findMany({
      where: {
        participants: {
          some: { userId: user.id },
        },
      },
      include: this.getEventInclude(),
      orderBy: { createdAt: 'desc' },
    });

    // Combine and deduplicate
    const allEvents = [...organizedEvents];
    const organizedIds = new Set(organizedEvents.map(e => e.id));
    participatingEvents.forEach(e => {
      if (!organizedIds.has(e.id)) {
        allEvents.push(e);
      }
    });

    console.log(`✅ Found ${allEvents.length} Secret Santa events for user ${user.id}`);
    return allEvents.map(event => this.formatEvent(event, user.id));
  }

  /**
   * Get a single Secret Santa event by ID
   */
  async findById(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
      include: this.getEventInclude(),
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    // Check access: must be organizer or participant
    const isOrganizer = event.organizerId === user.id;
    const isParticipant = event.participants.some(p => p.userId === user.id);

    if (!isOrganizer && !isParticipant) {
      throw new ForbiddenException("You don't have access to this event");
    }

    return this.formatEvent(event, user.id);
  }

  /**
   * Create a new Secret Santa event
   */
  async create(clerkUserId: string, data: CreateEventDto) {
    const user = await this.getUser(clerkUserId);
    console.log(`🎄 Creating Secret Santa event: ${data.title} for user ${user.id}`);

    // Validate dates
    const drawDate = new Date(data.drawDate);
    const exchangeDate = new Date(data.exchangeDate);

    if (drawDate >= exchangeDate) {
      throw new BadRequestException("Draw date must be before exchange date");
    }

    // Validate participants (must be friends with all)
    for (const participantId of data.participantIds) {
      const areFriends = await this.areFriends(user.id, participantId);
      if (!areFriends) {
        throw new BadRequestException("All participants must be your friends");
      }
    }

    // Create the event with a group wishlist in a transaction
    const event = await this.prisma.$transaction(async (tx) => {
      // 1. Create the group wishlist for this event
      const wishlist = await tx.wishlist.create({
        data: {
          title: `${data.title} - Gift Pool`,
          privacyLevel: "GROUP",
          ownerId: user.id,
          allowComments: true,
          allowReservations: true,
        },
      });

      // 2. Create the Secret Santa event
      const newEvent = await tx.secretSantaEvent.create({
        data: {
          title: data.title,
          organizerId: user.id,
          wishlistId: wishlist.id,
          drawDate,
          exchangeDate,
          budget: data.budget,
          currency: data.currency || "USD",
          status: "PENDING",
        },
      });

      // 3. Add the organizer as a participant (auto-accepted)
      await tx.secretSantaParticipant.create({
        data: {
          eventId: newEvent.id,
          userId: user.id,
          status: "ACCEPTED",
        },
      });

      // Note: Organizer is already the ownerId of the wishlist, so they don't need
      // to be added as a collaborator. This avoids duplicate entries in the members list.

      // 4. Invite all participants
      for (const participantId of data.participantIds) {
        await tx.secretSantaParticipant.create({
          data: {
            eventId: newEvent.id,
            userId: participantId,
            status: "INVITED",
          },
        });

        // Add participants as collaborators to the wishlist
        await tx.wishlistCollaborator.create({
          data: {
            wishlistId: wishlist.id,
            userId: participantId,
            role: "EDITOR",
          },
        });

        // Send notification
        const inviter = await tx.user.findUnique({ where: { id: user.id } });
        const displayName = getDisplayName(inviter?.firstName, inviter?.lastName) || inviter?.username || "Someone";
        
        await tx.notification.create({
          data: {
            userId: participantId,
            type: "SECRET_SANTA_INVITED",
            title: "Secret Santa Invitation",
            body: `${displayName} invited you to join "${data.title}"`,
            data: {
              eventId: newEvent.id,
              fromUserId: user.id,
            },
          },
        });
      }

      return newEvent;
    });

    // Return the full event with includes
    return this.findById(clerkUserId, event.id);
  }

  /**
   * Update a Secret Santa event (organizer only)
   */
  async update(clerkUserId: string, eventId: string, data: UpdateEventDto) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException("Only the organizer can update this event");
    }

    if (event.status !== "PENDING") {
      throw new ForbiddenException("Cannot update event after names have been drawn");
    }

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.currency) updateData.currency = data.currency;
    if (data.drawDate) updateData.drawDate = new Date(data.drawDate);
    if (data.exchangeDate) updateData.exchangeDate = new Date(data.exchangeDate);

    await this.prisma.secretSantaEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    return this.findById(clerkUserId, eventId);
  }

  /**
   * Delete a Secret Santa event (organizer only)
   */
  async delete(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException("Only the organizer can delete this event");
    }

    // Delete will cascade to participants, assignments, and wishlist
    await this.prisma.secretSantaEvent.delete({
      where: { id: eventId },
    });

    return { message: "Event deleted successfully" };
  }

  /**
   * Invite a participant to an event
   */
  async inviteParticipant(clerkUserId: string, eventId: string, inviteeUserId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException("Only the organizer can invite participants");
    }

    if (event.status !== "PENDING") {
      throw new ForbiddenException("Cannot invite participants after names have been drawn");
    }

    // Check if already a participant
    const existing = await this.prisma.secretSantaParticipant.findUnique({
      where: {
        eventId_userId: { eventId, userId: inviteeUserId },
      },
    });

    if (existing) {
      throw new BadRequestException("User is already a participant");
    }

    // Check friendship
    const areFriends = await this.areFriends(user.id, inviteeUserId);
    if (!areFriends) {
      throw new BadRequestException("You can only invite friends");
    }

    await this.prisma.$transaction(async (tx) => {
      // Add participant
      await tx.secretSantaParticipant.create({
        data: {
          eventId,
          userId: inviteeUserId,
          status: "INVITED",
        },
      });

      // Add as wishlist collaborator
      await tx.wishlistCollaborator.create({
        data: {
          wishlistId: event.wishlistId,
          userId: inviteeUserId,
          role: "EDITOR",
        },
      });

      // Send notification
      const inviter = await tx.user.findUnique({ where: { id: user.id } });
      const displayName = getDisplayName(inviter?.firstName, inviter?.lastName) || inviter?.username || "Someone";

      await tx.notification.create({
        data: {
          userId: inviteeUserId,
          type: "SECRET_SANTA_INVITED",
          title: "Secret Santa Invitation",
          body: `${displayName} invited you to join "${event.title}"`,
          data: {
            eventId,
            fromUserId: user.id,
          },
        },
      });
    });

    return { message: "Invitation sent" };
  }

  /**
   * Accept an invitation to a Secret Santa event
   */
  async acceptInvitation(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const participant = await this.prisma.secretSantaParticipant.findUnique({
      where: {
        eventId_userId: { eventId, userId: user.id },
      },
      include: { event: true },
    });

    if (!participant) {
      throw new NotFoundException("Invitation not found");
    }

    if (participant.status !== "INVITED") {
      throw new BadRequestException("Invitation already responded to");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.secretSantaParticipant.update({
        where: { id: participant.id },
        data: { status: "ACCEPTED" },
      });

      // Notify organizer
      const accepter = await tx.user.findUnique({ where: { id: user.id } });
      const displayName = getDisplayName(accepter?.firstName, accepter?.lastName) || accepter?.username || "Someone";

      await tx.notification.create({
        data: {
          userId: participant.event.organizerId,
          type: "SECRET_SANTA_ACCEPTED",
          title: "Invitation Accepted",
          body: `${displayName} accepted your Secret Santa invitation for "${participant.event.title}"`,
          data: {
            eventId,
            fromUserId: user.id,
          },
        },
      });
    });

    return { message: "Invitation accepted" };
  }

  /**
   * Decline an invitation to a Secret Santa event
   */
  async declineInvitation(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const participant = await this.prisma.secretSantaParticipant.findUnique({
      where: {
        eventId_userId: { eventId, userId: user.id },
      },
    });

    if (!participant) {
      throw new NotFoundException("Invitation not found");
    }

    if (participant.status !== "INVITED") {
      throw new BadRequestException("Invitation already responded to");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.secretSantaParticipant.update({
        where: { id: participant.id },
        data: { status: "DECLINED" },
      });

      // Remove from wishlist collaborators
      const event = await tx.secretSantaEvent.findUnique({ where: { id: eventId } });
      if (event) {
        await tx.wishlistCollaborator.deleteMany({
          where: {
            wishlistId: event.wishlistId,
            userId: user.id,
          },
        });
      }
    });

    return { message: "Invitation declined" };
  }

  /**
   * Remove a participant from an event (organizer only)
   */
  async removeParticipant(clerkUserId: string, eventId: string, participantUserId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException("Only the organizer can remove participants");
    }

    if (event.status !== "PENDING") {
      throw new ForbiddenException("Cannot remove participants after names have been drawn");
    }

    if (participantUserId === user.id) {
      throw new BadRequestException("Organizer cannot remove themselves");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.secretSantaParticipant.delete({
        where: {
          eventId_userId: { eventId, userId: participantUserId },
        },
      });

      // Remove from wishlist collaborators
      await tx.wishlistCollaborator.deleteMany({
        where: {
          wishlistId: event.wishlistId,
          userId: participantUserId,
        },
      });
    });

    return { message: "Participant removed" };
  }

  /**
   * Get participants for an event
   */
  async getParticipants(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    // Check access
    const isOrganizer = event.organizerId === user.id;
    const isParticipant = event.participants.some(p => p.userId === user.id);

    if (!isOrganizer && !isParticipant) {
      throw new ForbiddenException("You don't have access to this event");
    }

    return event.participants.map(p => ({
      ...p,
      user: {
        ...p.user,
        displayName: getDisplayName(p.user.firstName, p.user.lastName),
      },
    }));
  }

  /**
   * Draw names for Secret Santa assignments
   */
  async drawNames(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          where: { status: "ACCEPTED" },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException("Only the organizer can draw names");
    }

    if (event.status !== "PENDING") {
      throw new BadRequestException("Names have already been drawn");
    }

    const acceptedParticipants = event.participants;

    if (acceptedParticipants.length < 3) {
      throw new BadRequestException("Need at least 3 accepted participants to draw names");
    }

    // Generate random assignments using Fisher-Yates shuffle
    const participantIds = acceptedParticipants.map(p => p.userId);
    const assignments = this.generateAssignments(participantIds);

    await this.prisma.$transaction(async (tx) => {
      // Create assignments
      for (const [giverId, receiverId] of assignments) {
        await tx.secretSantaAssignment.create({
          data: {
            eventId,
            giverId,
            receiverId,
            revealed: false,
          },
        });
      }

      // Update event status
      await tx.secretSantaEvent.update({
        where: { id: eventId },
        data: { status: "DRAWN" },
      });

      // Notify all participants
      for (const participant of acceptedParticipants) {
        await tx.notification.create({
          data: {
            userId: participant.userId,
            type: "SECRET_SANTA_DRAWN",
            title: "Names Drawn!",
            body: `Names have been drawn for "${event.title}". Check who you're buying for!`,
            data: { eventId },
          },
        });
      }
    });

    return { message: "Names drawn successfully" };
  }

  /**
   * Get the current user's assignment for an event
   */
  async getMyAssignment(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    const assignment = await this.prisma.secretSantaAssignment.findUnique({
      where: {
        eventId_giverId: { eventId, giverId: user.id },
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    // Only reveal receiver details if assignment is revealed
    if (!assignment.revealed) {
      return {
        id: assignment.id,
        eventId: assignment.eventId,
        revealed: false,
        receiver: null,
      };
    }

    return {
      ...assignment,
      receiver: {
        ...assignment.receiver,
        displayName: getDisplayName(assignment.receiver.firstName, assignment.receiver.lastName),
      },
    };
  }

  /**
   * Reveal the current user's assignment
   */
  async revealAssignment(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const assignment = await this.prisma.secretSantaAssignment.findUnique({
      where: {
        eventId_giverId: { eventId, giverId: user.id },
      },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    if (assignment.revealed) {
      // Already revealed, just return it
      return this.getMyAssignment(clerkUserId, eventId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.secretSantaAssignment.update({
        where: { id: assignment.id },
        data: { revealed: true },
      });

      // Update event status if this is the first reveal
      const event = await tx.secretSantaEvent.findUnique({ where: { id: eventId } });
      if (event?.status === "DRAWN") {
        await tx.secretSantaEvent.update({
          where: { id: eventId },
          data: { status: "IN_PROGRESS" },
        });
      }
    });

    return this.getMyAssignment(clerkUserId, eventId);
  }

  /**
   * Get all assignments for an event (organizer only, after completion)
   */
  async getAllAssignments(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
      include: {
        assignments: {
          include: {
            giver: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            receiver: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    // Only organizer can see all assignments, and only after event is completed
    if (event.organizerId !== user.id) {
      throw new ForbiddenException("Only the organizer can view all assignments");
    }

    if (event.status !== "COMPLETED") {
      throw new ForbiddenException("Assignments can only be viewed after the event is completed");
    }

    return event.assignments.map(a => ({
      ...a,
      giver: {
        ...a.giver,
        displayName: getDisplayName(a.giver.firstName, a.giver.lastName),
      },
      receiver: {
        ...a.receiver,
        displayName: getDisplayName(a.receiver.firstName, a.receiver.lastName),
      },
    }));
  }

  /**
   * Get progress statistics for an event
   */
  async getProgress(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: { where: { status: "ACCEPTED" } },
        assignments: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    // Check access
    const isOrganizer = event.organizerId === user.id;
    const isParticipant = event.participants.some(p => p.userId === user.id);

    if (!isOrganizer && !isParticipant) {
      throw new ForbiddenException("You don't have access to this event");
    }

    return {
      totalParticipants: event.participants.length,
      assignmentsRevealed: event.assignments.filter(a => a.revealed).length,
      assignmentsCompleted: event.assignments.length,
      eventStatus: event.status,
    };
  }

  /**
   * Mark an event as completed (organizer only)
   */
  async markAsCompleted(clerkUserId: string, eventId: string) {
    const user = await this.getUser(clerkUserId);

    const event = await this.prisma.secretSantaEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Secret Santa event not found");
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException("Only the organizer can mark the event as completed");
    }

    if (event.status !== "IN_PROGRESS" && event.status !== "DRAWN") {
      throw new BadRequestException("Event is not in progress");
    }

    await this.prisma.secretSantaEvent.update({
      where: { id: eventId },
      data: { status: "COMPLETED" },
    });

    return { message: "Event marked as completed" };
  }

  // ========== HELPER METHODS ==========

  private async getUser(clerkUserId: string) {
    console.log(`🔍 Looking up user with Clerk ID: ${clerkUserId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });
    
    if (!user) {
      throw new Error("User profile not found. Please complete your profile setup.");
    }
    
    console.log(`✅ User found: ${user.id} for Clerk ID: ${clerkUserId}`);
    return user;
  }

  private async areFriends(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: "ACCEPTED" },
          { userId: friendId, friendId: userId, status: "ACCEPTED" },
        ],
      },
    });

    return !!friendship;
  }

  private generateAssignments(participantIds: string[]): [string, string][] {
    // Fisher-Yates shuffle to create a random derangement
    // where no one is assigned to themselves
    const n = participantIds.length;
    const shuffled = [...participantIds];
    
    // Keep shuffling until we get a valid derangement
    let isValid = false;
    while (!isValid) {
      // Fisher-Yates shuffle
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Check if it's a valid derangement (no one assigned to themselves)
      isValid = true;
      for (let i = 0; i < n; i++) {
        if (participantIds[i] === shuffled[i]) {
          isValid = false;
          break;
        }
      }
    }
    
    // Create assignments: participantIds[i] gives to shuffled[i]
    return participantIds.map((giver, i) => [giver, shuffled[i]]);
  }

  private getEventInclude() {
    return {
      organizer: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      wishlist: {
        select: {
          id: true,
          title: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
      assignments: {
        select: {
          id: true,
          giverId: true,
          receiverId: true,
          revealed: true,
        },
      },
    };
  }

  private formatEvent(event: any, currentUserId: string) {
    // Find current user's participant record
    const myParticipant = event.participants.find((p: any) => p.userId === currentUserId);
    
    return {
      ...event,
      organizer: {
        ...event.organizer,
        displayName: getDisplayName(event.organizer.firstName, event.organizer.lastName),
      },
      participants: event.participants.map((p: any) => ({
        ...p,
        user: {
          ...p.user,
          displayName: getDisplayName(p.user.firstName, p.user.lastName),
        },
      })),
      isOrganizer: event.organizerId === currentUserId,
      myParticipantStatus: myParticipant?.status || null,
    };
  }

  /**
   * Get count of pending Secret Santa invitations for a user
   */
  async getPendingInvitationsCount(clerkUserId: string): Promise<number> {
    const user = await this.getUser(clerkUserId);

    const count = await this.prisma.secretSantaParticipant.count({
      where: {
        userId: user.id,
        status: "INVITED",
      },
    });

    return count;
  }
}
