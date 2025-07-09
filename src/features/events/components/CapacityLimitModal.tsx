import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface CapacityLimitModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (capacity: number | null) => void;
  initialCapacity?: number | null;
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

const QUICK_OPTIONS = [10, 20, 30, 50, 100, 150, 200];

export default function CapacityLimitModal({
  visible,
  onClose,
  onSave,
  initialCapacity,
}: CapacityLimitModalProps) {
  const insets = useSafeAreaInsets();
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && initialCapacity) {
      setCapacity(initialCapacity.toString());
    } else if (visible) {
      setCapacity('');
    }
  }, [visible, initialCapacity]);

  const validateCapacity = (value: string): boolean => {
    if (!value) {
      setError(null);
      return true;
    }
    
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      setError('Please enter a valid number');
      return false;
    }
    
    if (num > 10000) {
      setError('Maximum capacity is 10,000');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleCapacityChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setCapacity(cleaned);
    validateCapacity(cleaned);
  };

  const handleQuickOption = (value: number) => {
    setCapacity(value.toString());
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (!validateCapacity(capacity)) return;
    
    const capacityValue = capacity ? parseInt(capacity) : null;
    onSave(capacityValue);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleCancel = () => {
    setCapacity('');
    setError(null);
    onClose();
  };

  const handleRemove = () => {
    onSave(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const isValid = !error && capacity !== '';

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
            <Text style={styles.title}>Guest Capacity</Text>
            <Text style={styles.subtitle}>Set a maximum number of guests</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="Enter max capacity"
                placeholderTextColor={COLORS.grey1}
                value={capacity}
                onChangeText={handleCapacityChange}
                keyboardType="number-pad"
                maxLength={5}
                autoFocus
              />
              {capacity !== '' && (
                <Text style={styles.guestLabel}>
                  {parseInt(capacity) === 1 ? 'guest' : 'guests'}
                </Text>
              )}
            </View>
            
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <View style={styles.quickOptionsContainer}>
              <Text style={styles.quickOptionsTitle}>Quick select</Text>
              <View style={styles.quickOptionsGrid}>
                {QUICK_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.quickOption,
                      capacity === option.toString() && styles.quickOptionSelected,
                    ]}
                    onPress={() => handleQuickOption(option)}
                  >
                    <Text style={[
                      styles.quickOptionText,
                      capacity === option.toString() && styles.quickOptionTextSelected,
                    ]}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.grey2} />
              <Text style={styles.infoText}>
                Setting a capacity limit helps manage RSVPs and prevents overbooking. 
                Guests will see when the event is full.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            {initialCapacity && (
              <Pressable style={styles.removeButton} onPress={handleRemove}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            )}
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={styles.saveButtonText}>Save</Text>
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
  content: {
    paddingHorizontal: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.black,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  guestLabel: {
    fontSize: 20,
    color: COLORS.grey2,
    marginLeft: 12,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
  },
  quickOptionsContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  quickOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grey2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  quickOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickOption: {
    backgroundColor: '#F8F8FA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickOptionText: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  quickOptionTextSelected: {
    color: COLORS.white,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.grey2,
    lineHeight: 20,
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
  removeButton: {
    paddingHorizontal: 20,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FF3B30',
  },
  removeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
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
  saveButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveButtonDisabled: {
    backgroundColor: '#B3D1FF',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});