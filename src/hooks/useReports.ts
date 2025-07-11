import { useState, useCallback } from 'react';

import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

export type ReportType = 'user' | 'event' | 'message' | 'story' | 'memory';
export type ReportReason =
  | 'inappropriate_content'
  | 'spam'
  | 'harassment'
  | 'fake_profile'
  | 'inappropriate_name'
  | 'violence'
  | 'hate_speech'
  | 'adult_content'
  | 'misinformation'
  | 'copyright'
  | 'other';

export interface Report {
  id: string;
  created_at: string;
  updated_at?: string;
  reporter_id: string;
  reported_type: ReportType;
  reported_id: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}
export function useReports() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createReport = useCallback(
    async (report: {
      reported_type: ReportType;
      reported_id: string;
      reason: ReportReason;
      details?: string;
    }) => {
      if (!session?.user) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        // Check if user has already reported this item
        const { data: existing } = await supabase
          .from('reports')
          .select('id')
          .eq('reporter_id', session.user.id)
          .eq('reported_type', report.reported_type)
          .eq('reported_id', report.reported_id)
          .single();

        if (existing) {
          throw new Error('Vous avez déjà signalé cet élément');
        }

        // Create the report
        const { data, error } = await supabase
          .from('reports')
          .insert({
            reporter_id: session.user.id,
            ...report,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        // Create notification for admins (you might want to implement admin notification system)
        // This is just a placeholder for the notification logic

        return data;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session?.user]
  );

  const reportUser = useCallback(
    async (userId: string, reason: ReportReason, details?: string) => {
      return createReport({
        reported_type: 'user',
        reported_id: userId,
        reason,
        details,
      });
    },
    [createReport]
  );

  const reportEvent = useCallback(
    async (eventId: string, reason: ReportReason, details?: string) => {
      return createReport({
        reported_type: 'event',
        reported_id: eventId,
        reason,
        details,
      });
    },
    [createReport]
  );

  const reportMessage = useCallback(
    async (messageId: string, reason: ReportReason, details?: string) => {
      return createReport({
        reported_type: 'message',
        reported_id: messageId,
        reason,
        details,
      });
    },
    [createReport]
  );

  const reportStory = useCallback(
    async (storyId: string, reason: ReportReason, details?: string) => {
      return createReport({
        reported_type: 'story',
        reported_id: storyId,
        reason,
        details,
      });
    },
    [createReport]
  );

  const reportMemory = useCallback(
    async (memoryId: string, reason: ReportReason, details?: string) => {
      return createReport({
        reported_type: 'memory',
        reported_id: memoryId,
        reason,
        details,
      });
    },
    [createReport]
  );

  // Get user's reports (for admin panel or user's report history)
  const getUserReports = useCallback(async () => {
    if (!session?.user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [session?.user]);

  return {
    loading,
    error,
    reportUser,
    reportEvent,
    reportMessage,
    reportStory,
    reportMemory,
    getUserReports,
  };
}
