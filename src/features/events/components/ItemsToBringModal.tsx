import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from './BottomModal';

interface Item {
  id: string;
  name: string;
  assignee: string;
}

interface ItemsToBringModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (items: Item[]) => void;
}

export default function ItemsToBringModal({
  visible,
  onClose,
  onSave,
}: ItemsToBringModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [newItemName, setNewItemName] = useState('');

  const addItem = () => {
    if (newItemName.trim()) {
      const newItem: Item = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        assignee: '',
      };
      setItems([...items, newItem]);
      setNewItemName('');
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateAssignee = (id: string, assignee: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, assignee } : item
    ));
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Add Item"
      height={600}
      onSave={handleSave}
      saveButtonText="Save Items"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.addItemSection}>
          <View style={styles.addItemContainer}>
            <TextInput
              style={styles.addItemInput}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="e.g. Snacks, Speakers, Decorations"
              placeholderTextColor="#C7C7CC"
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addItem}
              disabled={!newItemName.trim()}
            >
              <Ionicons 
                name="add" 
                size={24} 
                color="#FFF" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.itemsSectionTitle}>Items to Bring</Text>
          </View>
        )}
        
        <ScrollView 
          style={styles.itemsList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.assigneeInput}
                value={item.assignee}
                onChangeText={(text) => updateAssignee(item.id, text)}
                placeholder="Who's bringing this?"
                placeholderTextColor="#999"
              />
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  addItemSection: {
    marginBottom: 24,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsSection: {
    marginBottom: 12,
    marginTop: 8,
  },
  itemsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  itemsList: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  assigneeInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  deleteButton: {
    padding: 4,
  },
});