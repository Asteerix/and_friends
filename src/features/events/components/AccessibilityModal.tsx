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

interface AccessibilityModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (accessibility: {
    wheelchairAccessible: boolean;
    elevatorAvailable: boolean;
    accessibleParking: boolean;
    accessibleRestrooms: boolean;
    signLanguageInterpreter: boolean;
    brailleAvailable: boolean;
    additionalInfo?: string;
  }) => void;
  initialAccessibility?: {
    wheelchairAccessible: boolean;
    elevatorAvailable: boolean;
    accessibleParking: boolean;
    accessibleRestrooms: boolean;
    signLanguageInterpreter: boolean;
    brailleAvailable: boolean;
    additionalInfo?: string;
  };
}

const ACCESSIBILITY_OPTIONS = [
  {
    id: 'wheelchairAccessible',
    label: 'Wheelchair Accessible',
    icon: 'accessibility-outline',
    description: 'Venue has ramps and wide doorways',
  },
  {
    id: 'elevatorAvailable',
    label: 'Elevator Available',
    icon: 'arrow-up-outline',
    description: 'For multi-level venues',
  },
  {
    id: 'accessibleParking',
    label: 'Accessible Parking',
    icon: 'car-outline',
    description: 'Designated accessible parking spots',
  },
  {
    id: 'accessibleRestrooms',
    label: 'Accessible Restrooms',
    icon: 'man-outline',
    description: 'Wheelchair accessible facilities',
  },
  {
    id: 'signLanguageInterpreter',
    label: 'Sign Language Available',
    icon: 'hand-left-outline',
    description: 'Interpreter will be present',
  },
  {
    id: 'brailleAvailable',
    label: 'Braille Materials',
    icon: 'document-text-outline',
    description: 'Braille menus or programs available',
  },
];

export default function AccessibilityModal({
  visible,
  onClose,
  onSave,
  initialAccessibility,
}: AccessibilityModalProps) {
  const insets = useSafeAreaInsets();
  const [accessibility, setAccessibility] = useState({
    wheelchairAccessible: initialAccessibility?.wheelchairAccessible ?? false,
    elevatorAvailable: initialAccessibility?.elevatorAvailable ?? false,
    accessibleParking: initialAccessibility?.accessibleParking ?? false,
    accessibleRestrooms: initialAccessibility?.accessibleRestrooms ?? false,
    signLanguageInterpreter: initialAccessibility?.signLanguageInterpreter ?? false,
    brailleAvailable: initialAccessibility?.brailleAvailable ?? false,
  });
  const [additionalInfo, setAdditionalInfo] = useState(initialAccessibility?.additionalInfo || '');

  const handleToggle = (optionId: string) => {
    setAccessibility((prev) => ({
      ...prev,
      [optionId]: !prev[optionId as keyof typeof prev],
    }));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    onSave({
      ...accessibility,
      additionalInfo: additionalInfo.trim() || undefined,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleCancel = () => {
    setAccessibility({
      wheelchairAccessible: false,
      elevatorAvailable: false,
      accessibleParking: false,
      accessibleRestrooms: false,
      signLanguageInterpreter: false,
      brailleAvailable: false,
    });
    setAdditionalInfo('');
    onClose();
  };

  const activeCount = Object.values(accessibility).filter((v) => v).length;

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
            <Text style={styles.title}>Accessibility Features</Text>
            <Text style={styles.subtitle}>Help everyone feel welcome at your event</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.optionsContainer}>
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <View key={option.id} style={styles.optionCard}>
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        accessibility[option.id as keyof typeof accessibility] &&
                          styles.iconContainerActive,
                      ]}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={24}
                        color={
                          accessibility[option.id as keyof typeof accessibility]
                            ? '#007AFF'
                            : '#666'
                        }
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                  </View>
                  <Switch
                    value={accessibility[option.id as keyof typeof accessibility]}
                    onValueChange={() => handleToggle(option.id)}
                    trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                    thumbColor="#FFF"
                  />
                </View>
              ))}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Additional Accessibility Information</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="e.g., Service animals welcome, quiet areas available, strobe-free environment"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {activeCount > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  <Text style={styles.summaryTitle}>
                    {activeCount} Accessibility {activeCount === 1 ? 'Feature' : 'Features'} Enabled
                  </Text>
                </View>
                <Text style={styles.summaryText}>
                  Your event is more inclusive with these accessibility options
                </Text>
              </View>
            )}

            <View style={styles.tipCard}>
              <Ionicons name="heart-outline" size={20} color="#007AFF" />
              <Text style={styles.tipText}>
                Consider reaching out to attendees who may need accommodations to ensure their needs
                are met
              </Text>
            </View>
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
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainerActive: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  inputSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: '#E8F7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tipText: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
    lineHeight: 20,
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
