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
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import * as Haptics from 'expo-haptics';

const settingsSections = [
  {
    title: 'Account',
    items: [
      { id: 'edit-profile', icon: 'person-outline', label: 'Edit Profile', action: 'navigate' },
      { id: 'phone', icon: 'call-outline', label: 'Phone Number', action: 'navigate' },
      { id: 'email', icon: 'mail-outline', label: 'Email', action: 'navigate' },
      { id: 'password', icon: 'lock-closed-outline', label: 'Change Password', action: 'navigate' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', action: 'toggle' },
      { id: 'location', icon: 'location-outline', label: 'Location Services', action: 'toggle' },
      { id: 'dark-mode', icon: 'moon-outline', label: 'Dark Mode', action: 'toggle' },
      { id: 'language', icon: 'language-outline', label: 'Language', action: 'navigate' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { id: 'blocked', icon: 'ban-outline', label: 'Blocked Users', action: 'navigate' },
      { id: 'hide-age', icon: 'eye-off-outline', label: 'Hide Birth Date', action: 'toggle' },
      { id: 'private-profile', icon: 'shield-outline', label: 'Private Profile', action: 'toggle' },
      { id: 'data', icon: 'document-text-outline', label: 'Download My Data', action: 'navigate' },
    ],
  },
  {
    title: 'Support',
    items: [
      { id: 'help', icon: 'help-circle-outline', label: 'Help Center', action: 'navigate' },
      { id: 'contact', icon: 'chatbubble-outline', label: 'Contact Support', action: 'navigate' },
      { id: 'terms', icon: 'document-outline', label: 'Terms of Service', action: 'navigate' },
      { id: 'privacy', icon: 'shield-checkmark-outline', label: 'Privacy Policy', action: 'navigate' },
    ],
  },
  {
    title: 'About',
    items: [
      { id: 'version', icon: 'information-circle-outline', label: 'Version 1.0.0', action: 'info' },
      { id: 'rate', icon: 'star-outline', label: 'Rate & friends', action: 'navigate' },
      { id: 'share', icon: 'share-social-outline', label: 'Share App', action: 'share' },
    ],
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { profile, updateProfile } = useProfile();
  
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [hideAge, setHideAge] = useState(profile?.hide_birth_date || false);
  const [privateProfile, setPrivateProfile] = useState(false);

  const handleToggle = async (settingId: string, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    switch (settingId) {
      case 'notifications':
        setNotifications(value);
        break;
      case 'location':
        setLocationServices(value);
        break;
      case 'dark-mode':
        setDarkMode(value);
        break;
      case 'hide-age':
        setHideAge(value);
        await updateProfile({ hide_birth_date: value });
        break;
      case 'private-profile':
        setPrivateProfile(value);
        break;
    }
  };

  const handleAction = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    switch (item.id) {
      case 'edit-profile':
        navigation.navigate('EditProfile');
        break;
      case 'logout':
        handleLogout();
        break;
      case 'delete-account':
        handleDeleteAccount();
        break;
      default:
        // Navigate to respective screens
        break;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.navigate('Auth');
          },
        },
      ]
    );
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
          onPress: async () => {
            // TODO: Implement account deletion
          },
        },
      ]
    );
  };

  const getToggleValue = (settingId: string) => {
    switch (settingId) {
      case 'notifications':
        return notifications;
      case 'location':
        return locationServices;
      case 'dark-mode':
        return darkMode;
      case 'hide-age':
        return hideAge;
      case 'private-profile':
        return privateProfile;
      default:
        return false;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#45B7D1', '#3498DB']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {settingsSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.lastItem,
                  ]}
                  onPress={() => item.action === 'navigate' && handleAction(item)}
                  disabled={item.action === 'toggle' || item.action === 'info'}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon as any} size={24} color="#333" />
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  {item.action === 'toggle' && (
                    <Switch
                      value={getToggleValue(item.id)}
                      onValueChange={(value) => handleToggle(item.id, value)}
                      trackColor={{ false: '#e0e0e0', true: '#45B7D1' }}
                      thumbColor="white"
                    />
                  )}
                  {item.action === 'navigate' && (
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dangerButton, styles.deleteButton]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.dangerButtonText, styles.deleteButtonText]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ by & friends team</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    textAlign: 'center',
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  dangerZone: {
    marginTop: 40,
    marginHorizontal: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 10,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 12,
    color: '#bbb',
  },
});