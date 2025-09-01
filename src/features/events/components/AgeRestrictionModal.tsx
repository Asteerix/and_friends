import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface AgeRestrictionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    ageRestriction: {
      type: string;
      minAge?: number;
      requiresGuardian?: boolean;
      customMessage?: string;
    } | null
  ) => void;
  initialRestriction?: {
    type: string;
    minAge?: number;
    requiresGuardian?: boolean;
    customMessage?: string;
  } | null;
}

const AGE_RESTRICTION_OPTIONS = [
  {
    id: 'all_ages',
    label: 'All Ages Welcome',
    icon: '👨‍👩‍👧‍👦',
    description: 'This event is open to everyone',
  },
  {
    id: 'family_friendly',
    label: 'Family Friendly',
    icon: '👶',
    description: 'Suitable for children and families',
  },
  {
    id: '13+',
    label: '13 and Over',
    icon: '🧒',
    description: 'Teens and adults only',
    minAge: 13,
  },
  {
    id: '16+',
    label: '16 and Over',
    icon: '👦',
    description: 'Young adults and older',
    minAge: 16,
  },
  {
    id: '18+',
    label: '18 and Over',
    icon: '🔞',
    description: 'Adults only event',
    minAge: 18,
  },
  {
    id: '21+',
    label: '21 and Over',
    icon: '🍷',
    description: 'Legal drinking age required',
    minAge: 21,
  },
  {
    id: 'kids_only',
    label: 'Kids Only',
    icon: '🧸',
    description: 'Designed specifically for children',
    customMessage: 'This event is designed for children aged 5-12',
  },
  {
    id: 'custom',
    label: 'Custom Age Range',
    icon: '✏️',
    description: 'Set your own age requirements',
  },
];

export default function AgeRestrictionModal({
  visible,
  onClose,
  onSave,
  initialRestriction,
}: AgeRestrictionModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState(initialRestriction?.type || '');
  const [customMinAge, setCustomMinAge] = useState(initialRestriction?.minAge?.toString() || '');
  const [customMessage, setCustomMessage] = useState(initialRestriction?.customMessage || '');
  const [requiresGuardian, setRequiresGuardian] = useState(
    initialRestriction?.requiresGuardian || false
  );

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    const option = AGE_RESTRICTION_OPTIONS.find((opt) => opt.id === typeId);
    if (option && option.minAge) {
      setCustomMinAge(option.minAge.toString());
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (!selectedType) {
      onSave(null);
      onClose();
      return;
    }

    const selectedOption = AGE_RESTRICTION_OPTIONS.find((opt) => opt.id === selectedType);

    const ageRestriction = {
      type: selectedType,
      minAge:
        selectedType === 'custom' && customMinAge ? parseInt(customMinAge) : selectedOption?.minAge,
      requiresGuardian: selectedType === 'custom' ? requiresGuardian : false,
      customMessage: selectedType === 'custom' ? customMessage : selectedOption?.customMessage,
    };

    onSave(ageRestriction);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleCancel = () => {
    setSelectedType('');
    setCustomMinAge('');
    setCustomMessage('');
    setRequiresGuardian(false);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <Text style={styles.title}>Age Restrictions</Text>
            <Text style={styles.subtitle}>Specify who can attend your event</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.optionsContainer}>
              {AGE_RESTRICTION_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedType === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => handleSelectType(option.id)}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedType === option.id && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  {selectedType === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </Pressable>
              ))}
            </View>

            {selectedType === 'custom' && (
              <View style={styles.customSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Minimum Age</Text>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="Enter age"
                    value={customMinAge}
                    onChangeText={setCustomMinAge}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>

                <View style={styles.guardianOption}>
                  <View style={styles.guardianTextContainer}>
                    <Text style={styles.guardianTitle}>Parent/Guardian Required</Text>
                    <Text style={styles.guardianDescription}>
                      Minors must be accompanied by an adult
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.checkbox, requiresGuardian && styles.checkboxChecked]}
                    onPress={() => {
                      setRequiresGuardian(!requiresGuardian);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    {requiresGuardian && <Ionicons name="checkmark" size={18} color="#FFF" />}
                  </Pressable>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Additional Information</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="e.g., Children under 10 must be supervised at all times"
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}

            {selectedType && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>How it will appear</Text>
                <View style={styles.previewCard}>
                  <Ionicons name="information-circle" size={20} color="#007AFF" />
                  <View style={styles.previewContent}>
                    {(() => {
                      const option = AGE_RESTRICTION_OPTIONS.find((opt) => opt.id === selectedType);
                      if (selectedType === 'custom' && customMinAge) {
                        return (
                          <>
                            <Text style={styles.previewMainText}>
                              Ages {customMinAge}+ Only
                              {requiresGuardian && ' (with guardian if under 18)'}
                            </Text>
                            {customMessage && (
                              <Text style={styles.previewSubText}>{customMessage}</Text>
                            )}
                          </>
                        );
                      }
                      return (
                        <>
                          <Text style={styles.previewMainText}>{option?.label}</Text>
                          {option?.customMessage && (
                            <Text style={styles.previewSubText}>{option.customMessage}</Text>
                          )}
                        </>
                      );
                    })()}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {initialRestriction && (
              <Pressable style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>Remove</Text>
              </Pressable>
            )}
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !selectedType && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!selectedType}
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
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  customSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  ageInput: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  guardianOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  guardianTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  guardianTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  guardianDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  previewSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  previewSubText: {
    fontSize: 14,
    color: '#666',
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
  clearButton: {
    paddingHorizontal: 20,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFE5E5',
  },
  clearButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
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
  saveButtonDisabled: {
    backgroundColor: '#B3D1FF',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
});
