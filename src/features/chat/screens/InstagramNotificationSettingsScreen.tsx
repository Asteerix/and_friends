import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSession } from '@/shared/providers/SessionContext';
import { supabase } from '@/shared/lib/supabase/client';

interface NotificationSettings {
  notifications_muted: boolean;
  message_notifications: boolean;
  mention_notifications: boolean;
  reaction_notifications: boolean;
  call_notifications: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  preview_enabled: boolean;
  mute_duration?: string;
}

export default function InstagramNotificationSettingsScreen() {
  const params = useLocalSearchParams<{ chatId: string }>();
  const chatId = params?.chatId;
  const router = useRouter();
  const { session } = useSession();
  const currentUserId = session?.user?.id;

  const [settings, setSettings] = useState<NotificationSettings>({
    notifications_muted: false,
    message_notifications: true,
    mention_notifications: true,
    reaction_notifications: true,
    call_notifications: true,
    sound_enabled: true,
    vibration_enabled: true,
    preview_enabled: true,
  });

  const [showMuteDuration, setShowMuteDuration] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_preferences')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('chat_id', chatId)
        .single();

      if (data && !error) {
        setSettings((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await supabase.from('chat_preferences').upsert(
        {
          user_id: currentUserId,
          chat_id: chatId,
          [key]: value,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,chat_id',
        }
      );
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert on error
      setSettings(settings);
    }
  };

  const handleMuteDuration = (duration: string) => {
    Alert.alert('Muet pendant', `Les notifications seront désactivées pendant ${duration}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          await updateSetting('notifications_muted', true);
          setShowMuteDuration(false);
          // TODO: Schedule unmute based on duration
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={styles.mainToggle}>
            <View>
              <Text style={styles.mainToggleTitle}>Désactiver les notifications</Text>
              <Text style={styles.mainToggleSubtitle}>
                Vous ne recevrez aucune notification de cette conversation
              </Text>
            </View>
            <Switch
              value={settings.notifications_muted}
              onValueChange={(value) => {
                if (value) {
                  setShowMuteDuration(true);
                } else {
                  updateSetting('notifications_muted', false);
                }
              }}
              trackColor={{ false: '#767577', true: '#3797F0' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Notification Types */}
        {!settings.notifications_muted && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Types de notifications</Text>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Ionicons name="chatbubble-outline" size={24} color="#000" />
                  <Text style={styles.optionText}>Messages</Text>
                </View>
                <Switch
                  value={settings.message_notifications}
                  onValueChange={(value) => updateSetting('message_notifications', value)}
                  trackColor={{ false: '#767577', true: '#3797F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Ionicons name="at-outline" size={24} color="#000" />
                  <Text style={styles.optionText}>Mentions</Text>
                </View>
                <Switch
                  value={settings.mention_notifications}
                  onValueChange={(value) => updateSetting('mention_notifications', value)}
                  trackColor={{ false: '#767577', true: '#3797F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Ionicons name="heart-outline" size={24} color="#000" />
                  <Text style={styles.optionText}>Réactions</Text>
                </View>
                <Switch
                  value={settings.reaction_notifications}
                  onValueChange={(value) => updateSetting('reaction_notifications', value)}
                  trackColor={{ false: '#767577', true: '#3797F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Ionicons name="call-outline" size={24} color="#000" />
                  <Text style={styles.optionText}>Appels</Text>
                </View>
                <Switch
                  value={settings.call_notifications}
                  onValueChange={(value) => updateSetting('call_notifications', value)}
                  trackColor={{ false: '#767577', true: '#3797F0' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Alert Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paramètres d'alerte</Text>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Ionicons name="volume-high-outline" size={24} color="#000" />
                  <Text style={styles.optionText}>Son</Text>
                </View>
                <Switch
                  value={settings.sound_enabled}
                  onValueChange={(value) => updateSetting('sound_enabled', value)}
                  trackColor={{ false: '#767577', true: '#3797F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Ionicons name="phone-portrait-outline" size={24} color="#000" />
                  <Text style={styles.optionText}>Vibration</Text>
                </View>
                <Switch
                  value={settings.vibration_enabled}
                  onValueChange={(value) => updateSetting('vibration_enabled', value)}
                  trackColor={{ false: '#767577', true: '#3797F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.option}>
                <View style={styles.optionInfo}>
                  <Ionicons name="eye-outline" size={24} color="#000" />
                  <Text style={styles.optionText}>Aperçu du message</Text>
                </View>
                <Switch
                  value={settings.preview_enabled}
                  onValueChange={(value) => updateSetting('preview_enabled', value)}
                  trackColor={{ false: '#767577', true: '#3797F0' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </>
        )}

        {/* Mute Duration Options */}
        {showMuteDuration && (
          <View style={styles.muteOptions}>
            <TouchableOpacity
              style={styles.muteOption}
              onPress={() => handleMuteDuration('1 heure')}
            >
              <Text style={styles.muteOptionText}>1 heure</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.muteOption}
              onPress={() => handleMuteDuration('8 heures')}
            >
              <Text style={styles.muteOptionText}>8 heures</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.muteOption}
              onPress={() => handleMuteDuration('24 heures')}
            >
              <Text style={styles.muteOptionText}>24 heures</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.muteOption}
              onPress={() => handleMuteDuration("Jusqu'à réactivation")}
            >
              <Text style={styles.muteOptionText}>Jusqu'à réactivation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.muteOption} onPress={() => setShowMuteDuration(false)}>
              <Text style={[styles.muteOptionText, { color: '#999' }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
  },
  mainToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mainToggleSubtitle: {
    fontSize: 14,
    color: '#666',
    maxWidth: '80%',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
  },
  muteOptions: {
    backgroundColor: '#F5F5F5',
    marginTop: 24,
    paddingVertical: 8,
  },
  muteOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  muteOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
