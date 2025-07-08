import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export interface Friend {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  last_seen?: string;
  friendship_date?: string;
  friend_status?: 'pending' | 'accepted' | 'declined' | 'blocked';
  mutual_friends_count?: number;
}
export interface FriendRequest {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  request_date: string;
  mutual_friends_count: number;
}
export const useFriends = () => {
  const { session } = useSession();
  const user = session?.user;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search users
  const searchUsers = useCallback(
    async (query: string): Promise<Friend[]> => {
      if (!user?.id || !query.trim()) return [];

      try {
        const { data, error: searchError } = await supabase.rpc('search_users', {
          search_query: query,
          current_user_id: user.id,
          limit_count: 20,
          offset_count: 0,
        });

        if (searchError) throw searchError;
        return data || [];
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search users');
        return [];
      }
    },
    [user?.id]
  );

  // Get friends list
  const fetchFriends = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.rpc('get_friends', {
        p_user_id: user.id,
        limit_count: 50,
        offset_count: 0,
      });

      if (fetchError) throw fetchError;
      setFriends(data || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Get friend requests
  const fetchFriendRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Received requests
      const { data: received, error: receivedError } = await supabase.rpc('get_friend_requests', {
        p_user_id: user.id,
        request_type: 'received',
      });

      if (receivedError) throw receivedError;
      setFriendRequests(received || []);

      // Sent requests
      const { data: sent, error: sentError } = await supabase.rpc('get_friend_requests', {
        p_user_id: user.id,
        request_type: 'sent',
      });

      if (sentError) throw sentError;
      setSentRequests(sent || []);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      setError('Failed to fetch friend requests');
    }
  }, [user?.id]);

  // Send friend request
  const sendFriendRequest = useCallback(
    async (friendId: string) => {
      if (!user?.id) return;

      try {
        const { error: insertError } = await supabase.from('friendships').insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        });

        if (insertError) throw insertError;

        // Create activity
        await supabase.from('activities').insert({
          user_id: user.id,
          type: 'friend_request',
          target_user_id: friendId,
          is_public: false,
        });

        // Create notification
        await supabase.from('notifications').insert({
          user_id: friendId,
          type: 'friend_request',
          title: "Nouvelle demande d'ami",
          body: `${session?.user?.user_metadata?.full_name || "Quelqu'un"} vous a envoyé une demande d'ami`,
          data: { user_id: user.id },
        });

        // Refresh data
        await void fetchFriendRequests();
      } catch (err: any) {
        if (err?.code === '23505') {
          setError('Friend request already sent');
        } else {
          console.error('Error sending friend request:', err);
          setError(err instanceof Error ? err.message : String(err));
        }
        throw err;
      }
    },
    [user?.id, session?.user?.user_metadata?.full_name, fetchFriendRequests]
  );

  // Accept friend request
  const acceptFriendRequest = useCallback(
    async (requesterId: string) => {
      if (!user?.id) return;

      try {
        const { error: updateError } = await supabase
          .from('friendships')
          .update({
            status: 'accepted',
            responded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', requesterId)
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        if (updateError) throw updateError;

        // Create notification for the requester
        await supabase.from('notifications').insert({
          user_id: requesterId,
          type: 'friend_accepted',
          title: "Demande d'ami acceptée",
          body: `${session?.user?.user_metadata?.full_name || "Quelqu'un"} a accepté votre demande d'ami`,
          data: { user_id: user.id },
        });

        // Refresh data
        await Promise.all([fetchFriends(), fetchFriendRequests()]);
      } catch (err) {
        console.error('Error accepting friend request:', err);
        setError('Failed to accept friend request');
        throw err;
      }
    },
    [user?.id, session?.user?.user_metadata?.full_name, fetchFriends, fetchFriendRequests]
  );

  // Decline friend request
  const declineFriendRequest = useCallback(
    async (requesterId: string) => {
      if (!user?.id) return;

      try {
        const { error: updateError } = await supabase
          .from('friendships')
          .update({
            status: 'declined',
            responded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', requesterId)
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        if (updateError) throw updateError;

        // Refresh data
        await void fetchFriendRequests();
      } catch (err) {
        console.error('Error declining friend request:', err);
        setError('Failed to decline friend request');
        throw err;
      }
    },
    [user?.id, fetchFriendRequests]
  );

  // Remove friend
  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!user?.id) return;

      try {
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .or(
            `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
          )
          .eq('status', 'accepted');

        if (deleteError) throw deleteError;

        // Refresh data
        await void fetchFriends();
      } catch (err) {
        console.error('Error removing friend:', err);
        setError('Failed to remove friend');
        throw err;
      }
    },
    [user?.id, fetchFriends]
  );

  // Block user
  const blockUser = useCallback(
    async (userId: string) => {
      if (!user?.id) return;

      try {
        // First check if there's an existing friendship
        const { data: existing } = await supabase
          .from('friendships')
          .select('*')
          .or(
            `and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`
          )
          .single();

        if (existing) {
          // Update existing friendship to blocked
          const { error: updateError } = await supabase
            .from('friendships')
            .update({ status: 'blocked', updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          // Create new blocked relationship
          const { error: insertError } = await supabase.from('friendships').insert({
            user_id: user.id,
            friend_id: userId,
            status: 'blocked',
          });

          if (insertError) throw insertError;
        }

        // Also add to user_blocks table
        await supabase.from('user_blocks').insert({
          blocker_id: user.id,
          blocked_id: userId,
        });

        // Refresh data
        await Promise.all([fetchFriends(), fetchFriendRequests()]);
      } catch (err) {
        console.error('Error blocking user:', err);
        setError('Failed to block user');
        throw err;
      }
    },
    [user?.id, fetchFriends, fetchFriendRequests]
  );

  // Check friend status
  const checkFriendStatus = useCallback(
    async (userId: string): Promise<string | null> => {
      if (!user?.id) return null;

      try {
        const { data, error: rpcError } = await supabase.rpc('get_friend_status', {
          user1_id: user.id,
          user2_id: userId,
        });

        if (rpcError) throw rpcError;
        return data;
      } catch (err) {
        console.error('Error checking friend status:', err);
        return null;
      }
    },
    [user?.id]
  );

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      void fetchFriends();
      void fetchFriendRequests();
    }
  }, [user?.id, fetchFriends, fetchFriendRequests]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('friendships_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchFriends();
          void fetchFriendRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${user.id}`,
        },
        () => {
          void fetchFriends();
          void fetchFriendRequests();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchFriends, fetchFriendRequests]);

  return {
    friends,
    friendRequests,
    sentRequests,
    loading,
    error,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockUser,
    checkFriendStatus,
    refreshFriends: fetchFriends,
    refreshRequests: fetchFriendRequests,
  };
};
