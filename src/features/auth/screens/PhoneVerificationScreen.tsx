import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabase/client';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import {
  validatePhoneNumber,
  checkOTPRateLimit,
  recordOTPRequest,
} from '@/shared/utils/phoneValidation';
import { checkBanStatus } from '@/shared/utils/bruteforceProtection';
import { storeLastPhoneNumber } from '@/shared/hooks/useBanProtection';
import {
  sendOTPWithRetry,
  validatePhoneNumber as validatePhone,
  showSMSTroubleshootingDialog,
} from '@/shared/utils/otpHelpers';
import { OTPCache } from '@/shared/utils/otpCache';
import { NetworkRetry } from '@/shared/utils/networkRetry';
import { useNetworkQuality } from '@/shared/hooks/useNetworkQuality';
import { NetworkStatusBanner } from '@/shared/components/NetworkStatusBanner';
import { AdaptiveButton } from '@/shared/components/AdaptiveButton';
import { resilientFetch } from '@/shared/utils/api/retryStrategy';
import { OTPOfflineQueue } from '@/shared/utils/otpOfflineQueue';

const { height: H } = Dimensions.get('window');
const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface Country {
  name: string;
  flag: string;
  code: string;
  callingCode: string;
  placeholder: string;
}

const COMMON_COUNTRIES: Country[] = [
  {
    name: 'United States',
    flag: '🇺🇸',
    code: 'US',
    callingCode: '1',
    placeholder: '(201) 555-0123',
  },
  { name: 'France', flag: '🇫🇷', code: 'FR', callingCode: '33', placeholder: '6 12 34 56 78' },
  { name: 'United Kingdom', flag: '🇬🇧', code: 'GB', callingCode: '44', placeholder: '7400 123456' },
  { name: 'Spain', flag: '🇪🇸', code: 'ES', callingCode: '34', placeholder: '612 34 56 78' },
  { name: 'Germany', flag: '🇩🇪', code: 'DE', callingCode: '49', placeholder: '151 12345678' },
  { name: 'Canada', flag: '🇨🇦', code: 'CA', callingCode: '1', placeholder: '(416) 555-0123' },
  { name: 'Italy', flag: '🇮🇹', code: 'IT', callingCode: '39', placeholder: '312 345 6789' },
  { name: 'Brazil', flag: '🇧🇷', code: 'BR', callingCode: '55', placeholder: '(11) 98765-4321' },
  { name: 'Mexico', flag: '🇲🇽', code: 'MX', callingCode: '52', placeholder: '55 1234 5678' },
  { name: 'Japan', flag: '🇯🇵', code: 'JP', callingCode: '81', placeholder: '90-1234-5678' },
  { name: 'China', flag: '🇨🇳', code: 'CN', callingCode: '86', placeholder: '138 0000 0000' },
  { name: 'India', flag: '🇮🇳', code: 'IN', callingCode: '91', placeholder: '98765 43210' },
  { name: 'Australia', flag: '🇦🇺', code: 'AU', callingCode: '61', placeholder: '412 345 678' },
  { name: 'Netherlands', flag: '🇳🇱', code: 'NL', callingCode: '31', placeholder: '6 12345678' },
  { name: 'Switzerland', flag: '🇨🇭', code: 'CH', callingCode: '41', placeholder: '79 123 45 67' },
];

interface PhoneVerificationScreenProps {}

const PhoneVerificationScreen: React.FC<PhoneVerificationScreenProps> = React.memo(() => {
  const { navigateNext, getProgress } = useAuthNavigation('phone-verification');
  const { isSlowConnection, isOffline } = useNetworkQuality();
  const { t, i18n } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COMMON_COUNTRIES[i18n.language === 'fr' ? 1 : 0] || {
      // France for French, US for English
      name: i18n.language === 'fr' ? 'France' : 'United States',
      flag: i18n.language === 'fr' ? '🇫🇷' : '🇺🇸',
      code: i18n.language === 'fr' ? 'FR' : 'US',
      callingCode: i18n.language === 'fr' ? '33' : '1',
      placeholder: i18n.language === 'fr' ? '6 12 34 56 78' : '(201) 555-0123',
    }
  );

  // Sign out when reaching this screen (user went back to start)
  useEffect(() => {
    const resetUser = async () => {
      try {
        console.log('🔄 [PhoneVerification] User went back to start - signing out');

        // Sign out to completely reset the session
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error('❌ [PhoneVerification] Error signing out:', error);
        } else {
          console.log('✅ [PhoneVerification] User signed out successfully');
        }

        // Clean up OTP cache
        await OTPCache.cleanup();

        // Process any offline OTP requests if we're back online
        if (!isOffline) {
          await OTPOfflineQueue.processQueue(async (phone) => {
            const result = await sendOTPWithRetry({
              phone,
              channel: 'sms',
              createUser: true,
            });
            if (!result.success) {
              throw new Error(result.error || 'Failed to send OTP');
            }
          });
        }
      } catch (error) {
        console.error('❌ [PhoneVerification] Error in resetUser:', error);
      }
    };

    resetUser();
  }, [isOffline]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsCountryModalVisible(false);
    setPhoneNumber('');
  };

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert(t('errors.general'), t('errors.requiredField'));
      return;
    }

    setIsLoading(true);

    try {
      // Check network first
      const network = await NetworkRetry.checkNetwork();
      if (!network.isConnected) {
        // En mode offline, on met en queue la demande
        await OTPOfflineQueue.enqueue(phoneNumber);
        Alert.alert(
          t('network.offline'),
          t(
            'auth.phoneVerification.offlineMessage',
            'Your request will be processed once the connection is restored.'
          ),
          [{ text: t('common.ok') }]
        );
        setIsLoading(false);
        return;
      }
      // Validate phone number format with advanced checks
      const validation = validatePhoneNumber(phoneNumber, selectedCountry.code);

      if (!validation.isValid) {
        Alert.alert(t('errors.invalidPhone'), validation.error || t('errors.invalidPhone'));
        setIsLoading(false);
        return;
      }

      // Additional validation with risk assessment
      const advancedValidation = validatePhone(validation.formattedNumber!, selectedCountry.code);

      if (advancedValidation.riskWarning) {
        const shouldContinue = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('auth.phoneVerification.warning', 'Warning'),
            advancedValidation.riskWarning,
            [
              { text: t('common.cancel'), onPress: () => resolve(false) },
              { text: t('common.continue'), onPress: () => resolve(true) },
            ]
          );
        });

        if (!shouldContinue) {
          setIsLoading(false);
          return;
        }
      }

      const fullPhoneNumber = validation.formattedNumber!;
      console.log('📱 [PhoneVerification] Numéro validé:', fullPhoneNumber);

      // Check if phone number is banned
      const banStatus = await checkBanStatus(fullPhoneNumber);

      if (banStatus.isBanned) {
        // Store phone number for ban checking
        await storeLastPhoneNumber(fullPhoneNumber);

        // Navigate to banned screen
        navigateNext('banned');
        setIsLoading(false);
        return;
      }

      // Check rate limit before sending OTP
      const rateLimit = await checkOTPRateLimit(fullPhoneNumber);

      if (!rateLimit.canRequest) {
        const secondsRemaining = rateLimit.timeRemainingSeconds || 60;
        const displayTime =
          secondsRemaining > 60
            ? `${Math.ceil(secondsRemaining / 60)} minute${Math.ceil(secondsRemaining / 60) > 1 ? 's' : ''}`
            : `${secondsRemaining} secondes`;

        Alert.alert(
          t('auth.phoneVerification.tooManyAttempts'),
          t('auth.phoneVerification.waitBeforeRetry', { time: displayTime }),
          [{ text: t('common.ok') }]
        );
        setIsLoading(false);
        return;
      }

      // Record the OTP request for rate limiting
      const recordResult = await recordOTPRequest(fullPhoneNumber);

      if (!recordResult.success) {
        Alert.alert(t('errors.general'), recordResult.message);
        setIsLoading(false);
        return;
      }

      // Phone format is already validated above, no need to validate again

      // Envoyer l'OTP avec retry logic et cache
      console.log('📤 [PhoneVerification] Envoi OTP avec retry...');
      const result = await resilientFetch(
        () =>
          sendOTPWithRetry(
            {
              phone: fullPhoneNumber,
              channel: 'sms',
              createUser: true,
            },
            {
              maxRetries: isSlowConnection ? 5 : 3,
              retryDelay: isSlowConnection ? 3000 : 2000,
            }
          ),
        {
          showAlert: false, // We handle alerts ourselves
        }
      );

      if (result.cached) {
        // OTP was recently sent, skip to verification
        Alert.alert(
          t('auth.phoneVerification.codeSent'),
          t(
            'auth.phoneVerification.codeAlreadySent',
            'A code has already been sent to this number. Check your SMS.'
          ),
          [
            {
              text: t('common.continue'),
              onPress: () => navigateNext('code-verification', { phoneNumber: fullPhoneNumber }),
            },
          ]
        );
        setIsLoading(false);
        return;
      }

      if (!result.success && !result.cached) {
        console.error('❌ [PhoneVerification] Échec envoi OTP après retries');

        // Si c'est une erreur de quota, proposer le mode test
        if (result.error?.includes('quota') || result.error?.includes('indisponible')) {
          Alert.alert(
            t('auth.phoneVerification.serviceUnavailable', 'Service temporarily unavailable'),
            t(
              'auth.phoneVerification.serviceUnavailableMessage',
              'SMS service is temporarily unavailable. What would you like to do?'
            ),
            [
              {
                text: t('auth.phoneVerification.testMode', 'Test Mode'),
                onPress: () => {
                  Alert.alert(
                    t('auth.phoneVerification.testMode', 'Test Mode'),
                    t(
                      'auth.phoneVerification.testModeInstructions',
                      'Use:\nNumber: +33612345678\nCode: 123456'
                    ),
                    [
                      {
                        text: t('auth.phoneVerification.useTestMode', 'Use'),
                        onPress: async () => {
                          setPhoneNumber('612345678');
                          // Clear cache for test number
                          await OTPCache.clearCache('+33612345678');
                          navigateNext('code-verification', { phoneNumber: '+33612345678' });
                        },
                      },
                      { text: t('common.cancel') },
                    ]
                  );
                },
              },
              {
                text: t('auth.phoneVerification.help', 'Help'),
                onPress: showSMSTroubleshootingDialog,
              },
              {
                text: t('common.retry'),
                onPress: () => handleContinue(),
              },
            ]
          );
        } else if (result.error?.includes('Network') || result.error?.includes('connexion')) {
          Alert.alert(t('errors.networkError'), t('network.checkConnection'), [
            {
              text: t('network.checkConnection'),
              onPress: async () => {
                const connected = await NetworkRetry.waitForNetwork(5000);
                if (connected) {
                  handleContinue();
                } else {
                  Alert.alert(
                    t('errors.general'),
                    t('network.stillNoConnection', 'Still no connection')
                  );
                }
              },
            },
            { text: t('common.cancel'), style: 'cancel' },
          ]);
        } else {
          Alert.alert(
            t('auth.phoneVerification.smsFailed', 'Unable to send SMS'),
            result.error ||
              t('auth.phoneVerification.checkNumberAndRetry', 'Check your number and try again.'),
            [
              {
                text: t('auth.phoneVerification.help', 'Help'),
                onPress: showSMSTroubleshootingDialog,
              },
              {
                text: t('common.ok'),
                style: 'cancel',
              },
            ]
          );
        }
      } else {
        console.log('✅ [PhoneVerification] OTP envoyé avec succès!');

        // Store phone number for ban checking
        await storeLastPhoneNumber(fullPhoneNumber);

        // Show success message
        Alert.alert(
          t('auth.phoneVerification.codeSent'),
          t('auth.phoneVerification.codeSentTo', { phoneNumber: fullPhoneNumber }),
          [
            {
              text: t('common.continue'),
              onPress: () => navigateNext('code-verification', { phoneNumber: fullPhoneNumber }),
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ [PhoneVerification] Erreur inattendue:', error);
      Alert.alert(t('errors.general'), t('errors.general'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <NetworkStatusBanner />
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${getProgress() * 100}%` }]} />
              </View>

              <Text style={styles.title}>{t('auth.phoneVerification.title')}</Text>
              <Text style={styles.subtitle}>{t('auth.phoneVerification.subtitle')}</Text>
            </View>

            <View style={styles.formContainer}>
              <TouchableOpacity
                style={styles.inputBox}
                accessibilityRole="button"
                accessibilityLabel={t('auth.phoneVerification.countryCode')}
                onPress={() => setIsCountryModalVisible(true)}
              >
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={styles.inputText}>{selectedCountry.name}</Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>

              <View style={[styles.inputBox, styles.phoneInputContainer]}>
                <Text style={styles.countryCode}>+{selectedCountry.callingCode}</Text>
                <View style={styles.separator} />
                <TextInput
                  style={styles.textInput}
                  placeholder={selectedCountry.placeholder}
                  placeholderTextColor="#A9A9A9"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  accessibilityLabel={t('auth.phoneVerification.phoneNumber')}
                  maxLength={15}
                />
              </View>
            </View>

            <View style={styles.illustrationContainer}>
              <Image
                source={require('@/assets/images/register/phone_verification.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

            <View style={styles.footer}>
              <AdaptiveButton
                onPress={handleContinue}
                title={t('common.continue')}
                loading={isLoading}
                disabled={!phoneNumber.trim()}
                style={styles.button}
                textStyle={styles.buttonText}
                showRetryState={true}
              />

              <TouchableOpacity
                style={styles.helpButton}
                onPress={showSMSTroubleshootingDialog}
                accessibilityRole="button"
                accessibilityLabel={t(
                  'auth.phoneVerification.smsHelpLabel',
                  'Help for receiving SMS'
                )}
              >
                <Text style={styles.helpButtonText}>
                  {t('auth.phoneVerification.notReceivingSMS', 'Not receiving SMS?')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isCountryModalVisible}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsCountryModalVisible(false)}>
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={styles.modalContent}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {t('auth.phoneVerification.selectCountry', 'Select your country')}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {COMMON_COUNTRIES.map((item) => (
                <Pressable
                  key={item.code}
                  style={({ pressed }) => [
                    styles.countryModalItem,
                    pressed && styles.countryModalItemPressed,
                    selectedCountry.code === item.code && styles.countryModalItemSelected,
                  ]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <View style={styles.countryItemContent}>
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <View style={styles.countryTextContainer}>
                      <Text
                        style={[
                          styles.countryName,
                          selectedCountry.code === item.code && styles.countryNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.countryCodeStyle,
                          selectedCountry.code === item.code && styles.countryCodeSelected,
                        ]}
                      >
                        +{item.callingCode}
                      </Text>
                    </View>
                    {selectedCountry.code === item.code && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
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
    paddingTop: perfectSize(14),
  },
  formContainer: {
    marginTop: perfectSize(32),
  },
  footer: {
    marginTop: perfectSize(20),
    paddingBottom: perfectSize(20),
  },
  progressContainer: {
    height: perfectSize(1.5),
    backgroundColor: '#E5E5E5',
    borderRadius: perfectSize(0.75),
    marginHorizontal: perfectSize(40),
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#016fff',
    borderRadius: perfectSize(0.75),
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: perfectSize(34),
    lineHeight: perfectSize(41),
    color: '#000000',
    marginTop: perfectSize(44),
    textAlign: 'center',
    letterSpacing: 0.34,
  },
  subtitle: {
    fontSize: perfectSize(16),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    lineHeight: perfectSize(24),
    color: '#555555',
    marginTop: perfectSize(20),
    textAlign: 'center',
    paddingHorizontal: perfectSize(16),
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: perfectSize(58),
    backgroundColor: '#FFFFFF',
    borderRadius: perfectSize(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: perfectSize(16),
  },
  phoneInputContainer: {
    marginTop: perfectSize(16),
  },
  flag: {
    fontSize: perfectSize(24),
    marginRight: perfectSize(12),
  },
  inputText: {
    flex: 1,
    fontSize: perfectSize(16),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#111827',
  },
  chevron: {
    fontSize: perfectSize(12),
    color: '#6B7280',
  },
  countryCode: {
    fontSize: perfectSize(16),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#111827',
  },
  separator: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: perfectSize(12),
  },
  textInput: {
    flex: 1,
    fontSize: perfectSize(16),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#111827',
  },
  illustrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: perfectSize(30),
    marginBottom: perfectSize(30),
    minHeight: perfectSize(180),
  },
  illustration: {
    width: '90%',
    height: perfectSize(180),
    maxHeight: H * 0.22,
  },
  button: {
    height: perfectSize(60),
    backgroundColor: '#016fff',
    borderRadius: perfectSize(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: perfectSize(20),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: perfectSize(24),
    borderTopRightRadius: perfectSize(24),
    paddingTop: perfectSize(12),
    paddingHorizontal: perfectSize(0),
    maxHeight: '80%',
    minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHandle: {
    width: perfectSize(40),
    height: perfectSize(4),
    backgroundColor: '#E5E5E5',
    borderRadius: perfectSize(2),
    alignSelf: 'center',
    marginBottom: perfectSize(20),
  },
  modalTitle: {
    fontSize: perfectSize(24),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: perfectSize(8),
    textAlign: 'center',
    paddingHorizontal: perfectSize(20),
  },
  modalScrollContent: {
    paddingBottom: perfectSize(20),
  },
  countryModalItem: {
    paddingVertical: perfectSize(16),
    paddingHorizontal: perfectSize(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  countryModalItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  countryModalItemSelected: {
    backgroundColor: '#F0F4FF',
    borderBottomColor: '#E0E7FF',
  },
  countryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    fontSize: perfectSize(28),
    marginRight: perfectSize(16),
  },
  countryTextContainer: {
    flex: 1,
  },
  countryName: {
    fontSize: perfectSize(17),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#111827',
    marginBottom: perfectSize(2),
  },
  countryNameSelected: {
    fontWeight: '600',
    color: '#000000',
  },
  countryCodeStyle: {
    fontSize: perfectSize(14),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#6B7280',
  },
  countryCodeSelected: {
    color: '#4B5563',
  },
  checkmark: {
    fontSize: perfectSize(20),
    color: '#016fff',
    fontWeight: '600',
  },
  countryModalItemText: {
    fontSize: perfectSize(17),
    color: '#111827',
  },
  helpButton: {
    marginTop: perfectSize(20),
    alignItems: 'center',
    alignSelf: 'center',
  },
  helpButtonText: {
    fontSize: perfectSize(14),
    color: '#016fff',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

export default PhoneVerificationScreen;
