import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from "@/hooks/useProfile";
import * as Haptics from 'expo-haptics';

interface PreferenceSection {
  title: string;
  items: PreferenceItem[];
}

interface PreferenceItem {
  id: string;
  icon: string;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'navigate';
  value?: boolean | string;
  options?: { label: string; value: string }[];
}

const preferenceSections: PreferenceSection[] = [
  {
    title: 'Event Preferences',
    items: [
      {
        id: 'event_notifications',
        icon: 'notifications-outline',
        label: 'Event Notifications',
        description: 'Get notified about new events',
        type: 'toggle',
      },
      {
        id: 'event_reminders',
        icon: 'alarm-outline',
        label: 'Event Reminders',
        description: '1 hour before events you\'re attending',
        type: 'toggle',
      },
      {
        id: 'nearby_events',
        icon: 'location-outline',
        label: 'Nearby Events',
        description: 'Show events within 10 miles',
        type: 'toggle',
      },
      {
        id: 'event_categories',
        icon: 'grid-outline',
        label: 'Preferred Categories',
        description: 'Choose your favorite event types',
        type: 'navigate',
      },
    ],
  },
  {
    title: 'Social Preferences',
    items: [
      {
        id: 'friend_requests',
        icon: 'person-add-outline',
        label: 'Friend Requests',
        description: 'Who can send you friend requests',
        type: 'select',
        options: [
          { label: 'Everyone', value: 'everyone' },
          { label: 'Friends of Friends', value: 'friends_of_friends' },
          { label: 'No One', value: 'no_one' },
        ],
      },
      {
        id: 'message_requests',
        icon: 'chatbubble-outline',
        label: 'Message Requests',
        description: 'Who can message you',
        type: 'select',
        options: [
          { label: 'Everyone', value: 'everyone' },
          { label: 'Friends Only', value: 'friends' },
          { label: 'No One', value: 'no_one' },
        ],
      },
      {
        id: 'show_online_status',
        icon: 'radio-button-on-outline',
        label: 'Show Online Status',
        description: 'Let friends see when you\'re active',
        type: 'toggle',
      },
      {
        id: 'share_location',
        icon: 'navigate-outline',
        label: 'Share Location with Friends',
        description: 'During events you\'re both attending',
        type: 'toggle',
      },
    ],
  },
  {
    title: 'Content Preferences',
    items: [
      {
        id: 'auto_play_stories',
        icon: 'play-circle-outline',
        label: 'Auto-play Stories',
        description: 'Automatically play next story',
        type: 'toggle',
      },
      {
        id: 'data_saver',
        icon: 'wifi-outline',
        label: 'Data Saver Mode',
        description: 'Reduce data usage on cellular',
        type: 'toggle',
      },
      {
        id: 'language',
        icon: 'language-outline',
        label: 'Language',
        description: 'English',
        type: 'navigate',
      },
      {
        id: 'time_zone',
        icon: 'time-outline',
        label: 'Time Zone',
        description: 'Automatic',
        type: 'navigate',
      },
    ],
  },
];

export default function PreferencesScreen() {
  const navigation = useNavigation();
  const { profile, updateProfile } = useProfile();
  
  const [preferences, setPreferences] = useState({
    event_notifications: true,
    event_reminders: true,
    nearby_events: true,
    friend_requests: 'everyone',
    message_requests: 'everyone',
    show_online_status: true,
    share_location: false,
    auto_play_stories: true,
    data_saver: false,
  });

  const handleToggle = async (id: string, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setPreferences(prev => ({ ...prev, [id]: value }));
    
    // Save to profile
    await updateProfile({ 
      preferences: { ...preferences, [id]: value } 
    });
  };

  const handleSelect = (id: string, value: string) => {
    Alert.alert(
      'Change Preference',
      `Are you sure you want to change this setting?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            setPreferences(prev => ({ ...prev, [id]: value }));
            await updateProfile({ 
              preferences: { ...preferences, [id]: value } 
            });
          },
        },
      ]
    );
  };

  const handleNavigate = (id: string) => {
    switch (id) {
      case 'event_categories':
        navigation.navigate('CategoryPreferences' as never);
        break;
      case 'language':
        navigation.navigate('LanguageSettings' as never);
        break;
      case 'time_zone':
        navigation.navigate('TimeZoneSettings' as never);
        break;
    }
  };

  const renderPreferenceItem = (item: PreferenceItem) => {
    switch (item.type) {
      case 'toggle':
        return (
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <Ionicons name={item.icon as any} size={24} color="#333" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>{item.label}</Text>
                {item.description && (
                  <Text style={styles.preferenceDescription}>{item.description}</Text>
                )}
              </View>
            </View>
            <Switch
              value={preferences[item.id as keyof typeof preferences] as boolean}
              onValueChange={(value) => handleToggle(item.id, value)}
              trackColor={{ false: '#e0e0e0', true: '#45B7D1' }}
              thumbColor="white"
            />
          </View>
        );

      case 'select':
        const currentValue = preferences[item.id as keyof typeof preferences] as string;
        const currentOption = item.options?.find(opt => opt.value === currentValue);
        
        return (
          <TouchableOpacity
            style={styles.preferenceItem}
            onPress={() => {
              // Show selection modal
              Alert.alert(
                item.label,
                'Select an option',
                item.options?.map(option => ({
                  text: option.label,
                  onPress: () => handleSelect(item.id, option.value),
                  style: option.value === currentValue ? 'default' : undefined,
                })).concat([{ text: 'Cancel', style: 'cancel' }])
              );
            }}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name={item.icon as any} size={24} color="#333" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>{item.label}</Text>
                {item.description && (
                  <Text style={styles.preferenceDescription}>{item.description}</Text>
                )}
              </View>
            </View>
            <View style={styles.preferenceRight}>
              <Text style={styles.preferenceValue}>{currentOption?.label}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        );

      case 'navigate':
        return (
          <TouchableOpacity
            style={styles.preferenceItem}
            onPress={() => handleNavigate(item.id)}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name={item.icon as any} size={24} color="#333" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>{item.label}</Text>
                {item.description && (
                  <Text style={styles.preferenceDescription}>{item.description}</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#45B7D1', '#3498DB']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Preferences</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {preferenceSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  {renderPreferenceItem(item)}
                  {index < section.items.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.resetSection}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Reset Preferences',
                'This will reset all preferences to their default values.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                      // Reset to defaults
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="refresh-outline" size={24} color="#FF6B6B" />
            <Text style={styles.resetButtonText}>Reset All Preferences</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceInfo: {
    marginLeft: 15,
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#666',
  },
  preferenceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceValue: {
    fontSize: 14,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 59,
  },
  resetSection: {
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});