import { useState, useEffect, useCallback } from 'react';

import { useRealtimeSubscription } from '../shared/hooks/useRealtimeSubscription';
import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  likes_count: number;
  replies_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
  replies?: EventComment[];
  is_liked?: boolean;
}
export interface EventLike {
  event_id: string;
  user_id: string;
  created_at: string;
}
export function useEventInteractions(eventId: string) {
  const { session } = useSession();
  const [comments, setComments] = useState<EventComment[]>([]);
  const [likes, setLikes] = useState<EventLike[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_comments')
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `
        )
        .eq('event_id', eventId)
        .is('parent_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('event_comments')
            .select(
              `
              *,
              user:profiles!user_id (
                id,
                full_name,
                avatar_url,
                username
              )
            `
            )
            .eq('parent_id', comment.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

          return {
            ...comment,
            replies: replies || [],
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [eventId]);

  const fetchLikes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_likes')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;

      setLikes(data || []);
      setLikesCount(data?.length || 0);

      if (session?.user) {
        const userLike = data?.find((like) => like.user_id === session.user.id);
        setIsLiked(!!userLike);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [eventId, session?.user]);

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchComments(), fetchLikes()]).finally(() => setLoading(false));
  }, [fetchComments, fetchLikes]);

  // Realtime subscriptions for comments
  useRealtimeSubscription<EventComment>({
    table: 'event_comments',
    filter: `event_id=eq.${eventId}`,
    onInsert: async (payload) => {
      // Fetch complete comment with user info
      const { data } = await supabase
        .from('event_comments')
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `
        )
        .eq('id', (payload.new as EventComment).id)
        .single();

      if (data) {
        if (data.parent_id) {
          // It's a reply, add it to the parent comment
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === data.parent_id
                ? { ...comment, replies: [...(comment.replies || []), data] }
                : comment
            )
          );
        } else {
          // It's a new top-level comment
          setComments((prev) => [data, ...prev]);
        }
      }
    },
    onUpdate: (payload) => {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === (payload.new as EventComment).id
            ? { ...comment, ...payload.new }
            : {
                ...comment,
                replies: comment.replies?.map((reply) =>
                  reply.id === (payload.new as EventComment).id
                    ? { ...reply, ...payload.new }
                    : reply
                ),
              }
        )
      );
    },
    onDelete: (payload) => {
      setComments((prev) =>
        prev
          .filter((comment) => comment.id !== (payload.old as Partial<EventComment>).id)
          .map((comment) => ({
            ...comment,
            replies: comment.replies?.filter(
              (reply) => reply.id !== (payload.old as Partial<EventComment>).id
            ),
          }))
      );
    },
  });

  // Realtime subscriptions for likes
  useRealtimeSubscription<EventLike>({
    table: 'event_likes',
    filter: `event_id=eq.${eventId}`,
    onInsert: (payload) => {
      setLikes((prev) => [...prev, payload.new as EventLike]);
      setLikesCount((prev) => prev + 1);
      if (session?.user && (payload.new as EventLike).user_id === session.user.id) {
        setIsLiked(true);
      }
    },
    onDelete: (payload) => {
      const oldLike = payload.old as Partial<EventLike>;
      setLikes((prev) =>
        prev.filter(
          (like) => !(like.event_id === oldLike.event_id && like.user_id === oldLike.user_id)
        )
      );
      setLikesCount((prev) => Math.max(0, prev - 1));
      if (session?.user && oldLike.user_id === session.user.id) {
        setIsLiked(false);
      }
    },
  });

  const toggleLike = async () => {
    if (!session?.user) return;

    try {
      if (isLiked) {
        await supabase
          .from('event_likes')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', session.user.id);
      } else {
        await supabase.from('event_likes').insert({
          event_id: eventId,
          user_id: session.user.id,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const addComment = async (content: string, parentId?: string) => {
    if (!session?.user) return;

    try {
      const { data, error: insertError } = await supabase
        .from('event_comments')
        .insert({
          event_id: eventId,
          user_id: session.user.id,
          content,
          parent_id: parentId,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      throw err;
    }
  };

  const editComment = async (commentId: string, content: string) => {
    const { data, error: updateError } = await supabase
      .from('event_comments')
      .update({
        content,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data;
  };

  const deleteComment = async (commentId: string) => {
    const { data, error: deleteError } = await supabase
      .from('event_comments')
      .update({ is_deleted: true })
      .eq('id', commentId)
      .select()
      .single();

    if (deleteError) throw deleteError;
    return data;
  };

  return {
    comments,
    likes,
    isLiked,
    likesCount,
    loading,
    error,
    toggleLike,
    addComment,
    editComment,
    deleteComment,
    refetch: () => {
      fetchComments();
      fetchLikes();
    },
  };
}
