import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/shared/lib/supabase/client';

// Map registration steps to routes
const STEP_TO_ROUTE: Record<string, string> = {
  phone_verification: '/(auth)/phone-verification',
  code_verification: '/(auth)/code-verification',
  name_input: '/(auth)/name-input',
  avatar_pick: '/(auth)/avatar-pick',
  contacts_permission: '/(auth)/contacts-permission',
  location_permission: '/(auth)/location-permission',
  age_input: '/(auth)/age-input',
  path_input: '/(auth)/path-input',
  jam_picker: '/(auth)/jam-picker',
  restaurant_picker: '/(auth)/restaurant-picker',
  hobby_picker: '/(auth)/hobby-picker',
  completed: '/(tabs)/home',
};

export const useRegistrationProgress = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  useEffect(() => {
    checkRegistrationProgress();
  }, []);

  const checkRegistrationProgress = async () => {
    try {
      console.log('🔍 [useRegistrationProgress] Checking registration progress...');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log(
          '❌ [useRegistrationProgress] No user found, redirecting to phone verification'
        );
        setIsLoading(false);
        router.replace('/(auth)/phone-verification');
        return;
      }

      console.log('👤 [useRegistrationProgress] User found:', user.id);

      // Get user profile to check registration progress
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('current_registration_step')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        console.log(
          '❌ [useRegistrationProgress] No profile found, redirecting to phone verification'
        );
        setIsLoading(false);
        router.replace('/(auth)/phone-verification');
        return;
      }

      const step = profile.current_registration_step;
      console.log('📍 [useRegistrationProgress] Current registration step:', step);
      setCurrentStep(step);

      // If no step or null, don't redirect (user is starting fresh)
      if (!step) {
        console.log('✅ [useRegistrationProgress] No step set, user starting fresh');
        setIsLoading(false);
        return;
      }

      // Navigate to the appropriate screen based on progress
      const route = STEP_TO_ROUTE[step];
      console.log('🚀 [useRegistrationProgress] Redirecting to:', route);
      if (route) {
        router.replace(route);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ [useRegistrationProgress] Error:', error);
      setIsLoading(false);
      router.replace('/(auth)/phone-verification');
    }
  };

  return { isLoading, currentStep };
};
