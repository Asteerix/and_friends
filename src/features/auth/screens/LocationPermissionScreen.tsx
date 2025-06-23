import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, View } from 'react-native';

import { supabase } from '@/shared/lib/supabase/client';
import { getDeviceLanguage, t } from '@/shared/locales';
import ScreenLayout from '@/shared/ui/ScreenLayout';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

// LocationPermissionScreen.tsx
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const { height: H } = Dimensions.get('window');
const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey3: '#555555',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const LocationPermissionScreen: React.FC = () => {
  const router = useRouter();
  const lang = getDeviceLanguage();
  // const { currentStep, loading: onboardingLoading } = useOnboardingStatus(); // Removed to prevent auto-redirects
  const { navigateBack, getProgress } = useAuthNavigation('location-permission');
  const [isLoading, setIsLoading] = useState(false);

  // Save registration step
  useRegistrationStep('location_permission');

  // Removed auto-redirect logic to prevent navigation conflicts
  // User should control navigation flow manually

  // Remove auto-skip to prevent navigation loops
  // Users should explicitly click continue even if permission was already granted

  const updateUserProfileWithPermission = async (permissionGranted: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.id) {
      console.error('User not found for updating location permission.');
      Alert.alert(t('error_session_expired_title', lang), t('error_session_expired_message', lang));
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          location_permission_granted: permissionGranted,
          current_registration_step: 'location_permission',
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile with location permission:', error);
        Alert.alert(t('error_saving_profile', lang), error.message);
        return false;
      }
      return true;
    } catch (e: unknown) {
      console.error('Unexpected error updating profile:', e);
      Alert.alert(t('unexpected_error', lang), e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionRequest = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('[LocationPermissionScreen] Permission requested, status:', status);
    const permissionGranted = status === Location.PermissionStatus.GRANTED;
    await updateUserProfileWithPermission(permissionGranted);

    // Always navigate to next screen, even if permission denied
    void router.push('/age-input');
    setIsLoading(false);
  };

  const handleSkip = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // Si l'utilisateur saute, on enregistre que la permission n'a pas été accordée (false).
    const profileUpdated = await updateUserProfileWithPermission(false);
    if (profileUpdated) {
      void router.push('/age-input');
    } else {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    navigateBack();
  };

  return (
    <ScreenLayout
      title={t('location_permission_title', lang)}
      subtitle={t('location_permission_subtitle', lang)}
      progress={getProgress()}
      onContinue={handlePermissionRequest}
      continueButtonText={t('location_permission_button_allow', lang)} // Ex: "Enable Location"
      continueDisabled={isLoading}
      showAltLink={true}
      altLinkText={t('skip_for_now', lang)} // Ex: "Skip for now"
      onAltLinkPress={handleSkip}
      onBackPress={handleBackPress}
      // isLoading prop retirée si ScreenLayout ne la supporte pas
    >
      <View style={styles.contentContainer}>
        <Image
          source={require('@/assets/images/register/location-illustration.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
        {isLoading && (
          <ActivityIndicator size="large" color={COLORS.black} style={styles.loadingIndicator} />
        )}
      </View>
    </ScreenLayout>
  );
};

export default LocationPermissionScreen;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 0,
    justifyContent: 'center',
    paddingTop: 20,
  },
  illustration: {
    width: '85%',
    height: H * 0.35,
    alignSelf: 'center',
    marginBottom: 20,
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

/*
TODO:
1. Assurez-vous que la table `profiles`
*/
