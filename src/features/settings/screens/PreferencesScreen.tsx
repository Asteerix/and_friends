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
import { useTranslation } from 'react-i18next';

import { useProfile } from '@/hooks/useProfile';
import { Colors } from '@/shared/config/Colors';
import CustomText from '@/shared/ui/CustomText';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

export default function PreferencesScreen() {
  const { loading } = useProfile();
  const { t } = useTranslation();

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
      Alert.alert(t('common.success'), t('settings.preferences.settingsSaved', 'Settings saved successfully'));
    } catch (error) {
      Alert.alert(t('errors.general'), t('settings.preferences.failedToSave', 'Failed to save settings'));
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
    Alert.alert(
      t('settings.preferences.clearCache', 'Clear Cache'), 
      t('settings.preferences.clearCacheMessage', 'This will clear all cached data. Continue?'), 
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear', 'Clear'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cache clearing
            Alert.alert(t('common.success'), t('settings.preferences.cacheCleared', 'Cache cleared'));
          },
        },
      ]
    );
  };

  const handleDownloadData = () => {
    Alert.alert(
      t('settings.account.downloadData'), 
      t('settings.preferences.downloadDataMessage', 'Your data will be sent to your email address'), 
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.preferences.request', 'Request'),
          onPress: () => {
            // TODO: Implement data export
            Alert.alert(
              t('common.success'),
              t('settings.preferences.dataRequestSubmitted', 'Data request submitted. You will receive an email within 24 hours.')
            );
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.account.deleteAccount'),
      t('settings.preferences.deleteAccountWarning', 'This action cannot be undone. All your data will be permanently deleted.'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.preferences.confirmDeletion', 'Confirm Deletion'), 
              t('settings.preferences.typeDeleteToConfirm', 'Please type "DELETE" to confirm'), 
              [
                {
                  text: t('common.cancel'),
                  style: 'cancel',
                },
                {
                  text: t('common.confirm'),
                  style: 'destructive',
                  onPress: async () => {
                    // TODO: Implement account deletion
                    Alert.alert(
                      t('settings.preferences.accountDeleted', 'Account Deleted'), 
                      t('settings.preferences.accountDeletedMessage', 'Your account has been deleted')
                    );
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const notificationSettings = [
    {
      label: t('settings.notifications.eventInvites', 'Event Invites'),
      description: t('settings.notifications.eventInvitesDesc', 'Get notified when someone invites you to an event'),
      value: notifications.eventInvites,
      onToggle: handleNotificationToggle('eventInvites'),
    },
    {
      label: t('settings.notifications.eventReminders'),
      description: t('settings.notifications.eventRemindersDesc', 'Reminders for upcoming events'),
      value: notifications.eventReminders,
      onToggle: handleNotificationToggle('eventReminders'),
    },
    {
      label: t('settings.notifications.eventUpdates', 'Event Updates'),
      description: t('settings.notifications.eventUpdatesDesc', "Changes to events you're attending"),
      value: notifications.eventUpdates,
      onToggle: handleNotificationToggle('eventUpdates'),
    },
    {
      label: t('settings.notifications.newFollowers'),
      description: t('settings.notifications.newFollowersDesc', 'When someone follows you'),
      value: notifications.newFollowers,
      onToggle: handleNotificationToggle('newFollowers'),
    },
    {
      label: t('settings.notifications.messages'),
      description: t('settings.notifications.messagesDesc', 'Direct messages from friends'),
      value: notifications.messages,
      onToggle: handleNotificationToggle('messages'),
    },
    {
      label: t('settings.notifications.stories', 'Stories'),
      description: t('settings.notifications.storiesDesc', 'New stories from friends'),
      value: notifications.stories,
      onToggle: handleNotificationToggle('stories'),
    },
  ];

  const privacySettings = [
    {
      label: t('settings.privacy.profileVisibility'),
      description: t('settings.privacy.publicProfileDesc', 'Anyone can see your profile'),
      value: privacy.profilePublic,
      onToggle: handlePrivacyToggle('profilePublic'),
    },
    {
      label: t('settings.privacy.showLocation'),
      description: t('settings.privacy.showLocationDesc', 'Show your general location on profile'),
      value: privacy.showLocation,
      onToggle: handlePrivacyToggle('showLocation'),
    },
    {
      label: t('settings.privacy.showAge', 'Show Age'),
      description: t('settings.privacy.showAgeDesc', 'Display your age on profile'),
      value: privacy.showAge,
      onToggle: handlePrivacyToggle('showAge'),
    },
    {
      label: t('settings.privacy.allowMessages'),
      description: t('settings.privacy.allowMessagesDesc', 'Who can send you direct messages'),
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
          <CustomText style={styles.title}>{t('settings.preferences.title')}</CustomText>
          <TouchableOpacity onPress={saveSettings} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.light.tint} />
            ) : (
              <CustomText style={styles.saveButton}>{t('common.save')}</CustomText>
            )}
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>{t('settings.notifications.title')}</CustomText>
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
          <CustomText style={styles.sectionTitle}>{t('settings.privacy.title')}</CustomText>
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

        {/* Language Section */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>{t('settings.preferences.language')}</CustomText>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <CustomText style={styles.settingLabel}>{t('settings.preferences.language')}</CustomText>
              <CustomText style={styles.settingDescription}>
                {t('settings.preferences.languageDesc', 'Choose your preferred language')}
              </CustomText>
            </View>
            <LanguageSwitcher showLabel={false} />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>{t('settings.account.title')}</CustomText>

          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Ionicons name="trash-outline" size={24} color={Colors.light.text} />
            <CustomText style={styles.actionLabel}>{t('settings.preferences.clearCache', 'Clear Cache')}</CustomText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleDownloadData}>
            <Ionicons name="download-outline" size={24} color={Colors.light.text} />
            <CustomText style={styles.actionLabel}>{t('settings.account.downloadData')}</CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.dangerAction]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="warning-outline" size={24} color={Colors.light.error} />
            <CustomText style={[styles.actionLabel, styles.dangerText]}>{t('settings.account.deleteAccount')}</CustomText>
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
