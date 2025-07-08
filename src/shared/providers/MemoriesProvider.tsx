import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from './SessionContext';
import { Alert } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Reply {
  id: string;
  story_id: string;
  user_id: string;
  parent_reply_id: string | null;
  text: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string;
    full_name: string;
  };
  is_liked?: boolean;
  child_replies?: Reply[];
}

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  caption?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  replies_count: number;
  saves_count: number;
  created_at: string;
  expires_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string;
    full_name: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;
  has_viewed?: boolean;
}

interface MemoriesContextType {
  stories: Story[];
  replies: Reply[];
  loading: boolean;
  loadingReplies: boolean;
  error: string | null;
  
  // Story actions
  fetchStories: () => Promise<void>;
  fetchStoryById: (storyId: string) => Promise<Story | null>;
  toggleLike: (storyId: string) => Promise<void>;
  toggleSave: (storyId: string) => Promise<void>;
  addView: (storyId: string) => Promise<void>;
  
  // Reply actions
  fetchReplies: (storyId: string) => Promise<void>;
  addReply: (storyId: string, text: string, parentReplyId?: string) => Promise<void>;
  toggleReplyLike: (replyId: string) => Promise<void>;
  deleteReply: (replyId: string) => Promise<void>;
  
  // Real-time subscriptions
  subscribeToStory: (storyId: string) => () => void;
  subscribeToAllStories: () => () => void;
}

const MemoriesContext = createContext<MemoriesContextType | undefined>(undefined);

export const useMemories = () => {
  const context = useContext(MemoriesContext);
  if (!context) {
    throw new Error('useMemories must be used within a MemoriesProvider');
  }
  return context;
};

interface MemoriesProviderProps {
  children: ReactNode;
}

export const MemoriesProvider: React.FC<MemoriesProviderProps> = ({ children }) => {
  const { session } = useSession();
  const [stories, setStories] = useState<Story[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  // Cleanup channels on unmount
  useEffect(() => {
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [channels]);

  const fetchStories = useCallback(async () => {
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles!stories_user_id_fkey(id, username, avatar_url, full_name)
        `)
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;

      if (storiesData) {
        // Check likes and saves for the current user
        const storyIds = storiesData.map(s => s.id);
        
        const [likesResult, savesResult, viewsResult] = await Promise.all([
          supabase
            .from('story_likes')
            .select('story_id')
            .eq('user_id', session.user.id)
            .in('story_id', storyIds),
          
          supabase
            .from('story_saves')
            .select('story_id')
            .eq('user_id', session.user.id)
            .in('story_id', storyIds),
            
          supabase
            .from('story_views')
            .select('story_id')
            .eq('viewer_id', session.user.id)
            .in('story_id', storyIds)
        ]);

        const likedStoryIds = new Set(likesResult.data?.map(l => l.story_id) || []);
        const savedStoryIds = new Set(savesResult.data?.map(s => s.story_id) || []);
        const viewedStoryIds = new Set(viewsResult.data?.map(v => v.story_id) || []);

        const enrichedStories = storiesData.map(story => ({
          ...story,
          is_liked: likedStoryIds.has(story.id),
          is_saved: savedStoryIds.has(story.id),
          has_viewed: viewedStoryIds.has(story.id)
        }));

        setStories(enrichedStories);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError('Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchStoryById = useCallback(async (storyId: string): Promise<Story | null> => {
    if (!session?.user) return null;
    
    try {
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles!stories_user_id_fkey(id, username, avatar_url, full_name)
        `)
        .eq('id', storyId)
        .single();

      if (storyError) throw storyError;

      if (storyData) {
        // Check if user has liked/saved/viewed
        const [likeResult, saveResult, viewResult] = await Promise.all([
          supabase
            .from('story_likes')
            .select('id')
            .eq('story_id', storyId)
            .eq('user_id', session.user.id)
            .single(),
          
          supabase
            .from('story_saves')
            .select('id')
            .eq('story_id', storyId)
            .eq('user_id', session.user.id)
            .single(),
            
          supabase
            .from('story_views')
            .select('story_id')
            .eq('story_id', storyId)
            .eq('viewer_id', session.user.id)
            .single()
        ]);

        return {
          ...storyData,
          is_liked: !!likeResult.data,
          is_saved: !!saveResult.data,
          has_viewed: !!viewResult.data
        };
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching story:', err);
      return null;
    }
  }, [session]);

  const toggleLike = useCallback(async (storyId: string) => {
    if (!session?.user) return;
    
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    
    const isLiked = story.is_liked;
    
    // Optimistic update
    setStories(prev => prev.map(s => 
      s.id === storyId 
        ? { ...s, is_liked: !isLiked, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 }
        : s
    ));
    
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('story_likes')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', session.user.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('story_likes')
          .insert({
            story_id: storyId,
            user_id: session.user.id
          });
          
        if (error) throw error;
      }
    } catch (err) {
      // Revert optimistic update
      setStories(prev => prev.map(s => 
        s.id === storyId 
          ? { ...s, is_liked: isLiked, likes_count: story.likes_count }
          : s
      ));
      
      console.error('Error toggling like:', err);
      Alert.alert('Error', 'Failed to update like');
    }
  }, [session, stories]);

  const toggleSave = useCallback(async (storyId: string) => {
    if (!session?.user) return;
    
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    
    const isSaved = story.is_saved;
    
    // Optimistic update
    setStories(prev => prev.map(s => 
      s.id === storyId 
        ? { ...s, is_saved: !isSaved, saves_count: isSaved ? s.saves_count - 1 : s.saves_count + 1 }
        : s
    ));
    
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('story_saves')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', session.user.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('story_saves')
          .insert({
            story_id: storyId,
            user_id: session.user.id
          });
          
        if (error) throw error;
      }
    } catch (err) {
      // Revert optimistic update
      setStories(prev => prev.map(s => 
        s.id === storyId 
          ? { ...s, is_saved: isSaved, saves_count: story.saves_count }
          : s
      ));
      
      console.error('Error toggling save:', err);
      Alert.alert('Error', 'Failed to update save');
    }
  }, [session, stories]);

  const addView = useCallback(async (storyId: string) => {
    if (!session?.user) return;
    
    const story = stories.find(s => s.id === storyId);
    if (!story || story.has_viewed) return;
    
    // Optimistic update
    setStories(prev => prev.map(s => 
      s.id === storyId 
        ? { ...s, has_viewed: true, views_count: s.views_count + 1 }
        : s
    ));
    
    try {
      const { error } = await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: session.user.id
        });
        
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }
    } catch (err) {
      // Revert optimistic update
      setStories(prev => prev.map(s => 
        s.id === storyId 
          ? { ...s, has_viewed: false, views_count: story.views_count }
          : s
      ));
      
      console.error('Error adding view:', err);
    }
  }, [session, stories]);

  const fetchReplies = useCallback(async (storyId: string) => {
    if (!session?.user) return;
    
    setLoadingReplies(true);
    setReplies([]); // Clear previous replies immediately
    
    try {
      // Fetch replies first
      const { data: repliesData, error: repliesError } = await supabase
        .from('story_replies')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true });
      
      if (repliesError) throw repliesError;
      
      // Then fetch user profiles if we have replies
      let enrichedReplies = repliesData || [];
      if (enrichedReplies.length > 0) {
        const userIds = [...new Set(enrichedReplies.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .in('id', userIds);
        
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        enrichedReplies = enrichedReplies.map(reply => ({
          ...reply,
          user: profilesMap.get(reply.user_id) || {
            id: reply.user_id,
            username: 'Unknown',
            avatar_url: null,
            full_name: null
          }
        }));
      }
      
      if (enrichedReplies) {
        // Check likes for the current user
        const replyIds = enrichedReplies.map(r => r.id);
        
        const { data: likesData } = await supabase
          .from('reply_likes')
          .select('reply_id')
          .eq('user_id', session.user.id)
          .in('reply_id', replyIds);
          
        const likedReplyIds = new Set(likesData?.map(l => l.reply_id) || []);
        
        // Build reply tree
        const replyMap = new Map<string, Reply>();
        const rootReplies: Reply[] = [];
        
        // First pass: create all reply objects
        enrichedReplies.forEach(reply => {
          const enrichedReply: Reply = {
            ...reply,
            is_liked: likedReplyIds.has(reply.id),
            child_replies: [],
            user: reply.user || { 
              id: reply.user_id, 
              username: 'Unknown', 
              avatar_url: null,
              full_name: null
            }
          };
          replyMap.set(reply.id, enrichedReply);
        });
        
        // Second pass: build tree structure
        replyMap.forEach(reply => {
          if (reply.parent_reply_id) {
            const parent = replyMap.get(reply.parent_reply_id);
            if (parent) {
              parent.child_replies!.push(reply);
            }
          } else {
            rootReplies.push(reply);
          }
        });
        
        setReplies(rootReplies);
      }
    } catch (err) {
      console.error('Error fetching replies:', err);
      Alert.alert('Error', 'Failed to load replies');
    } finally {
      setLoadingReplies(false);
    }
  }, [session]);

  const addReply = useCallback(async (storyId: string, text: string, parentReplyId?: string) => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('story_replies')
        .insert({
          story_id: storyId,
          user_id: session.user.id,
          parent_reply_id: parentReplyId || null,
          text
        })
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        // Fetch the user profile for the new reply
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .eq('id', session.user.id)
          .single();
        
        const newReply: Reply = {
          ...data,
          is_liked: false,
          child_replies: [],
          user: profileData || { 
            id: session.user.id, 
            username: 'Unknown', 
            avatar_url: null,
            full_name: null
          }
        };
        
        if (parentReplyId) {
          // Add to parent's children
          setReplies(prev => {
            const updateReplyChildren = (replies: Reply[]): Reply[] => {
              return replies.map(reply => {
                if (reply.id === parentReplyId) {
                  return {
                    ...reply,
                    child_replies: [...(reply.child_replies || []), newReply]
                  };
                } else if (reply.child_replies) {
                  return {
                    ...reply,
                    child_replies: updateReplyChildren(reply.child_replies)
                  };
                }
                return reply;
              });
            };
            
            return updateReplyChildren(prev);
          });
        } else {
          // Add to root replies
          setReplies(prev => [...prev, newReply]);
        }
        
        // Update story reply count
        setStories(prev => prev.map(s => 
          s.id === storyId 
            ? { ...s, replies_count: s.replies_count + 1 }
            : s
        ));
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      Alert.alert('Error', 'Failed to add reply');
    }
  }, [session]);

  const toggleReplyLike = useCallback(async (replyId: string) => {
    if (!session?.user) return;
    
    const findReply = (replies: Reply[]): Reply | null => {
      for (const reply of replies) {
        if (reply.id === replyId) return reply;
        if (reply.child_replies) {
          const found = findReply(reply.child_replies);
          if (found) return found;
        }
      }
      return null;
    };
    
    const reply = findReply(replies);
    if (!reply) return;
    
    const isLiked = reply.is_liked;
    
    // Optimistic update
    const updateReplyLike = (replies: Reply[]): Reply[] => {
      return replies.map(r => {
        if (r.id === replyId) {
          return {
            ...r,
            is_liked: !isLiked,
            likes_count: isLiked ? r.likes_count - 1 : r.likes_count + 1
          };
        } else if (r.child_replies) {
          return {
            ...r,
            child_replies: updateReplyLike(r.child_replies)
          };
        }
        return r;
      });
    };
    
    setReplies(prev => updateReplyLike(prev));
    
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('reply_likes')
          .delete()
          .eq('reply_id', replyId)
          .eq('user_id', session.user.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reply_likes')
          .insert({
            reply_id: replyId,
            user_id: session.user.id
          });
          
        if (error) throw error;
      }
    } catch (err) {
      // Revert optimistic update
      setReplies(prev => updateReplyLike(prev));
      
      console.error('Error toggling reply like:', err);
      Alert.alert('Error', 'Failed to update like');
    }
  }, [session, replies]);

  const deleteReply = useCallback(async (replyId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('story_replies')
        .delete()
        .eq('id', replyId)
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      // Remove from state
      const removeReply = (replies: Reply[]): Reply[] => {
        return replies.filter(r => {
          if (r.id === replyId) return false;
          if (r.child_replies) {
            r.child_replies = removeReply(r.child_replies);
          }
          return true;
        });
      };
      
      setReplies(prev => removeReply(prev));
      
      // Update story reply count
      const storyId = replies.find(r => r.id === replyId)?.story_id;
      if (storyId) {
        setStories(prev => prev.map(s => 
          s.id === storyId 
            ? { ...s, replies_count: Math.max(0, s.replies_count - 1) }
            : s
        ));
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      Alert.alert('Error', 'Failed to delete reply');
    }
  }, [session, replies]);

  const subscribeToStory = useCallback((storyId: string) => {
    if (!session?.user) return () => {};
    
    const channel = supabase
      .channel(`story:${storyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories',
        filter: `id=eq.${storyId}`
      }, async (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updatedStory = await fetchStoryById(storyId);
          if (updatedStory) {
            setStories(prev => prev.map(s => s.id === storyId ? updatedStory : s));
          }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'story_replies',
        filter: `story_id=eq.${storyId}`
      }, () => {
        fetchReplies(storyId);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'story_replies',
        filter: `story_id=eq.${storyId}`
      }, () => {
        fetchReplies(storyId);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_likes',
        filter: `story_id=eq.${storyId}`
      }, async () => {
        const updatedStory = await fetchStoryById(storyId);
        if (updatedStory) {
          setStories(prev => prev.map(s => s.id === storyId ? updatedStory : s));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_saves',
        filter: `story_id=eq.${storyId}`
      }, async () => {
        const updatedStory = await fetchStoryById(storyId);
        if (updatedStory) {
          setStories(prev => prev.map(s => s.id === storyId ? updatedStory : s));
        }
      })
      .subscribe();
    
    setChannels(prev => [...prev, channel]);
    
    return () => {
      supabase.removeChannel(channel);
      setChannels(prev => prev.filter(c => c !== channel));
    };
  }, [session, fetchStoryById, fetchReplies]);

  const subscribeToAllStories = useCallback(() => {
    if (!session?.user) return () => {};
    
    const channel = supabase
      .channel('all-stories')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories'
      }, () => {
        fetchStories();
      })
      .subscribe();
    
    setChannels(prev => [...prev, channel]);
    
    return () => {
      supabase.removeChannel(channel);
      setChannels(prev => prev.filter(c => c !== channel));
    };
  }, [session, fetchStories]);

  // Fetch stories on mount
  useEffect(() => {
    if (session?.user) {
      fetchStories();
    }
  }, [session, fetchStories]);

  const value: MemoriesContextType = {
    stories,
    replies,
    loading,
    loadingReplies,
    error,
    fetchStories,
    fetchStoryById,
    toggleLike,
    toggleSave,
    addView,
    fetchReplies,
    addReply,
    toggleReplyLike,
    deleteReply,
    subscribeToStory,
    subscribeToAllStories
  };

  return (
    <MemoriesContext.Provider value={value}>
      {children}
    </MemoriesContext.Provider>
  );
};