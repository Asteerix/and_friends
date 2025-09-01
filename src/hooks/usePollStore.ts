import { useState, useEffect } from 'react';
import pollsData from '@/data/polls.json';
import { supabase } from '@/shared/lib/supabase/client';

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  endsAt: string;
  author: string;
}
export function usePollStore() {
  const [polls, setPolls] = useState<Poll[]>(pollsData as Poll[]);
  const [userVotes, setUserVotes] = useState<{ [pollId: string]: string }>({});

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPolls((prev) =>
        prev.map((poll) => ({
          ...poll,
          options: poll.options.map((opt) => ({
            ...opt,
            votes: opt.votes + Math.floor(Math.random() * 2),
          })),
        }))
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  function vote(pollId: string, optionId: string) {
    setUserVotes((v) => ({ ...v, [pollId]: optionId }));
    setPolls((prev) =>
      prev.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: poll.options.map((opt) =>
                opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
              ),
            }
          : poll
      )
    );
  }

  function getPoll(pollId: string) {
    return polls.find((p) => p.id === pollId);
  }

  async function createPoll(pollData: {
    question: string;
    options: string[];
    type: 'single' | 'multiple';
    expires_at: string;
    anonymous: boolean;
    chat_id?: string;
    event_id?: string;
  }) {
    try {
      console.log('🗳️ [PollStore] Creating new poll:', pollData.question);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('❌ [PollStore] User not authenticated:', userError);
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Create poll in database
      const { data: pollResult, error: pollError } = await supabase
        .from('polls')
        .insert([
          {
            question: pollData.question,
            type: pollData.type,
            expires_at: pollData.expires_at,
            is_anonymous: pollData.anonymous,
            chat_id: pollData.chat_id,
            event_id: pollData.event_id,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (pollError) {
        console.error('❌ [PollStore] Error creating poll:', pollError);

        // If polls table doesn't exist, fall back to local storage
        if (pollError.code === '42P01') {
          console.warn('⚠️ [PollStore] Polls table not found, using local storage');
          const localPoll = createLocalPoll(pollData, user.id);
          return { data: localPoll, error: null };
        }

        return { data: null, error: pollError };
      }

      console.log('✅ [PollStore] Poll created in database:', pollResult.id);

      // Create poll options
      const optionsToInsert = pollData.options.map((option, index) => ({
        poll_id: pollResult.id,
        option_text: option,
        position: index,
      }));

      const { data: optionsResult, error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert)
        .select();

      if (optionsError) {
        console.error('❌ [PollStore] Error creating poll options:', optionsError);

        // Clean up the poll if options failed
        await supabase.from('polls').delete().eq('id', pollResult.id);

        // Fall back to local storage
        const localPoll = createLocalPoll(pollData, user.id);
        return { data: localPoll, error: null };
      }

      console.log('✅ [PollStore] Poll options created:', optionsResult.length);

      // Convert to local format and add to state
      const newPoll: Poll = {
        id: pollResult.id,
        question: pollResult.question,
        options: optionsResult.map((opt) => ({
          id: opt.id,
          label: opt.option_text,
          votes: 0,
        })),
        endsAt: pollResult.expires_at,
        author: user.id,
      };

      setPolls((prev) => [...prev, newPoll]);

      console.log('🎉 [PollStore] Poll created successfully');
      return { data: newPoll, error: null };
    } catch (error) {
      console.error('💥 [PollStore] Fatal error creating poll:', error);

      // Fall back to local storage for development
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const localPoll = createLocalPoll(pollData, user?.id || 'anonymous');
        return { data: localPoll, error: null };
      } catch (fallbackError) {
        return { data: null, error: { message: 'Failed to create poll' } };
      }
    }
  }

  // Local fallback function
  function createLocalPoll(pollData: any, userId: string): Poll {
    const newPoll: Poll = {
      id: `local-poll-${Date.now()}`,
      question: pollData.question,
      options: pollData.options.map((opt: string, index: number) => ({
        id: `local-opt-${index}`,
        label: opt,
        votes: 0,
      })),
      endsAt: pollData.expires_at,
      author: userId,
    };

    setPolls((prev) => [...prev, newPoll]);
    return newPoll;
  }

  return { polls, getPoll, vote, userVotes, createPoll };
}
