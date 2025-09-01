import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useProfile } from '@/hooks/useProfile';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const AvatarPickScreen: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('avatar-pick');
  const { updateProfile } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Save registration step
  useRegistrationStep('avatar_pick');

  const handleBackPress = () => {
    navigateBack();
  };

  const handleSnapPicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery permission is required to select a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (selectedImage) {
      setIsUploading(true);
      try {
        // TODO: Upload image to Supabase storage and get URL
        // For now, we'll just save a placeholder
        await updateProfile({
          avatar_url: selectedImage,
        });

        navigateNext('contacts-permission');
      } catch (error) {
        console.error('Error saving avatar:', error);
        Alert.alert('Error', 'Failed to save avatar. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else {
      navigateNext('location-permission');
    }
  };

  const handleSkip = () => {
    navigateNext('contacts-permission');
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
        accessibilityLabel="Time to add a face to the name"
      >
        Time to add a face to <Text style={styles.titleItalic}>the name</Text>
      </Text>
      <Text style={styles.subtitle} accessibilityRole="text">
        Show your vibe. Pick a photo that{'\n'}feels like you.
      </Text>

      {/* Illustration */}
      <View
        style={styles.illustrationContainer}
        accessible
        accessibilityLabel="Avatar illustration"
      >
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.selectedAvatar} resizeMode="cover" />
        ) : (
          <Image
            source={require('@/assets/images/register/avatar.png')}
            style={styles.illustration}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsWrapper}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSnapPicture}
          accessibilityRole="button"
          accessibilityLabel="Snap a picture"
          activeOpacity={0.8}
        >
          <View style={styles.actionIconWrapper}>
            <Icon name="camera-outline" size={perfectSize(22)} color="#000" />
          </View>
          <Text style={styles.actionText}>Snap a picture</Text>
          <Icon
            name="chevron-forward"
            size={perfectSize(20)}
            color="#C7C7CC"
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handlePickGallery}
          accessibilityRole="button"
          accessibilityLabel="Grab one from your gallery"
          activeOpacity={0.8}
        >
          <View style={styles.actionIconWrapper}>
            <Icon name="images-outline" size={perfectSize(22)} color="#000" />
          </View>
          <Text style={styles.actionText}>Grab one from your gallery</Text>
          <Icon
            name="chevron-forward"
            size={perfectSize(20)}
            color="#C7C7CC"
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, isUploading && { opacity: 0.4 }]}
        onPress={handleContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        activeOpacity={0.8}
        disabled={isUploading}
      >
        <Text style={styles.continueButtonText}>{isUploading ? 'Uploading...' : 'Continue'}</Text>
      </TouchableOpacity>

      {/* Skip For Now */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip For Now"
        activeOpacity={0.8}
        disabled={isUploading}
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
    marginLeft: perfectSize(0),
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
    marginBottom: perfectSize(24),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(8),
  },
  illustration: {
    width: perfectSize(280),
    height: perfectSize(180),
  },
  selectedAvatar: {
    width: perfectSize(160),
    height: perfectSize(160),
    borderRadius: perfectSize(80),
    borderWidth: 3,
    borderColor: '#016fff',
  },
  actionButtonsWrapper: {
    width: '100%',
    marginBottom: perfectSize(16),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: perfectSize(56),
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: perfectSize(12),
    backgroundColor: '#fff',
    marginBottom: perfectSize(12),
    paddingHorizontal: perfectSize(16),
  },
  actionIconWrapper: {
    width: perfectSize(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: perfectSize(17),
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginLeft: perfectSize(8),
  },
  chevronIcon: {
    marginLeft: perfectSize(8),
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

export default AvatarPickScreen;
