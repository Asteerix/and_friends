import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/hooks/useProfile';
import { Colors } from '@/shared/config/Colors';
import CustomText from '@/shared/ui/CustomText';

export default function PreferencesScreen() {
  const { loading } = useProfile();

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
    showAge: true,
    allowMessages: true,
  });

  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Save settings to user preferences table
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => (value: boolean) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePrivacyToggle = (key: keyof typeof privacy) => (value: boolean) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will clear all cached data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          // TODO: Implement cache clearing
          Alert.alert('Success', 'Cache cleared');
        },
      },
    ]);
  };

  const handleDownloadData = () => {
    Alert.alert('Download Data', 'Your data will be sent to your email address', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Request',
        onPress: () => {
          // TODO: Implement data export
          Alert.alert(
            'Success',
            'Data request submitted. You will receive an email within 24 hours.'
          );
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm Deletion', 'Please type "DELETE" to confirm', [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Confirm',
                style: 'destructive',
                onPress: async () => {
                  // TODO: Implement account deletion
                  Alert.alert('Account Deleted', 'Your account has been deleted');
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const notificationSettings = [
    {
      label: 'Event Invites',
      description: 'Get notified when someone invites you to an event',
      value: notifications.eventInvites,
      onToggle: handleNotificationToggle('eventInvites'),
    },
    {
      label: 'Event Reminders',
      description: 'Reminders for upcoming events',
      value: notifications.eventReminders,
      onToggle: handleNotificationToggle('eventReminders'),
    },
    {
      label: 'Event Updates',
      description: "Changes to events you're attending",
      value: notifications.eventUpdates,
      onToggle: handleNotificationToggle('eventUpdates'),
    },
    {
      label: 'New Followers',
      description: 'When someone follows you',
      value: notifications.newFollowers,
      onToggle: handleNotificationToggle('newFollowers'),
    },
    {
      label: 'Messages',
      description: 'Direct messages from friends',
      value: notifications.messages,
      onToggle: handleNotificationToggle('messages'),
    },
    {
      label: 'Stories',
      description: 'New stories from friends',
      value: notifications.stories,
      onToggle: handleNotificationToggle('stories'),
    },
  ];

  const privacySettings = [
    {
      label: 'Public Profile',
      description: 'Anyone can see your profile',
      value: privacy.profilePublic,
      onToggle: handlePrivacyToggle('profilePublic'),
    },
    {
      label: 'Show Location',
      description: 'Show your general location on profile',
      value: privacy.showLocation,
      onToggle: handlePrivacyToggle('showLocation'),
    },
    {
      label: 'Show Age',
      description: 'Display your age on profile',
      value: privacy.showAge,
      onToggle: handlePrivacyToggle('showAge'),
    },
    {
      label: 'Allow Messages',
      description: 'Who can send you direct messages',
      value: privacy.allowMessages,
      onToggle: handlePrivacyToggle('allowMessages'),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <CustomText style={styles.title}>Preferences</CustomText>
          <TouchableOpacity onPress={saveSettings} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.light.tint} />
            ) : (
              <CustomText style={styles.saveButton}>Save</CustomText>
            )}
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>Notifications</CustomText>
          {notificationSettings.map((setting, index) => (
            <View key={index} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <CustomText style={styles.settingLabel}>{setting.label}</CustomText>
                {setting.description && (
                  <CustomText style={styles.settingDescription}>{setting.description}</CustomText>
                )}
              </View>
              <Switch
                value={setting.value}
                onValueChange={setting.onToggle}
                trackColor={{
                  false: Colors.light.tabIconDefault,
                  true: Colors.light.tint,
                }}
              />
            </View>
          ))}
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>Privacy</CustomText>
          {privacySettings.map((setting, index) => (
            <View key={index} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <CustomText style={styles.settingLabel}>{setting.label}</CustomText>
                {setting.description && (
                  <CustomText style={styles.settingDescription}>{setting.description}</CustomText>
                )}
              </View>
              <Switch
                value={setting.value}
                onValueChange={setting.onToggle}
                trackColor={{
                  false: Colors.light.tabIconDefault,
                  true: Colors.light.tint,
                }}
              />
            </View>
          ))}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>Account</CustomText>

          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Ionicons name="trash-outline" size={24} color={Colors.light.text} />
            <CustomText style={styles.actionLabel}>Clear Cache</CustomText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleDownloadData}>
            <Ionicons name="download-outline" size={24} color={Colors.light.text} />
            <CustomText style={styles.actionLabel}>Download My Data</CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.dangerAction]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="warning-outline" size={24} color={Colors.light.error} />
            <CustomText style={[styles.actionLabel, styles.dangerText]}>Delete Account</CustomText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  actionLabel: {
    fontSize: 16,
    marginLeft: 16,
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: Colors.light.error,
  },
});
