import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Image,
  Modal,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/shared/lib/supabase/client';
import { getDeviceLanguage, t } from '@/shared/locales';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';
import { Colors } from '@/shared/config/Colors';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);
const { width: W, height: H } = Dimensions.get('window');

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
const MAX_BIRTH_YEAR = CURRENT_YEAR - 13;
const YEARS = Array.from(
  { length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 },
  (_, i) => `${MAX_BIRTH_YEAR - i}`
);
const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
const MIN_AGE = 13;
const MAX_AGE = 120;
const NEXT_REGISTRATION_STEP_VALUE = 'path_input';

interface PickerModalProps {
  visible: boolean;
  data: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

const PickerModal: React.FC<PickerModalProps> = React.memo(
  ({ visible, data, onSelect, onClose }) => (
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
              accessibilityRole="button"
              accessibilityLabel={item}
            >
              <Text style={styles.modalItemText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  )
);

const AgeInputScreen: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const lang = getDeviceLanguage();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('age-input');
  useRegistrationStep('age_input');

  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [hideDOB, setHideDOB] = useState(false);
  const [ageErrorKey, setAgeErrorKey] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ type: 'month' | 'day' | 'year' | null }>({ type: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetchingInitialData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('birth_date, hide_birth_date')
            .eq('id', user.id)
            .single();
          if (data) {
            if (data.birth_date) {
              const [y, m, d] = data.birth_date.split('-');
              setYear(y);
              setMonth(MONTHS[parseInt(m, 10) - 1] || null);
              setDay(String(parseInt(d, 10)));
            }
            if (typeof data.hide_birth_date === 'boolean') {
              setHideDOB(data.hide_birth_date);
            }
          }
        } catch {}
      }
      setIsFetchingInitialData(false);
    };
    void fetchProfile();
  }, []);

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
        return null;
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
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }
    if (!year || !month || !day) {
      setAgeErrorKey('error_age_date_required');
      return;
    }
    setIsLoading(true);
    const monthIndex = MONTHS.indexOf(month);
    const birthDateISO = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
        Alert.alert('Error', error.message);
      } else {
        navigateNext('path-input');
      }
    } catch (e) {
      Alert.alert('Unexpected error', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const pickerDisabled = isLoading || isFetchingInitialData;

  if (isFetchingInitialData && !isLoading) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={Colors.light.text} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header & ProgressBar */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={navigateBack}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
          </View>
        </View>
        <View style={styles.backButton} />
      </View>
      {/* Title */}
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLabel="Gotta ask, how old are you?"
      >
        Gotta ask, how old are <Text style={styles.titleItalic}>you?</Text>
      </Text>
      <Text
        style={styles.subtitle}
        accessibilityLabel="No worries, your age is your secret unless you want to share it."
      >
        No worries, your age is your secret unless you want to share it.
      </Text>
      {/* Date Picker Row */}
      <View style={styles.pickerGroupWrapper}>
        {(['month', 'day', 'year'] as const).map((pickerType) => (
          <Pressable
            key={pickerType}
            style={styles.pickerBox}
            onPress={() => !pickerDisabled && setPicker({ type: pickerType })}
            disabled={pickerDisabled}
            accessibilityRole="button"
            accessibilityLabel={pickerType.charAt(0).toUpperCase() + pickerType.slice(1)}
          >
            <Text
              style={[
                styles.pickerText,
                !(pickerType === 'month' ? month : pickerType === 'day' ? day : year)
                  ? { color: Colors.light.textSecondary }
                  : {},
              ]}
            >
              {pickerType === 'month'
                ? (month ?? 'Month')
                : pickerType === 'day'
                  ? (day ?? 'Day')
                  : (year ?? 'Year')}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
        ))}
      </View>
      {ageErrorKey && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {t(ageErrorKey, lang, { minAge: MIN_AGE, maxAge: MAX_AGE })}
        </Text>
      )}
      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Image
          source={require('@/assets/images/register/birth.png')}
          style={styles.illustration}
          resizeMode="contain"
          accessibilityLabel="Birthday cake illustration"
        />
      </View>
      {/* Hide from Profile Switch */}
      <View style={styles.toggleCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Hide from Profile</Text>
          <Text style={styles.toggleSubtitle}>Only show age, not full birth date</Text>
        </View>
        <Switch
          value={hideDOB}
          onValueChange={setHideDOB}
          thumbColor={Platform.OS === 'android' ? Colors.light.background : undefined}
          ios_backgroundColor={Colors.light.textSecondary}
          trackColor={{ true: Colors.light.text, false: Colors.light.textSecondary }}
          disabled={pickerDisabled}
          accessibilityLabel="Hide birth date from profile"
        />
      </View>
      {/* Continue Button */}
      <Pressable
        style={({ pressed }) => [
          styles.continueButton,
          pressed ? { opacity: 0.75 } : {},
          !canContinue ? { opacity: 0.3 } : {},
        ]}
        onPress={continueAction}
        disabled={!canContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue"
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </Pressable>
      {/* Picker Modals */}
      <PickerModal
        visible={picker.type === 'month'}
        data={MONTHS}
        onSelect={setMonth}
        onClose={() => setPicker({ type: null })}
      />
      <PickerModal
        visible={picker.type === 'day'}
        data={DAYS}
        onSelect={setDay}
        onClose={() => setPicker({ type: null })}
      />
      <PickerModal
        visible={picker.type === 'year'}
        data={YEARS}
        onSelect={setYear}
        onClose={() => setPicker({ type: null })}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: perfectSize(24),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: Colors.light.tint,
    marginLeft: perfectSize(0),
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: '70%',
    height: perfectSize(2),
    backgroundColor: Colors.light.border,
    borderRadius: perfectSize(1),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: perfectSize(1),
  },
  title: {
    marginTop: perfectSize(16),
    fontSize: perfectSize(34),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Colors.light.text,
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
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: perfectSize(22),
    marginBottom: perfectSize(24),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
  },
  pickerGroupWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: perfectSize(16),
    borderRadius: perfectSize(16),
    alignSelf: 'stretch',
    marginBottom: perfectSize(16),
  },
  pickerBox: {
    flex: 1,
    height: perfectSize(56),
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: perfectSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    marginHorizontal: perfectSize(4),
  },
  pickerText: {
    fontSize: perfectSize(17),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: Colors.light.text,
  },
  chevron: {
    fontSize: perfectSize(13),
    color: Colors.light.icon,
    marginLeft: perfectSize(6),
  },
  errorText: {
    color: Colors.light.error,
    fontSize: perfectSize(12),
    marginTop: perfectSize(8),
    textAlign: 'center',
    width: '100%',
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(8),
  },
  illustration: {
    width: perfectSize(220),
    height: perfectSize(160),
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: perfectSize(12),
    padding: perfectSize(16),
    alignSelf: 'stretch',
    backgroundColor: Colors.light.background,
    marginBottom: perfectSize(16),
  },
  toggleTitle: {
    fontSize: perfectSize(17),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    color: Colors.light.text,
  },
  toggleSubtitle: {
    fontSize: perfectSize(14),
    color: Colors.light.textSecondary,
    marginTop: perfectSize(4),
  },
  continueButton: {
    height: perfectSize(60),
    backgroundColor: Colors.light.tint,
    borderRadius: perfectSize(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: perfectSize(16),
    marginBottom: perfectSize(8),
  },
  continueButtonText: {
    color: Colors.light.background,
    fontSize: perfectSize(20),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    maxHeight: H * 0.45,
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: perfectSize(20),
    borderTopRightRadius: perfectSize(20),
    paddingTop: perfectSize(8),
    paddingBottom: Platform.OS === 'ios' ? perfectSize(20) : perfectSize(8),
  },
  modalItem: {
    paddingVertical: perfectSize(14),
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalItemText: {
    fontSize: perfectSize(18),
    color: Colors.light.text,
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});

export default AgeInputScreen;
