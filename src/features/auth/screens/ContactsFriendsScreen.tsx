import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'react-native-pixel-perfect';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';
import { supabase } from '@/shared/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const DEFAULT_AVATAR = require('../../../assets/default_avatar.png');

interface ContactMatch {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  phone_number: string;
  bio: string | null;
  mutual_friends_count: number;
  is_friend: boolean;
  has_pending_request: boolean;
  contact_name: string; // Name from phone contacts
}

interface PendingRequest {
  user_id: string;
  timestamp: number;
}

const PENDING_REQUESTS_KEY = 'pending_friend_requests';

const ContactsFriendsScreen: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('contacts-friends');
  const { profile } = useProfile();
  const [contacts, setContacts] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  // Save registration step
  useRegistrationStep('contacts_friends');

  useEffect(() => {
    loadContactsAndMatch();
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_REQUESTS_KEY);
      if (stored) {
        setPendingRequests(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const savePendingRequests = async (requests: PendingRequest[]) => {
    try {
      await AsyncStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(requests));
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error saving pending requests:', error);
    }
  };

  const loadContactsAndMatch = async () => {
    try {
      setLoading(true);
      
      // Get phone contacts
      const { data: contactsData } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (!contactsData || contactsData.length === 0) {
        setContacts([]);
        return;
      }

      // Extract all phone numbers
      const phoneNumbers: { number: string; name: string }[] = [];
      contactsData.forEach(contact => {
        if (contact.phoneNumbers) {
          contact.phoneNumbers.forEach(phone => {
            if (phone.number) {
              phoneNumbers.push({
                number: normalizePhoneNumber(phone.number),
                name: contact.name || 'Unknown',
              });
            }
          });
        }
      });

      // Query Supabase for users with these phone numbers
      const { data: matchedUsers, error } = await supabase
        .rpc('match_contacts_with_users', {
          phone_numbers: phoneNumbers.map(p => p.number),
          current_user_id: profile?.id,
        });

      if (error) {
        console.error('Error matching contacts:', error);
        return;
      }

      // Map matched users with contact names and mutual friends
      const mappedContacts: ContactMatch[] = (matchedUsers || []).map((user: any) => {
        const contact = phoneNumbers.find(p => 
          normalizePhoneNumber(p.number) === normalizePhoneNumber(user.phone_number)
        );
        
        return {
          ...user,
          contact_name: contact?.name || 'Unknown',
          mutual_friends_count: user.mutual_friends_count || 0,
        };
      });

      // Sort by mutual friends count (descending)
      mappedContacts.sort((a, b) => b.mutual_friends_count - a.mutual_friends_count);

      setContacts(mappedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSendRequests = async () => {
    if (selectedUsers.size === 0) {
      Alert.alert('No Selection', 'Please select at least one friend to add.');
      return;
    }

    // Save pending requests locally
    const newRequests: PendingRequest[] = Array.from(selectedUsers).map(userId => ({
      user_id: userId,
      timestamp: Date.now(),
    }));

    const allRequests = [...pendingRequests, ...newRequests];
    await savePendingRequests(allRequests);

    Alert.alert(
      'Requests Saved',
      `${selectedUsers.size} friend request${selectedUsers.size > 1 ? 's' : ''} will be sent when these users join the app!`,
      [
        {
          text: 'Continue',
          onPress: () => navigateNext('location-permission'),
        },
      ]
    );
  };

  const handleSkip = () => {
    navigateNext('location-permission');
  };

  const filteredContacts = contacts.filter(contact =>
    contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContact = ({ item }: { item: ContactMatch }) => {
    const isSelected = selectedUsers.has(item.id);
    const isDisabled = item.is_friend || item.has_pending_request;

    return (
      <TouchableOpacity
        style={[styles.contactCard, isDisabled && styles.contactCardDisabled]}
        onPress={() => !isDisabled && toggleUserSelection(item.id)}
        disabled={isDisabled}
      >
        <View style={styles.contactLeft}>
          <Image
            source={item.avatar_url ? { uri: item.avatar_url } : DEFAULT_AVATAR}
            style={styles.avatar}
          />
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.contact_name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
            {item.bio && (
              <Text style={styles.bio} numberOfLines={1}>
                {item.bio}
              </Text>
            )}
            {item.mutual_friends_count > 0 && (
              <View style={styles.mutualFriendsContainer}>
                <Ionicons name="people" size={14} color="#666" />
                <Text style={styles.mutualFriendsText}>
                  {item.mutual_friends_count} mutual friend{item.mutual_friends_count > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.contactRight}>
          {item.is_friend ? (
            <View style={styles.friendBadge}>
              <Text style={styles.friendBadgeText}>Friends</Text>
            </View>
          ) : item.has_pending_request ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </View>
          ) : (
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => navigateBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} accessibilityRole="header">
        Friends from your contacts
      </Text>
      <Text style={styles.subtitle}>
        {contacts.length > 0
          ? `We found ${contacts.length} of your contacts on the app!`
          : 'Looking for your contacts...'}
      </Text>

      {/* Search Bar */}
      {contacts.length > 0 && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {/* Contacts List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#016fff" />
          <Text style={styles.loadingText}>Finding your friends...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No contacts found matching your search'
                  : 'No contacts found on the app yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Action Buttons */}
      {selectedUsers.size > 0 && (
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendRequests}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <Text style={styles.sendButtonText}>
            Add {selectedUsers.size} Friend{selectedUsers.size > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <Text style={styles.skipButtonText}>
          {selectedUsers.size > 0 ? 'Skip For Now' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(16),
    paddingHorizontal: perfectSize(24),
  },
  backButton: {
    width: perfectSize(44),
    height: perfectSize(44),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: perfectSize(28),
    color: '#016fff',
  },
  progressTrack: {
    flex: 1,
    height: perfectSize(2),
    backgroundColor: '#E5E5E5',
    marginLeft: perfectSize(8),
    marginRight: perfectSize(8),
    borderRadius: perfectSize(1),
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#016fff',
    borderRadius: perfectSize(1),
  },
  title: {
    fontSize: perfectSize(28),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#000',
    textAlign: 'center',
    fontWeight: '400',
    paddingHorizontal: perfectSize(24),
  },
  subtitle: {
    marginTop: perfectSize(8),
    fontSize: perfectSize(16),
    color: '#555555',
    textAlign: 'center',
    marginBottom: perfectSize(20),
    paddingHorizontal: perfectSize(24),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: perfectSize(10),
    paddingHorizontal: perfectSize(12),
    height: perfectSize(40),
    marginHorizontal: perfectSize(24),
    marginBottom: perfectSize(16),
  },
  searchInput: {
    flex: 1,
    marginLeft: perfectSize(8),
    fontSize: perfectSize(16),
    color: '#000',
  },
  listContainer: {
    paddingHorizontal: perfectSize(24),
    paddingBottom: perfectSize(20),
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: perfectSize(12),
    padding: perfectSize(16),
    marginBottom: perfectSize(12),
  },
  contactCardDisabled: {
    opacity: 0.6,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: perfectSize(50),
    height: perfectSize(50),
    borderRadius: perfectSize(25),
    marginRight: perfectSize(12),
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: perfectSize(16),
    fontWeight: '600',
    color: '#000',
    marginBottom: perfectSize(2),
  },
  username: {
    fontSize: perfectSize(14),
    color: '#666',
    marginBottom: perfectSize(2),
  },
  bio: {
    fontSize: perfectSize(13),
    color: '#999',
    marginBottom: perfectSize(4),
  },
  mutualFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: perfectSize(4),
  },
  mutualFriendsText: {
    fontSize: perfectSize(12),
    color: '#666',
  },
  contactRight: {
    marginLeft: perfectSize(12),
  },
  checkbox: {
    width: perfectSize(24),
    height: perfectSize(24),
    borderRadius: perfectSize(12),
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#016fff',
    borderColor: '#016fff',
  },
  friendBadge: {
    backgroundColor: '#E8F3FF',
    borderRadius: perfectSize(12),
    paddingHorizontal: perfectSize(12),
    paddingVertical: perfectSize(6),
  },
  friendBadgeText: {
    color: '#007AFF',
    fontSize: perfectSize(12),
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: perfectSize(12),
    paddingHorizontal: perfectSize(12),
    paddingVertical: perfectSize(6),
  },
  pendingBadgeText: {
    color: '#856404',
    fontSize: perfectSize(12),
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: perfectSize(16),
    fontSize: perfectSize(16),
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: perfectSize(60),
  },
  emptyText: {
    marginTop: perfectSize(16),
    fontSize: perfectSize(16),
    color: '#999',
    textAlign: 'center',
  },
  sendButton: {
    height: perfectSize(60),
    backgroundColor: '#016fff',
    borderRadius: perfectSize(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: perfectSize(12),
    marginHorizontal: perfectSize(24),
  },
  sendButtonText: {
    color: '#fff',
    fontSize: perfectSize(20),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: perfectSize(12),
    marginBottom: perfectSize(20),
  },
  skipButtonText: {
    color: '#016fff',
    fontSize: perfectSize(16),
    fontWeight: '400',
  },
});

export default ContactsFriendsScreen;