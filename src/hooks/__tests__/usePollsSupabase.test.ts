import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePollStore } from '../usePollStore';

// Mock the polls data
jest.mock('@/data/polls.json', () => [
  {
    id: 'poll-1',
    question: 'What\'s your favorite food?',
    options: [
      { id: 'opt-1', label: 'Pizza', votes: 5 },
      { id: 'opt-2', label: 'Burger', votes: 3 },
    ],
    endsAt: '2024-12-31T23:59:59Z',
    author: 'user-123',
  },
  {
    id: 'poll-2',
    question: 'Best movie genre?',
    options: [
      { id: 'opt-3', label: 'Action', votes: 8 },
      { id: 'opt-4', label: 'Comedy', votes: 6 },
      { id: 'opt-5', label: 'Drama', votes: 4 },
    ],
    endsAt: '2024-12-31T23:59:59Z',
    author: 'user-456',
  },
]);

describe('usePollStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should load polls from JSON data', () => {
      const { result } = renderHook(() => usePollStore());

      expect(result.current.polls).toHaveLength(2);
      expect(result.current.polls[0].question).toBe('What\'s your favorite food?');
      expect(result.current.polls[1].question).toBe('Best movie genre?');
    });

    it('should initialize with empty user votes', () => {
      const { result } = renderHook(() => usePollStore());

      expect(result.current.userVotes).toEqual({});
    });
  });

  describe('getPoll', () => {
    it('should return poll by ID', () => {
      const { result } = renderHook(() => usePollStore());

      const poll = result.current.getPoll('poll-1');

      expect(poll).toBeDefined();
      expect(poll?.question).toBe('What\'s your favorite food?');
      expect(poll?.options).toHaveLength(2);
    });

    it('should return undefined for non-existent poll', () => {
      const { result } = renderHook(() => usePollStore());

      const poll = result.current.getPoll('non-existent');

      expect(poll).toBeUndefined();
    });
  });

  describe('vote', () => {
    it('should record user vote and increment option votes', () => {
      const { result } = renderHook(() => usePollStore());

      act(() => {
        result.current.vote('poll-1', 'opt-1');
      });

      expect(result.current.userVotes['poll-1']).toBe('opt-1');
      
      const poll = result.current.getPoll('poll-1');
      const votedOption = poll?.options.find(opt => opt.id === 'opt-1');
      expect(votedOption?.votes).toBe(6); // Was 5, now 6
    });

    it('should handle voting on different polls', () => {
      const { result } = renderHook(() => usePollStore());

      act(() => {
        result.current.vote('poll-1', 'opt-1');
        result.current.vote('poll-2', 'opt-3');
      });

      expect(result.current.userVotes['poll-1']).toBe('opt-1');
      expect(result.current.userVotes['poll-2']).toBe('opt-3');

      const poll1 = result.current.getPoll('poll-1');
      const poll2 = result.current.getPoll('poll-2');
      
      expect(poll1?.options.find(opt => opt.id === 'opt-1')?.votes).toBe(6);
      expect(poll2?.options.find(opt => opt.id === 'opt-3')?.votes).toBe(9);
    });

    it('should allow changing vote on same poll', () => {
      const { result } = renderHook(() => usePollStore());

      // First vote
      act(() => {
        result.current.vote('poll-1', 'opt-1');
      });

      // Change vote
      act(() => {
        result.current.vote('poll-1', 'opt-2');
      });

      expect(result.current.userVotes['poll-1']).toBe('opt-2');
      
      const poll = result.current.getPoll('poll-1');
      expect(poll?.options.find(opt => opt.id === 'opt-1')?.votes).toBe(6); // First vote still counted
      expect(poll?.options.find(opt => opt.id === 'opt-2')?.votes).toBe(4); // Second vote counted
    });

    it('should handle voting on non-existent poll gracefully', () => {
      const { result } = renderHook(() => usePollStore());

      act(() => {
        result.current.vote('non-existent', 'opt-1');
      });

      expect(result.current.userVotes['non-existent']).toBe('opt-1');
      // Should not crash or affect other polls
      expect(result.current.polls).toHaveLength(2);
    });

    it('should handle voting with non-existent option', () => {
      const { result } = renderHook(() => usePollStore());

      act(() => {
        result.current.vote('poll-1', 'non-existent-option');
      });

      expect(result.current.userVotes['poll-1']).toBe('non-existent-option');
      
      const poll = result.current.getPoll('poll-1');
      // Original options should remain unchanged
      expect(poll?.options.find(opt => opt.id === 'opt-1')?.votes).toBe(5);
      expect(poll?.options.find(opt => opt.id === 'opt-2')?.votes).toBe(3);
    });
  });

  describe('createPoll', () => {
    const newPollData = {
      question: 'What is your preferred coding language?',
      options: ['JavaScript', 'Python', 'Go'],
      type: 'single' as const,
      expires_at: '2024-12-31T23:59:59Z',
      anonymous: false,
      chat_id: 'chat-123',
    };

    it('should create a new poll successfully', async () => {
      const { result } = renderHook(() => usePollStore());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(newPollData);
      });

      expect(createResult.data).toBeDefined();
      expect(createResult.error).toBeNull();
      expect(result.current.polls).toHaveLength(3);

      const newPoll = result.current.polls.find(p => p.question === newPollData.question);
      expect(newPoll).toBeDefined();
      expect(newPoll?.options).toHaveLength(3);
      expect(newPoll?.author).toBe('currentUser');
    });

    it('should generate proper option IDs and initialize votes', async () => {
      const { result } = renderHook(() => usePollStore());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(newPollData);
      });

      const newPoll = createResult.data;
      expect(newPoll.options.every(opt => opt.id.startsWith('opt-'))).toBe(true);
      expect(newPoll.options.every(opt => opt.votes === 0)).toBe(true);
      expect(newPoll.options.map(opt => opt.label)).toEqual(newPollData.options);
    });

    it('should handle empty options array', async () => {
      const { result } = renderHook(() => usePollStore());

      const pollWithNoOptions = {
        ...newPollData,
        options: [],
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(pollWithNoOptions);
      });

      expect(createResult.data).toBeDefined();
      expect(createResult.data.options).toHaveLength(0);
    });

    it('should set proper poll properties', async () => {
      const { result } = renderHook(() => usePollStore());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(newPollData);
      });

      const newPoll = createResult.data;
      expect(newPoll.endsAt).toBe(newPollData.expires_at);
      expect(newPoll.author).toBe('currentUser');
      expect(typeof newPoll.id).toBe('string');
      expect(newPoll.id.length).toBeGreaterThan(0);
    });
  });

  describe('live updates simulation', () => {
    it('should simulate live vote updates', async () => {
      const { result } = renderHook(() => usePollStore());

      const initialVotes = result.current.polls[0].options[0].votes;

      // Fast forward to trigger the update interval
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const currentVotes = result.current.polls[0].options[0].votes;
        // Votes might have changed due to simulated updates
        expect(typeof currentVotes).toBe('number');
      });
    });

    it('should maintain poll structure during live updates', () => {
      const { result } = renderHook(() => usePollStore());

      const initialPollCount = result.current.polls.length;
      const initialPollIds = result.current.polls.map(p => p.id);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.polls).toHaveLength(initialPollCount);
      expect(result.current.polls.map(p => p.id)).toEqual(initialPollIds);
    });
  });

  describe('state persistence', () => {
    it('should maintain user votes across re-renders', () => {
      const { result, rerender } = renderHook(() => usePollStore());

      act(() => {
        result.current.vote('poll-1', 'opt-1');
        result.current.vote('poll-2', 'opt-3');
      });

      rerender();

      expect(result.current.userVotes['poll-1']).toBe('opt-1');
      expect(result.current.userVotes['poll-2']).toBe('opt-3');
    });

    it('should maintain poll state across re-renders', () => {
      const { result, rerender } = renderHook(() => usePollStore());

      // Vote to change state
      act(() => {
        result.current.vote('poll-1', 'opt-1');
      });

      const votesAfterVote = result.current.getPoll('poll-1')?.options.find(opt => opt.id === 'opt-1')?.votes;

      rerender();

      const votesAfterRerender = result.current.getPoll('poll-1')?.options.find(opt => opt.id === 'opt-1')?.votes;
      expect(votesAfterRerender).toBe(votesAfterVote);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty poll question', async () => {
      const { result } = renderHook(() => usePollStore());

      const pollWithEmptyQuestion = {
        question: '',
        options: ['Option 1'],
        type: 'single' as const,
        expires_at: '2024-12-31T23:59:59Z',
        anonymous: false,
        chat_id: 'chat-123',
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(pollWithEmptyQuestion);
      });

      expect(createResult.data).toBeDefined();
      expect(createResult.data.question).toBe('');
    });

    it('should handle very long option text', async () => {
      const { result } = renderHook(() => usePollStore());

      const longOption = 'A'.repeat(1000);
      const pollWithLongOption = {
        question: 'Test?',
        options: [longOption, 'Short option'],
        type: 'single' as const,
        expires_at: '2024-12-31T23:59:59Z',
        anonymous: false,
        chat_id: 'chat-123',
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(pollWithLongOption);
      });

      expect(createResult.data.options[0].label).toBe(longOption);
    });

    it('should handle many options', async () => {
      const { result } = renderHook(() => usePollStore());

      const manyOptions = Array.from({ length: 20 }, (_, i) => `Option ${i + 1}`);
      const pollWithManyOptions = {
        question: 'Choose one:',
        options: manyOptions,
        type: 'single' as const,
        expires_at: '2024-12-31T23:59:59Z',
        anonymous: false,
        chat_id: 'chat-123',
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(pollWithManyOptions);
      });

      expect(createResult.data.options).toHaveLength(20);
      expect(createResult.data.options.every(opt => opt.votes === 0)).toBe(true);
    });

    it('should handle rapid consecutive votes', () => {
      const { result } = renderHook(() => usePollStore());

      act(() => {
        // Rapid voting
        for (let i = 0; i < 10; i++) {
          result.current.vote('poll-1', i % 2 === 0 ? 'opt-1' : 'opt-2');
        }
      });

      expect(result.current.userVotes['poll-1']).toBe('opt-2'); // Last vote wins
      
      const poll = result.current.getPoll('poll-1');
      // Both options should have accumulated votes
      expect(poll?.options.find(opt => opt.id === 'opt-1')?.votes).toBeGreaterThan(5);
      expect(poll?.options.find(opt => opt.id === 'opt-2')?.votes).toBeGreaterThan(3);
    });

    it('should handle special characters in poll data', async () => {
      const { result } = renderHook(() => usePollStore());

      const specialCharPoll = {
        question: 'What about émojis? 🤔',
        options: ['Yes! 👍', 'No 👎', 'Maybe? 🤷‍♂️'],
        type: 'single' as const,
        expires_at: '2024-12-31T23:59:59Z',
        anonymous: false,
        chat_id: 'chat-123',
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createPoll(specialCharPoll);
      });

      expect(createResult.data.question).toBe('What about émojis? 🤔');
      expect(createResult.data.options.map(opt => opt.label)).toEqual([
        'Yes! 👍',
        'No 👎', 
        'Maybe? 🤷‍♂️'
      ]);
    });
  });

  describe('cleanup', () => {
    it('should cleanup interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { unmount } = renderHook(() => usePollStore());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent voting and poll creation', async () => {
      const { result } = renderHook(() => usePollStore());

      await act(async () => {
        // Concurrent operations
        const votePromise = Promise.resolve(result.current.vote('poll-1', 'opt-1'));
        const createPromise = result.current.createPoll({
          question: 'Concurrent test?',
          options: ['Yes', 'No'],
          type: 'single' as const,
          expires_at: '2024-12-31T23:59:59Z',
          anonymous: false,
          chat_id: 'chat-123',
        });

        await Promise.all([votePromise, createPromise]);
      });

      expect(result.current.polls).toHaveLength(3);
      expect(result.current.userVotes['poll-1']).toBe('opt-1');
    });

    it('should handle multiple concurrent votes on same poll', () => {
      const { result } = renderHook(() => usePollStore());

      act(() => {
        // Simulate concurrent votes (last one should win)
        result.current.vote('poll-1', 'opt-1');
        result.current.vote('poll-1', 'opt-2');
        result.current.vote('poll-1', 'opt-1');
      });

      expect(result.current.userVotes['poll-1']).toBe('opt-1');
    });
  });
});