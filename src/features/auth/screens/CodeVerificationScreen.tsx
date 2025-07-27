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
  ScrollView,
  Dimensions,
  AppState,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/shared/lib/supabase/client';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { checkOTPRateLimit, recordOTPRequest } from '@/shared/utils/phoneValidation';
import { recordFailedOTPAttempt, checkBanStatus } from '@/shared/utils/bruteforceProtection';
import BannedScreen from './BannedScreen';
import { OTPCache } from '@/shared/utils/otpCache';
import { NetworkRetry } from '@/shared/utils/networkRetry';
import { useNetworkQuality } from '@/shared/hooks/useNetworkQuality';
import { NetworkStatusBanner } from '@/shared/components/NetworkStatusBanner';
import { AdaptiveButton } from '@/shared/components/AdaptiveButton';
import { resilientFetch } from '@/shared/utils/api/retryStrategy';
import { useAdaptiveTimeout } from '@/shared/utils/api/adaptiveTimeout';
import { useTranslation } from 'react-i18next';

const { height: H } = Dimensions.get('window');
const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface CodeVerificationScreenProps {
  // Example prop, can be connected to route params
  phoneNumber?: string;
}

const CodeVerificationScreen: React.FC<CodeVerificationScreenProps> = React.memo(() => {
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('code-verification');
  const { isSlowConnection, isOffline } = useNetworkQuality();
  const { t } = useTranslation();
  const adaptiveTimeout = useAdaptiveTimeout(30000); // 30s base timeout
  const params = useLocalSearchParams<{ phoneNumber: string }>();
  // Ensure phone number is properly formatted (remove spaces, keep + sign)
  const phoneNumber = params.phoneNumber?.replace(/\s/g, '');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes timer for code expiry
  const [timerExpiry, setTimerExpiry] = useState<number>(Date.now() + 300000); // Store actual expiry timestamp
  const [resendCooldown, setResendCooldown] = useState(60); // 1 minute cooldown for resend
  const [resendTimerExpiry, setResendTimerExpiry] = useState<number>(Date.now() + 60000); // Resend timer expiry
  
  // If no phone number, redirect back
  useEffect(() => {
    if (!phoneNumber) {
      console.error('❌ [CodeVerificationScreen] No phone number provided');
      Alert.alert('Erreur', 'Numéro de téléphone manquant', [
        {
          text: 'Retour',
          onPress: () => navigateBack()
        }
      ]);
    }
  }, [phoneNumber, navigateBack]);
  const [canResend, setCanResend] = useState(false);
  const [banStatus, setBanStatus] = useState<any>(null);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);
  // Removed auto-save - step is saved when navigating forward from phone verification

  const handleBackPress = () => {
    navigateBack();
  };

  // Handle app state changes to maintain timer accuracy
  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - recalculate timers based on actual expiry times
        const now = Date.now();
        const codeRemaining = Math.max(0, Math.floor((timerExpiry - now) / 1000));
        const resendRemaining = Math.max(0, Math.floor((resendTimerExpiry - now) / 1000));
        
        setTimeRemaining(codeRemaining);
        setResendCooldown(resendRemaining);
        
        if (resendRemaining === 0) {
          setCanResend(true);
        }
        
        // Restart timer if code hasn't expired
        if (codeRemaining > 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          
          timerRef.current = setInterval(() => {
            const currentTime = Date.now();
            const codeTimeLeft = Math.max(0, Math.floor((timerExpiry - currentTime) / 1000));
            const resendTimeLeft = Math.max(0, Math.floor((resendTimerExpiry - currentTime) / 1000));
            
            setTimeRemaining(codeTimeLeft);
            setResendCooldown(resendTimeLeft);
            
            if (resendTimeLeft === 0 && !canResend) {
              setCanResend(true);
            }
            
            if (codeTimeLeft === 0) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
            }
          }, 1000);
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [timerExpiry, resendTimerExpiry, canResend]);

  useEffect(() => {
    console.log('🔐 [CodeVerificationScreen] Écran chargé');
    console.log('  - Numéro de téléphone:', phoneNumber);
    
    if (!phoneNumber) {
      console.error('❌ [CodeVerificationScreen] Aucun numéro de téléphone fourni');
      Alert.alert('Erreur', 'Numéro de téléphone manquant', [
        { text: 'Retour', onPress: () => navigateBack() }
      ]);
      return;
    }
    
    // Test de connexion Supabase
    testSupabaseConnection();
    
    // Check ban status first
    checkBanStatusOnMount();
    
    // Check rate limit status on mount
    checkRateLimitStatus();
    
    // Start countdown timer
    startTimer();
    
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phoneNumber, navigateBack]);

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

  const startTimer = () => {
    const codeExpiryTime = Date.now() + 300000; // 5 minutes for code expiry
    const resendExpiryTime = Date.now() + 60000; // 1 minute for resend cooldown
    
    setTimerExpiry(codeExpiryTime);
    setTimeRemaining(300); // 5 minutes
    setResendTimerExpiry(resendExpiryTime);
    setResendCooldown(60); // 1 minute
    setCanResend(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const codeRemaining = Math.max(0, Math.floor((codeExpiryTime - now) / 1000));
      const resendRemaining = Math.max(0, Math.floor((resendExpiryTime - now) / 1000));
      
      setTimeRemaining(codeRemaining);
      setResendCooldown(resendRemaining);
      
      // Enable resend button after 1 minute
      if (resendRemaining === 0 && !canResend) {
        setCanResend(true);
      }
      
      // Stop timer when code expires
      if (codeRemaining === 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }, 1000);
  };
  
  const checkRateLimitStatus = async () => {
    if (!phoneNumber) return;
    
    try {
      const rateLimit = await checkOTPRateLimit(phoneNumber);
      
      if (!rateLimit.canRequest && rateLimit.timeRemainingSeconds) {
        // Set resend timer to remaining time from rate limit
        const remainingTime = Math.min(rateLimit.timeRemainingSeconds, 60); // Max 1 minute for resend cooldown
        setResendCooldown(remainingTime);
        setCanResend(false);
        
        // Update resend timer expiry
        const newResendExpiryTime = Date.now() + (remainingTime * 1000);
        setResendTimerExpiry(newResendExpiryTime);
      }
    } catch (error) {
      console.error('❌ [CodeVerificationScreen] Erreur vérification rate limit:', error);
    }
  };
  
  const checkBanStatusOnMount = async () => {
    if (!phoneNumber) return;
    
    try {
      const ban = await checkBanStatus(phoneNumber);
      if (ban.isBanned) {
        setBanStatus(ban);
      }
    } catch (error) {
      console.error('❌ [CodeVerificationScreen] Erreur vérification ban:', error);
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
      // Check network first
      const network = await NetworkRetry.checkNetwork();
      if (!network.isConnected) {
        Alert.alert(
          'Mode hors ligne',
          'Vous devez être connecté à Internet pour vérifier le code.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
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
          // First check if profile exists, create if not
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (!profile) {
            // Create profile first
            await supabase
              .from('profiles')
              .insert([{ 
                id: user.id,
                current_registration_step: 'name_input',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
          } else {
            // Update existing profile
            await supabase
              .from('profiles')
              .update({ 
                current_registration_step: 'name_input',
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
          }
        }
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigateNext('name-input');
        setIsLoading(false);
        return;
      }
      
      // Vérifier l'OTP avec Supabase (production)
      console.log('📞 [CodeVerificationScreen] Tentative de vérification OTP:');
      console.log('  - Phone:', phoneNumber);
      console.log('  - Code:', codeToVerify);
      console.log('  - Type: sms');
      
      const { data, error } = await resilientFetch(
        () => supabase.auth.verifyOtp({
          phone: phoneNumber,
          token: codeToVerify,
          type: 'sms',
        }),
        {
          maxRetries: isSlowConnection ? 5 : 3,
          showAlert: false
        }
      );

      if (error) {
        console.error('❌ [CodeVerificationScreen] Erreur vérification OTP:', error);
        console.error('  - Error code:', error.code);
        console.error('  - Error message:', error.message);
        console.error('  - Error status:', (error as any).status);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        // Record failed attempt
        const banResult = await recordFailedOTPAttempt(phoneNumber);
        
        if (banResult.isBanned) {
          setBanStatus(banResult);
          setIsLoading(false);
          return;
        }
        
        let errorMessage = 'Le code entré est incorrect. Veuillez réessayer.';
        let actions = [{
          text: 'OK',
          onPress: () => {
            setCode('');
            inputRef.current?.focus();
          },
        }];
        
        // Handle token expiration specifically
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          // Check if it's a token format issue or actual expiration
          if (error.message?.includes('Token format')) {
            errorMessage = 'Le code entré est incorrect. Veuillez vérifier et réessayer.';
          } else {
            errorMessage = 'Le code a expiré ou est invalide. Veuillez demander un nouveau code.';
          }
          
          if (canResend) {
            actions = [
              {
                text: 'Annuler',
                onPress: () => {
                  setCode('');
                  inputRef.current?.focus();
                },
              },
              {
                text: 'Renvoyer le code',
                onPress: handleResendCode,
              },
            ];
          }
        }
        
        Alert.alert('Code invalide', errorMessage, actions);
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
        // First check if profile exists, create if not
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          // Create profile first
          await supabase
            .from('profiles')
            .insert([{ 
              id: user.id,
              current_registration_step: 'name_input',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
        } else {
          // Update existing profile
          await supabase
            .from('profiles')
            .update({ 
              current_registration_step: 'name_input',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
      }
      
      // Clear OTP cache on successful verification
      if (phoneNumber) {
        await OTPCache.clearCache(phoneNumber);
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

  const handleResendCode = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    setCode('');
    
    try {
      // Check network first
      const network = await NetworkRetry.checkNetwork();
      if (!network.isConnected) {
        Alert.alert(
          'Pas de connexion',
          'Vérifiez votre connexion internet et réessayez.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
      
      console.log('📱 [CodeVerificationScreen] Vérification rate limit pour:', phoneNumber);
      
      // Check OTP cache
      const cacheStatus = await OTPCache.hasRecentOTP(phoneNumber);
      if (cacheStatus.hasRecent && !cacheStatus.canResend) {
        Alert.alert(
          'Patientez',
          `Un code a déjà été envoyé. Réessayez dans ${cacheStatus.timeRemaining} secondes.`,
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
      
      // Check rate limit before resending
      const rateLimit = await checkOTPRateLimit(phoneNumber);
      
      if (!rateLimit.canRequest) {
        const secondsRemaining = rateLimit.timeRemainingSeconds || 60;
        const displayTime = secondsRemaining > 60 
          ? `${Math.ceil(secondsRemaining / 60)} minute${Math.ceil(secondsRemaining / 60) > 1 ? 's' : ''}`
          : `${secondsRemaining} secondes`;
        
        Alert.alert(
          'Trop de demandes',
          `Veuillez attendre ${displayTime} avant de demander un nouveau code.`,
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
      
      // Record the new OTP request
      const recordResult = await recordOTPRequest(phoneNumber);
      
      if (!recordResult.success) {
        Alert.alert('Erreur', recordResult.message);
        setIsLoading(false);
        return;
      }
      
      console.log('📱 [CodeVerificationScreen] Renvoi OTP à:', phoneNumber);
      
      // Use NetworkRetry for resilient sending
      try {
        await NetworkRetry.withRetry(
          async () => {
            const { error } = await supabase.auth.signInWithOtp({
              phone: phoneNumber,
            });
            
            if (error) {
              throw error;
            }
          },
          {
            maxRetries: 2,
            initialDelay: 1000
          }
        );
        
        // Record in cache
        await OTPCache.recordOTPSent(phoneNumber);
        
        console.log('✅ [CodeVerificationScreen] OTP renvoyé avec succès');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Reset resend timer only (not the code expiry timer)
        const newResendExpiryTime = Date.now() + 60000; // 1 minute cooldown
        setResendTimerExpiry(newResendExpiryTime);
        setResendCooldown(60);
        setCanResend(false);
        
        Alert.alert('Code renvoyé', 'Un nouveau code de vérification a été envoyé.', [
          { text: 'OK' },
        ]);
        
      } catch (error: any) {
        console.error('❌ [CodeVerificationScreen] Erreur renvoi OTP:', error);
        
        if (error.message?.includes('Network') || error.message?.includes('timeout')) {
          Alert.alert(
            'Problème de connexion',
            'Vérifiez votre connexion internet et réessayez.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Erreur', error.message || 'Impossible de renvoyer le code.');
        }
      }
    } catch (error) {
      console.error('❌ [CodeVerificationScreen] Erreur inattendue:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show banned screen if banned
  if (banStatus && banStatus.isBanned) {
    return <BannedScreen banStatus={banStatus} />;
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <NetworkStatusBanner />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.container}>
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
              {timeRemaining > 0 && (
                <Text style={styles.timerText}>
                  Code expire dans {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </Text>
              )}
              {timeRemaining === 0 && (
                <Text style={styles.expiredText}>
                  Code expiré - Veuillez renvoyer un nouveau code
                </Text>
              )}

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
              <AdaptiveButton
                onPress={handleContinue}
                title="Continue"
                loading={isLoading}
                disabled={!code || code.length !== 6}
                style={styles.continueButton}
                textStyle={styles.continueButtonText}
                showRetryState={true}
              />
              <TouchableOpacity
                style={[styles.resendButton, !canResend && styles.resendButtonDisabled]}
                onPress={handleResendCode}
                disabled={!canResend || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Resend code"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.resendButtonText, !canResend && styles.resendButtonTextDisabled]}>
                  {canResend ? 'Renvoyer le code' : `Renvoyer dans ${resendCooldown}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
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
    alignItems: 'center',
    paddingTop: perfectSize(20),
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
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: perfectSize(30),
    marginBottom: perfectSize(30),
    minHeight: perfectSize(200),
  },
  illustration: {
    width: perfectSize(220),
    height: perfectSize(220),
    maxHeight: H * 0.25,
  },
  footer: {
    marginTop: perfectSize(20),
    paddingBottom: perfectSize(34),
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: perfectSize(14),
    height: perfectSize(56),
    minHeight: 56,
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
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonTextDisabled: {
    color: '#8E8E93',
  },
  timerText: {
    fontSize: perfectSize(14),
    color: '#8E8E93',
    marginTop: perfectSize(8),
    textAlign: 'center',
  },
  expiredText: {
    fontSize: perfectSize(14),
    color: '#FF3B30',
    marginTop: perfectSize(8),
    textAlign: 'center',
  },
});

export default CodeVerificationScreen;
