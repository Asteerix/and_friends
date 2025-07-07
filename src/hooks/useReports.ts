import { useState, useCallback } from 'react';

import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

export type ReportType = 'user' | 'event' | 'message' | 'story' | 'memory';
export type ReportReason =
  | 'inappropriate_content'
  | 'harassment'
  | 'spam'
  | 'violence'
  | 'hate_speech'
  | 'false_information'
  | 'nudity'
  | 'scam'
  | 'other';

export interface Report {
  id: string;
  created_at: string;
  reporter_id: string;
  type: ReportType;
  reported_user_id?: string;
  reported_event_id?: string;
  reported_message_id?: string;
  reported_story_id?: string;
  reported_memory_id?: string;
  reason: ReportReason;
  description?: string;
  evidence?: any;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewed_at?: string;
  reviewed_by?: string;
  resolution?: string;
}
export function useReports() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createReport = useCallback(
    async (report: {
      type: ReportType;
      reported_user_id?: string;
      reported_event_id?: string;
      reported_message_id?: string;
      reported_story_id?: string;
      reported_memory_id?: string;
      reason: ReportReason;
      description?: string;
      evidence?: any;
    }) => {
      if (!session?.user) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        // Check if user has already reported this item
        let existingReportQuery = supabase
          .from('reports')
          .select('id')
          .eq('reporter_id', session.user.id)
          .eq('type', report.type)
          .eq('reason', report.reason);

        // Add specific ID based on type
        switch (report.type) {
          case 'user':
            if (report.reported_user_id) {
              existingReportQuery = existingReportQuery.eq(
                'reported_user_id',
                report.reported_user_id
              );
            }
            break;
          case 'event':
            if (report.reported_event_id) {
              existingReportQuery = existingReportQuery.eq(
                'reported_event_id',
                report.reported_event_id
              );
            }
            break;
          case 'message':
            if (report.reported_message_id) {
              existingReportQuery = existingReportQuery.eq(
                'reported_message_id',
                report.reported_message_id
              );
            }
            break;
          case 'story':
            if (report.reported_story_id) {
              existingReportQuery = existingReportQuery.eq(
                'reported_story_id',
                report.reported_story_id
              );
            }
            break;
          case 'memory':
            if (report.reported_memory_id) {
              existingReportQuery = existingReportQuery.eq(
                'reported_memory_id',
                report.reported_memory_id
              );
            }
            break;
        }

        const { data: existing } = await existingReportQuery.single();

        if (existing) {
          throw new Error('Vous avez déjà signalé cet élément pour cette raison');
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
    async (userId: string, reason: ReportReason, description?: string, evidence?: any) => {
      return createReport({
        type: 'user',
        reported_user_id: userId,
        reason,
        description,
        evidence,
      });
    },
    [createReport]
  );

  const reportEvent = useCallback(
    async (eventId: string, reason: ReportReason, description?: string, evidence?: any) => {
      return createReport({
        type: 'event',
        reported_event_id: eventId,
        reason,
        description,
        evidence,
      });
    },
    [createReport]
  );

  const reportMessage = useCallback(
    async (messageId: string, reason: ReportReason, description?: string, evidence?: any) => {
      return createReport({
        type: 'message',
        reported_message_id: messageId,
        reason,
        description,
        evidence,
      });
    },
    [createReport]
  );

  const reportStory = useCallback(
    async (storyId: string, reason: ReportReason, description?: string, evidence?: any) => {
      return createReport({
        type: 'story',
        reported_story_id: storyId,
        reason,
        description,
        evidence,
      });
    },
    [createReport]
  );

  const reportMemory = useCallback(
    async (memoryId: string, reason: ReportReason, description?: string, evidence?: any) => {
      return createReport({
        type: 'memory',
        reported_memory_id: memoryId,
        reason,
        description,
        evidence,
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
