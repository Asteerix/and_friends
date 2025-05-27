import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useSession } from "../lib/SessionContext";
import type { PostgrestError } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  birth_date?: string;
  jam_preference?: string;
  restaurant_preference?: string;
  hobbies?: string[];
  path?: string;
  location_permission_granted?: boolean;
  contacts_permission_status?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
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
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setError(error);
        return;
      }

      const profileData: UserProfile = {
        id: data.id,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        birth_date: data.birth_date,
        jam_preference: data.jam_preference,
        restaurant_preference: data.restaurant_preference,
        hobbies: data.hobbies || [],
        path: data.path,
        location_permission_granted: data.location_permission_granted,
        contacts_permission_status: data.contacts_permission_status,
        phone: session.user.phone,
        email: session.user.email,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setProfile(profileData);
    } catch (err: any) {
      console.error("Unexpected error fetching profile:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!session?.user) {
      return { error: { message: "Not authenticated" } };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
          birth_date: updates.birth_date,
          jam_preference: updates.jam_preference,
          restaurant_preference: updates.restaurant_preference,
          hobbies: updates.hobbies,
          path: updates.path,
          location_permission_granted: updates.location_permission_granted,
          contacts_permission_status: updates.contacts_permission_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
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
    } catch (err: any) {
      console.error("Unexpected error updating profile:", err);
      setError(err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (avatarFile: File | Blob, fileName: string) => {
    if (!session?.user) {
      return { error: { message: "Not authenticated" } };
    }

    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `${session.user.id}/avatar.${fileExt}`;

      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading avatar:", uploadError);
        return { error: uploadError };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const updateResult = await updateProfile({ avatar_url: publicUrl });
      return updateResult;

    } catch (err: any) {
      console.error("Unexpected error uploading avatar:", err);
      return { error: err };
    }
  };

  const getProfileStats = async () => {
    if (!session?.user) return null;

    try {
      // Get events created count
      const { count: eventsCreated } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("created_by", session.user.id);

      // Get events participated count
      const { count: eventsParticipated } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      // Get friends count
      const { count: friendsCount } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .eq("status", "accepted");

      return {
        eventsCreated: eventsCreated || 0,
        eventsParticipated: eventsParticipated || 0,
        friendsCount: friendsCount || 0,
      };
    } catch (error) {
      console.error("Error fetching profile stats:", error);
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
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log("Profile updated in real-time:", payload);
          fetchProfile(); // Refresh profile data
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    getProfileStats,
  };
}