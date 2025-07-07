import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  reason?: string;
  blocked_user?: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
  };
}
export function useUserBlocks() {
  const { session } = useSession();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBlockedUsers = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      // Get users I've blocked
      const { data: blocked, error: blockedError } = await supabase
        .from('user_blocks')
        .select(
          `
          *,
          blocked_user:profiles!user_blocks_blocked_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `
        )
        .eq('blocker_id', session.user.id);

      if (blockedError) throw blockedError;

      // Get users who have blocked me (just IDs for filtering)
      const { data: blockedBy, error: blockedByError } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocked_id', session.user.id);

      if (blockedByError) throw blockedByError;

      setBlockedUsers(blocked || []);
      setBlockedByUsers((blockedBy || []).map((b) => b.blocker_id));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    void fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const blockUser = useCallback(
    async (userId: string, reason?: string) => {
      if (!session?.user?.id) return;

      try {
        // Check if already blocked
        const existing = blockedUsers.find((b) => b.blocked_id === userId);
        if (existing) {
          throw new Error('Cet utilisateur est déjà bloqué');
        }

        // Create block record
        const { data, error } = await supabase
          .from('user_blocks')
          .insert({
            blocker_id: session.user.id,
            blocked_id: userId,
            reason,
          })
          .select(
            `
          *,
          blocked_user:profiles!user_blocks_blocked_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `
          )
          .single();

        if (error) throw error;

        // Also update friendship status if exists
        await supabase
          .from('friendships')
          .update({ status: 'blocked' })
          .or(
            `and(user_id.eq.${session.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${session.user.id})`
          );

        setBlockedUsers((prev) => [...prev, data]);
        return data;
      } catch (err) {
        setError(err as Error);
      }
    },
    [session?.user?.id, blockedUsers]
  );

  const unblockUser = useCallback(
    async (userId: string) => {
      if (!session?.user?.id) return;

      try {
        const { error } = await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', session.user.id)
          .eq('blocked_id', userId);

        if (error) throw error;

        setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== userId));
      } catch (err) {
        setError(err as Error);
      }
    },
    [session?.user?.id]
  );

  const isBlocked = useCallback(
    (userId: string): boolean => {
      return blockedUsers.some((b) => b.blocked_id === userId);
    },
    [blockedUsers]
  );

  const isBlockedBy = useCallback(
    (userId: string): boolean => {
      return blockedByUsers.includes(userId);
    },
    [blockedByUsers]
  );

  const canInteract = useCallback(
    (userId: string): boolean => {
      return !isBlocked(userId) && !isBlockedBy(userId);
    },
    [isBlocked, isBlockedBy]
  );

  // Filter function to remove blocked users from lists
  const filterBlockedUsers = useCallback(
    <T extends { id?: string; user_id?: string }>(items: T[]): T[] => {
      return items.filter((item) => {
        const userId = item.id || item.user_id;
        return userId ? canInteract(userId) : true;
      });
    },
    [canInteract]
  );

  return {
    blockedUsers,
    blockedByUsers,
    loading,
    error,
    blockUser,
    unblockUser,
    isBlocked,
    isBlockedBy,
    canInteract,
    filterBlockedUsers,
    refetch: fetchBlockedUsers,
  };
}
