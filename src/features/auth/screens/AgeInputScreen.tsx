import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/shared/lib/supabase/client';
import { getDeviceLanguage, t } from '@/shared/locales';
import ScreenLayout from '@/shared/ui/ScreenLayout';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
// Navigation type removed - using expo-router instead

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const { width: W, height: H } = Dimensions.get('window');
const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey1: '#AEB0B4',
  grey2: '#666666',
  grey3: '#555555',
  greyF: '#F7F7F7',
  error: '#D32F2F',
};
const NEXT_REGISTRATION_STEP_VALUE = 'path_input';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const CURRENT_YEAR = new Date().getFullYear();
const MIN_BIRTH_YEAR = CURRENT_YEAR - 120;
const MAX_BIRTH_YEAR = CURRENT_YEAR - 13; // Age minimum 13 ans
const YEARS = Array.from(
  { length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 },
  (_, i) => `${MAX_BIRTH_YEAR - i}`
);
const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
const MIN_AGE = 13;
const MAX_AGE = 120;

// ---------------------------------------------------------------------------
// Picker Modal
// ---------------------------------------------------------------------------
interface PickerModalProps {
  visible: boolean;
  data: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}
const PickerModal: React.FC<PickerModalProps> = ({ visible, data, onSelect, onClose }) => (
  <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose} />
    <View style={styles.modalSheet}>
      <FlatList
        data={data}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              onSelect(item);
              onClose();
            }}
            style={styles.modalItem}
          >
            <Text style={styles.modalItemText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  </Modal>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const AgeInputScreen: React.FC = () => {
  const router = useRouter();
  const lang = getDeviceLanguage();
  // const { currentStep, loading: onboardingLoading } = useOnboardingStatus(); // Removed to prevent auto-redirects
  const { navigateBack, getProgress } = useAuthNavigation('age-input');

  // Save registration step
  useRegistrationStep('age_input');

  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [hideDOB, setHideDOB] = useState(false);
  const [ageErrorKey, setAgeErrorKey] = useState<string | null>(null);
  const [picker, setPicker] = useState<{
    type: 'month' | 'day' | 'year' | null;
  }>({ type: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  // Removed auto-redirect logic to prevent navigation conflicts
  // User should control navigation flow manually

  // Fetch existing profile data
  useEffect(() => {
    console.log('🎂 [AgeInputScreen] Écran chargé');
    testSupabaseConnection();
    
    const fetchProfile = async () => {
      setIsFetchingInitialData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log('🎂 [AgeInputScreen] User:', user?.id);
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('birth_date, hide_birth_date')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('❌ [AgeInputScreen] Error fetching age input profile data:', error);
            Alert.alert(t('error_loading_profile_generic', lang));
          } else if (data) {
            console.log('✅ [AgeInputScreen] Profil récupéré:', data);
            if (data.birth_date) {
              const [y, m, d] = data.birth_date.split('-');
              setYear(y);
              setMonth(MONTHS[parseInt(m, 10) - 1] || null);
              setDay(String(parseInt(d, 10))); // Remove leading zero for display consistency
            }
            if (typeof data.hide_birth_date === 'boolean') {
              setHideDOB(data.hide_birth_date);
            }
          }
        } catch (e) {
          console.error('❌ [AgeInputScreen] Unexpected error fetching age input profile data:', e);
          Alert.alert(t('unexpected_error', lang));
        }
      } else {
        console.warn('⚠️ [AgeInputScreen] Pas d\'utilisateur connecté');
      }
      setIsFetchingInitialData(false);
    };
    void fetchProfile();
  }, [lang]);

  const testSupabaseConnection = async () => {
    try {
      console.log('🧪 [AgeInputScreen] Test de connexion Supabase...');
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ [AgeInputScreen] Erreur Supabase:', error);
      } else {
        console.log('✅ [AgeInputScreen] Connexion Supabase OK');
        console.log('  - Session existante:', !!data.session);
        console.log('  - User ID:', data.session?.user?.id);
      }
    } catch (err) {
      console.error('❌ [AgeInputScreen] Erreur critique:', err);
    }
  };

  const calculateAge = useCallback(
    (
      birthMonthStr: string | null,
      birthDayStr: string | null,
      birthYearStr: string | null
    ): number | null => {
      if (!birthMonthStr || !birthDayStr || !birthYearStr) return null;
      const monthIndex = MONTHS.indexOf(birthMonthStr);
      if (monthIndex === -1) return null;

      const birthYear = parseInt(birthYearStr, 10);
      const birthDay = parseInt(birthDayStr, 10);
      const birthDate = new Date(birthYear, monthIndex, birthDay);

      if (
        isNaN(birthDate.getTime()) ||
        birthDate.getFullYear() !== birthYear ||
        birthDate.getMonth() !== monthIndex ||
        birthDate.getDate() !== birthDay
      ) {
        return null; // Invalid date (e.g., Feb 30)
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    },
    []
  );

  const validateAge = useCallback((): boolean => {
    if (!month || !day || !year) {
      setAgeErrorKey('error_age_date_required');
      return false;
    }
    const age = calculateAge(month, day, year);
    if (age === null) {
      setAgeErrorKey('error_age_invalid_date');
      return false;
    }
    if (age < MIN_AGE) {
      setAgeErrorKey('error_age_too_young');
      return false;
    }
    if (age > MAX_AGE) {
      setAgeErrorKey('error_age_too_old');
      return false;
    }
    setAgeErrorKey(null);
    return true;
  }, [month, day, year, calculateAge]);

  const isDateSelected = !!month && !!day && !!year;
  useEffect(() => {
    if (isDateSelected) validateAge();
    else setAgeErrorKey(null);
  }, [month, day, year, isDateSelected, validateAge]);

  const canContinue = isDateSelected && !ageErrorKey && !isLoading && !isFetchingInitialData;

  const continueAction = async () => {
    if (!validateAge()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.id) {
      Alert.alert(t('error_session_expired_title', lang), t('error_session_expired_message', lang));
      return;
    }
    if (!year || !month || !day) {
      // Should be caught by validateAge, but as a safeguard
      setAgeErrorKey('error_age_date_required');
      return;
    }

    setIsLoading(true);
    const monthIndex = MONTHS.indexOf(month);
    const birthDateISO = `${year}-${String(monthIndex + 1).padStart(
      2,
      '0'
    )}-${String(day).padStart(2, '0')}`;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          birth_date: birthDateISO,
          hide_birth_date: hideDOB,
          current_registration_step: NEXT_REGISTRATION_STEP_VALUE,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving birth date to profile:', error);
        Alert.alert(t('error_saving_profile', lang), error.message);
      } else {
        void router.push('/path-input');
      }
    } catch (e: unknown) {
      console.error('Unexpected error saving birth date:', e);
      Alert.alert(t('unexpected_error', lang), e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const pickerDisabled = isLoading || isFetchingInitialData;

  if (isFetchingInitialData && !isLoading) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.black} />
      </View>
    );
  }

  const handleBackPress = () => {
    navigateBack();
  };

  return (
    <>
      <ScreenLayout
        title={t('age_input_title', lang)}
        subtitle={t('age_input_subtitle', lang)}
        progress={getProgress()}
        onContinue={continueAction}
        continueDisabled={!canContinue}
        onBackPress={handleBackPress}
      >
        <KeyboardAvoidingView
          style={styles.flexGrow}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.infoText}>{t('age_input_info', lang)}</Text>

            <View style={styles.pickerGroupWrapper}>
              {(['month', 'day', 'year'] as const).map((pickerType) => (
                <Pressable
                  key={pickerType}
                  style={[
                    styles.pickerBox,
                    ageErrorKey && isDateSelected ? styles.inputErrorBorder : {},
                  ]}
                  onPress={() => !pickerDisabled && setPicker({ type: pickerType })}
                  disabled={pickerDisabled}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !(pickerType === 'month' ? month : pickerType === 'day' ? day : year)
                        ? { color: COLORS.grey1 }
                        : {},
                    ]}
                  >
                    {pickerType === 'month'
                      ? (month ?? t('month', lang))
                      : pickerType === 'day'
                        ? (day ?? t('day', lang))
                        : (year ?? t('year', lang))}
                  </Text>
                  <Text style={styles.chevron}>⌄</Text>
                </Pressable>
              ))}
            </View>
            {ageErrorKey && (
              <Text style={styles.errorText}>
                {t(ageErrorKey, lang, { minAge: MIN_AGE, maxAge: MAX_AGE })}
              </Text>
            )}

            <Image
              source={require('@/assets/images/register/born.png')}
              style={styles.illustration}
              resizeMode="contain"
            />

            <View style={styles.toggleCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>{t('age_input_hide_dob_title', lang)}</Text>
                <Text style={styles.toggleSubtitle}>{t('age_input_hide_dob_subtitle', lang)}</Text>
              </View>
              <Switch
                value={hideDOB}
                onValueChange={setHideDOB}
                thumbColor={Platform.OS === 'android' ? COLORS.white : undefined}
                ios_backgroundColor={COLORS.grey1}
                trackColor={{ true: COLORS.black, false: COLORS.grey1 }}
                disabled={pickerDisabled}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
        <PickerModal
          visible={picker.type === 'month'}
          data={MONTHS}
          onSelect={(v) => setMonth(v)}
          onClose={() => setPicker({ type: null })}
        />
        <PickerModal
          visible={picker.type === 'day'}
          data={DAYS}
          onSelect={(v) => setDay(v)}
          onClose={() => setPicker({ type: null })}
        />
        <PickerModal
          visible={picker.type === 'year'}
          data={YEARS}
          onSelect={(v) => setYear(v)}
          onClose={() => setPicker({ type: null })}
        />
      </ScreenLayout>
    </>
  );
};

export default AgeInputScreen;

const styles = StyleSheet.create({
  flexGrow: { flexGrow: 1 },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 0,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  infoText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: COLORS.grey3,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  pickerGroupWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.greyF,
    padding: 16,
    borderRadius: 16,
    alignSelf: 'stretch',
  },
  pickerBox: {
    width: (W - 24 * 2 - 16 * 2) / 3 - 8,
    height: 64,
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.white,
  },
  inputErrorBorder: { borderColor: COLORS.error },
  pickerText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: COLORS.black,
  },
  chevron: { fontSize: 13, color: COLORS.grey2, marginLeft: 6 },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  illustration: {
    width: '85%',
    height: H * 0.2,
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 12,
    padding: 16,
    alignSelf: 'stretch',
    backgroundColor: COLORS.white,
  },
  toggleTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    color: COLORS.black,
  },
  toggleSubtitle: { fontSize: 14, color: COLORS.grey3, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    maxHeight: H * 0.45,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  modalItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey0,
  },
  modalItemText: { fontSize: 18, color: COLORS.black },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});

/*
TODO:
1. Assurez-vous que la table `profiles` dans Supabase a les colonnes:
   - `birth_date` (type `date`)
   - `hide_birth_date` (type `boolean`)

2. Ajoutez/vérifiez les clés de traduction:
   "age_input_title": "Gotta ask, how old are you?"
   "age_input_subtitle": "Your birth date helps us ensure a safe and appropriate experience." (ou similaire)
   "age_input_info": "No worries, your age is your secret\nunless you want to share it."
   "month": "Month" (pour le placeholder du picker)
   "day": "Day" (pour le placeholder du picker)
   "year": "Year" (pour le placeholder du picker)
   "age_input_hide_dob_title": "Hide from Profile"
   "age_input_hide_dob_subtitle": "Only show age, not full birth date"
   "error_age_date_required": "Please select a complete date of birth."
   "error_age_invalid_date": "Invalid date selected. Please check the day, month, and year."
   "error_age_too_young": "You must be at least {{minAge}} years old to use the app."
   "error_age_too_old": "Age cannot be greater than {{maxAge}} years."
   (et les clés génériques comme "error_loading_profile_generic", "error_session_expired_title", "error_saving_profile", "unexpected_error")

3. Testez la sélection de date, la validation, la sauvegarde, et le pré-remplissage.
*/
