import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase/client';

interface Attendee {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  rsvp_status: string;
}

export function useEventAttendees(eventId: string | undefined) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchAttendees = async () => {
      setLoading(true);
      try {
        // Get all users who have RSVP'd as attending
        const { data, error } = await supabase
          .from('event_attendees')
          .select(
            `
            user_id,
            status,
            profiles!event_attendees_user_id_fkey (
              id,
              full_name,
              username,
              avatar_url
            )
          `
          )
          .eq('event_id', eventId)
          .eq('status', 'attending');

        if (error) throw error;

        const attendeesList =
          data?.map((invite: any) => ({
            id: invite.user_id,
            full_name: invite.profiles?.full_name || '',
            username: invite.profiles?.username || '',
            avatar_url: invite.profiles?.avatar_url || null,
            rsvp_status: invite.status,
          })) || [];

        setAttendees(attendeesList);
      } catch (err) {
        console.error('Error fetching attendees:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendees();
  }, [eventId]);

  return { attendees, loading, error };
}
