import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface DressCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (dressCode: string | null) => void;
  initialDressCode?: string | null;
}

const PRESET_DRESS_CODES = [
  {
    id: '1',
    title: 'Casual',
    description: 'Come as you are - jeans, t-shirt, sneakers welcome',
    icon: '👕',
  },
  {
    id: '2',
    title: 'Smart Casual',
    description: 'Nice jeans or chinos, shirt or blouse, no sneakers',
    icon: '👔',
  },
  {
    id: '3',
    title: 'Business Casual',
    description: 'Dress pants/skirt, button-down shirt, dress shoes',
    icon: '💼',
  },
  {
    id: '4',
    title: 'Cocktail Attire',
    description: 'Cocktail dress or suit, elegant but not formal',
    icon: '🍸',
  },
  {
    id: '5',
    title: 'Black Tie Optional',
    description: 'Tuxedo encouraged but dark suit acceptable',
    icon: '🎩',
  },
  {
    id: '6',
    title: 'Black Tie',
    description: 'Tuxedo for men, evening gown for women',
    icon: '🤵',
  },
  { id: '7', title: 'White Attire', description: 'All white clothing requested', icon: '⚪' },
  {
    id: '8',
    title: 'Theme Party',
    description: 'Specific costume or theme (specify in custom)',
    icon: '🎭',
  },
  { id: '9', title: 'Beach/Pool', description: 'Swimwear, cover-ups, sandals', icon: '🏖️' },
  {
    id: '10',
    title: 'Athletic/Sporty',
    description: 'Sportswear, sneakers, athleisure',
    icon: '🏃',
  },
  {
    id: '11',
    title: 'Festival',
    description: 'Comfortable, expressive, weather-appropriate',
    icon: '🎪',
  },
  { id: '12', title: 'All Black', description: 'Black clothing only', icon: '⚫' },
];

export default function DressCodeModal({
  visible,
  onClose,
  onSave,
  initialDressCode,
}: DressCodeModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customDressCode, setCustomDressCode] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Initialize with existing dress code
  React.useEffect(() => {
    if (visible && initialDressCode) {
      const preset = PRESET_DRESS_CODES.find((code) => code.title === initialDressCode);
      if (preset) {
        setSelectedPreset(preset.id);
        setUseCustom(false);
      } else {
        setCustomDressCode(initialDressCode);
        setUseCustom(true);
      }
    }
  }, [visible, initialDressCode]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    setUseCustom(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    let dressCode: string | null = null;

    if (useCustom && customDressCode.trim()) {
      dressCode = customDressCode.trim();
    } else if (selectedPreset) {
      const preset = PRESET_DRESS_CODES.find((code) => code.id === selectedPreset);
      dressCode = preset?.title || null;
    }

    onSave(dressCode);
    onClose();
  };

  const handleCancel = () => {
    setSelectedPreset(null);
    setCustomDressCode('');
    setUseCustom(false);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <Text style={styles.title}>Dress Code</Text>
            <Text style={styles.subtitle}>Let guests know what to wear</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Preset Dress Codes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select a dress code</Text>
              {PRESET_DRESS_CODES.map((code) => (
                <Pressable
                  key={code.id}
                  style={[
                    styles.presetItem,
                    selectedPreset === code.id && !useCustom && styles.presetItemSelected,
                  ]}
                  onPress={() => handleSelectPreset(code.id)}
                >
                  <Text style={styles.presetIcon}>{code.icon}</Text>
                  <View style={styles.presetContent}>
                    <Text
                      style={[
                        styles.presetTitle,
                        selectedPreset === code.id && !useCustom && styles.presetTitleSelected,
                      ]}
                    >
                      {code.title}
                    </Text>
                    <Text style={styles.presetDescription}>{code.description}</Text>
                  </View>
                  {selectedPreset === code.id && !useCustom && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Custom Dress Code */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Or create custom</Text>
              <Pressable
                style={[styles.customContainer, useCustom && styles.customContainerActive]}
                onPress={() => {
                  setUseCustom(true);
                  setSelectedPreset(null);
                }}
              >
                <TextInput
                  style={styles.customInput}
                  value={customDressCode}
                  onChangeText={setCustomDressCode}
                  placeholder="Enter custom dress code..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                  maxLength={100}
                  onFocus={() => {
                    setUseCustom(true);
                    setSelectedPreset(null);
                  }}
                />
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {initialDressCode && (
              <Pressable style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            )}
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveButton,
                !selectedPreset &&
                  (!useCustom || !customDressCode.trim()) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!selectedPreset && (!useCustom || !customDressCode.trim())}
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
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E5E5',
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
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    maxHeight: '70%',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  presetItemSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  presetIcon: {
    fontSize: 24,
  },
  presetContent: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  presetTitleSelected: {
    color: '#007AFF',
  },
  presetDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  customContainer: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  customContainerActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  customInput: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
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
    backgroundColor: '#E5E5E5',
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
