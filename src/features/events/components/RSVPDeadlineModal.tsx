import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomModal from './BottomModal';

interface RSVPDeadlineModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (deadline: Date | null, reminderEnabled: boolean) => void;
}

export default function RSVPDeadlineModal({
  visible,
  onClose,
  onSave,
}: RSVPDeadlineModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [deadlineEnabled, setDeadlineEnabled] = useState(true);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSave = () => {
    onSave(deadlineEnabled ? selectedDate : null, reminderEnabled);
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

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="RSVP Deadline"
      height={500}
      onSave={handleSave}
      saveButtonText="Save Deadline"
    >
      <View style={styles.container}>
        <View style={styles.deadlineToggleCard}>
          <View style={styles.toggleContent}>
            <Ionicons name="calendar-outline" size={24} color="#666" />
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Set RSVP Deadline</Text>
              <Text style={styles.toggleSubtitle}>
                Guests must respond by this date
              </Text>
            </View>
          </View>
          <Switch
            value={deadlineEnabled}
            onValueChange={setDeadlineEnabled}
            trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
            thumbColor="#FFF"
            ios_backgroundColor="#E5E5EA"
          />
        </View>

        {deadlineEnabled && (
          <>
            <TouchableOpacity
              style={styles.dateTimeCard}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateTimeRow}>
                <Text style={styles.dateTimeLabel}>Date</Text>
                <View style={styles.dateTimeValue}>
                  <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeCard}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={styles.dateTimeRow}>
                <Text style={styles.dateTimeLabel}>Time</Text>
                <View style={styles.dateTimeValue}>
                  <Text style={styles.dateTimeText}>{formatTime(selectedDate)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.reminderCard}>
              <View style={styles.reminderContent}>
                <Ionicons name="notifications-outline" size={24} color="#666" />
                <View style={styles.reminderTextContainer}>
                  <Text style={styles.reminderTitle}>Send Reminder</Text>
                  <Text style={styles.reminderSubtitle}>
                    Notify guests 24 hours before deadline
                  </Text>
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
          </>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </View>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
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
  dateTimeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateTimeLabel: {
    fontSize: 16,
    color: '#000',
  },
  dateTimeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  reminderCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
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
});