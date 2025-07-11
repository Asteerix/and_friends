// Temporary compatibility layer for useProfile
// This allows components to work both with and without ProfileProvider

import { useState, useEffect } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';
import type { UserProfile } from './useProfile';

// This provides a fallback implementation when ProfileProvider is not available
export function useProfileCompat() {
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
        hobbies: data.hobbies || [],
        path: data.path,
        location: data.location || null,
        phone: session.user.phone,
        email: session.user.email,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_name_change: data.last_name_change,
        last_username_change: data.last_username_change,
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
    // Minimal implementation for compatibility
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session?.user?.id);
    
    if (!error) {
      await fetchProfile();
    }
    
    return { data: profile, error };
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar: async () => ({ data: null, error: { message: 'Not implemented' } }),
    uploadCover: async () => ({ data: null, error: { message: 'Not implemented' } }),
    getProfileStats: async () => null,
  };
}