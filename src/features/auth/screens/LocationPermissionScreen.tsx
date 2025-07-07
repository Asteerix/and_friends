import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'react-native-pixel-perfect';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '@/shared/lib/supabase/client';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const illustration = require('@/assets/images/register/localisation.png');

const LocationPermissionScreen: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('location-permission');
  useRegistrationStep('location_permission');
  const [isLoading, setIsLoading] = useState(false);

  const handleAllow = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    const permissionGranted = status === Location.PermissionStatus.GRANTED;
    await supabase
      .from('profiles')
      .update({
        location_permission_granted: permissionGranted,
        current_registration_step: 'age_input',
      })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);
    navigateNext('age-input');
    setIsLoading(false);
  };

  const handleSkip = async () => {
    if (isLoading) return;
    setIsLoading(true);
    await supabase
      .from('profiles')
      .update({
        location_permission_granted: false,
        current_registration_step: 'age_input',
      })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);
    navigateNext('age-input');
    setIsLoading(false);
  };

  const handleBack = () => {
    navigateBack();
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
        </View>
      </View>

      {/* Title & Subtitle */}
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLabel="See what's happening nearby"
      >
        See what's happening <Text style={styles.titleItalic}>nearby</Text>
      </Text>
      <Text
        style={styles.subtitle}
        accessibilityLabel="To show nearby events, we need your location — nothing sneaky."
      >
        To show nearby events, we{`\n`}need your location — nothing sneaky.
      </Text>

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Image
          source={illustration}
          style={styles.illustration}
          resizeMode="contain"
          accessible
          accessibilityLabel="Person among green flowers illustration"
        />
      </View>

      {/* Buttons */}
      <Pressable
        style={({ pressed }) => [
          styles.continueButton,
          { opacity: pressed || isLoading ? 0.4 : 1 },
        ]}
        onPress={handleAllow}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Allow Location Access"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueButtonText}>Allow Location Access</Text>
        )}
      </Pressable>
      <Pressable
        onPress={handleSkip}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Skip For Now"
        style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={styles.skipButtonText}>Skip For Now</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: perfectSize(24),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(16),
  },
  backButton: {
    width: perfectSize(44),
    height: perfectSize(44),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: perfectSize(28),
    color: '#016fff',
  },
  progressTrack: {
    flex: 1,
    height: perfectSize(2),
    backgroundColor: '#E5E5E5',
    marginLeft: perfectSize(8),
    marginRight: perfectSize(8),
    borderRadius: perfectSize(1),
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#016fff',
    borderRadius: perfectSize(1),
  },
  title: {
    marginTop: perfectSize(16),
    fontSize: perfectSize(34),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#000',
    textAlign: 'center',
    lineHeight: perfectSize(41),
    letterSpacing: 0.34,
    fontWeight: '400',
  },
  titleItalic: {
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : 'serif',
  },
  subtitle: {
    marginTop: perfectSize(16),
    fontSize: perfectSize(16),
    color: '#555555',
    textAlign: 'center',
    lineHeight: perfectSize(22),
    marginBottom: perfectSize(40),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
  },
  illustrationContainer: {
    flex: 1,
    marginRight: -perfectSize(24), // Étend jusqu'au bord droit
    justifyContent: 'center',
    alignItems: 'flex-end', // Aligne l'image à droite
  },
  illustration: {
    width: '90%', // Ajustez selon vos besoins
    height: '100%',
  },
  continueButton: {
    height: perfectSize(60),
    backgroundColor: '#016fff',
    borderRadius: perfectSize(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: perfectSize(16),
  },
  continueButtonText: {
    color: '#fff',
    fontSize: perfectSize(20),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: perfectSize(-8),
    paddingVertical: perfectSize(8),
    marginBottom: perfectSize(16),
  },
  skipButtonText: {
    color: '#016fff',
    fontSize: perfectSize(16),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
  },
});

export default LocationPermissionScreen;

/*
TODO:
1. Assurez-vous que la table `profiles`
*/
