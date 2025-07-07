import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

export interface EventTemplate {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  description?: string;
  event_data: {
    title: string;
    description?: string;
    location?: string;
    is_private: boolean;
    cover_bg_color?: string;
    cover_font?: string;
    cover_image?: string;
    subtitle?: string;
    // Any other event fields
    [key: string]: any;
  };
  is_public: boolean;
  uses_count: number;
}
export function useEventTemplates() {
  const { session } = useSession();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMyTemplates = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .eq('user_id', session.user.id)
        .order('uses_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  const fetchPublicTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .eq('is_public', true)
        .order('uses_count', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPublicTemplates(data || []);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchMyTemplates(), fetchPublicTemplates()]).finally(() => setLoading(false));
  }, [fetchMyTemplates, fetchPublicTemplates]);

  const createTemplate = useCallback(
    async (
      name: string,
      eventData: EventTemplate['event_data'],
      description?: string,
      isPublic: boolean = false
    ) => {
      if (!session?.user?.id) throw new Error('User not authenticated');

      try {
        const { data, error } = await supabase
          .from('event_templates')
          .insert({
            user_id: session.user.id,
            name,
            description,
            event_data: eventData,
            is_public: isPublic,
          })
          .select()
          .single();

        if (error) throw error;

        setTemplates((prev) => [data, ...prev]);
        if (isPublic) {
          setPublicTemplates((prev) => [data, ...prev]);
        }

        return data;
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [session?.user?.id]
  );

  const updateTemplate = useCallback(
    async (
      templateId: string,
      updates: {
        name?: string;
        description?: string;
        event_data?: EventTemplate['event_data'];
        is_public?: boolean;
      }
    ) => {
      if (!session?.user?.id) throw new Error('User not authenticated');

      try {
        const { data, error } = await supabase
          .from('event_templates')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId)
          .eq('user_id', session.user.id)
          .select()
          .single();

        if (error) throw error;

        setTemplates((prev) => prev.map((t) => (t.id === templateId ? data : t)));

        // Update public templates if visibility changed
        if (updates.is_public !== undefined) {
          if (updates.is_public) {
            setPublicTemplates((prev) => [...prev, data]);
          } else {
            setPublicTemplates((prev) => prev.filter((t) => t.id !== templateId));
          }
        }

        return data;
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [session?.user?.id]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!session?.user?.id) throw new Error('User not authenticated');

      try {
        const { error: fetchError } = await supabase
          .from('event_templates')
          .delete()
          .eq('id', templateId)
          .eq('user_id', session.user.id);

        if (fetchError) throw fetchError;

        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        setPublicTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [session?.user?.id]
  );

  const useTemplate = useCallback(
    async (templateId: string) => {
      try {
        // Increment uses count
        await supabase.rpc('increment_template_uses', {
          template_id: templateId,
        });

        // Get template data
        const template = [...templates, ...publicTemplates].find((t) => t.id === templateId);
        if (!template) throw new Error('Template not found');

        // Update local state
        const updateTemplateCount = (prev: EventTemplate[]) =>
          prev.map((t) => (t.id === templateId ? { ...t, uses_count: t.uses_count + 1 } : t));

        setTemplates(updateTemplateCount);
        setPublicTemplates(updateTemplateCount);

        return template.event_data;
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [templates, publicTemplates]
  );

  const searchTemplates = useCallback(async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_public', true)
        .order('uses_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, []);

  const getPopularTemplates = useCallback(async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .eq('is_public', true)
        .order('uses_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, []);

  return {
    templates,
    publicTemplates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    searchTemplates,
    getPopularTemplates,
    refetch: () => {
      fetchMyTemplates();
      fetchPublicTemplates();
    },
  };
}
