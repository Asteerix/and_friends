import type { PostgrestError } from '@supabase/supabase-js';
import { useProfileContext } from '@/shared/providers/ProfileProvider';

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
  // Individual jam fields
  jam_track_id?: string;
  jam_title?: string;
  jam_artist?: string;
  jam_cover_url?: string;
  jam_preview_url?: string;
  // Individual restaurant fields
  selected_restaurant_id?: string;
  selected_restaurant_name?: string;
  selected_restaurant_address?: string;
  hobbies?: string[];
  interests?: string[];
  path?: string;
  location?: string;
  location_permission_granted?: boolean;
  contacts_permission_status?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  last_name_change?: string;
  last_username_change?: string;
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

// This hook now acts as a wrapper around the ProfileContext
export function useProfile() {
  try {
    // Try to use the context if we're within a ProfileProvider
    return useProfileContext();
  } catch (error) {
    // If we're not within a ProfileProvider, use the compatibility layer
    // This is a temporary solution while migrating to ProfileProvider
    console.warn('useProfile called outside ProfileProvider, using compatibility layer');
    const { useProfileCompat } = require('./useProfileCompat');
    return useProfileCompat();
  }
}