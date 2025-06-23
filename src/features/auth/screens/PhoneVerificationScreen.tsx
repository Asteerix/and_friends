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
import { supabase } from '@/shared/lib/supabase/client';
import { Alert } from 'react-native';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COMMON_COUNTRIES[1] || { // France par défaut
      name: 'France',
      flag: '🇫🇷',
      code: 'FR',
      callingCode: '33',
      placeholder: '6 12 34 56 78',
    }
  );

  // Clear user data when reaching this screen (user went back to start)
  useEffect(() => {
    const clearUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Reset registration progress
          await supabase
            .from('profiles')
            .update({
              current_registration_step: 'phone_verification',
              // Clear any partial data
              username: null,
              full_name: null,
              avatar_url: null,
              birth_date: null,
              path: null,
              jam: null,
              restaurant_recommendations: null,
              hobbies: null,
              location_permission_granted: null,
              contacts_permission_status: null,
            })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error clearing user data:', error);
      }
    };

    clearUserData();
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsCountryModalVisible(false);
    setPhoneNumber('');
  };

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone');
      return;
    }

    setIsLoading(true);
    
    try {
      // Formater le numéro de téléphone avec le code pays
      const cleanedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0/, '');
      const fullPhoneNumber = `+${selectedCountry.callingCode}${cleanedPhone}`;
      
      console.log('📱 [PhoneVerification] Envoi OTP à:', fullPhoneNumber);
      
      // Envoyer l'OTP via Supabase
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) {
        console.error('❌ [PhoneVerification] Erreur envoi OTP:', error);
        
        // Si c'est une erreur de quota, proposer le mode test
        if (error.message?.includes('Quota Exceeded')) {
          Alert.alert(
            'Quota SMS dépassé', 
            'Le quota d\'envoi de SMS est dépassé. En développement, utilisez le numéro +33612345678 avec le code 123456.',
            [
              {
                text: 'Utiliser le mode test',
                onPress: () => {
                  setPhoneNumber('612345678');
                  navigateNext('code-verification');
                }
              },
              { text: 'Annuler', style: 'cancel' }
            ]
          );
        } else {
          Alert.alert(
            'Erreur', 
            error.message || 'Impossible d\'envoyer le code. Vérifiez votre numéro.'
          );
        }
      } else {
        console.log('✅ [PhoneVerification] Réponse Supabase:', data);
        
        // Avec Supabase, l'absence d'erreur signifie que l'OTP a été envoyé
        // même si data.user et data.session sont null (normal pour signInWithOtp)
        console.log('✅ [PhoneVerification] OTP envoyé avec succès');
        
        // Naviguer vers l'écran de vérification du code
        navigateNext('code-verification');
      }
    } catch (error) {
      console.error('❌ [PhoneVerification] Erreur inattendue:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${getProgress() * 100}%` }]} />
            </View>

            <Text style={styles.title}>Are you real or something?</Text>
            <Text style={styles.subtitle}>
              Let's make sure you're a real one. Enter your phone number to keep things safe.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity
              style={styles.inputBox}
              accessibilityRole="button"
              accessibilityLabel="Select country"
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
                accessibilityLabel="Phone number input"
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
            <TouchableOpacity
              style={[styles.button, (!phoneNumber.trim() || isLoading) && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={!phoneNumber.trim() || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue to the next step"
            >
              <Text style={styles.buttonText}>{isLoading ? 'Envoi...' : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
            <Text style={styles.modalTitle}>Select your country</Text>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: H * 0.04,
    marginBottom: H * 0.04,
  },
  illustration: {
    width: '90%',
    height: H * 0.25,
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
});

export default PhoneVerificationScreen;
