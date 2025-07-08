import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export interface EventMemory {
  id: string;
  event_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  type: 'photo' | 'video';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  duration?: number;
  is_public: boolean;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  created_at: string;
}
export interface MemoryComment {
  id: string;
  memory_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
export const useEventMemories = (eventId: string) => {
  const { session } = useSession();
  const user = session?.user;
  const [memories, setMemories] = useState<EventMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canAddMemory, setCanAddMemory] = useState(false);

  // Check if user can add memories
  const checkCanAddMemory = useCallback(async () => {
    if (!user?.id || !eventId) return;

    try {
      const { data, error } = await supabase.rpc('can_add_memory_to_event', {
        p_event_id: eventId,
        p_user_id: user.id,
      });

      if (error) throw error;
      setCanAddMemory(data || false);
    } catch (err: unknown) {
      console.error('Error checking memory permission:', err);
      setCanAddMemory(false);
    }
  }, [user?.id, eventId]);

  // Fetch event memories
  const fetchMemories = useCallback(async () => {
    if (!user?.id || !eventId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_event_memories', {
        p_event_id: eventId,
        p_user_id: user.id,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;
      setMemories(data || []);
    } catch (err: unknown) {
      console.error('Error fetching memories:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [user?.id, eventId]);

  // Upload media file
  const uploadMedia = async (file: {
    uri: string;
    type: 'photo' | 'video';
  }): Promise<{ mediaUrl: string; thumbnailUrl?: string }> => {
    const fileName = `${eventId}/${user?.id}/${Date.now()}.${file.type === 'photo' ? 'jpg' : 'mp4'}`;
    const filePath = `event-memories/${fileName}`;

    // Compress image if it's a photo
    let uploadUri = file.uri;
    if (file.type === 'photo') {
      const manipResult = await manipulateAsync(file.uri, [{ resize: { width: 1920 } }], {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });
      uploadUri = manipResult.uri;
    }

    // Upload file
    const response = await fetch(uploadUri);
    const blob = await response.blob();

    const { error: fetchError } = await supabase.storage
      .from('event-memories')
      .upload(filePath, blob, {
        contentType: file.type === 'photo' ? 'image/jpeg' : 'video/mp4',
        upsert: false,
      });

    if (fetchError) throw fetchError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('event-memories').getPublicUrl(filePath);

    // Generate thumbnail for video
    let thumbnailUrl: string | undefined;
    if (file.type === 'video') {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(file.uri, {
          time: 1000,
        });

        // Upload thumbnail
        const thumbFileName = `${eventId}/${user?.id}/${Date.now()}_thumb.jpg`;
        const thumbPath = `event-memories/${thumbFileName}`;

        const thumbResponse = await fetch(uri);
        const thumbBlob = await thumbResponse.blob();

        await supabase.storage.from('event-memories').upload(thumbPath, thumbBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

        const {
          data: { publicUrl: thumbUrl },
        } = supabase.storage.from('event-memories').getPublicUrl(thumbPath);

        thumbnailUrl = thumbUrl;
      } catch (err: unknown) {
        console.error('Error generating thumbnail:', err);
      }
    }

    return { mediaUrl: publicUrl, thumbnailUrl };
  };

  // Add memory
  const addMemory = useCallback(
    async (
      media: { uri: string; type: 'photo' | 'video' },
      caption?: string,
      isPublic: boolean = true
    ) => {
      if (!user?.id || !eventId || !canAddMemory) {
        throw new Error('Cannot add memory to this event');
      }

      setUploading(true);
      setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

      try {
        // Upload media
        const { mediaUrl, thumbnailUrl } = await uploadMedia(media);

        // Create memory record
        const { data, error } = await supabase
          .from('event_memories')
          .insert({
            event_id: eventId,
            user_id: user.id,
            type: media.type,
            media_url: mediaUrl,
            thumbnail_url: thumbnailUrl,
            caption,
            is_public: isPublic,
          })
          .select()
          .single();

        if (error) throw error;

        // Refresh memories
        await fetchMemories();

        return data;
      } catch (err: unknown) {
        console.error('Error adding memory:', err);
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [user?.id, eventId, canAddMemory, fetchMemories]
  );

  // Pick image from library
  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      return {
        uri: result.assets[0].uri,
        type: 'photo' as const,
      };
    }
    return null;
  }, []);

  // Pick video from library
  const pickVideo = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos' as ImagePicker.MediaTypeOptions,
      allowsEditing: true,
      videoMaxDuration: 60, // 60 seconds max
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return {
        uri: result.assets[0].uri,
        type: 'video' as const,
      };
    }
    return null;
  }, []);

  // Take photo
  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      return {
        uri: result.assets[0].uri,
        type: 'photo' as const,
      };
    }
    return null;
  }, []);

  // Like/unlike memory
  const toggleLike = useCallback(
    async (memoryId: string) => {
      if (!user?.id) return;

      try {
        const memory = memories.find((m) => m.id === memoryId);
        if (!memory) return;

        if (memory.is_liked) {
          // Unlike
          const { error: fetchError } = await supabase
            .from('memory_likes')
            .delete()
            .eq('memory_id', memoryId)
            .eq('user_id', user.id);

          if (fetchError) throw fetchError;

          // Update local state
          setMemories((prev) =>
            prev.map((m) =>
              m.id === memoryId ? { ...m, is_liked: false, likes_count: m.likes_count - 1 } : m
            )
          );
        } else {
          // Like
          const { error: fetchError } = await supabase.from('memory_likes').insert({
            memory_id: memoryId,
            user_id: user.id,
          });

          if (fetchError) throw fetchError;

          // Update local state
          setMemories((prev) =>
            prev.map((m) =>
              m.id === memoryId ? { ...m, is_liked: true, likes_count: m.likes_count + 1 } : m
            )
          );
        }
      } catch (err: unknown) {
        console.error('Error toggling like:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [user?.id, memories]
  );

  // Delete memory
  const deleteMemory = useCallback(
    async (memoryId: string) => {
      if (!user?.id) return;

      try {
        const { error: fetchError } = await supabase
          .from('event_memories')
          .delete()
          .eq('id', memoryId)
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        // Update local state
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      } catch (err: unknown) {
        console.error('Error deleting memory:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [user?.id]
  );

  // Get comments for a memory
  const getMemoryComments = useCallback(async (memoryId: string): Promise<MemoryComment[]> => {
    try {
      const { data, error } = await supabase
        .from('memory_comments')
        .select(
          `
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `
        )
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((comment) => ({
        id: comment.id,
        memory_id: comment.memory_id,
        user_id: comment.user_id,
        username: comment.profiles.username,
        avatar_url: comment.profiles.avatar_url,
        content: comment.content,
        created_at: comment.created_at,
      }));
    } catch (err: unknown) {
      console.error('Error fetching comments:', err);
      return [];
    }
  }, []);

  // Add comment
  const addComment = useCallback(
    async (memoryId: string, content: string) => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('memory_comments')
          .insert({
            memory_id: memoryId,
            user_id: user.id,
            content,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setMemories((prev) =>
          prev.map((m) => (m.id === memoryId ? { ...m, comments_count: m.comments_count + 1 } : m))
        );

        return data;
      } catch (err: unknown) {
        console.error('Error adding comment:', err);
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    [user?.id]
  );

  // Initial fetch
  useEffect(() => {
    if (user?.id && eventId) {
      checkCanAddMemory();
      void fetchMemories();
    }
  }, [user?.id, eventId, checkCanAddMemory, fetchMemories]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id || !eventId) return;

    const subscription = supabase
      .channel(`event_memories_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_memories',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          void fetchMemories();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [user?.id, eventId, fetchMemories]);

  return {
    memories,
    loading,
    uploading,
    uploadProgress,
    error,
    canAddMemory,
    addMemory,
    pickImage,
    pickVideo,
    takePhoto,
    toggleLike,
    deleteMemory,
    getMemoryComments,
    addComment,
    refreshMemories: fetchMemories,
  };
};
