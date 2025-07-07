import React, { createContext, useContext, ReactNode } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';

import { useStories as useStoriesHook, Story } from '@/hooks/useStories';

interface StoriesContextType {
  stories: Story[];
  loading: boolean;
  error: PostgrestError | null;
  fetchStories: () => Promise<void>;
  createStory: (storyData: any) => Promise<any>;
  viewStory: (storyId: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<{ error: PostgrestError | null }>;
  getStoriesByUser: (userId: string) => Promise<any[]>;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export function StoriesProvider({ children }: { children: ReactNode }) {
  const storiesData = useStoriesHook();

  return (
    <StoriesContext.Provider value={storiesData}>
      {children}
    </StoriesContext.Provider>
  );
}

export function useStories() {
  const context = useContext(StoriesContext);
  if (!context) {
    throw new Error('useStories must be used within a StoriesProvider');
  }
  return context;
}