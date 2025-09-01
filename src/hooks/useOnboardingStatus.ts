import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export interface ProfileStatus {
  currentStep: string | null;
  isComplete: boolean | null;
  loading: boolean;
  error: Error | null;
  userId: string | null;
  refetch: () => Promise<void>;
}
export function useOnboardingStatus(): ProfileStatus {
  const { session } = useSession();
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfileStatus = useCallback(async () => {
    console.log('[useOnboardingStatus] fetchProfileStatus called. session:', session);

    if (!session?.user) {
      console.log('[useOnboardingStatus] 🚫 PAS DE SESSION USER - FORCE AUTH');
      console.log(
        '[useOnboardingStatus] Setting: currentStep=PhoneVerification, isComplete=false, loading=false'
      );
      setCurrentStep('PhoneVerification');
      setIsComplete(false); // Changé de null à false pour forcer l'authentification
      setLoading(false);
      setUserId(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setUserId(session.user.id);
    console.log(`[useOnboardingStatus] Début fetch pour user: ${session.user.id}`);

    let localStep: string | null = null;
    let localIsComplete: boolean | null = null;
    try {
      console.log(`[useOnboardingStatus] Fetching profile for user: ${session.user.id}`);
      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      let finalProfile = profile;
      if (profile) {
        console.log("[useOnboardingStatus] Profil déjà existant, pas d'insert.");
        // On continue pour déterminer l'étape d'onboarding manquante
      } else if (selectError) {
        if (selectError.code === 'PGRST116') {
          // Row not found, on peut insérer
          console.log('[useOnboardingStatus] Profil non trouvé (PGRST116), on insère.');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({ id: session.user.id });
          if (insertError) {
            if (insertError.code === '23505') {
              // Duplicate key: le profil existe déjà, on ne log pas d'erreur
              console.log(
                '[useOnboardingStatus] Insert profil: duplicate key, le profil existe déjà.'
              );
            } else {
              // Autre erreur : log en erreur
              console.error(
                '[useOnboardingStatus] Erreur création profil à la volée:',
                insertError
              );
            }
          }
          // Relire le profil après création
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          finalProfile = newProfile;
        } else {
          // Autre erreur, on ne tente pas d'insérer
          console.error('[useOnboardingStatus] Erreur lors du select profil:', selectError);
          setLoading(false);
          setCurrentStep('NameInput');
          setIsComplete(false);
          return;
        }
      }
      // Déterminer l'étape d'onboarding manquante
      if (finalProfile) {
        console.log('[useOnboardingStatus] Profile data fetched:', finalProfile);
        const missingStep = getMissingOnboardingStep(finalProfile);
        if (missingStep === 'PhoneVerification') {
          console.error(
            "[useOnboardingStatus] ERREUR: missingStep=PhoneVerification alors qu'une session existe! Forçage NameInput."
          );
          localStep = 'NameInput';
          localIsComplete = false;
        } else if (missingStep) {
          localStep = missingStep;
          localIsComplete = false;
        } else {
          // Profil complet
          console.log('[useOnboardingStatus] Profil complet, onboarding terminé.');
          localStep = 'OnboardingComplete';
          localIsComplete = true;
        }
      } else {
        console.warn('[useOnboardingStatus] Pas de data profile, fallback NameInput.');
        localStep = 'NameInput';
        localIsComplete = false;
      }
    } catch (e: unknown) {
      console.error('[useOnboardingStatus] Catch block error fetching profile status:', e);
      setError(e as Error);
      localStep = 'NameInput';
      localIsComplete = false;
    } finally {
      setLoading(false);
    }
    // Applique l'état final une seule fois
    setCurrentStep(localStep);
    setIsComplete(localIsComplete);
  }, [session]);

  useEffect(() => {
    // Le log initial du hook se fera ici, une fois par "montage" ou changement de session
    console.log(
      '[useOnboardingStatus] Hook instance running or session changed. session:',
      session
    );
    fetchProfileStatus();
  }, [fetchProfileStatus]); // fetchProfileStatus dépend de session

  return {
    currentStep,
    isComplete,
    loading,
    error,
    userId,
    refetch: fetchProfileStatus,
  };
}

// Ajoute une fonction utilitaire pour déterminer l'étape d'onboarding manquante
function getMissingOnboardingStep(profile: unknown): string | null {
  const p = profile as any;
  if (!p.full_name) return 'NameInput';
  if (!p.avatar_url) return 'AvatarPick';
  if (!p.contacts_permission_status || p.contacts_permission_status !== 'granted')
    return 'ContactsPermission';
  if (!p.location_permission_granted) return 'LocationPermission';
  if (!p.birth_date) return 'AgeInput';
  if (!p.path) return 'PathInput';
  if (!p.jam_track_id) return 'JamPicker';
  if (!p.selected_restaurant_id) return 'RestaurantPicker';
  if (!p.hobbies || !Array.isArray(p.hobbies) || p.hobbies.length === 0) return 'HobbyPicker';
  return null; // Tout est rempli
}
