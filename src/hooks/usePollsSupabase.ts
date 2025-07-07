import { RealtimeChannel } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

import { supabase } from '@/shared/lib/supabase/client';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}
export interface Poll {
  id: string;
  message_id?: string;
  question: string;
  options: PollOption[];
  multiple_choice: boolean;
  anonymous: boolean;
  expires_at?: string;
  created_at: string;
  total_votes: number;
  user_votes?: string[]; // Option IDs the current user voted for
}
export const usePollsSupabase = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setChannel] = useState<RealtimeChannel | null>(null);

  // Fetch all polls
  const fetchPolls = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch polls with user votes
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select(
          `
          *,
          poll_votes!poll_votes_poll_id_fkey(
            user_id,
            option_ids
          )
        `
        )
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      // Transform data to include user votes and calculate totals
      const transformedPolls: Poll[] = (pollsData || []).map((poll) => {
        const userVote = poll.poll_votes?.find((v: any) => v.user_id === user.id);
        const totalVotes = poll.options.reduce(
          (sum: number, opt: PollOption) => sum + opt.votes,
          0
        );

        return {
          ...poll,
          total_votes: totalVotes,
          user_votes: userVote?.option_ids || [],
        };
      });

      setPolls(transformedPolls);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  };

  // Create a new poll
  const createPoll = async (
    messageId: string,
    question: string,
    options: string[],
    multipleChoice: boolean = false,
    anonymous: boolean = false,
    expiresIn?: number // Hours until expiration
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const pollOptions: PollOption[] = options.map((text) => ({
        id: crypto.randomUUID(),
        text,
        votes: 0,
      }));

      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString()
        : undefined;

      const { data, error } = await supabase
        .from('polls')
        .insert({
          message_id: messageId,
          question,
          options: pollOptions,
          multiple_choice: multipleChoice,
          anonymous,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      const newPoll: Poll = {
        ...data,
        total_votes: 0,
        user_votes: [],
      };

      setPolls((prev) => [newPoll, ...prev]);
      return newPoll;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create poll');
      throw error;
    }
  };

  // Vote on a poll
  const votePoll = async (pollId: string, optionIds: string[]) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current poll
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) throw new Error('Poll not found');

      // Check if poll is expired
      if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
        throw new Error('Poll has expired');
      }

      // Start transaction
      const { error: voteError } = await supabase.from('poll_votes').upsert({
        poll_id: pollId,
        user_id: user.id,
        option_ids: optionIds,
      });

      if (voteError) throw voteError;

      // Update poll options vote counts
      const updatedOptions = poll.options.map((option) => {
        const wasVoted = poll.user_votes?.includes(option.id) || false;
        const isVoted = optionIds.includes(option.id);

        return {
          ...option,
          votes: option.votes + (isVoted ? 1 : 0) - (wasVoted ? 1 : 0),
        };
      });

      const { error: updateError } = await supabase
        .from('polls')
        .update({ options: updatedOptions })
        .eq('id', pollId);

      if (updateError) throw updateError;

      // Update local state
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? {
                ...p,
                options: updatedOptions,
                user_votes: optionIds,
                total_votes: updatedOptions.reduce((sum, opt) => sum + opt.votes, 0),
              }
            : p
        )
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to vote');
      throw error;
    }
  };

  // Get a single poll
  const getPoll = (pollId: string): Poll | undefined => {
    return polls.find((p) => p.id === pollId);
  };

  // Get polls for a specific message
  const getMessagePolls = (messageId: string): Poll[] => {
    return polls.filter((p) => p.message_id === messageId);
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchPolls();

    const channel = supabase
      .channel('polls_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newPoll = payload.new as Poll;
          setPolls((prev) => [{ ...newPoll, total_votes: 0, user_votes: [] }, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedPoll = payload.new as Poll;
          setPolls((prev) =>
            prev.map((p) => (p.id === updatedPoll.id ? { ...p, ...updatedPoll } : p))
          );
        } else if (payload.eventType === 'DELETE') {
          setPolls((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
        // Refetch polls when votes change
        fetchPolls();
      })
      .subscribe();

    setChannel(channel);

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    polls,
    loading,
    error,
    createPoll,
    votePoll,
    getPoll,
    getMessagePolls,
    refreshPolls: fetchPolls,
  };
};
