import api from "./api";

export interface Notification {
  id: string;
  type:
    | "FRIEND_REQUEST"
    | "FRIEND_ACCEPTED"
    | "WISHLIST_SHARED"
    | "ITEM_RESERVED"
    | "ITEM_PURCHASED"
    | "COMMENT_ADDED";
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export const notificationsService = {
  async getNotifications(): Promise<Notification[]> {
    const response = await api.get("/notifications");
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get("/notifications/unread-count");
    return response.data.count;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post("/notifications/mark-all-read");
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async deleteAll(): Promise<void> {
    console.log("🗑️ notificationsService.deleteAll called");
    try {
      const response = await api.post("/notifications/delete-all");
      console.log("✅ deleteAll API response:", response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ deleteAll API error:", error);
      console.error("❌ deleteAll error response:", error.response?.data);
      throw error;
    }
  },

  // Push notification token registration
  async registerPushToken(token: string): Promise<void> {
    await api.post("/notifications/register-token", {
      token,
      platform: "expo",
    });
  },
};

