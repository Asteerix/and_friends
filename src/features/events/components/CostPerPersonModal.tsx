import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import BottomModal from './BottomModal';

interface CostPerPersonModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (amount: string, description: string) => void;
}

export default function CostPerPersonModal({
  visible,
  onClose,
  onSave,
}: CostPerPersonModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    onSave(amount || '0.00', description);
    onClose();
  };

  const formatAmount = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // More than one decimal point, keep only first
      setAmount(parts[0] + '.' + parts[1]);
    } else if (parts.length === 2 && parts[1].length > 2) {
      // Limit to 2 decimal places
      setAmount(parts[0] + '.' + parts[1].substring(0, 2));
    } else {
      setAmount(cleaned);
    }
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="💰 Cost Per Person"
      height={380}
      onSave={handleSave}
      saveButtonText="Save"
    >
      <View style={styles.container}>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={formatAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#C7C7CC"
          />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this for? (e.g. dinner, rentals)"
            placeholderTextColor="#C7C7CC"
            multiline
            numberOfLines={1}
          />
        </View>
      </View>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  amountInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '300',
    color: '#000',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  descriptionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 50,
  },
});