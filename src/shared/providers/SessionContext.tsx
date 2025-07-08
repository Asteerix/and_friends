import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useState, useEffect, Dispatch, SetStateAction } from 'react';

import { supabase } from '@/shared/lib/supabase/client';

export interface SessionContextType {
  session: Session | null;
  loading: boolean;
  setSession?: Dispatch<SetStateAction<Session | null>>;
}

export const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
});

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with error handling
    const initializeSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[SessionContext] Error getting initial session:', error);
          setLoading(false);
          return;
        }
        
        setSession(initialSession);
        setLoading(false);
      } catch (error) {
        console.error('[SessionContext] Unexpected error during session initialization:', error);
        setLoading(false);
      }
    };

    void initializeSession();

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[SessionContext] Auth state changed:', _event);
      setSession(newSession);
      
      // Reset loading state if it's still true (edge case)
      if (loading) {
        setLoading(false);
      }
    });

    return () => void subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, setSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  
  // Fonction helper pour récupérer la session actuelle de manière fiable
  const getCurrentSession = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession;
    } catch (error) {
      console.error('[SessionContext] Erreur lors de la récupération de session:', error);
      return null;
    }
  };

  return {
    ...context,
    getCurrentSession,
  };
};
