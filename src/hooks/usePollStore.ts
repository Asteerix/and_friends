import { useState, useEffect } from "react";
import pollsData from "../data/polls.json";

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

  return { polls, getPoll, vote, userVotes };
}
