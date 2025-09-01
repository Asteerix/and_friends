import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

/**
 * Vérifie et rafraîchit la session si nécessaire
 * @returns La session valide ou null si expirée
 */
export async function getValidSession(): Promise<Session | null> {
  try {
    // D'abord essayer de récupérer la session actuelle
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ [SessionHelper] Erreur lors de la récupération de session:', error);
      return null;
    }

    if (!session) {
      console.log('⚠️ [SessionHelper] Aucune session active');
      return null;
    }

    // Vérifier si le token est proche de l'expiration (moins de 5 minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      console.log(
        `⏱️ [SessionHelper] Temps avant expiration: ${timeUntilExpiry}s (${Math.floor(timeUntilExpiry / 60)}min)`
      );

      // Si moins de 5 minutes, forcer le refresh
      if (timeUntilExpiry < 300) {
        console.log("🔄 [SessionHelper] Token proche de l'expiration, rafraîchissement...");
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('❌ [SessionHelper] Erreur lors du rafraîchissement:', refreshError);
          return null;
        }

        console.log('✅ [SessionHelper] Session rafraîchie avec succès');
        return refreshedSession;
      }
    }

    return session;
  } catch (error) {
    console.error('❌ [SessionHelper] Erreur inattendue:', error);
    return null;
  }
}

/**
 * Force le rafraîchissement de la session
 */
export async function forceRefreshSession(): Promise<Session | null> {
  try {
    console.log('🔄 [SessionHelper] Rafraîchissement forcé de la session...');
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error) {
      console.error('❌ [SessionHelper] Erreur lors du rafraîchissement forcé:', error);
      return null;
    }

    console.log('✅ [SessionHelper] Session rafraîchie avec succès (forcé)');
    return session;
  } catch (error) {
    console.error('❌ [SessionHelper] Erreur inattendue lors du rafraîchissement:', error);
    return null;
  }
}

/**
 * Déconnecte l'utilisateur et nettoie la session
 */
export async function signOutAndCleanup(): Promise<void> {
  try {
    console.log('🚪 [SessionHelper] Déconnexion et nettoyage...');
    await supabase.auth.signOut();
    console.log('✅ [SessionHelper] Déconnexion réussie');
  } catch (error) {
    console.error('❌ [SessionHelper] Erreur lors de la déconnexion:', error);
  }
}
