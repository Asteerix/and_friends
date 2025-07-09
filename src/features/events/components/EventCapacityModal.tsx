import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface EventCapacityModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (capacity: { 
    maxAttendees?: number;
    waitlistEnabled?: boolean;
    autoApprove?: boolean;
  }) => void;
  initialCapacity?: { 
    maxAttendees?: number;
    waitlistEnabled?: boolean;
    autoApprove?: boolean;
  };
}

const PRESET_CAPACITIES = [10, 20, 30, 50, 75, 100, 150, 200];

export default function EventCapacityModal({
  visible,
  onClose,
  onSave,
  initialCapacity,
}: EventCapacityModalProps) {
  const insets = useSafeAreaInsets();
  const [maxAttendees, setMaxAttendees] = useState(
    initialCapacity?.maxAttendees?.toString() || ''
  );
  const [hasLimit, setHasLimit] = useState(!!initialCapacity?.maxAttendees);
  const [waitlistEnabled, setWaitlistEnabled] = useState(
    initialCapacity?.waitlistEnabled || false
  );
  const [autoApprove, setAutoApprove] = useState(
    initialCapacity?.autoApprove ?? true
  );

  const handlePresetSelect = (capacity: number) => {
    setMaxAttendees(capacity.toString());
    setHasLimit(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    const capacity = {
      maxAttendees: hasLimit && maxAttendees ? parseInt(maxAttendees) : undefined,
      waitlistEnabled: hasLimit ? waitlistEnabled : false,
      autoApprove,
    };

    onSave(capacity);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleCancel = () => {
    setMaxAttendees('');
    setHasLimit(false);
    setWaitlistEnabled(false);
    setAutoApprove(true);
    onClose();
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
            <Text style={styles.title}>Event Capacity</Text>
            <Text style={styles.subtitle}>
              Set guest limits and approval settings
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <View style={styles.limitToggleContainer}>
                <View style={styles.limitToggleLeft}>
                  <Ionicons name="people-outline" size={24} color="#666" />
                  <Text style={styles.limitToggleText}>Guest Limit</Text>
                </View>
                <Switch
                  value={hasLimit}
                  onValueChange={(value) => {
                    setHasLimit(value);
                    if (!value) {
                      setMaxAttendees('');
                      setWaitlistEnabled(false);
                    }
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor="#FFF"
                />
              </View>

              {hasLimit && (
                <>
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Maximum Guests</Text>
                    <TextInput
                      style={styles.numberInput}
                      placeholder="Enter number"
                      value={maxAttendees}
                      onChangeText={setMaxAttendees}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>

                  <View style={styles.presetsContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.presetsScroll}
                    >
                      {PRESET_CAPACITIES.map((capacity) => (
                        <Pressable
                          key={capacity}
                          style={[
                            styles.presetButton,
                            maxAttendees === capacity.toString() && styles.presetButtonSelected,
                          ]}
                          onPress={() => handlePresetSelect(capacity)}
                        >
                          <Text style={[
                            styles.presetButtonText,
                            maxAttendees === capacity.toString() && styles.presetButtonTextSelected,
                          ]}>
                            {capacity}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.optionRow}>
                    <View style={styles.optionLeft}>
                      <Ionicons name="list-outline" size={20} color="#666" />
                      <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>Enable Waitlist</Text>
                        <Text style={styles.optionDescription}>
                          Allow guests to join a waitlist when full
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={waitlistEnabled}
                      onValueChange={(value) => {
                        setWaitlistEnabled(value);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                      thumbColor="#FFF"
                    />
                  </View>
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Approval Settings</Text>
              
              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Auto-Approve RSVPs</Text>
                    <Text style={styles.optionDescription}>
                      Automatically approve guest requests
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoApprove}
                  onValueChange={(value) => {
                    setAutoApprove(value);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor="#FFF"
                />
              </View>

              {!autoApprove && (
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>
                    You'll need to manually approve each guest request
                  </Text>
                </View>
              )}
            </View>

            {hasLimit && maxAttendees && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Maximum guests:</Text>
                  <Text style={styles.summaryValue}>{maxAttendees}</Text>
                </View>
                {waitlistEnabled && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Waitlist:</Text>
                    <Text style={styles.summaryValue}>Enabled</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Approval:</Text>
                  <Text style={styles.summaryValue}>
                    {autoApprove ? 'Automatic' : 'Manual'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  limitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  limitToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  numberInput: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  presetsContainer: {
    marginBottom: 16,
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  presetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F8FA',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  presetButtonTextSelected: {
    color: '#007AFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  cancelButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
});