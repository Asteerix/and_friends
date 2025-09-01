import React, { useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  FlatList,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface BirthDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  currentDate?: string;
}

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey1: '#AEB0B4',
  grey2: '#666666',
  primary: '#007AFF',
  border: '#E5E5EA',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

interface PickerColumnProps {
  data: string[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder: string;
}

const PickerColumn: React.FC<PickerColumnProps> = ({
  data,
  selectedValue,
  onSelect,
  placeholder,
}) => {
  const [showList, setShowList] = useState(false);

  return (
    <View style={styles.pickerColumn}>
      <Pressable style={styles.pickerBox} onPress={() => setShowList(!showList)}>
        <Text style={[styles.pickerText, !selectedValue && styles.pickerPlaceholder]}>
          {selectedValue || placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      {showList && (
        <Modal
          transparent
          animationType="fade"
          visible={showList}
          onRequestClose={() => setShowList(false)}
        >
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowList(false)} />
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{placeholder}</Text>
              <Pressable onPress={() => setShowList(false)} style={styles.pickerDone}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    setShowList(false);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.pickerItem, selectedValue === item && styles.pickerItemSelected]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedValue === item && styles.pickerItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

export default function BirthDatePickerModal({
  visible,
  onClose,
  onSelect,
  currentDate,
}: BirthDatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible && currentDate) {
      const [y, m, d] = currentDate.split('-');
      setYear(y || null);
      setMonth(m ? MONTHS[parseInt(m, 10) - 1] || null : null);
      setDay(d ? String(parseInt(d, 10)) : null);
    }
  }, [visible, currentDate]);

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
      setAgeError('Please select a complete date');
      return false;
    }

    const age = calculateAge(month, day, year);
    if (age === null) {
      setAgeError('Invalid date selected');
      return false;
    }

    if (age < 13) {
      setAgeError('You must be at least 13 years old');
      return false;
    }

    if (age > 120) {
      setAgeError('Please enter a valid birth date');
      return false;
    }

    setAgeError(null);
    return true;
  }, [month, day, year, calculateAge]);

  React.useEffect(() => {
    if (month && day && year) {
      validateAge();
    } else {
      setAgeError(null);
    }
  }, [month, day, year, validateAge]);

  const handleConfirm = () => {
    if (!validateAge()) return;

    if (year && month && day) {
      const monthIndex = MONTHS.indexOf(month);
      const birthDateISO = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
      onSelect(birthDateISO);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  const handleCancel = () => {
    setMonth(null);
    setDay(null);
    setYear(null);
    setAgeError(null);
    onClose();
  };

  const isValid = month && day && year && !ageError;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom || 20 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>When were you born?</Text>
            <Text style={styles.subtitle}>This helps us personalize your experience</Text>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerGroup}>
              <PickerColumn
                data={MONTHS}
                selectedValue={month}
                onSelect={setMonth}
                placeholder="Month"
              />
              <PickerColumn data={DAYS} selectedValue={day} onSelect={setDay} placeholder="Day" />
              <PickerColumn
                data={YEARS}
                selectedValue={year}
                onSelect={setYear}
                placeholder="Year"
              />
            </View>

            {ageError && <Text style={styles.errorText}>{ageError}</Text>}
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !isValid && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!isValid}
            >
              <Text style={styles.confirmButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.grey0,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.grey2,
  },
  pickerContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  pickerGroup: {
    flexDirection: 'row',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerBox: {
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
  },
  pickerText: {
    fontSize: 17,
    color: COLORS.black,
    flex: 1,
    textAlign: 'center',
  },
  pickerPlaceholder: {
    color: COLORS.grey1,
  },
  chevron: {
    fontSize: 13,
    color: COLORS.grey2,
    marginLeft: 4,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.4,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  pickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pickerDoneText: {
    fontSize: 17,
    color: COLORS.primary,
    fontWeight: '600',
  },
  pickerItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  pickerItemText: {
    fontSize: 18,
    color: COLORS.black,
  },
  pickerItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey0,
    backgroundColor: COLORS.white,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.grey0,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
  },
  confirmButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: '#B3D1FF',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});
