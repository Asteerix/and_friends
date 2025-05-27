import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from "@/hooks/useProfile";
import * as Haptics from 'expo-haptics';
import * as Contacts from 'expo-contacts';

interface Friend {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  phoneNumber?: string;
  isRegistered: boolean;
  isSelected: boolean;
}

export default function InviteFriendsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId, eventTitle } = route.params as any;
  const { fetchAllProfiles } = useProfile();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'app' | 'contacts'>('app');

  useEffect(() => {
    loadFriends();
  }, [activeTab]);

  const loadFriends = async () => {
    setLoading(true);
    
    if (activeTab === 'app') {
      // Load app users
      const result = await fetchAllProfiles();
      if (result) {
        const appFriends = result.profiles.map(profile => ({
          id: profile.id,
          name: profile.display_name || profile.full_name || 'Unknown',
          username: profile.username,
          avatar: profile.avatar_url,
          isRegistered: true,
          isSelected: false,
        }));
        setFriends(appFriends);
      }
    } else {
      // Load phone contacts
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
        });

        if (data.length > 0) {
          const contactFriends = data
            .filter(contact => contact.name && contact.phoneNumbers && contact.phoneNumbers.length > 0)
            .map(contact => ({
              id: contact.id || '',
              name: contact.name || '',
              phoneNumber: contact.phoneNumbers?.[0]?.number,
              avatar: contact.image?.uri,
              isRegistered: false,
              isSelected: false,
            }));
          setFriends(contactFriends);
        }
      }
    }
    
    setLoading(false);
  };

  const toggleFriendSelection = (friendId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleInviteSelected = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('No Selection', 'Please select at least one friend to invite.');
      return;
    }

    if (activeTab === 'app') {
      // Send in-app invitations
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Invitations Sent!',
        `${selectedFriends.length} friends have been invited to ${eventTitle}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      // Share via SMS/WhatsApp
      const selectedContacts = friends.filter(f => selectedFriends.includes(f.id));
      const phoneNumbers = selectedContacts.map(c => c.phoneNumber).join(', ');
      
      try {
        await Share.share({
          message: `Hey! You're invited to ${eventTitle} 🎉\n\nJoin me on & friends app to RSVP!\n\nDownload: https://andfriends.app`,
          title: `Invitation to ${eventTitle}`,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to share invitation.');
      }
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFriend = ({ item }: { item: Friend }) => {
    const isSelected = selectedFriends.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.friendItemSelected]}
        onPress={() => toggleFriendSelection(item.id)}
      >
        <View style={styles.friendLeft}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{item.name}</Text>
            {item.username && (
              <Text style={styles.friendUsername}>@{item.username}</Text>
            )}
            {item.phoneNumber && !item.isRegistered && (
              <Text style={styles.friendPhone}>{item.phoneNumber}</Text>
            )}
          </View>
        </View>

        <View style={styles.friendRight}>
          {!item.isRegistered && (
            <View style={styles.inviteBadge}>
              <Text style={styles.inviteBadgeText}>Invite</Text>
            </View>
          )}
          <View
            style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#45B7D1', '#3498DB']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <TouchableOpacity
            onPress={handleInviteSelected}
            disabled={selectedFriends.length === 0}
          >
            <Text
              style={[
                styles.inviteButton,
                selectedFriends.length === 0 && styles.inviteButtonDisabled,
              ]}
            >
              Invite ({selectedFriends.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'app' && styles.activeTab]}
            onPress={() => setActiveTab('app')}
          >
            <Text style={[styles.tabText, activeTab === 'app' && styles.activeTabText]}>
              & friends Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
            onPress={() => setActiveTab('contacts')}
          >
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>
              Phone Contacts
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab === 'app' ? 'friends' : 'contacts'}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Select All */}
      <TouchableOpacity
        style={styles.selectAllButton}
        onPress={() => {
          if (selectedFriends.length === filteredFriends.length) {
            setSelectedFriends([]);
          } else {
            setSelectedFriends(filteredFriends.map(f => f.id));
          }
        }}
      >
        <Text style={styles.selectAllText}>
          {selectedFriends.length === filteredFriends.length ? 'Deselect All' : 'Select All'}
        </Text>
      </TouchableOpacity>

      {/* Friends List */}
      <FlatList
        data={filteredFriends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriend}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>
              {activeTab === 'app' ? '👥' : '📱'}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'app'
                ? 'No friends found'
                : 'No contacts available'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {activeTab === 'app'
                ? 'Try searching by name or username'
                : 'Grant access to see your contacts'}
            </Text>
          </View>
        }
      />

      {/* Bottom Action */}
      {selectedFriends.length > 0 && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.inviteSelectedButton}
            onPress={handleInviteSelected}
          >
            <LinearGradient
              colors={['#45B7D1', '#3498DB']}
              style={styles.inviteSelectedGradient}
            >
              <Text style={styles.inviteSelectedText}>
                {activeTab === 'app'
                  ? `Send ${selectedFriends.length} Invitation${selectedFriends.length > 1 ? 's' : ''}`
                  : `Share with ${selectedFriends.length} Contact${selectedFriends.length > 1 ? 's' : ''}`}
              </Text>
              <Ionicons name="send" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  inviteButton: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: 'white',
  },
  tabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  selectAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
  },
  selectAllText: {
    fontSize: 14,
    color: '#45B7D1',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#45B7D1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
  },
  friendPhone: {
    fontSize: 14,
    color: '#999',
  },
  friendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteBadge: {
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inviteBadgeText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#45B7D1',
    borderColor: '#45B7D1',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inviteSelectedButton: {
    overflow: 'hidden',
    borderRadius: 30,
  },
  inviteSelectedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  inviteSelectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});