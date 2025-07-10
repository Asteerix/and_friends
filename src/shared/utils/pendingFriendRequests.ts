import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/lib/supabase/client';

const PENDING_REQUESTS_KEY = 'pending_friend_requests';

interface PendingRequest {
  user_id: string;
  timestamp: number;
}

export const pendingFriendRequestsManager = {
  // Get all pending requests
  async getPendingRequests(): Promise<PendingRequest[]> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_REQUESTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  },

  // Add pending requests
  async addPendingRequests(userIds: string[]): Promise<void> {
    try {
      const existing = await this.getPendingRequests();
      const newRequests: PendingRequest[] = userIds.map(userId => ({
        user_id: userId,
        timestamp: Date.now(),
      }));
      
      const allRequests = [...existing, ...newRequests];
      await AsyncStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(allRequests));
    } catch (error) {
      console.error('Error adding pending requests:', error);
    }
  },

  // Process pending requests (send actual friend requests)
  async processPendingRequests(currentUserId: string): Promise<{ sent: number; failed: number }> {
    try {
      const pending = await this.getPendingRequests();
      if (pending.length === 0) {
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;
      const processed: string[] = [];

      for (const request of pending) {
        try {
          // Send friend request using Supabase
          const { error } = await supabase
            .from('friendships')
            .insert({
              user_id: request.user_id,
              friend_id: currentUserId,
              status: 'pending',
            });

          if (!error) {
            sent++;
            processed.push(request.user_id);
          } else {
            failed++;
            console.error('Failed to send friend request:', error);
          }
        } catch (err) {
          failed++;
          console.error('Error sending friend request:', err);
        }
      }

      // Remove processed requests
      if (processed.length > 0) {
        const remaining = pending.filter(r => !processed.includes(r.user_id));
        await AsyncStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(remaining));
      }

      return { sent, failed };
    } catch (error) {
      console.error('Error processing pending requests:', error);
      return { sent: 0, failed: 0 };
    }
  },

  // Clear all pending requests
  async clearPendingRequests(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_REQUESTS_KEY);
    } catch (error) {
      console.error('Error clearing pending requests:', error);
    }
  },
};