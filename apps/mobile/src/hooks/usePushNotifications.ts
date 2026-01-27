import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useAuth } from "@clerk/clerk-expo";
import api from "../services/api";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function usePushNotifications() {
  const { isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    error: null,
  });
  
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const tokenRegistered = useRef(false);

  // Register for push notifications
  async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      setState(prev => ({ ...prev, error: "Permission not granted" }));
      return null;
    }

    // Get project ID from Constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      // In development without a projectId, push notifications won't work
      // This is expected - push tokens require a production EAS build
      console.log("ℹ️ Push notifications disabled: No projectId configured (development mode)");
      return null;
    }

    try {
      // Get the Expo push token
      const pushTokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = pushTokenResponse.data;
    } catch (error: any) {
      // Don't log as error for expected simulator issues
      if (error?.message?.includes("simulator") || error?.message?.includes("projectId")) {
        console.log("ℹ️ Push notifications unavailable:", error.message);
      } else {
        console.error("Error getting push token:", error);
        setState(prev => ({ ...prev, error: "Failed to get push token" }));
      }
      return null;
    }

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C41E68",
      });
    }

    return token;
  }

  // Register push token with backend
  async function registerTokenWithBackend(token: string) {
    if (tokenRegistered.current) {
      return;
    }

    try {
      // First check if user profile exists
      await api.get("/users/me");
      // If we get here, profile exists - register the token
      await api.post("/users/me/push-token", { pushToken: token });
      tokenRegistered.current = true;
      console.log("✅ Push token registered with backend");
    } catch (error: any) {
      // Silently ignore 404 - user profile doesn't exist yet
      if (error?.response?.status === 404) {
        console.log("ℹ️ Push token registration skipped - user profile not created yet");
        return;
      }
      console.error("Failed to register push token with backend:", error);
    }
  }

  // Initialize push notifications when user is signed in
  useEffect(() => {
    if (!isSignedIn) {
      tokenRegistered.current = false;
      return;
    }

    async function initializePushNotifications() {
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        setState(prev => ({ ...prev, expoPushToken: token }));
        await registerTokenWithBackend(token);
      }
    }

    initializePushNotifications();

    // Listen for incoming notifications (app in foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("📬 Notification received:", notification);
        setState(prev => ({ ...prev, notification }));
      }
    );

    // Listen for notification interactions (user tapped on notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("👆 Notification tapped:", response);
        const data = response.notification.request.content.data;
        
        // Handle navigation based on notification data
        handleNotificationNavigation(data);
      }
    );

    return () => {
      // Clean up subscriptions using the remove() method on the subscription object
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isSignedIn]);

  // Handle navigation when notification is tapped
  function handleNotificationNavigation(data: Record<string, unknown>) {
    // Navigation will be handled based on notification type
    // This can be expanded based on the notification data structure
    const type = data?.type as string;
    
    switch (type) {
      case "FRIEND_REQUEST":
        // Navigate to friend requests
        console.log("Navigate to friend requests");
        break;
      case "WISHLIST_SHARED":
        // Navigate to the shared wishlist
        const wishlistId = data?.wishlistId as string;
        if (wishlistId) {
          console.log("Navigate to wishlist:", wishlistId);
        }
        break;
      case "SECRET_SANTA_INVITED":
      case "SECRET_SANTA_DRAWN":
        // Navigate to secret santa
        const eventId = data?.eventId as string;
        if (eventId) {
          console.log("Navigate to secret santa event:", eventId);
        }
        break;
      default:
        console.log("Unknown notification type:", type);
    }
  }

  // Unregister push token (e.g., on logout)
  async function unregisterPushToken() {
    try {
      await api.delete("/users/me/push-token");
      tokenRegistered.current = false;
      setState(prev => ({ ...prev, expoPushToken: null }));
      console.log("✅ Push token unregistered");
    } catch (error) {
      console.error("Failed to unregister push token:", error);
    }
  }

  return {
    expoPushToken: state.expoPushToken,
    notification: state.notification,
    error: state.error,
    unregisterPushToken,
  };
}
