import { useState, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { useProfile } from './useProfile';

export interface Rating {
  id: string;
  from_user_id: string;
  to_user_id: string;
  event_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  from_user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio?: string;
  };
  to_user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio?: string;
  };
  event?: {
    id: string;
    title: string;
    start_date: string;
    image_url?: string;
  } | null;
}

export interface RatingStats {
  average_rating: number;
  total_ratings: number;
  rating_distribution: Record<string, number>;
  recent_ratings: Rating[];
}

export const useRatings = () => {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get rating statistics for a user
  const getUserRatingStats = useCallback(async (userId: string): Promise<RatingStats | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_rating_stats', { p_user_id: userId });

      if (rpcError) {
        console.error('Error fetching rating stats:', rpcError);
        setError(rpcError.message);
        return null;
      }

      if (!data) {
        return {
          average_rating: 0,
          total_ratings: 0,
          rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          recent_ratings: []
        };
      }

      // Supabase RPC returns single row functions as an object, not an array
      const stats = Array.isArray(data) ? data[0] : data;
      return {
        average_rating: stats?.average_rating || 0,
        total_ratings: stats?.total_ratings || 0,
        rating_distribution: stats?.rating_distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        recent_ratings: stats?.recent_ratings || []
      };
    } catch (err) {
      console.error('Error in getUserRatingStats:', err);
      setError('Failed to load rating statistics');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get ratings given by a user
  const getUserGivenRatings = useCallback(async (userId: string, limit = 50, offset = 0): Promise<Rating[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_given_ratings', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        });

      if (rpcError) {
        console.error('Error fetching given ratings:', rpcError);
        setError(rpcError.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getUserGivenRatings:', err);
      setError('Failed to load given ratings');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get ratings received by a user
  const getUserReceivedRatings = useCallback(async (userId: string, limit = 50, offset = 0): Promise<Rating[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_received_ratings', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        });

      if (rpcError) {
        console.error('Error fetching received ratings:', rpcError);
        setError(rpcError.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getUserReceivedRatings:', err);
      setError('Failed to load received ratings');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Create or update a rating
  const upsertRating = useCallback(async (
    toUserId: string,
    rating: number,
    comment?: string,
    eventId?: string
  ): Promise<boolean> => {
    try {
      if (!profile?.id) {
        setError('You must be logged in to rate users');
        return false;
      }

      setLoading(true);
      setError(null);

      const { error: rpcError } = await supabase
        .rpc('upsert_rating', {
          p_from_user_id: profile.id,
          p_to_user_id: toUserId,
          p_event_id: eventId || null,
          p_rating: rating,
          p_comment: comment || null
        });

      if (rpcError) {
        console.error('Error upserting rating:', rpcError);
        setError(rpcError.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in upsertRating:', err);
      setError('Failed to save rating');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  // Delete a rating
  const deleteRating = useCallback(async (ratingId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('delete_rating', { p_rating_id: ratingId });

      if (rpcError) {
        console.error('Error deleting rating:', rpcError);
        setError(rpcError.message);
        return false;
      }

      return data || false;
    } catch (err) {
      console.error('Error in deleteRating:', err);
      setError('Failed to delete rating');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user can rate another user
  const canRateUser = useCallback(async (
    toUserId: string,
    eventId?: string
  ): Promise<boolean> => {
    try {
      if (!profile?.id) return false;

      const { data, error: rpcError } = await supabase
        .rpc('can_rate_user', {
          p_from_user_id: profile.id,
          p_to_user_id: toUserId,
          p_event_id: eventId || null
        });

      if (rpcError) {
        console.error('Error checking rate permission:', rpcError);
        return false;
      }

      return data || false;
    } catch (err) {
      console.error('Error in canRateUser:', err);
      return false;
    }
  }, [profile?.id]);

  // Get event participant ratings
  const getEventParticipantRatings = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_event_participant_ratings', { p_event_id: eventId });

      if (rpcError) {
        console.error('Error fetching event ratings:', rpcError);
        setError(rpcError.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getEventParticipantRatings:', err);
      setError('Failed to load event ratings');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getUserRatingStats,
    getUserGivenRatings,
    getUserReceivedRatings,
    upsertRating,
    deleteRating,
    canRateUser,
    getEventParticipantRatings,
  };
};