import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/shared/lib/supabase/client';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface CodeVerificationScreenProps {
  // Example prop, can be connected to route params
  phoneNumber?: string;
}

const CodeVerificationScreen: React.FC<CodeVerificationScreenProps> = React.memo(() => {
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('code-verification');
  const params = useLocalSearchParams<{ phoneNumber: string }>();
  const phoneNumber = params.phoneNumber || '+33633954893';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  // Removed auto-save - step is saved when navigating forward from phone verification

  const handleBackPress = () => {
    navigateBack();
  };

  useEffect(() => {
    console.log('🔐 [CodeVerificationScreen] Écran chargé');
    console.log('  - Numéro de téléphone:', phoneNumber);
    
    // Test de connexion Supabase
    testSupabaseConnection();
  }, [phoneNumber]);

  const testSupabaseConnection = async () => {
    console.log('🧪 [CodeVerificationScreen] Test de connexion Supabase...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ [CodeVerificationScreen] Erreur Supabase:', error);
      } else {
        console.log('✅ [CodeVerificationScreen] Connexion Supabase OK');
        console.log('  - Session existante:', !!session);
        if (session) {
          console.log('  - User ID:', session.user.id);
        }
      }
    } catch (error) {
      console.error('❌ [CodeVerificationScreen] Erreur test connexion:', error);
    }
  };

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleCodeChange = async (newCode: string) => {
    setCode(newCode);

    // Auto-verify when 6 digits are entered
    if (newCode.length === 6) {
      await verifyCode(newCode);
    }
  };

  const verifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) return;

    setIsLoading(true);
    console.log('🔍 [CodeVerificationScreen] Vérification du code:', codeToVerify);

    try {
      console.log('🔍 [CodeVerificationScreen] Vérification OTP avec Supabase...');
      
      // Mode test pour le développement (numéro spécifique + code 123456)
      if (phoneNumber === '+33612345678' && codeToVerify === '123456') {
        console.log('🧪 [CodeVerificationScreen] Mode test activé - Création session de test');
        
        // Créer une session de test avec un email unique
        const testEmail = `test_${Date.now()}@testapp.local`;
        const testPassword = 'TestPassword123!';
        
        const { error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            data: {
              phone: phoneNumber,
              is_test_account: true
            }
          }
        });

        if (signUpError && signUpError.message !== 'User already registered') {
          throw signUpError;
        }

        console.log('✅ [CodeVerificationScreen] Session de test créée');
        
        // Save next step before navigating
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ 
              current_registration_step: 'name_input',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigateNext('name-input');
        setIsLoading(false);
        return;
      }
      
      // Vérifier l'OTP avec Supabase (production)
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: codeToVerify,
        type: 'sms',
      });

      if (error) {
        console.error('❌ [CodeVerificationScreen] Erreur vérification OTP:', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Code invalide', error.message || 'Le code entré est incorrect. Veuillez réessayer.', [
          {
            text: 'OK',
            onPress: () => {
              setCode('');
              inputRef.current?.focus();
            },
          },
        ]);
        setIsLoading(false);
        return;
      }

      console.log('✅ [CodeVerificationScreen] OTP vérifié avec succès!');
      console.log('  - User ID:', data.user?.id);
      console.log('  - Session:', !!data.session);

      // Attendre un peu pour que le SessionContext se mette à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Vérifier que la session est bien là
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📍 [CodeVerificationScreen] Session après vérification:', !!session);
      if (session) {
        console.log('  - User ID confirmé:', session.user.id);
      }
      
      // Save next step before navigating
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ 
            current_registration_step: 'name_input',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigateNext('name-input');
    } catch (error) {
      console.error('❌ [CodeVerificationScreen] Erreur inattendue:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite. Veuillez réessayer.', [
        {
          text: 'OK',
          onPress: () => {
            setCode('');
            inputRef.current?.focus();
          },
        },
      ]);
    }
    
    setIsLoading(false);
  };

  const handleContinue = async () => {
    await verifyCode(code);
  };

  const handleResendCode = () => {
    Alert.alert('Code Resent', 'A new verification code has been sent to your phone.', [
      { text: 'OK' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} accessibilityLabel="Go back">
            <Feather name="arrow-left" size={perfectSize(24)} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${getProgress() * 100}%` }]} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            And we are <Text style={styles.titleItalic}>almost there</Text>
          </Text>
          <Text style={styles.subtitle}>Enter the 6-digit code below sent to {phoneNumber}.</Text>

          <TouchableOpacity
            style={styles.codeContainer}
            onPress={handlePress}
            activeOpacity={1}
            accessibilityLabel="Enter 6-digit code"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={index} style={styles.codeBox}>
                <Text style={styles.codeText}>{code[index] || '-'}</Text>
              </View>
            ))}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              caretHidden
              textContentType="oneTimeCode"
              autoFocus
            />
          </TouchableOpacity>

          <View style={styles.imageContainer}>
            <Image
              source={require('@/assets/images/register/code-verification.png')}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!code || code.length !== 6 || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!code || code.length !== 6 || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
          >
            <Text style={styles.resendButtonText}>Resend Code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: perfectSize(24),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: perfectSize(20),
    paddingBottom: perfectSize(20),
  },
  progressBar: {
    flex: 1,
    height: perfectSize(4),
    backgroundColor: '#E0E0E0',
    borderRadius: perfectSize(2),
    marginLeft: perfectSize(16),
  },
  progress: {
    width: '100%',
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: perfectSize(2),
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: perfectSize(34),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#000000',
    textAlign: 'center',
    lineHeight: perfectSize(41),
  },
  titleItalic: {
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : 'serif',
  },
  subtitle: {
    fontSize: perfectSize(16),
    color: '#3C3C43',
    textAlign: 'center',
    marginTop: perfectSize(12),
    lineHeight: perfectSize(22),
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: perfectSize(32),
    width: '100%',
    paddingHorizontal: perfectSize(4),
  },
  codeBox: {
    width: perfectSize(48),
    height: perfectSize(48),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: perfectSize(8),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  codeText: {
    fontSize: perfectSize(24),
    color: '#000000',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  illustration: {
    width: perfectSize(250),
    height: perfectSize(250),
  },
  footer: {
    paddingBottom: perfectSize(34),
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: perfectSize(14),
    height: perfectSize(56),
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: perfectSize(17),
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resendButton: {
    marginTop: perfectSize(24),
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: perfectSize(16),
  },
});

export default CodeVerificationScreen;
