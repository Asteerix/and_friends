import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import CustomText, { AfterHoursText } from "@/components/common/CustomText";
import { supabase } from "@/lib/supabase";

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  action?: () => void;
  hasToggle?: boolean;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  hasArrow?: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ],
    );
  };

  const settingsSections = [
    {
      title: 'ACCOUNT',
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          icon: '👤',
          action: () => navigation.navigate('EditProfile' as never),
          hasArrow: true,
        },
        {
          id: 'preferences',
          title: 'Preferences',
          subtitle: 'Notifications, privacy, and more',
          icon: '⚙️',
          action: () => navigation.navigate('Preferences' as never),
          hasArrow: true,
        },
        {
          id: 'contacts',
          title: 'Sync Contacts',
          subtitle: 'Find friends on & friends',
          icon: '📱',
          action: () => {},
          hasArrow: true,
        },
      ] as SettingItem[],
    },
    {
      title: 'SUPPORT',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          icon: '❓',
          action: () => {},
          hasArrow: true,
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          icon: '💬',
          action: () => {},
          hasArrow: true,
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          icon: '📄',
          action: () => {},
          hasArrow: true,
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          icon: '🔒',
          action: () => {},
          hasArrow: true,
        },
      ] as SettingItem[],
    },
    {
      title: 'ABOUT',
      items: [
        {
          id: 'version',
          title: 'Version',
          subtitle: '1.0.0',
          icon: '📱',
        },
      ] as SettingItem[],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.action}
      activeOpacity={item.action ? 0.7 : 1}
      disabled={!item.action}
    >
      <View style={styles.settingLeft}>
        <CustomText size="lg" style={styles.settingIcon}>
          {item.icon}
        </CustomText>
        <View style={styles.settingText}>
          <CustomText size="md">{item.title}</CustomText>
          {item.subtitle && (
            <CustomText size="sm" color="#666">
              {item.subtitle}
            </CustomText>
          )}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {item.hasToggle && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
            thumbColor="#FFF"
          />
        )}
        {item.hasArrow && (
          <CustomText size="lg" color="#999">›</CustomText>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <CustomText size="xl">←</CustomText>
        </TouchableOpacity>
        <AfterHoursText size="xl">Settings</AfterHoursText>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <CustomText size="sm" color="#666" style={styles.sectionTitle}>
              {section.title}
            </CustomText>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <CustomText size="md" color="#FF3B30" weight="bold" align="center">
            Sign Out
          </CustomText>
        </TouchableOpacity>
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutButton: {
    marginHorizontal: 16,
    marginVertical: 32,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
});