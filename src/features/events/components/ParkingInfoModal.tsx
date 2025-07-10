import React, { useState, useEffect } from 'react';
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

interface ParkingInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (parkingInfo: {
    available: boolean;
    type?: string;
    price?: string;
    instructions?: string;
    nearbyOptions?: string;
  }) => void;
  initialParkingInfo?: {
    available: boolean;
    type?: string;
    price?: string;
    instructions?: string;
    nearbyOptions?: string;
  };
}

const PARKING_TYPES = [
  { id: 'free', label: 'Free Parking', icon: '🆓' },
  { id: 'paid', label: 'Paid Parking', icon: '💳' },
  { id: 'street', label: 'Street Parking', icon: '🛣️' },
  { id: 'valet', label: 'Valet Service', icon: '🚗' },
  { id: 'limited', label: 'Limited Spots', icon: '⚠️' },
];

export default function ParkingInfoModal({
  visible,
  onClose,
  onSave,
  initialParkingInfo,
}: ParkingInfoModalProps) {
  const insets = useSafeAreaInsets();
  const [parkingAvailable, setParkingAvailable] = useState(
    initialParkingInfo?.available ?? true
  );
  const [selectedType, setSelectedType] = useState(initialParkingInfo?.type || '');
  const [price, setPrice] = useState(initialParkingInfo?.price || '');
  const [instructions, setInstructions] = useState(initialParkingInfo?.instructions || '');
  const [nearbyOptions, setNearbyOptions] = useState(initialParkingInfo?.nearbyOptions || '');

  // Update state when modal becomes visible with new initial data
  useEffect(() => {
    if (visible && initialParkingInfo) {
      console.log('🚗 [ParkingInfoModal] Updating state with initial data:', initialParkingInfo);
      setParkingAvailable(initialParkingInfo.available ?? true);
      setSelectedType(initialParkingInfo.type || '');
      setPrice(initialParkingInfo.price || '');
      setInstructions(initialParkingInfo.instructions || '');
      setNearbyOptions(initialParkingInfo.nearbyOptions || '');
    }
  }, [visible, initialParkingInfo]);

  const handleSave = () => {
    // Validate that something is filled
    if (parkingAvailable && !selectedType) {
      return; // Don't save if parking available but no type selected
    }
    if (!parkingAvailable && !nearbyOptions.trim()) {
      return; // Don't save if no parking and no alternatives provided
    }
    
    const parkingInfo = {
      available: parkingAvailable,
      type: parkingAvailable ? selectedType : undefined,
      price: selectedType === 'paid' || selectedType === 'valet' ? price : undefined,
      instructions: instructions.trim() || undefined,
      nearbyOptions: !parkingAvailable ? nearbyOptions.trim() : undefined,
    };

    onSave(parkingInfo);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleCancel = () => {
    // Reset to initial values
    setParkingAvailable(initialParkingInfo?.available ?? true);
    setSelectedType(initialParkingInfo?.type || '');
    setPrice(initialParkingInfo?.price || '');
    setInstructions(initialParkingInfo?.instructions || '');
    setNearbyOptions(initialParkingInfo?.nearbyOptions || '');
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
            <Text style={styles.title}>Parking Information</Text>
            <Text style={styles.subtitle}>
              Help guests plan their transportation
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <View style={styles.availabilityToggle}>
                <View style={styles.toggleLeft}>
                  <Ionicons name="car-outline" size={24} color="#666" />
                  <Text style={styles.toggleText}>Parking Available</Text>
                </View>
                <Switch
                  value={parkingAvailable}
                  onValueChange={(value) => {
                    setParkingAvailable(value);
                    if (!value) {
                      setSelectedType('');
                      setPrice('');
                      setInstructions('');
                    }
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor="#FFF"
                />
              </View>

              {parkingAvailable ? (
                <>
                  <Text style={styles.sectionTitle}>Parking Type <Text style={{ color: '#FF3B30' }}>*</Text></Text>
                  <View style={styles.typeGrid}>
                    {PARKING_TYPES.map((type) => (
                      <Pressable
                        key={type.id}
                        style={[
                          styles.typeButton,
                          selectedType === type.id && styles.typeButtonSelected,
                        ]}
                        onPress={() => {
                          setSelectedType(type.id);
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.typeIcon}>{type.icon}</Text>
                        <Text style={[
                          styles.typeLabel,
                          selectedType === type.id && styles.typeLabelSelected,
                        ]}>
                          {type.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {(selectedType === 'paid' || selectedType === 'valet') && (
                    <View style={styles.inputSection}>
                      <Text style={styles.inputLabel}>Price/Cost</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., $10/hour, €5 flat rate"
                        value={price}
                        onChangeText={setPrice}
                        returnKeyType="done"
                      />
                    </View>
                  )}

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Parking Instructions <Text style={{ color: '#8E8E93', fontSize: 12 }}>(optional)</Text></Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      placeholder="e.g., Enter through the main gate, parking is on level B2"
                      value={instructions}
                      onChangeText={setInstructions}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              ) : (
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Alternative Parking Options <Text style={{ color: '#FF3B30' }}>*</Text></Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="e.g., Public parking garage 2 blocks away, street parking available on Main St"
                    value={nearbyOptions}
                    onChangeText={setNearbyOptions}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.tipCard}>
                    <Ionicons name="bulb-outline" size={20} color="#FF9500" />
                    <Text style={styles.tipText}>
                      Suggest alternative transportation like public transit or rideshare
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {selectedType && parkingAvailable && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={styles.previewCard}>
                  <View style={styles.previewRow}>
                    <Ionicons name="car" size={20} color="#007AFF" />
                    <View style={styles.previewContent}>
                      <Text style={styles.previewMainText}>
                        {PARKING_TYPES.find(t => t.id === selectedType)?.label}
                      </Text>
                      {price && (
                        <Text style={styles.previewSubText}>{price}</Text>
                      )}
                      {instructions && (
                        <Text style={styles.previewDescription}>{instructions}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.saveButton,
                ((parkingAvailable && !selectedType) || (!parkingAvailable && !nearbyOptions.trim())) && styles.saveButtonDisabled
              ]} 
              onPress={handleSave}
              disabled={(parkingAvailable && !selectedType) || (!parkingAvailable && !nearbyOptions.trim())}
            >
              <Text style={[
                styles.saveButtonText,
                ((parkingAvailable && !selectedType) || (!parkingAvailable && !nearbyOptions.trim())) && styles.saveButtonTextDisabled
              ]}>Save</Text>
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
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  typeIcon: {
    fontSize: 24,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  typeLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E5',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#FF9500',
    flex: 1,
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
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    padding: 16,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  previewSubText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  previewDescription: {
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
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonTextDisabled: {
    color: '#FFF',
    opacity: 0.6,
  },
});