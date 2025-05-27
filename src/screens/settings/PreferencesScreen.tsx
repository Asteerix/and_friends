import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import CustomText, { AfterHoursText } from "@/components/common/CustomText";

interface PreferenceItem {
  id: string;
  title: string;
  subtitle?: string;
  value: boolean;
}

export default function PreferencesScreen() {
  const navigation = useNavigation();
  
  const [notifications, setNotifications] = useState({
    eventInvites: true,
    eventReminders: true,
    eventUpdates: true,
    newFollowers: true,
    messages: true,
    stories: false,
  });
  
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showLocation: true,
    showAge: false,
    allowMessages: true,
  });

  const handleNotificationToggle = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePrivacyToggle = (key: string, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const notificationSettings = [
    {
      id: 'eventInvites',
      title: 'Event Invites',
      subtitle: 'When someone invites you to an event',
    },
    {
      id: 'eventReminders',
      title: 'Event Reminders',
      subtitle: '1 hour before events you\'re attending',
    },
    {
      id: 'eventUpdates',
      title: 'Event Updates',
      subtitle: 'Changes to events you\'re attending',
    },
    {
      id: 'newFollowers',
      title: 'New Followers',
      subtitle: 'When someone follows you',
    },
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'New messages from friends',
    },
    {
      id: 'stories',
      title: 'Stories',
      subtitle: 'When friends post new stories',
    },
  ];

  const privacySettings = [
    {
      id: 'profilePublic',
      title: 'Public Profile',
      subtitle: 'Anyone can see your profile',
    },
    {
      id: 'showLocation',
      title: 'Show Location',
      subtitle: 'Display your city on your profile',
    },
    {
      id: 'showAge',
      title: 'Show Age',
      subtitle: 'Display your age on your profile',
    },
    {
      id: 'allowMessages',
      title: 'Allow Messages',
      subtitle: 'Let anyone send you messages',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <CustomText size="xl">←</CustomText>
        </TouchableOpacity>
        <AfterHoursText size="xl">Preferences</AfterHoursText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <CustomText size="sm" color="#666" style={styles.sectionTitle}>
            NOTIFICATIONS
          </CustomText>
          <View style={styles.sectionContent}>
            {notificationSettings.map((setting) => (
              <View key={setting.id} style={styles.preferenceItem}>
                <View style={styles.preferenceText}>
                  <CustomText size="md">{setting.title}</CustomText>
                  {setting.subtitle && (
                    <CustomText size="sm" color="#666">
                      {setting.subtitle}
                    </CustomText>
                  )}
                </View>
                <Switch
                  value={notifications[setting.id as keyof typeof notifications]}
                  onValueChange={(value) => handleNotificationToggle(setting.id, value)}
                  trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                  thumbColor="#FFF"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <CustomText size="sm" color="#666" style={styles.sectionTitle}>
            PRIVACY
          </CustomText>
          <View style={styles.sectionContent}>
            {privacySettings.map((setting) => (
              <View key={setting.id} style={styles.preferenceItem}>
                <View style={styles.preferenceText}>
                  <CustomText size="md">{setting.title}</CustomText>
                  {setting.subtitle && (
                    <CustomText size="sm" color="#666">
                      {setting.subtitle}
                    </CustomText>
                  )}
                </View>
                <Switch
                  value={privacy[setting.id as keyof typeof privacy]}
                  onValueChange={(value) => handlePrivacyToggle(setting.id, value)}
                  trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                  thumbColor="#FFF"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <CustomText size="sm" color="#666" style={styles.sectionTitle}>
            DATA & STORAGE
          </CustomText>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.actionItem}>
              <CustomText size="md">Clear Cache</CustomText>
              <CustomText size="lg" color="#999">›</CustomText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <CustomText size="md">Download My Data</CustomText>
              <CustomText size="lg" color="#999">›</CustomText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]}>
              <CustomText size="md" color="#FF3B30">Delete Account</CustomText>
              <CustomText size="lg" color="#999">›</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#FFF',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  preferenceText: {
    flex: 1,
    marginRight: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
});