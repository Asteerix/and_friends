import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface HobbiesPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (hobbies: string[]) => void;
  currentHobbies: string[];
  maxHobbies?: number;
}

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey1: '#AEB0B4',
  grey2: '#666666',
  primary: '#007AFF',
};

const DEFAULT_HOBBIES = [
  'Painting',
  'Photography',
  'Writing',
  'Singing',
  'Surfing',
  'Running',
  'Playing Instruments',
  'Coding',
  'Hiking',
  'Board Games',
  'Yoga',
  'Biking',
  'Thrifting',
  'Gaming',
  'Dancing',
  'Journaling',
  'Traveling',
  'Reading',
  'Learning Languages',
  'Cooking',
  'Scuba Diving',
  'Gardening',
  'Movies',
  'Music',
  'Art',
  'Fashion',
  'Technology',
  'Fitness',
  'Meditation',
  'Baking',
];

export default function HobbiesPickerModal({
  visible,
  onClose,
  onSelect,
  currentHobbies,
  maxHobbies = 10,
}: HobbiesPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(currentHobbies);
  const [customHobby, setCustomHobby] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHobbies, setCustomHobbies] = useState<string[]>([]);

  React.useEffect(() => {
    if (visible) {
      setSelectedHobbies(currentHobbies);
      // Extract custom hobbies from current selection
      const custom = currentHobbies.filter((h) => !DEFAULT_HOBBIES.includes(h));
      setCustomHobbies(custom);
    }
  }, [visible, currentHobbies]);

  const toggleHobby = (hobby: string) => {
    if (selectedHobbies.includes(hobby)) {
      setSelectedHobbies(selectedHobbies.filter((h) => h !== hobby));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (selectedHobbies.length < maxHobbies) {
      setSelectedHobbies([...selectedHobbies, hobby]);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const addCustomHobby = () => {
    const trimmed = customHobby.trim();
    if (!trimmed) return;

    if (selectedHobbies.length >= maxHobbies) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (selectedHobbies.includes(trimmed)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSelectedHobbies([...selectedHobbies, trimmed]);
    if (!DEFAULT_HOBBIES.includes(trimmed) && !customHobbies.includes(trimmed)) {
      setCustomHobbies([...customHobbies, trimmed]);
    }
    setCustomHobby('');
    setShowCustomInput(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirm = () => {
    onSelect(selectedHobbies);
    onClose();
  };

  const handleCancel = () => {
    setSelectedHobbies(currentHobbies);
    setCustomHobby('');
    setShowCustomInput(false);
    onClose();
  };

  const allHobbies = [...DEFAULT_HOBBIES, ...customHobbies];

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContent, { paddingBottom: insets.bottom || 20 }]}
          keyboardVerticalOffset={0}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Talk to Me About</Text>
            <Text style={styles.subtitle}>
              Select up to {maxHobbies - selectedHobbies.length} more interests
            </Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hobbiesGrid}>
              {allHobbies.map((hobby) => {
                const isSelected = selectedHobbies.includes(hobby);
                const isDisabled = !isSelected && selectedHobbies.length >= maxHobbies;

                return (
                  <Pressable
                    key={hobby}
                    style={[
                      styles.hobbyChip,
                      isSelected && styles.hobbyChipSelected,
                      isDisabled && styles.hobbyChipDisabled,
                    ]}
                    onPress={() => toggleHobby(hobby)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.hobbyChipText,
                        isSelected && styles.hobbyChipTextSelected,
                        isDisabled && styles.hobbyChipTextDisabled,
                      ]}
                    >
                      {hobby}
                    </Text>
                  </Pressable>
                );
              })}

              {selectedHobbies.length < maxHobbies && (
                <Pressable
                  style={[styles.hobbyChip, styles.addChip]}
                  onPress={() => setShowCustomInput(true)}
                >
                  <Text style={styles.addChipText}>+ Add Your Own</Text>
                </Pressable>
              )}
            </View>

            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Type your interest"
                  placeholderTextColor={COLORS.grey1}
                  value={customHobby}
                  onChangeText={setCustomHobby}
                  onSubmitEditing={addCustomHobby}
                  returnKeyType="done"
                  autoFocus
                />
                <View style={styles.customInputActions}>
                  <Pressable
                    style={styles.customCancelButton}
                    onPress={() => {
                      setShowCustomInput(false);
                      setCustomHobby('');
                    }}
                  >
                    <Text style={styles.customCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.customAddButton,
                      !customHobby.trim() && styles.customAddButtonDisabled,
                    ]}
                    onPress={addCustomHobby}
                    disabled={!customHobby.trim()}
                  >
                    <Text style={styles.customAddText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Done</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    maxHeight: '80%',
    height: '80%',
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
    marginBottom: 20,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  hobbiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  hobbyChip: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.grey0,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  hobbyChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderWidth: 0,
  },
  hobbyChipDisabled: {
    opacity: 0.5,
  },
  hobbyChipText: {
    fontSize: 15,
    color: COLORS.black,
    fontWeight: '500',
  },
  hobbyChipTextSelected: {
    color: COLORS.white,
  },
  hobbyChipTextDisabled: {
    color: COLORS.grey1,
  },
  addChip: {
    borderStyle: 'dashed',
    borderColor: COLORS.grey1,
    backgroundColor: COLORS.white,
  },
  addChipText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
  },
  customInputContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
  },
  customInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 12,
  },
  customInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  customCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  customCancelText: {
    color: COLORS.grey2,
    fontSize: 16,
    fontWeight: '500',
  },
  customAddButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAddButtonDisabled: {
    backgroundColor: '#B3D1FF',
    opacity: 0.6,
  },
  customAddText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
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
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});
