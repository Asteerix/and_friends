import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'react-native-pixel-perfect';
import * as Contacts from 'expo-contacts';
import { useProfile } from '@/hooks/useProfile';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const ContactsPermissionScreen: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('contacts-permission');
  const { updateProfile } = useProfile();
  const [isRequesting, setIsRequesting] = React.useState(false);

  // Save registration step
  useRegistrationStep('contacts_permission');

  const handleBackPress = () => {
    navigateBack();
  };

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status === 'granted') {
        await updateProfile({
          contacts_permission_status: 'granted',
        });
        navigateNext('location-permission');
      } else {
        Alert.alert(
          'Permission Denied',
          'You can enable contacts access later in your device settings.',
          [
            {
              text: 'Continue',
              onPress: () => navigateNext('location-permission'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    navigateNext('location-permission');
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
        </View>
      </View>

      {/* Title & Subtitle */}
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLabel="Help us find your people"
      >
        Help us find your <Text style={styles.titleItalic}>people</Text>
      </Text>
      <Text style={styles.subtitle} accessibilityRole="text">
        Connect with friends already on the app.{'\n'}We'll notify you when they join.
      </Text>

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Image
          source={require('@/assets/images/register/contacts.png')}
          style={styles.illustration}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, isRequesting && { opacity: 0.4 }]}
        onPress={handleAllow}
        accessibilityRole="button"
        accessibilityLabel="Allow Contacts"
        activeOpacity={0.8}
        disabled={isRequesting}
      >
        <Text style={styles.continueButtonText}>
          {isRequesting ? 'Requesting...' : 'Allow Contacts'}
        </Text>
      </TouchableOpacity>

      {/* Skip For Now */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip For Now"
        activeOpacity={0.8}
        disabled={isRequesting}
      >
        <Text style={styles.skipButtonText}>Skip For Now</Text>
      </TouchableOpacity>
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

export default ContactsPermissionScreen;
