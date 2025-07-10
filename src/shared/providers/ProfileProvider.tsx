import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';
import type { UserProfile } from '@/hooks/useProfile';
import { 
  validateProfileUpdate, 
  sanitizeString, 
  sanitizeArray,
  handleSupabaseError,
  InputValidators,
  ValidationError 
} from '@/shared/utils/supabaseValidation';

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: PostgrestError | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ data: UserProfile | null; error: PostgrestError | null }>;
  uploadAvatar: (avatarUri: string) => Promise<{ data: UserProfile | null; error: any }>;
  uploadCover: (coverUri: string) => Promise<{ data: UserProfile | null; error: any }>;
  getProfileStats: () => Promise<{ eventsCreated: number; eventsParticipated: number; friendsCount: number } | null>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProfile = useCallback(async (retryCount = 0) => {
    if (!session?.user || !isMountedRef.current) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        if (isMountedRef.current) {
          setError(error);
          // Retry logic for transient errors
          if (retryCount < 3) {
            retryTimeoutRef.current = setTimeout(() => {
              fetchProfile(retryCount + 1);
            }, Math.pow(2, retryCount) * 1000);
          }
        }
        return;
      }

      // If no profile exists yet (new user), create one
      if (!data) {
        console.log('No profile found for user, creating new profile...');
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: session.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (createError) {
          console.error('Error creating initial profile:', createError);
          if (isMountedRef.current) {
            setError(createError);
          }
          return;
        }

        // Fetch the newly created profile
        const { data: newProfile, error: fetchNewError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (fetchNewError || !newProfile) {
          console.error('Error fetching newly created profile:', fetchNewError);
          return;
        }

        data = newProfile;
      }

      const profileData: UserProfile = {
        id: data.id,
        full_name: data.full_name,
        display_name: data.display_name || data.full_name,
        username: data.username,
        avatar_url: data.avatar_url,
        cover_url: data.cover_url,
        bio: data.bio,
        birth_date: data.birth_date,
        hide_birth_date: data.hide_birth_date || false,
        jam_preference: data.jam_preference,
        restaurant_preference: data.restaurant_preference,
        selected_jams: data.selected_jams || [],
        selected_restaurants: data.selected_restaurants || [],
        jam_track_id: data.jam_track_id,
        jam_title: data.jam_title,
        jam_artist: data.jam_artist,
        jam_cover_url: data.jam_cover_url,
        jam_preview_url: data.jam_preview_url,
        selected_restaurant_id: data.selected_restaurant_id,
        selected_restaurant_name: data.selected_restaurant_name,
        selected_restaurant_address: data.selected_restaurant_address,
        hobbies: data.hobbies || [],
        interests: data.interests || [],
        path: data.path,
        location: data.location || null,
        location_permission_granted: data.location_permission_granted,
        contacts_permission_status: data.contacts_permission_status,
        phone: session.user.phone,
        email: session.user.email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_name_change: data.last_name_change,
        last_username_change: data.last_username_change,
        settings: data.settings,
      };

      if (isMountedRef.current) {
        setProfile(profileData);
      }
    } catch (err: unknown) {
      console.error('Unexpected error fetching profile:', err);
      if (isMountedRef.current) {
        setError(err as PostgrestError);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [session?.user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!session?.user) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }

    setLoading(true);
    setError(null);

    try {
      // Validate profile data
      let validatedUpdates: Partial<UserProfile>;
      try {
        validatedUpdates = validateProfileUpdate(updates);
      } catch (validationError) {
        const error = validationError instanceof Error ? validationError : new ValidationError('Invalid profile data');
        setError(error as PostgrestError);
        return { data: null, error: error as PostgrestError };
      }

      // Additional input validation
      if (validatedUpdates.username) {
        const usernameError = InputValidators.username(validatedUpdates.username);
        if (usernameError) {
          const error = new ValidationError(usernameError, 'username');
          setError(error as PostgrestError);
          return { data: null, error: error as PostgrestError };
        }
        validatedUpdates.username = sanitizeString(validatedUpdates.username).toLowerCase();
      }

      if (validatedUpdates.full_name) {
        validatedUpdates.full_name = sanitizeString(validatedUpdates.full_name);
      }

      if (validatedUpdates.bio) {
        validatedUpdates.bio = sanitizeString(validatedUpdates.bio);
      }

      if (validatedUpdates.hobbies) {
        validatedUpdates.hobbies = sanitizeArray(validatedUpdates.hobbies);
      }

      if (validatedUpdates.interests) {
        validatedUpdates.interests = sanitizeArray(validatedUpdates.interests);
      }

      if (validatedUpdates.birth_date) {
        const birthDateError = InputValidators.birthDate(validatedUpdates.birth_date);
        if (birthDateError) {
          const error = new ValidationError(birthDateError, 'birth_date');
          setError(error as PostgrestError);
          return { data: null, error: error as PostgrestError };
        }
      }

      if (validatedUpdates.avatar_url) {
        const urlError = InputValidators.url(validatedUpdates.avatar_url);
        if (urlError) {
          const error = new ValidationError(urlError, 'avatar_url');
          setError(error as PostgrestError);
          return { data: null, error: error as PostgrestError };
        }
      }

      if (validatedUpdates.cover_url) {
        const urlError = InputValidators.url(validatedUpdates.cover_url);
        if (urlError) {
          const error = new ValidationError(urlError, 'cover_url');
          setError(error as PostgrestError);
          return { data: null, error: error as PostgrestError };
        }
      }
      // First, check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      // If profile doesn't exist, create it first
      if (!existingProfile) {
        console.log('Profile does not exist, creating new profile...');
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: session.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (createError) {
          console.error('Error creating profile:', createError);
          setError(createError);
          return { data: null, error: createError };
        }
      }

      // Build update object only with defined values
      const updateData: any = {
        ...validatedUpdates,
        updated_at: new Date().toISOString(),
      };

      // updateData already contains validatedUpdates from above
      
      // Handle location separately to catch column not found error
      if (updates.location !== undefined) {
        try {
          const { error: locationError } = await supabase
            .from('profiles')
            .update({ location: updates.location })
            .eq('id', session.user.id);
          
          if (!locationError || !locationError.message.includes('location')) {
            updateData.location = updates.location;
          } else {
            console.warn('Location column not yet available in database cache');
          }
        } catch {
          console.warn('Could not update location field');
        }
      }
      
      // Handle last_name_change separately to catch column not found error
      if (updates.last_name_change !== undefined) {
        try {
          const { error: nameChangeError } = await supabase
            .from('profiles')
            .update({ last_name_change: updates.last_name_change })
            .eq('id', session.user.id);
          
          if (!nameChangeError || !nameChangeError.message.includes('last_name_change')) {
            updateData.last_name_change = updates.last_name_change;
          } else {
            console.warn('last_name_change column not yet available in database cache');
          }
        } catch {
          console.warn('Could not update last_name_change field');
        }
      }
      
      // Handle last_username_change separately to catch column not found error
      if (updates.last_username_change !== undefined) {
        try {
          const { error: usernameChangeError } = await supabase
            .from('profiles')
            .update({ last_username_change: updates.last_username_change })
            .eq('id', session.user.id);
          
          if (!usernameChangeError || !usernameChangeError.message.includes('last_username_change')) {
            updateData.last_username_change = updates.last_username_change;
          } else {
            console.warn('last_username_change column not yet available in database cache');
          }
        } catch {
          console.warn('Could not update last_username_change field');
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        const handledError = handleSupabaseError(error);
        setError(handledError as PostgrestError);
        return { data: null, error: handledError as PostgrestError };
      }

      // Update local state with fresh data from database
      const updatedProfile: UserProfile = {
        id: data.id,
        full_name: data.full_name,
        display_name: data.display_name || data.full_name,
        username: data.username,
        avatar_url: data.avatar_url,
        cover_url: data.cover_url,
        bio: data.bio,
        birth_date: data.birth_date,
        hide_birth_date: data.hide_birth_date || false,
        jam_preference: data.jam_preference,
        restaurant_preference: data.restaurant_preference,
        selected_jams: data.selected_jams || [],
        selected_restaurants: data.selected_restaurants || [],
        jam_track_id: data.jam_track_id,
        jam_title: data.jam_title,
        jam_artist: data.jam_artist,
        jam_cover_url: data.jam_cover_url,
        jam_preview_url: data.jam_preview_url,
        selected_restaurant_id: data.selected_restaurant_id,
        selected_restaurant_name: data.selected_restaurant_name,
        selected_restaurant_address: data.selected_restaurant_address,
        hobbies: data.hobbies || [],
        interests: data.interests || [],
        path: data.path,
        location: data.location || null,
        location_permission_granted: data.location_permission_granted,
        contacts_permission_status: data.contacts_permission_status,
        phone: session.user.phone,
        email: session.user.email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_name_change: data.last_name_change,
        last_username_change: data.last_username_change,
        settings: data.settings,
      };
      if (isMountedRef.current) {
        setProfile(updatedProfile);
      }

      return { data: updatedProfile, error: null };
    } catch (err: unknown) {
      console.error('Unexpected error updating profile:', err);
      const handledError = err instanceof Error ? err : new Error('An unexpected error occurred');
      setError(handledError as PostgrestError);
      return { data: null, error: handledError as PostgrestError };
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  const uploadAvatar = useCallback(async (avatarUri: string) => {
    if (!session?.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    try {
      // Get file info to ensure it exists
      const fileInfo = await FileSystem.getInfoAsync(avatarUri);
      if (!fileInfo.exists) {
        return { data: null, error: { message: 'File does not exist' } };
      }
      
      if (fileInfo.size === 0) {
        return { data: null, error: { message: 'File is empty' } };
      }

      console.log('Avatar file info:', { size: fileInfo.size, uri: avatarUri });

      // Compress image before upload
      let uploadUri = avatarUri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          avatarUri,
          [{ resize: { width: 800 } }], // Resize to max 800px width
          { 
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG 
          }
        );
        uploadUri = manipResult.uri;
        
        const compressedInfo = await FileSystem.getInfoAsync(uploadUri);
        if (compressedInfo.exists) {
          console.log('Compressed avatar:', { 
            originalSize: fileInfo.size, 
            compressedSize: compressedInfo.size 
          });
        }
      } catch (compressionError) {
        console.error('Failed to compress avatar, using original:', compressionError);
      }

      const fileExt = 'jpg'; // Always use jpg after compression
      const contentType = 'image/jpeg';
      const fileName = `${session.user.id}/avatar-${Date.now()}.${fileExt}`;

      // Get current session for auth token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        return { data: null, error: { message: 'Not authenticated' } };
      }

      // Use FileSystem.uploadAsync for direct upload
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/avatars/${fileName}`;
      
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uploadUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': contentType,
          'x-upsert': 'true',
          'cache-control': '3600',
        },
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        console.error('Error uploading avatar:', uploadResult.body);
        return { data: null, error: { message: `Upload failed: ${uploadResult.body}` } };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile with new avatar URL
      const updateResult = await updateProfile({ avatar_url: publicUrl });
      return updateResult;
    } catch (err: unknown) {
      console.error('Unexpected error uploading avatar:', err);
      return { data: null, error: err };
    }
  }, [session?.user, updateProfile]);

  const uploadCover = useCallback(async (coverUri: string) => {
    if (!session?.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    try {
      // Get file info to ensure it exists
      const fileInfo = await FileSystem.getInfoAsync(coverUri);
      if (!fileInfo.exists) {
        return { data: null, error: { message: 'File does not exist' } };
      }
      
      if (fileInfo.size === 0) {
        return { data: null, error: { message: 'File is empty' } };
      }

      console.log('Cover file info:', { size: fileInfo.size, uri: coverUri });

      // Compress image before upload
      let uploadUri = coverUri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          coverUri,
          [{ resize: { width: 1200 } }], // Resize to max 1200px width for covers
          { 
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG 
          }
        );
        uploadUri = manipResult.uri;
        
        const compressedInfo = await FileSystem.getInfoAsync(uploadUri);
        if (compressedInfo.exists) {
          console.log('Compressed cover:', { 
            originalSize: fileInfo.size, 
            compressedSize: compressedInfo.size 
          });
        }
      } catch (compressionError) {
        console.error('Failed to compress cover, using original:', compressionError);
      }

      const fileExt = 'jpg'; // Always use jpg after compression
      const contentType = 'image/jpeg';
      const fileName = `${session.user.id}/cover-${Date.now()}.${fileExt}`;

      // Get current session for auth token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        return { data: null, error: { message: 'Not authenticated' } };
      }

      // Use FileSystem.uploadAsync for direct upload
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/covers/${fileName}`;
      
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uploadUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': contentType,
          'x-upsert': 'true',
          'cache-control': '3600',
        },
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        console.error('Error uploading cover:', uploadResult.body);
        return { data: null, error: { message: `Upload failed: ${uploadResult.body}` } };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('covers').getPublicUrl(fileName);

      // Update profile with new cover URL
      const updateResult = await updateProfile({ cover_url: publicUrl });
      return updateResult;
    } catch (err: unknown) {
      console.error('Unexpected error uploading cover:', err);
      return { data: null, error: err };
    }
  }, [session?.user, updateProfile]);

  const getProfileStats = useCallback(async () => {
    if (!session?.user) return null;

    try {
      // Get events created count
      const { count: eventsCreated } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', session.user.id);

      // Get events participated count
      const { count: eventsParticipated } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      // Get friends count
      const { count: friendsCount } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

      return {
        eventsCreated: eventsCreated || 0,
        eventsParticipated: eventsParticipated || 0,
        friendsCount: friendsCount || 0,
      };
    } catch (err) {
      console.error('Error fetching profile stats:', err);
      return null;
    }
  }, [session?.user]);

  // Auto-fetch profile when session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (!session?.user?.id) return;

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`profile:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;
          
          console.log('Profile updated in real-time:', payload);
          // Update profile with the new data directly
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            const updatedProfile: UserProfile = {
              id: newData.id,
              full_name: newData.full_name,
              display_name: newData.display_name || newData.full_name,
              username: newData.username,
              avatar_url: newData.avatar_url,
              cover_url: newData.cover_url,
              bio: newData.bio,
              birth_date: newData.birth_date,
              hide_birth_date: newData.hide_birth_date || false,
              jam_preference: newData.jam_preference,
              restaurant_preference: newData.restaurant_preference,
              selected_jams: newData.selected_jams || [],
              selected_restaurants: newData.selected_restaurants || [],
              jam_track_id: newData.jam_track_id,
              jam_title: newData.jam_title,
              jam_artist: newData.jam_artist,
              jam_cover_url: newData.jam_cover_url,
              jam_preview_url: newData.jam_preview_url,
              selected_restaurant_id: newData.selected_restaurant_id,
              selected_restaurant_name: newData.selected_restaurant_name,
              selected_restaurant_address: newData.selected_restaurant_address,
              hobbies: newData.hobbies || [],
              interests: newData.interests || [],
              path: newData.path,
              location: newData.location || null,
              location_permission_granted: newData.location_permission_granted,
              contacts_permission_status: newData.contacts_permission_status,
              phone: session.user.phone,
              email: session.user.email,
              created_at: newData.created_at,
              updated_at: newData.updated_at,
              last_name_change: newData.last_name_change,
              last_username_change: newData.last_username_change,
              settings: newData.settings,
            };
            if (isMountedRef.current) {
              setProfile(updatedProfile);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Profile subscription active');
        } else if (status === 'CLOSED') {
          console.log('Profile subscription closed');
          // Attempt to reconnect after a delay
          if (isMountedRef.current) {
            setTimeout(() => {
              if (isMountedRef.current && session?.user?.id) {
                fetchProfile();
              }
            }, 5000);
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Profile subscription error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session?.user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      profile,
      loading,
      error,
      fetchProfile: () => fetchProfile(0),
      updateProfile,
      uploadAvatar,
      uploadCover,
      getProfileStats,
    }),
    [profile, loading, error, fetchProfile, updateProfile, uploadAvatar, uploadCover, getProfileStats]
  );

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
}