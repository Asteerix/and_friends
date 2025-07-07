import type { PostgrestError } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export interface UserProfile {
  id: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  birth_date?: string;
  hide_birth_date?: boolean;
  jam_preference?: string;
  restaurant_preference?: string;
  selected_jams?: string[];
  selected_restaurants?: string[];
  hobbies?: string[];
  interests?: string[];
  path?: string;
  location_permission_granted?: boolean;
  contacts_permission_status?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  settings?: {
    notifications: {
      event_invites: boolean;
      friend_requests: boolean;
      event_reminders: boolean;
    };
    privacy: {
      who_can_invite: string;
      hide_from_search: boolean;
    };
  };
}
export function useProfile() {
  const { session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const fetchProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setError(error);
        return;
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
        hobbies: data.hobbies || [],
        interests: data.interests || [],
        path: data.path,
        location_permission_granted: data.location_permission_granted,
        contacts_permission_status: data.contacts_permission_status,
        phone: session.user.phone,
        email: session.user.email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        settings: data.settings,
      };

      setProfile(profileData);
    } catch (err: unknown) {
      console.error('Unexpected error fetching profile:', err);
      setError(err as PostgrestError);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!session?.user) {
      return { error: { message: 'Not authenticated' } };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          username: updates.username,
          avatar_url: updates.avatar_url,
          cover_url: updates.cover_url,
          bio: updates.bio,
          birth_date: updates.birth_date,
          hide_birth_date: updates.hide_birth_date,
          jam_preference: updates.jam_preference,
          restaurant_preference: updates.restaurant_preference,
          hobbies: updates.hobbies,
          path: updates.path,
          location_permission_granted: updates.location_permission_granted,
          contacts_permission_status: updates.contacts_permission_status,
          settings: updates.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        setError(error);
        return { error };
      }

      // Update local state
      const updatedProfile: UserProfile = {
        ...profile!,
        ...updates,
        updated_at: data.updated_at,
      };
      setProfile(updatedProfile);

      return { data: updatedProfile, error: null };
    } catch (err: unknown) {
      console.error('Unexpected error updating profile:', error);
      setError(err as PostgrestError);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (avatarUri: string) => {
    if (!session?.user) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        return { error: { message: 'Image vide, upload annulé.' } };
      }
      const fileExt = avatarUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return { error: uploadError };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile with new avatar URL
      const updateResult = await updateProfile({ avatar_url: publicUrl });
      return updateResult;
    } catch (err: unknown) {
      console.error('Unexpected error uploading avatar:', error);
      return { error: err };
    }
  };

  const uploadCover = async (coverUri: string) => {
    if (!session?.user) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      const response = await fetch(coverUri);
      const blob = await response.blob();
      const fileExt = coverUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}-cover-${Date.now()}.${fileExt}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, blob, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        console.error('Error uploading cover:', uploadError);
        return { error: uploadError };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('covers').getPublicUrl(fileName);

      // Update profile with new cover URL
      const updateResult = await updateProfile({ cover_url: publicUrl });
      return updateResult;
    } catch (err: unknown) {
      console.error('Unexpected error uploading cover:', error);
      return { error: err };
    }
  };

  const getProfileStats = async () => {
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
    } catch {
      console.error('Error fetching profile stats:', error);
      return null;
    }
  };

  // Auto-fetch profile when session changes
  useEffect(() => {
    fetchProfile();
  }, [session?.user?.id]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
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
          console.log('Profile updated in real-time:', payload);
          fetchProfile(); // Refresh profile data
        }
      )
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').limit(50);

      if (error) {
        console.error('Error fetching profiles:', error);
        return { profiles: [], error };
      }

      return { profiles: data || [], error: null };
    } catch (err: unknown) {
      console.error('Unexpected error fetching profiles:', error);
      return { profiles: [], error: err };
    }
  };

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    uploadCover,
    getProfileStats,
    fetchAllProfiles,
  };
}
