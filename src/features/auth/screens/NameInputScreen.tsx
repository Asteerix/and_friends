import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Image,
  AccessibilityRole,
  Alert,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/shared/lib/supabase/client';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface NameInputScreenProps {}

const NameInputScreen: React.FC<NameInputScreenProps> = React.memo(() => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [handle, setHandle] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [handleError, setHandleError] = useState('');
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [handleTaken, setHandleTaken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  const lastNameInputRef = useRef<TextInput>(null);
  const handleInputRef = useRef<TextInput>(null);
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('name-input');
  const { updateProfile } = useProfile();

  // Save registration step
  useRegistrationStep('name_input');

  const handleBackPress = () => {
    navigateBack();
  };

  // Check for handle uniqueness in Supabase
  const checkHandleUnique = async (h: string) => {
    setCheckingHandle(true);
    setHandleTaken(false);
    
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHandleError('User not authenticated.');
        setCheckingHandle(false);
        return false;
      }

      // Check if username exists for OTHER users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', h.trim())
        .neq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Erreur lors de la vérification du handle:', error);
        setHandleError('Erreur lors de la vérification.');
        setCheckingHandle(false);
        return false;
      }
      
      if (data) {
        setHandleTaken(true);
        setHandleError('This handle is already taken.');
        setCheckingHandle(false);
        return false;
      }
      
      setHandleTaken(false);
      setHandleError('');
      setCheckingHandle(false);
      return true;
    } catch (error) {
      console.error('Erreur inattendue:', error);
      setHandleError('Erreur de connexion.');
      setCheckingHandle(false);
      return false;
    }
  };

  // Simple validation for demo
  const validateFirstName = (name: string) => {
    if (!name.trim()) {
      setFirstNameError('First name is required.');
      return false;
    }
    setFirstNameError('');
    return true;
  };
  
  const validateLastName = (name: string) => {
    if (!name.trim()) {
      setLastNameError('Last name is required.');
      return false;
    }
    setLastNameError('');
    return true;
  };
  const validateHandle = async (h: string) => {
    if (!h.trim()) {
      setHandleError('Handle is required.');
      setHandleTaken(false);
      return false;
    }
    const unique = await checkHandleUnique(h);
    return unique;
  };

  const canContinue =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!handle.trim() &&
    !firstNameError &&
    !lastNameError &&
    !handleError &&
    !handleTaken &&
    !checkingHandle &&
    !isSubmitting;

  const onContinue = async () => {
    const validFirstName = validateFirstName(firstName);
    const validLastName = validateLastName(lastName);
    const validHandle = await validateHandle(handle);
    if (validFirstName && validLastName && validHandle) {
      setIsSubmitting(true);
      
      try {
        // Sauvegarder les données dans le profil
        const { error } = await updateProfile({
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          username: handle.trim(),
        });

        if (error) {
          console.error('Erreur lors de la mise à jour du profil:', error);
          Alert.alert('Erreur', 'Impossible de sauvegarder vos informations. Veuillez réessayer.');
          setIsSubmitting(false);
          return;
        }

        // Navigate to the next screen in the auth flow
        navigateNext('avatar-pick');
      } catch (error) {
        console.error('Erreur inattendue:', error);
        Alert.alert('Erreur', 'Une erreur inattendue s\'est produite.');
        setIsSubmitting(false);
      }
    }
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
        accessibilityLabel="What should we call you?"
      >
        What should we call <Text style={styles.titleItalic}>you?</Text>
      </Text>
      <Text style={styles.subtitle} accessibilityRole="text">
        Tell us your name and pick a{'\n'}nickname friends can find you with.
      </Text>

      {/* Inputs */}
      <KeyboardAvoidingView
        style={styles.inputsContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={perfectSize(40)}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, firstNameError ? styles.inputError : undefined]}
            placeholder="Enter your first name"
            placeholderTextColor="#AEB0B4"
            value={firstName}
            onChangeText={setFirstName}
            onBlur={() => validateFirstName(firstName)}
            returnKeyType="next"
            autoCapitalize="words"
            accessible
            accessibilityLabel="First name"
            accessibilityRole="text"
            onSubmitEditing={() => lastNameInputRef.current?.focus()}
          />
          {!!firstNameError && <Text style={styles.errorText}>{firstNameError}</Text>}
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={lastNameInputRef}
            style={[styles.input, lastNameError ? styles.inputError : undefined]}
            placeholder="Enter your last name"
            placeholderTextColor="#AEB0B4"
            value={lastName}
            onChangeText={setLastName}
            onBlur={() => validateLastName(lastName)}
            returnKeyType="next"
            autoCapitalize="words"
            accessible
            accessibilityLabel="Last name"
            accessibilityRole="text"
            onSubmitEditing={() => handleInputRef.current?.focus()}
          />
          {!!lastNameError && <Text style={styles.errorText}>{lastNameError}</Text>}
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={handleInputRef}
            style={[styles.input, handleError ? styles.inputError : undefined]}
            placeholder="Create a handle (e.g., @ana_eremina_)"
            placeholderTextColor="#AEB0B4"
            value={handle}
            onChangeText={async (text) => {
              setHandle(text);
              setHandleError('');
              setHandleTaken(false);
              if (text.trim()) {
                await validateHandle(text);
              }
            }}
            onBlur={async () => {
              if (handle.trim()) {
                await validateHandle(handle);
              }
            }}
            returnKeyType="done"
            autoCapitalize="none"
            accessible
            accessibilityLabel="Handle"
            accessibilityRole="text"
          />
          {!!handleError && <Text style={styles.errorText}>{handleError}</Text>}
        </View>
      </KeyboardAvoidingView>

      {/* Illustration */}
      <View
        style={styles.illustrationContainer}
        accessible
        accessibilityLabel="Friends cheers illustration"
      >
        <Image
          source={require('@/assets/images/register/name.png')}
          style={styles.illustration}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !canContinue && { opacity: 0.4 }]}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        activeOpacity={0.8}
        disabled={!canContinue}
      >
        <Text style={styles.continueButtonText}>
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Text>
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
  inputsContainer: {
    width: '100%',
    marginBottom: perfectSize(16),
  },
  inputWrapper: {
    marginBottom: perfectSize(12),
  },
  input: {
    height: perfectSize(56),
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: perfectSize(12),
    paddingHorizontal: perfectSize(16),
    fontSize: perfectSize(17),
    color: '#000',
    backgroundColor: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: perfectSize(12),
    marginTop: perfectSize(4),
    paddingLeft: perfectSize(4),
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
});

export default NameInputScreen;
