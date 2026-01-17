import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { friendsService } from '@/services/friends';
import { notificationsService } from '@/services/notifications';
import { secretSantaService } from '@/services/secretSanta';

interface NotificationContextType {
  pendingRequestsCount: number;
  unreadNotificationsCount: number;
  pendingSecretSantaInvitationsCount: number;
  refreshPendingRequestsCount: () => Promise<void>;
  refreshUnreadNotificationsCount: () => Promise<void>;
  refreshPendingSecretSantaInvitationsCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingSecretSantaInvitationsCount, setPendingSecretSantaInvitationsCount] = useState(0);

  const refreshPendingRequestsCount = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId) {
      setPendingRequestsCount(0);
      return;
    }

    try {
      const requests = await friendsService.getPendingRequests();
      setPendingRequestsCount(requests.length);
    } catch (error: any) {
      // Silently handle errors for users who haven't created their profile yet
      // 404/500 errors are expected when user profile doesn't exist
      const isExpectedError = 
        error?.response?.status === 404 || 
        error?.response?.status === 500 ||
        error?.message?.includes('User profile not found');
      
      if (!isExpectedError) {
        console.error('❌ Error fetching pending requests count:', error);
      }
      setPendingRequestsCount(0);
    }
  }, [isLoaded, isSignedIn, userId]);

  const refreshUnreadNotificationsCount = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId) {
      setUnreadNotificationsCount(0);
      return;
    }

    try {
      const count = await notificationsService.getUnreadCount();
      console.log('📊 Unread notifications count:', count);
      setUnreadNotificationsCount(count);
    } catch (error: any) {
      // Silently handle errors for users who haven't created their profile yet
      // 404/500 errors are expected when user profile doesn't exist
      const isExpectedError = 
        error?.response?.status === 404 || 
        error?.response?.status === 500 ||
        error?.message?.includes('User profile not found');
      
      if (!isExpectedError) {
        console.error('❌ Error fetching unread notifications count:', error);
      }
      setUnreadNotificationsCount(0);
    }
  }, [isLoaded, isSignedIn, userId]);

  const refreshPendingSecretSantaInvitationsCount = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId) {
      setPendingSecretSantaInvitationsCount(0);
      return;
    }

    try {
      const count = await secretSantaService.getPendingInvitationsCount();
      setPendingSecretSantaInvitationsCount(count);
    } catch (error: any) {
      // Silently handle errors for users who haven't created their profile yet
      const isExpectedError = 
        error?.response?.status === 404 || 
        error?.response?.status === 500 ||
        error?.message?.includes('User profile not found');
      
      if (!isExpectedError) {
        console.error('❌ Error fetching pending Secret Santa invitations count:', error);
      }
      setPendingSecretSantaInvitationsCount(0);
    }
  }, [isLoaded, isSignedIn, userId]);

  // Refresh counts when user signs in/out
  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      refreshPendingRequestsCount();
      refreshUnreadNotificationsCount();
      refreshPendingSecretSantaInvitationsCount();
    } else {
      setPendingRequestsCount(0);
      setUnreadNotificationsCount(0);
      setPendingSecretSantaInvitationsCount(0);
    }
  }, [isLoaded, isSignedIn, userId, refreshPendingRequestsCount, refreshUnreadNotificationsCount, refreshPendingSecretSantaInvitationsCount]);

  return (
    <NotificationContext.Provider
      value={{
        pendingRequestsCount,
        unreadNotificationsCount,
        pendingSecretSantaInvitationsCount,
        refreshPendingRequestsCount,
        refreshUnreadNotificationsCount,
        refreshPendingSecretSantaInvitationsCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

