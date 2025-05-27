import React, { createContext, useContext, Dispatch, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export interface SessionContextType {
  session: Session | null;
  loading: boolean;
  setSession?: Dispatch<SetStateAction<Session | null>>; // Optionnel pour l'instant, mais utile si App.tsx le gère
}

export const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
  // setSession: () => {}, // Valeur par défaut pour setSession
});

export const useSession = () => {
  const context = useContext(SessionContext);
  
  // Fonction helper pour récupérer la session actuelle de manière fiable
  const getCurrentSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error("[SessionContext] Erreur lors de la récupération de session:", error);
      return null;
    }
  };

  return {
    ...context,
    getCurrentSession,
  };
};
