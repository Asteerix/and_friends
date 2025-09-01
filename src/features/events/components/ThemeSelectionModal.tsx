import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface ThemeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (theme: string | null) => void;
  initialTheme?: string | null;
}

const PRESET_THEMES = [
  { id: '1', title: '80s Retro', description: 'Neon colors, big hair, vintage vibes', icon: '🕺' },
  {
    id: '2',
    title: 'Tropical Paradise',
    description: 'Hawaiian shirts, leis, beach vibes',
    icon: '🌺',
  },
  { id: '3', title: 'Masquerade', description: 'Masks, mystery, elegance', icon: '🎭' },
  { id: '4', title: 'Hollywood Glam', description: 'Red carpet, glamour, movie stars', icon: '⭐' },
  { id: '5', title: 'Casino Night', description: 'Vegas style, cards, dice', icon: '🎰' },
  { id: '6', title: 'Murder Mystery', description: 'Detective theme, clues, costumes', icon: '🔍' },
  { id: '7', title: 'Gatsby/Roaring 20s', description: 'Flapper dresses, jazz age', icon: '🥂' },
  { id: '8', title: 'Superhero', description: 'Capes, powers, save the day', icon: '🦸' },
  { id: '9', title: 'Halloween', description: 'Costumes, spooky, trick or treat', icon: '🎃' },
  { id: '10', title: 'Christmas/Holiday', description: 'Ugly sweaters, festive cheer', icon: '🎄' },
  { id: '11', title: 'Disco Fever', description: 'Platform shoes, disco balls, funk', icon: '🕺' },
  { id: '12', title: 'Pajama Party', description: 'Comfy PJs, slumber party vibes', icon: '😴' },
  { id: '13', title: 'Sports/Jersey', description: 'Team jerseys, athletic wear', icon: '🏈' },
  {
    id: '14',
    title: 'Around the World',
    description: 'International themes, cultures',
    icon: '🌍',
  },
  {
    id: '15',
    title: 'Movie Characters',
    description: 'Dress as favorite movie characters',
    icon: '🎬',
  },
  {
    id: '16',
    title: 'Decades Party',
    description: 'Pick a decade (50s, 60s, 70s, etc)',
    icon: '⏰',
  },
  { id: '17', title: 'Color Party', description: 'Everyone wears one specific color', icon: '🎨' },
  { id: '18', title: 'Western/Cowboy', description: 'Boots, hats, wild west', icon: '🤠' },
];

export default function ThemeSelectionModal({
  visible,
  onClose,
  onSave,
  initialTheme,
}: ThemeSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Initialize with existing theme
  React.useEffect(() => {
    if (visible && initialTheme) {
      const preset = PRESET_THEMES.find((theme) => theme.title === initialTheme);
      if (preset) {
        setSelectedPreset(preset.id);
        setUseCustom(false);
      } else {
        setCustomTheme(initialTheme);
        setUseCustom(true);
      }
    }
  }, [visible, initialTheme]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    setUseCustom(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    let theme: string | null = null;

    if (useCustom && customTheme.trim()) {
      theme = customTheme.trim();
    } else if (selectedPreset) {
      const preset = PRESET_THEMES.find((t) => t.id === selectedPreset);
      theme = preset?.title || null;
    }

    onSave(theme);
    onClose();
  };

  const handleCancel = () => {
    setSelectedPreset(null);
    setCustomTheme('');
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
            <Text style={styles.title}>Event Theme</Text>
            <Text style={styles.subtitle}>Choose a fun theme for your event</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Preset Themes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Themes</Text>
              {PRESET_THEMES.map((theme) => (
                <Pressable
                  key={theme.id}
                  style={[
                    styles.presetItem,
                    selectedPreset === theme.id && !useCustom && styles.presetItemSelected,
                  ]}
                  onPress={() => handleSelectPreset(theme.id)}
                >
                  <Text style={styles.presetIcon}>{theme.icon}</Text>
                  <View style={styles.presetContent}>
                    <Text
                      style={[
                        styles.presetTitle,
                        selectedPreset === theme.id && !useCustom && styles.presetTitleSelected,
                      ]}
                    >
                      {theme.title}
                    </Text>
                    <Text style={styles.presetDescription}>{theme.description}</Text>
                  </View>
                  {selectedPreset === theme.id && !useCustom && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Custom Theme */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Or create custom theme</Text>
              <Pressable
                style={[styles.customContainer, useCustom && styles.customContainerActive]}
                onPress={() => {
                  setUseCustom(true);
                  setSelectedPreset(null);
                }}
              >
                <TextInput
                  style={styles.customInput}
                  value={customTheme}
                  onChangeText={setCustomTheme}
                  placeholder="Enter your custom theme..."
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
            {initialTheme && (
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
                !selectedPreset && (!useCustom || !customTheme.trim()) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!selectedPreset && (!useCustom || !customTheme.trim())}
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
