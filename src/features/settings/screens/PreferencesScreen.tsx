import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '@/hooks/useProfile';
import { Colors } from '@/shared/config/Colors';
import CustomText from '@/shared/ui/CustomText';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { supabase } from '@/shared/lib/supabase/client';
import { generalCache, userCache, eventCache, imageCache } from '@/shared/utils/cache/cacheManager';

export default function PreferencesScreen() {
  const { profile, loading, refreshProfile } = useProfile();
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
  const [clearingCache, setClearingCache] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load existing settings when profile is available
  useEffect(() => {
    if (profile?.settings) {
      if (profile.settings.notifications) {
        setNotifications({
          eventInvites: profile.settings.notifications.event_invites ?? true,
          eventReminders: profile.settings.notifications.event_reminders ?? true,
          eventUpdates: profile.settings.notifications.event_updates ?? true,
          newFollowers: profile.settings.notifications.new_followers ?? true,
          messages: profile.settings.notifications.messages ?? true,
          stories: profile.settings.notifications.stories ?? false,
        });
      }
      if (profile.settings.privacy) {
        setPrivacy({
          profilePublic: profile.settings.privacy.profile_public ?? true,
          showLocation: profile.settings.privacy.show_location ?? true,
          showAge: profile.settings.privacy.show_age ?? true,
          allowMessages: profile.settings.privacy.allow_messages ?? true,
        });
      }
    }
  }, [profile]);

  const saveSettings = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const settingsData = {
        notifications: {
          event_invites: notifications.eventInvites,
          event_reminders: notifications.eventReminders,
          event_updates: notifications.eventUpdates,
          new_followers: notifications.newFollowers,
          messages: notifications.messages,
          stories: notifications.stories,
        },
        privacy: {
          profile_public: privacy.profilePublic,
          show_location: privacy.showLocation,
          show_age: privacy.showAge,
          allow_messages: privacy.allowMessages,
        },
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          settings: settingsData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      // Refresh profile to get updated settings
      if (refreshProfile) {
        await refreshProfile();
      }

      Alert.alert(
        t('common.success'),
        t('settings.preferences.settingsSaved', 'Settings saved successfully')
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('settings.preferences.failedToSave', 'Failed to save settings')
      );
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
          onPress: clearAllCaches,
        },
      ]
    );
  };

  const clearAllCaches = async () => {
    setClearingCache(true);
    try {
      // Clear all cache managers
      await Promise.all([
        generalCache.clear(),
        userCache.clear(),
        eventCache.clear(),
        imageCache.clear(),
      ]);

      // Clear AsyncStorage items (except auth and essential data)
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(
        (key) =>
          !key.includes('auth') &&
          !key.includes('session') &&
          !key.includes('user-session') &&
          !key.includes('onboarding') &&
          (key.includes('cache') ||
            key.includes('temp') ||
            key.includes('image') ||
            key.includes('data-cache'))
      );

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      Alert.alert(
        t('common.success'),
        t('settings.preferences.cacheCleared', 'Cache cleared successfully')
      );
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert(t('common.error', 'Error'), 'Failed to clear cache. Please try again.');
    } finally {
      setClearingCache(false);
    }
  };

  const handleDownloadData = () => {
    Alert.alert(
      t('settings.account.downloadData', 'Download Data'),
      t('settings.preferences.downloadDataMessage', 'Your data will be exported as a JSON file'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.preferences.request', 'Export'),
          onPress: exportUserData,
        },
      ]
    );
  };

  const exportUserData = async () => {
    if (!profile?.id) return;

    setExportingData(true);
    try {
      // Collect user data from various tables
      const [profileData, eventsData, messagesData, friendsData] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', profile.id).single(),
        supabase.from('events').select('*').eq('user_id', profile.id),
        supabase.from('messages').select('*').eq('user_id', profile.id),
        supabase
          .from('friendships')
          .select('*, friend:friend_id(full_name, username)')
          .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`),
      ]);

      const exportData = {
        profile: profileData.status === 'fulfilled' ? profileData.value.data : null,
        events: eventsData.status === 'fulfilled' ? eventsData.value.data || [] : [],
        messages: messagesData.status === 'fulfilled' ? messagesData.value.data || [] : [],
        friendships: friendsData.status === 'fulfilled' ? friendsData.value.data || [] : [],
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
      };

      // Create JSON file
      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `and-friends-data-${profile.username || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Log the export for audit purposes
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: profile.id,
          action: 'data_export',
          metadata: { export_date: new Date().toISOString() },
        })
        .catch(() => {}); // Ignore errors for logging

      Alert.alert(
        t('common.success'),
        `Data exported successfully to ${fileName}\n\nFile saved to: ${fileUri}`
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert(t('common.error', 'Error'), 'Failed to export data. Please try again later.');
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.account.deleteAccount', 'Delete Account'),
      t(
        'settings.preferences.deleteAccountWarning',
        'This action cannot be undone. All your data will be permanently deleted.'
      ),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => setShowDeleteConfirm(true),
        },
      ]
    );
  };

  const confirmAccountDeletion = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      Alert.alert(t('common.error', 'Error'), 'Please type "DELETE" exactly to confirm');
      return;
    }

    if (!profile?.id) return;

    setDeletingAccount(true);
    try {
      // Log the deletion attempt
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: profile.id,
          action: 'account_deletion_initiated',
          metadata: { deletion_date: new Date().toISOString() },
        })
        .catch(() => {}); // Ignore logging errors

      // Delete user data from various tables
      await Promise.allSettled([
        supabase.from('event_participants').delete().eq('user_id', profile.id),
        supabase.from('messages').delete().eq('user_id', profile.id),
        supabase.from('chat_participants').delete().eq('user_id', profile.id),
        supabase
          .from('friendships')
          .delete()
          .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`),
        supabase.from('events').delete().eq('created_by', profile.id),
        supabase.from('profiles').delete().eq('id', profile.id),
      ]);

      // Clear all local data
      await Promise.all([
        generalCache.clear(),
        userCache.clear(),
        eventCache.clear(),
        imageCache.clear(),
        AsyncStorage.clear(),
      ]);

      // Sign out
      await supabase.auth.signOut();

      Alert.alert(
        t('settings.preferences.accountDeleted', 'Account Deleted'),
        t(
          'settings.preferences.accountDeletedMessage',
          'Your account has been permanently deleted'
        ),
        [
          {
            text: t('common.ok', 'OK'),
            onPress: () => {
              // Navigate to auth screen
              router.replace('/');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        t('common.error', 'Error'),
        'Failed to delete account. Please contact support if this issue persists.'
      );
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const cancelAccountDeletion = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  const notificationSettings = [
    {
      label: t('settings.notifications.eventInvites', 'Event Invites'),
      description: t(
        'settings.notifications.eventInvitesDesc',
        'Get notified when someone invites you to an event'
      ),
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
      description: t(
        'settings.notifications.eventUpdatesDesc',
        "Changes to events you're attending"
      ),
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
              <CustomText style={styles.settingLabel}>
                {t('settings.preferences.language')}
              </CustomText>
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

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearCache}
            disabled={clearingCache}
          >
            <Ionicons name="trash-outline" size={24} color={Colors.light.text} />
            <View style={styles.actionContent}>
              <CustomText style={styles.actionLabel}>
                {t('settings.preferences.clearCache', 'Clear Cache')}
              </CustomText>
              {clearingCache && <ActivityIndicator size="small" color={Colors.light.tint} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleDownloadData}
            disabled={exportingData}
          >
            <Ionicons name="download-outline" size={24} color={Colors.light.text} />
            <View style={styles.actionContent}>
              <CustomText style={styles.actionLabel}>
                {t('settings.account.downloadData', 'Download Data')}
              </CustomText>
              {exportingData && <ActivityIndicator size="small" color={Colors.light.tint} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.dangerAction]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            <Ionicons name="warning-outline" size={24} color={Colors.light.error} />
            <View style={styles.actionContent}>
              <CustomText style={[styles.actionLabel, styles.dangerText]}>
                {t('settings.account.deleteAccount', 'Delete Account')}
              </CustomText>
              {deletingAccount && <ActivityIndicator size="small" color={Colors.light.error} />}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <CustomText style={styles.modalTitle}>
              {t('settings.preferences.confirmDeletion', 'Confirm Account Deletion')}
            </CustomText>
            <CustomText style={styles.modalMessage}>
              {t(
                'settings.preferences.typeDeleteToConfirm',
                'Please type "DELETE" to confirm this action'
              )}
            </CustomText>
            <TextInput
              style={styles.deleteInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type DELETE here"
              placeholderTextColor={Colors.light.textSecondary}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelAccountDeletion}
                disabled={deletingAccount}
              >
                <CustomText style={styles.cancelButtonText}>{t('common.cancel')}</CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmAccountDeletion}
                disabled={deletingAccount || deleteConfirmText.toUpperCase() !== 'DELETE'}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <CustomText style={styles.deleteButtonText}>{t('common.delete')}</CustomText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    flex: 1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: Colors.light.error,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  deleteButton: {
    backgroundColor: Colors.light.error,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
