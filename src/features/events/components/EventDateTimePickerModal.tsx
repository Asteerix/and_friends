import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  FlatList,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface EventDateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date, time: Date) => void;
  currentDate?: Date;
  currentTime?: Date;
  title?: string;
  subtitle?: string;
  minDate?: Date;
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
const YEARS = Array.from({ length: 10 }, (_, i) => `${CURRENT_YEAR + i}`);
const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}`.padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => `${i}`.padStart(2, '0'));

interface PickerColumnProps {
  data: string[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder: string;
}

const PickerColumn: React.FC<PickerColumnProps> = ({ data, selectedValue, onSelect, placeholder }) => {
  const [showList, setShowList] = useState(false);

  return (
    <View style={styles.pickerColumn}>
      <Pressable
        style={styles.pickerBox}
        onPress={() => setShowList(!showList)}
      >
        <Text style={[
          styles.pickerText,
          !selectedValue && styles.pickerPlaceholder
        ]}>
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
                  style={[
                    styles.pickerItem,
                    selectedValue === item && styles.pickerItemSelected
                  ]}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedValue === item && styles.pickerItemTextSelected
                  ]}>
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

export default function EventDateTimePickerModal({
  visible,
  onClose,
  onSelect,
  currentDate,
  currentTime,
  title = "Select date & time",
  subtitle = "Choose when your event will take place",
  minDate
}: EventDateTimePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [hour, setHour] = useState<string | null>(null);
  const [minute, setMinute] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const now = new Date();
      const minimumDate = minDate || new Date(now.getTime() + (24 * 60 * 60 * 1000));
      
      let dateToUse = currentDate || minimumDate;
      let timeToUse = currentTime || minimumDate;
      
      // Ensure the date is not in the past
      if (dateToUse < minimumDate) {
        dateToUse = minimumDate;
        timeToUse = minimumDate;
      }
      
      setYear(String(dateToUse.getFullYear()));
      setMonth(MONTHS[dateToUse.getMonth()] || null);
      setDay(String(dateToUse.getDate()));
      setHour(String(timeToUse.getHours()).padStart(2, '0'));
      setMinute(String(timeToUse.getMinutes()).padStart(2, '0'));
    }
  }, [visible, currentDate, currentTime, minDate]);

  const validateDateTime = (): boolean => {
    if (!month || !day || !year || !hour || !minute) {
      setDateError('Please select a complete date and time');
      return false;
    }

    const monthIndex = MONTHS.indexOf(month);
    const selectedDate = new Date(
      parseInt(year),
      monthIndex,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );

    const now = new Date();
    // const minimumDate = minDate || new Date(now.getTime() + (24 * 60 * 60 * 1000));
    
    if (selectedDate < now) {
      setDateError('Date cannot be in the past');
      return false;
    }
    
    if (minDate && selectedDate < minDate) {
      setDateError('Date must be after the minimum allowed date');
      return false;
    }

    setDateError(null);
    return true;
  };

  useEffect(() => {
    if (month && day && year && hour && minute) {
      validateDateTime();
    } else {
      setDateError(null);
    }
  }, [month, day, year, hour, minute]);

  const handleConfirm = () => {
    if (!validateDateTime()) return;

    if (year && month && day && hour && minute) {
      const monthIndex = MONTHS.indexOf(month);
      const eventDate = new Date(
        parseInt(year),
        monthIndex,
        parseInt(day)
      );
      const eventTime = new Date(
        parseInt(year),
        monthIndex,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
      
      onSelect(eventDate, eventTime);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  const handleCancel = () => {
    setMonth(null);
    setDay(null);
    setYear(null);
    setHour(null);
    setMinute(null);
    setDateError(null);
    onClose();
  };

  const isValid = month && day && year && hour && minute && !dateError;

  const formatSelectedDateTime = () => {
    if (!month || !day || !year || !hour || !minute) return 'Select date & time';
    return `${month} ${day}, ${year} at ${hour}:${minute}`;
  };

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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.dateTimeDisplay}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.dateTimeText}>{formatSelectedDateTime()}</Text>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Date</Text>
              <View style={styles.pickerGroup}>
                <PickerColumn
                  data={MONTHS}
                  selectedValue={month}
                  onSelect={setMonth}
                  placeholder="Month"
                />
                <PickerColumn
                  data={DAYS}
                  selectedValue={day}
                  onSelect={setDay}
                  placeholder="Day"
                />
                <PickerColumn
                  data={YEARS}
                  selectedValue={year}
                  onSelect={setYear}
                  placeholder="Year"
                />
              </View>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Time</Text>
              <View style={styles.timePickerGroup}>
                <PickerColumn
                  data={HOURS}
                  selectedValue={hour}
                  onSelect={setHour}
                  placeholder="Hour"
                />
                <Text style={styles.timeSeparator}>:</Text>
                <PickerColumn
                  data={MINUTES}
                  selectedValue={minute}
                  onSelect={setMinute}
                  placeholder="Min"
                />
              </View>
            </View>
            
            {dateError && (
              <Text style={styles.errorText}>{dateError}</Text>
            )}
          </ScrollView>

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
    maxHeight: '75%',
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
  dateTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    gap: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grey2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  pickerGroup: {
    flexDirection: 'row',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  timePickerGroup: {
    flexDirection: 'row',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.black,
    paddingHorizontal: 4,
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
    fontSize: 14,
    marginTop: -8,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
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