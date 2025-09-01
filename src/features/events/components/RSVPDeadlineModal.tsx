import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomModal from './BottomModal';

interface RSVPDeadlineModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (deadline: Date | null, reminderEnabled: boolean, reminderTiming: string) => void;
  eventDate?: Date;
  initialDeadline?: Date | null;
}

const REMINDER_TIMINGS = [
  { value: '24h', label: '24 hours before', description: 'Last minute reminder' },
  { value: '48h', label: '48 hours before', description: 'Weekend planning' },
  { value: '3d', label: '3 days before', description: 'Mid-week reminder' },
  { value: '1w', label: '1 week before', description: 'Early bird notice' },
  { value: 'both', label: 'Week + Day before', description: 'Maximum response' },
];

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

const PickerColumn: React.FC<PickerColumnProps> = ({
  data,
  selectedValue,
  onSelect,
  placeholder,
}) => {
  const [showList, setShowList] = useState(false);

  return (
    <View style={pickerStyles.pickerColumn}>
      <Pressable style={pickerStyles.pickerBox} onPress={() => setShowList(!showList)}>
        <Text style={[pickerStyles.pickerText, !selectedValue && pickerStyles.pickerPlaceholder]}>
          {selectedValue || placeholder}
        </Text>
        <Text style={pickerStyles.chevron}>⌄</Text>
      </Pressable>

      {showList && (
        <Modal
          transparent
          animationType="fade"
          visible={showList}
          onRequestClose={() => setShowList(false)}
        >
          <Pressable style={pickerStyles.pickerBackdrop} onPress={() => setShowList(false)} />
          <View style={pickerStyles.pickerModalSheet}>
            <View style={pickerStyles.pickerHeader}>
              <Text style={pickerStyles.pickerTitle}>{placeholder}</Text>
              <Pressable onPress={() => setShowList(false)} style={pickerStyles.pickerDone}>
                <Text style={pickerStyles.pickerDoneText}>Done</Text>
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
                    pickerStyles.pickerItem,
                    selectedValue === item && pickerStyles.pickerItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      pickerStyles.pickerItemText,
                      selectedValue === item && pickerStyles.pickerItemTextSelected,
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

export default function RSVPDeadlineModal({
  visible,
  onClose,
  onSave,
  eventDate,
  initialDeadline,
}: RSVPDeadlineModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [deadlineEnabled, setDeadlineEnabled] = useState(true);
  const [selectedReminderTiming, setSelectedReminderTiming] = useState('24h');
  const [errors, setErrors] = useState<{ date?: string; general?: string }>({});

  useEffect(() => {
    const now = new Date();
    const minimumDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // Round up to next hour
    const roundedMinimum = new Date(minimumDate);
    roundedMinimum.setMinutes(0, 0, 0);
    if (minimumDate.getMinutes() > 0 || minimumDate.getSeconds() > 0) {
      roundedMinimum.setHours(roundedMinimum.getHours() + 1);
    }

    if (initialDeadline && initialDeadline > roundedMinimum) {
      setSelectedDate(initialDeadline);
      setDeadlineEnabled(true);
    } else if (eventDate) {
      // Default to 1 hour before event
      const defaultDeadline = new Date(eventDate);
      defaultDeadline.setHours(defaultDeadline.getHours() - 1);

      // Ensure the default deadline is not in the past
      if (defaultDeadline < roundedMinimum) {
        setSelectedDate(roundedMinimum);
      } else {
        setSelectedDate(defaultDeadline);
      }
    } else {
      // If no event date, set to rounded minimum allowed date
      setSelectedDate(roundedMinimum);
    }
  }, [initialDeadline, eventDate]);

  const validateDate = (date: Date): boolean => {
    setErrors({});

    const now = new Date();
    const minimumDeadline = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

    // Check if date is in the past
    if (date < now) {
      setErrors({ date: 'RSVP deadline cannot be in the past' });
      return false;
    }

    // Check if deadline is too soon (less than 24 hours from now)
    if (date < minimumDeadline) {
      const hoursUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));
      setErrors({
        date: `RSVP deadline must be at least 3 hours from now (currently ${hoursUntil} hours)`,
      });
      return false;
    }

    // Check if date is after event date
    if (eventDate && date >= eventDate) {
      setErrors({ date: 'RSVP deadline must be before the event' });
      return false;
    }

    // Warning if deadline is too close to event
    if (eventDate) {
      const daysBefore = Math.ceil((eventDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysBefore < 2) {
        Alert.alert(
          'Short Notice',
          'Setting RSVP deadline less than 48 hours before event may not give guests enough time to respond.',
          [
            { text: 'Change Date', style: 'cancel' },
            { text: 'Continue Anyway', onPress: () => handleSaveConfirmed() },
          ]
        );
        return false;
      }
    }

    return true;
  };

  // State for custom date picker
  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [hour, setHour] = useState<string | null>(null);
  const [minute, setMinute] = useState<string | null>(null);

  // Initialize picker values when modal opens
  useEffect(() => {
    if (showCustomDatePicker) {
      setYear(String(selectedDate.getFullYear()));
      setMonth(MONTHS[selectedDate.getMonth()] || null);
      setDay(String(selectedDate.getDate()));
      setHour(String(selectedDate.getHours()).padStart(2, '0'));
      setMinute(String(selectedDate.getMinutes()).padStart(2, '0'));
    }
  }, [showCustomDatePicker, selectedDate]);

  const handleDateTimeConfirm = () => {
    if (year && month && day && hour && minute) {
      const monthIndex = MONTHS.indexOf(month);
      const newDate = new Date(
        parseInt(year),
        monthIndex,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      // Validate the date before confirming
      if (!validateDate(newDate)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setSelectedDate(newDate);
      setErrors({});
      setShowCustomDatePicker(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDateTimeCancel = () => {
    setMonth(null);
    setDay(null);
    setYear(null);
    setHour(null);
    setMinute(null);
    setShowCustomDatePicker(false);
  };

  const formatSelectedDateTime = () => {
    if (!month || !day || !year || !hour || !minute) return 'Select date & time';
    return `${month} ${day}, ${year} at ${hour}:${minute}`;
  };

  const handleSave = () => {
    if (deadlineEnabled && !validateDate(selectedDate)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    handleSaveConfirmed();
  };

  const handleSaveConfirmed = () => {
    onSave(deadlineEnabled ? selectedDate : null, reminderEnabled, selectedReminderTiming);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDaysUntilEvent = () => {
    if (!eventDate) return null;
    const days = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="RSVP Deadline"
      height={Platform.OS === 'ios' ? 600 : 650}
      onSave={handleSave}
      saveButtonText={deadlineEnabled ? 'Save Deadline' : 'Save Settings'}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.deadlineToggleCard}>
          <View style={styles.toggleContent}>
            <Ionicons name="calendar-outline" size={24} color="#666" />
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Set RSVP Deadline</Text>
              <Text style={styles.toggleSubtitle}>Guests must respond by this date</Text>
            </View>
          </View>
          <Switch
            value={deadlineEnabled}
            onValueChange={(value) => {
              setDeadlineEnabled(value);
              if (!value) {
                setErrors({});
              }
            }}
            trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
            thumbColor="#FFF"
            ios_backgroundColor="#E5E5EA"
          />
        </View>

        {deadlineEnabled && (
          <>
            {/* Current Selection Display */}
            <View style={styles.currentSelectionCard}>
              <View style={styles.currentSelectionHeader}>
                <Ionicons name="calendar" size={24} color="#007AFF" />
                <Text style={styles.currentSelectionTitle}>Selected Deadline</Text>
              </View>
              <Text style={styles.currentSelectionDate}>{formatDate(selectedDate)}</Text>
              <Text style={styles.currentSelectionTime}>{formatTime(selectedDate)}</Text>
              {eventDate && (
                <Text style={styles.currentSelectionInfo}>
                  {(() => {
                    const hoursBeforeEvent = Math.ceil(
                      (eventDate.getTime() - selectedDate.getTime()) / (1000 * 60 * 60)
                    );
                    const daysBeforeEvent = Math.floor(hoursBeforeEvent / 24);
                    const remainingHours = hoursBeforeEvent % 24;

                    if (daysBeforeEvent === 0) {
                      return `${hoursBeforeEvent} hour${hoursBeforeEvent !== 1 ? 's' : ''} before your event`;
                    } else if (remainingHours === 0) {
                      return `${daysBeforeEvent} day${daysBeforeEvent !== 1 ? 's' : ''} before your event`;
                    } else {
                      return `${daysBeforeEvent} day${daysBeforeEvent !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''} before your event`;
                    }
                  })()}
                </Text>
              )}
            </View>

            {/* Error Display */}
            {errors.date && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.date}</Text>
              </View>
            )}

            {/* Date & Time Picker Button */}
            <TouchableOpacity
              style={[styles.changeDateButton, errors.date && styles.changeDateButtonError]}
              onPress={() => setShowCustomDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              <Text style={styles.changeDateButtonText}>Change Date & Time</Text>
              <Ionicons name="chevron-forward" size={20} color="#007AFF" />
            </TouchableOpacity>

            {/* Smart Tips */}
            {eventDate && (
              <View style={styles.tipsSection}>
                <Text style={styles.tipsSectionTitle}>Tips</Text>
                <View style={styles.tipCard}>
                  <Ionicons name="bulb-outline" size={20} color="#FFA500" />
                  <Text style={styles.tipText}>
                    {getDaysUntilEvent() && getDaysUntilEvent()! <= 7
                      ? 'Your event is coming soon! Consider a shorter RSVP deadline.'
                      : getDaysUntilEvent() && getDaysUntilEvent()! > 30
                        ? 'For events far in advance, 2-3 weeks notice works well.'
                        : '1-2 weeks before the event gives guests enough time to plan.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Reminder Settings */}
            <View style={styles.reminderSection}>
              <View style={styles.reminderCard}>
                <View style={styles.reminderContent}>
                  <Ionicons name="notifications-outline" size={24} color="#666" />
                  <View style={styles.reminderTextContainer}>
                    <Text style={styles.reminderTitle}>Send Reminders</Text>
                    <Text style={styles.reminderSubtitle}>Notify guests who haven't responded</Text>
                  </View>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor="#FFF"
                  ios_backgroundColor="#E5E5EA"
                />
              </View>

              {reminderEnabled && (
                <View style={styles.reminderTimingSection}>
                  <Text style={styles.reminderTimingTitle}>When to remind</Text>
                  {REMINDER_TIMINGS.map((timing) => (
                    <TouchableOpacity
                      key={timing.value}
                      style={[
                        styles.reminderTimingOption,
                        selectedReminderTiming === timing.value &&
                          styles.reminderTimingOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedReminderTiming(timing.value);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View style={styles.reminderTimingContent}>
                        <Text
                          style={[
                            styles.reminderTimingLabel,
                            selectedReminderTiming === timing.value &&
                              styles.reminderTimingLabelSelected,
                          ]}
                        >
                          {timing.label}
                        </Text>
                        <Text style={styles.reminderTimingDescription}>{timing.description}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioButton,
                          selectedReminderTiming === timing.value && styles.radioButtonSelected,
                        ]}
                      >
                        {selectedReminderTiming === timing.value && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* Custom Date & Time Picker Modal */}
        {showCustomDatePicker && (
          <Modal
            visible={showCustomDatePicker}
            animationType="slide"
            transparent
            presentationStyle="overFullScreen"
            onRequestClose={() => setShowCustomDatePicker(false)}
          >
            <View style={pickerStyles.modalContainer}>
              <Pressable
                style={pickerStyles.backdrop}
                onPress={() => setShowCustomDatePicker(false)}
              />
              <View style={pickerStyles.modalContent}>
                <View style={pickerStyles.handle} />

                <View style={pickerStyles.header}>
                  <Text style={pickerStyles.title}>Select RSVP Deadline</Text>
                  <Text style={pickerStyles.subtitle}>Must be at least 3 hours from now</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={pickerStyles.dateTimeDisplay}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={pickerStyles.dateTimeText}>{formatSelectedDateTime()}</Text>
                  </View>

                  {/* Error Display in Picker */}
                  {errors.date && (
                    <View style={pickerStyles.errorContainer}>
                      <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                      <Text style={pickerStyles.errorText}>{errors.date}</Text>
                    </View>
                  )}

                  <View style={pickerStyles.sectionContainer}>
                    <Text style={pickerStyles.sectionTitle}>Date</Text>
                    <View style={pickerStyles.pickerGroup}>
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

                  {/* Date validation info */}
                  {eventDate && (
                    <View style={pickerStyles.validationInfo}>
                      <Ionicons name="information-circle-outline" size={16} color="#666" />
                      <Text style={pickerStyles.validationText}>
                        Must be between now and {eventDate.toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  <View style={pickerStyles.sectionContainer}>
                    <Text style={pickerStyles.sectionTitle}>Time</Text>
                    <View style={pickerStyles.timePickerGroup}>
                      <PickerColumn
                        data={HOURS}
                        selectedValue={hour}
                        onSelect={setHour}
                        placeholder="Hour"
                      />
                      <Text style={pickerStyles.timeSeparator}>:</Text>
                      <PickerColumn
                        data={MINUTES}
                        selectedValue={minute}
                        onSelect={setMinute}
                        placeholder="Min"
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={pickerStyles.footer}>
                  <Pressable style={pickerStyles.cancelButton} onPress={handleDateTimeCancel}>
                    <Text style={pickerStyles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      pickerStyles.confirmButton,
                      (!month || !day || !year || !hour || !minute) &&
                        pickerStyles.confirmButtonDisabled,
                    ]}
                    onPress={handleDateTimeConfirm}
                    disabled={!month || !day || !year || !hour || !minute}
                  >
                    <Text style={pickerStyles.confirmButtonText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deadlineToggleCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  currentSelectionCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  currentSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  currentSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  currentSelectionDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  currentSelectionTime: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  currentSelectionInfo: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    flex: 1,
  },
  changeDateButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  changeDateButtonError: {
    borderColor: '#FF3B30',
  },
  changeDateButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tipCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  tipText: {
    color: '#F57C00',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  reminderSection: {
    marginTop: 12,
  },
  reminderCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  reminderSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  reminderTimingSection: {
    marginTop: 16,
  },
  reminderTimingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  reminderTimingOption: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  reminderTimingOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  reminderTimingContent: {
    flex: 1,
  },
  reminderTimingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  reminderTimingLabelSelected: {
    color: '#007AFF',
  },
  reminderTimingDescription: {
    fontSize: 13,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
});

const pickerStyles = StyleSheet.create({
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
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
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
  errorContainer: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    flex: 1,
  },
  validationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    marginTop: -12,
    marginBottom: 24,
  },
  validationText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
});
