import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EventCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (category: string) => void;
  initialCategory?: string;
}

const EVENT_CATEGORIES = [
  // Primary categories from eventTemplates.ts
  { id: 'nightlife', label: 'Nightlife & Clubs', icon: '🌃', description: 'Clubs, bars, DJ sets, late night events' },
  { id: 'apartment', label: 'Apartment & Home', icon: '🏠', description: 'House parties, game nights, gatherings' },
  { id: 'outdoor', label: 'Outdoor', icon: '🏕️', description: 'Beach, BBQ, camping, festivals, parks' },
  { id: 'activities', label: 'Activities', icon: '🎯', description: 'Sports, games, bowling, mini golf' },
  { id: 'cultural', label: 'Cultural', icon: '🎭', description: 'Art, music, theater, museums, concerts' },
  { id: 'meetup', label: 'Meetups', icon: '🤝', description: 'Networking, book clubs, social groups' },
  { id: 'casual', label: 'Casual', icon: '☕', description: 'Coffee, brunch, happy hour, shopping' },
  { id: 'dining', label: 'Dining', icon: '🍽️', description: 'Dinner parties, wine tasting, cooking' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', description: 'Movies, comedy shows, theme parks' },
  { id: 'party', label: 'Parties & Celebrations', icon: '🎉', description: 'Birthdays, surprises, showers' },
  { id: 'wedding', label: 'Weddings', icon: '💒', description: 'Ceremonies, receptions, engagements' },
  { id: 'seasonal', label: 'Seasonal', icon: '🎄', description: 'Holiday events, New Year, Halloween' },
  { id: 'sports', label: 'Sports & Games', icon: '⚽', description: 'Watch parties, tournaments, matches' },
  { id: 'corporate', label: 'Corporate', icon: '🏢', description: 'Conferences, team building, launches' },
  { id: 'travel', label: 'Travel & Adventures', icon: '✈️', description: 'Trips, tours, weekend getaways' },
  { id: 'wellness', label: 'Wellness & Health', icon: '🧘', description: 'Yoga, fitness, meditation, retreats' },
  
  // Additional categories from HomeScreen
  { id: 'music', label: 'Music', icon: '🎵', description: 'Concerts, live bands, music festivals' },
  { id: 'arts', label: 'Arts', icon: '🎨', description: 'Art exhibitions, creative workshops' },
  { id: 'food', label: 'Food', icon: '🍴', description: 'Food festivals, tastings, markets' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', description: 'Video games, esports, LAN parties' },
];

export default function EventCategoryModal({ 
  visible, 
  onClose, 
  onSave, 
  initialCategory = '' 
}: EventCategoryModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Reset selected category when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedCategory(initialCategory);
    }
  }, [visible, initialCategory]);

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (selectedCategory) {
      onSave(selectedCategory);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom || 20 }]}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Event Category</Text>
            <Text style={styles.subtitle}>
              Choose the category that best describes your event
            </Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.categoriesContainer}>
              {EVENT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.label && styles.categoryCardActive
                  ]}
                  onPress={() => handleSelectCategory(category.label)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <View style={styles.categoryTextContainer}>
                    <Text style={[
                      styles.categoryLabel,
                      selectedCategory === category.label && styles.categoryLabelActive
                    ]}>
                      {category.label}
                    </Text>
                    <Text style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                  </View>
                  {selectedCategory === category.label && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, !selectedCategory && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!selectedCategory}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
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
    height: '90%',
    maxHeight: '90%',
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
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 14,
    width: 40,
    textAlign: 'center',
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  categoryLabelActive: {
    color: '#007AFF',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
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
  saveButtonDisabled: {
    backgroundColor: '#C5C5C7',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
});