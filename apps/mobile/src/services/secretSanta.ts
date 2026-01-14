import api from "./api";
import type { SecretSantaEvent, SecretSantaParticipant, SecretSantaAssignment } from "@/types";

interface CreateSecretSantaEventPayload {
  title: string;
  drawDate: string;
  exchangeDate: string;
  budget?: number;
  currency?: string;
  participantIds: string[];
}

interface UpdateSecretSantaEventPayload {
  id: string;
  title?: string;
  drawDate?: string;
  exchangeDate?: string;
  budget?: number;
  currency?: string;
}

export const secretSantaService = {
  // Event operations
  async getEvents(): Promise<SecretSantaEvent[]> {
    const response = await api.get("/secret-santa/events");
    return response.data;
  },

  async getEvent(id: string): Promise<SecretSantaEvent> {
    const response = await api.get(`/secret-santa/events/${id}`);
    return response.data;
  },

  async createEvent(payload: CreateSecretSantaEventPayload): Promise<SecretSantaEvent> {
    const response = await api.post("/secret-santa/events", payload);
    return response.data;
  },

  async updateEvent(payload: UpdateSecretSantaEventPayload): Promise<SecretSantaEvent> {
    const { id, ...data } = payload;
    const response = await api.patch(`/secret-santa/events/${id}`, data);
    return response.data;
  },

  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/secret-santa/events/${id}`);
  },

  // Participant operations
  async inviteParticipant(eventId: string, userId: string): Promise<void> {
    await api.post(`/secret-santa/events/${eventId}/participants/invite`, { userId });
  },

  async acceptInvitation(eventId: string): Promise<void> {
    await api.post(`/secret-santa/events/${eventId}/participants/accept`);
  },

  async declineInvitation(eventId: string): Promise<void> {
    await api.post(`/secret-santa/events/${eventId}/participants/decline`);
  },

  async removeParticipant(eventId: string, userId: string): Promise<void> {
    await api.delete(`/secret-santa/events/${eventId}/participants/${userId}`);
  },

  async getParticipants(eventId: string): Promise<SecretSantaParticipant[]> {
    const response = await api.get(`/secret-santa/events/${eventId}/participants`);
    return response.data;
  },

  // Assignment operations
  async drawNames(eventId: string): Promise<void> {
    await api.post(`/secret-santa/events/${eventId}/draw`);
  },

  async getMyAssignment(eventId: string): Promise<SecretSantaAssignment | null> {
    try {
      const response = await api.get(`/secret-santa/events/${eventId}/assignment`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async revealAssignment(eventId: string): Promise<SecretSantaAssignment> {
    const response = await api.post(`/secret-santa/events/${eventId}/assignment/reveal`);
    return response.data;
  },

  async getAllAssignments(eventId: string): Promise<SecretSantaAssignment[]> {
    const response = await api.get(`/secret-santa/events/${eventId}/assignments`);
    return response.data;
  },

  // Progress
  async getProgress(eventId: string): Promise<{
    totalParticipants: number;
    assignmentsRevealed: number;
    assignmentsCompleted: number;
    eventStatus: string;
  }> {
    const response = await api.get(`/secret-santa/events/${eventId}/progress`);
    return response.data;
  },

  async markAsCompleted(eventId: string): Promise<void> {
    await api.post(`/secret-santa/events/${eventId}/complete`);
  },
};
