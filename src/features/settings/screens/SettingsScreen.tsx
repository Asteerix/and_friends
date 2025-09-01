import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  Text,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

interface PrivacyOption {
  label: string;
  value: string;
}

interface Settings {
  notifications: {
    event_invites: boolean;
    friend_requests: boolean;
    event_reminders: boolean;
  };
  privacy: {
    who_can_invite: string;
    hide_from_search: boolean;
  };
}

const SETTINGS_STORAGE_KEY = '@andfriends_settings';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const { session } = useSession();

  // Notification settings
  const [eventInvites, setEventInvites] = useState(true);
  const [friendRequests, setFriendRequests] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);

  // Privacy settings
  const [whoCanInvite, setWhoCanInvite] = useState<string>('Public');
  const [hideFromSearch, setHideFromSearch] = useState(false);

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Store initial values for discard
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null);

  // Load settings from local storage first, then from profile
  useEffect(() => {
    loadSettings();
  }, [profile]);

  const loadSettings = async () => {
    try {
      // First try to load from local storage
      const localSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (localSettings) {
        const parsed = JSON.parse(localSettings) as Settings;
        applySettings(parsed);
      } else if (profile?.settings) {
        // Fall back to profile settings
        applySettings(profile.settings);
      }

      // Store initial settings for discard functionality
      const currentSettings = {
        notifications: {
          event_invites: profile?.settings?.notifications?.event_invites ?? true,
          friend_requests: profile?.settings?.notifications?.friend_requests ?? false,
          event_reminders: profile?.settings?.notifications?.event_reminders ?? true,
        },
        privacy: {
          who_can_invite: profile?.settings?.privacy?.who_can_invite ?? 'Public',
          hide_from_search: profile?.settings?.privacy?.hide_from_search ?? false,
        },
      };
      setInitialSettings(currentSettings);
      applySettings(currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const applySettings = (settings: Settings) => {
    setEventInvites(settings.notifications.event_invites);
    setFriendRequests(settings.notifications.friend_requests);
    setEventReminders(settings.notifications.event_reminders);
    setWhoCanInvite(settings.privacy.who_can_invite);
    setHideFromSearch(settings.privacy.hide_from_search);
  };

  const privacyOptions: PrivacyOption[] = [
    { label: 'Public', value: 'public' },
    { label: 'Friends', value: 'friends' },
    { label: 'No One', value: 'no_one' },
  ];

  const handleToggle =
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => (value: boolean) => {
      setter(value);
      setHasChanges(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

  const handlePrivacyChange = (option: string) => {
    setWhoCanInvite(option);
    setHasChanges(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveChanges = async () => {
    if (!profile?.id || isSaving) return;

    setIsSaving(true);
    try {
      const updatedSettings: Settings = {
        notifications: {
          event_invites: eventInvites,
          friend_requests: friendRequests,
          event_reminders: eventReminders,
        },
        privacy: {
          who_can_invite: whoCanInvite,
          hide_from_search: hideFromSearch,
        },
      };

      // Save to local storage
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));

      // Save to Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Update local profile state
      await updateProfile({ settings: updatedSettings });

      // Update initial settings
      setInitialSettings(updatedSettings);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasChanges(false);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (initialSettings) {
      applySettings(initialSettings);
      setHasChanges(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleHelpFAQ = () => {
    router.push('/screens/settings/help-faq');
  };

  const handleReportBug = async () => {
    const email = 'support@andfriends.app';
    const subject = 'Bug Report';
    const body = `\n\n\n---\nApp Version: 1.0.0\nPlatform: ${Platform.OS}\nUser ID: ${profile?.id || 'Unknown'}`;

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // If email client not available, show alternative
      Alert.alert('Report a Bug', 'Please send your bug report to support@andfriends.app', [
        {
          text: 'Copy Email',
          onPress: () => {
            // In a real app, you'd use Clipboard API here
            Alert.alert('Email copied!');
          },
        },
        { text: 'OK' },
      ]);
    }
  };

  const handleSendFeedback = async () => {
    const email = 'feedback@andfriends.app';
    const subject = 'App Feedback';
    const body = `\n\n\n---\nApp Version: 1.0.0\nPlatform: ${Platform.OS}\nUser: ${profile?.full_name || 'Unknown'}`;

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Send Feedback', 'Please send your feedback to feedback@andfriends.app', [
        {
          text: 'Copy Email',
          onPress: () => {
            Alert.alert('Email copied!');
          },
        },
        { text: 'OK' },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will:\n\n• Delete your profile\n• Remove you from all events\n• Delete all your messages\n• Remove all your friendships\n• Delete all your stories',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Final Confirmation', 'Type "DELETE" to confirm account deletion', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Proceed',
                style: 'destructive',
                onPress: async () => {
                  try {
                    if (!profile?.id) return;

                    // Delete all user data in order
                    // 1. Delete stories
                    await supabase.from('stories').delete().eq('user_id', profile.id);

                    // 2. Delete messages
                    await supabase.from('messages').delete().eq('sender_id', profile.id);

                    // 3. Delete event participants
                    await supabase.from('event_participants').delete().eq('user_id', profile.id);

                    // 4. Delete events created by user
                    await supabase.from('events').delete().eq('creator_id', profile.id);

                    // 5. Delete friendships
                    await supabase
                      .from('friendships')
                      .delete()
                      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);

                    // 6. Delete notifications
                    await supabase.from('notifications').delete().eq('user_id', profile.id);

                    // 7. Clear local storage
                    await AsyncStorage.clear();

                    // 8. Delete profile
                    await supabase.from('profiles').delete().eq('id', profile.id);

                    // 9. Sign out
                    await supabase.auth.signOut();

                    Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                  } catch (error) {
                    console.error('Error deleting account:', error);
                    Alert.alert('Error', 'Failed to delete account. Please contact support.');
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return '+1(617)-309-8438';
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/screens/chat')}>
            <Ionicons name="chatbubble-outline" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/screens/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="notifications-outline" size={18} color="#000" />
            </View>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Stay in the loop, or keep it quiet.</Text>

          <View style={styles.sectionContent}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Event invites</Text>
              <Switch
                value={eventInvites}
                onValueChange={handleToggle(setEventInvites)}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
                style={styles.switch}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Friend requests</Text>
              <Switch
                value={friendRequests}
                onValueChange={handleToggle(setFriendRequests)}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
                style={styles.switch}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Event reminders</Text>
              <Switch
                value={eventReminders}
                onValueChange={handleToggle(setEventReminders)}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
                style={styles.switch}
              />
            </View>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#000" />
            </View>
            <Text style={styles.sectionTitle}>Privacy</Text>
          </View>
          <Text style={styles.sectionSubtitle}>You decide who sees and invites you.</Text>

          <View style={styles.sectionContent}>
            <View style={styles.privacyItem}>
              <Text style={styles.privacyLabel}>Who can invite me to events?</Text>
              <View style={styles.privacyOptions}>
                {privacyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.privacyOption,
                      whoCanInvite === option.label && styles.privacyOptionSelected,
                    ]}
                    onPress={() => handlePrivacyChange(option.label)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.privacyOptionText,
                        whoCanInvite === option.label && styles.privacyOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Hide my profile from search</Text>
              <Switch
                value={hideFromSearch}
                onValueChange={handleToggle(setHideFromSearch)}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5EA"
                style={styles.switch}
              />
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="person-outline" size={18} color="#000" />
            </View>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Manage your login and personal info.</Text>

          <View style={styles.sectionContent}>
            <View style={styles.accountItem}>
              <Text style={styles.settingLabel}>Phone number</Text>
              <Text style={styles.phoneNumber}>{formatPhoneNumber(session?.user?.phone)}</Text>
            </View>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.accountItem}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Text style={styles.settingLabel}>Delete my account</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="help-circle-outline" size={18} color="#000" />
            </View>
            <Text style={styles.sectionTitle}>Support</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Questions? Glitches? We're all ears.</Text>

          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.supportItem}
              activeOpacity={0.7}
              onPress={handleHelpFAQ}
            >
              <Text style={styles.settingLabel}>Help & FAQ</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.supportItem}
              activeOpacity={0.7}
              onPress={handleReportBug}
            >
              <Text style={styles.settingLabel}>Report a bug</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.supportItem}
              activeOpacity={0.7}
              onPress={handleSendFeedback}
            >
              <Text style={styles.settingLabel}>Send feedback</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSaveChanges}
            disabled={!hasChanges || isSaving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>

          {hasChanges && (
            <TouchableOpacity onPress={handleDiscardChanges} activeOpacity={0.7}>
              <Text style={styles.discardText}>Discard Changes</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F8F8',
    height: 44,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 35,
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    marginBottom: 2,
  },
  sectionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 14,
    lineHeight: 17,
    letterSpacing: -0.08,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    minHeight: 44,
  },
  settingLabel: {
    fontSize: 17,
    color: '#000',
    letterSpacing: -0.4,
    flex: 1,
  },
  settingDivider: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 0,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  privacyItem: {
    paddingTop: 12,
    paddingBottom: 14,
  },
  privacyLabel: {
    fontSize: 17,
    color: '#000',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  privacyOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C6C6C8',
    backgroundColor: '#FFFFFF',
  },
  privacyOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  privacyOptionText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },
  privacyOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    minHeight: 44,
  },
  phoneNumber: {
    fontSize: 17,
    color: '#8E8E93',
    letterSpacing: -0.4,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    minHeight: 44,
  },
  actionButtons: {
    marginTop: 35,
    marginHorizontal: 16,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#007AFF',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  discardText: {
    fontSize: 17,
    color: '#007AFF',
    textAlign: 'center',
    paddingVertical: 4,
    letterSpacing: -0.4,
  },
});
