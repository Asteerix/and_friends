import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFriends, Friend, FriendRequest } from '@/hooks/useFriends';
import { Colors } from '@/shared/config/Colors';
import CustomText from '@/shared/ui/CustomText';

type Tab = 'friends' | 'requests' | 'sent';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const {
    friends,
    friendRequests,
    sentRequests,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    refreshFriends,
    refreshRequests,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [refreshing, setRefreshing] = useState(false);

  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      await acceptFriendRequest(request.id);
      Alert.alert('Success', `You are now friends with ${request.username}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (request: FriendRequest) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline ${request.username}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineFriendRequest(request.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to decline friend request');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFriend = async (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friend.id);
              Alert.alert('Success', 'Friend removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshFriends(), refreshRequests()]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() =>
        router.push({
          pathname: '/screens/person-card',
          params: { userId: item.id },
        })
      }
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/100' }}
        style={styles.avatar}
        contentFit="cover"
      />

      <View style={styles.friendInfo}>
        <CustomText style={styles.username}>@{item.username}</CustomText>
        <CustomText style={styles.fullName}>{item.full_name}</CustomText>
        {item.last_seen && (
          <CustomText style={styles.lastSeen}>
            Last seen {new Date(item.last_seen).toLocaleDateString()}
          </CustomText>
        )}
      </View>

      <TouchableOpacity style={styles.moreButton} onPress={() => handleRemoveFriend(item)}>
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.light.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      <TouchableOpacity
        style={styles.requestInfo}
        onPress={() =>
          router.push({
            pathname: '/screens/person-card',
            params: { userId: item.id },
          })
        }
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.avatar_url || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
          contentFit="cover"
        />

        <View style={styles.friendInfo}>
          <CustomText style={styles.username}>@{item.username}</CustomText>
          <CustomText style={styles.fullName}>{item.full_name}</CustomText>
          {item.mutual_friends_count > 0 && (
            <CustomText style={styles.mutualFriends}>
              {item.mutual_friends_count} mutual friend{item.mutual_friends_count > 1 ? 's' : ''}
            </CustomText>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item)}
        >
          <Ionicons name="checkmark" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleDeclineRequest(item)}
        >
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() =>
        router.push({
          pathname: '/screens/person-card',
          params: { userId: item.id },
        })
      }
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/100' }}
        style={styles.avatar}
        contentFit="cover"
      />

      <View style={styles.friendInfo}>
        <CustomText style={styles.username}>@{item.username}</CustomText>
        <CustomText style={styles.fullName}>{item.full_name}</CustomText>
        <CustomText style={styles.pendingText}>
          Request sent {new Date(item.request_date).toLocaleDateString()}
        </CustomText>
      </View>

      <View style={styles.pendingBadge}>
        <Ionicons name="time-outline" size={16} color={Colors.light.warning} />
        <CustomText style={styles.pendingBadgeText}>Pending</CustomText>
      </View>
    </TouchableOpacity>
  );

  // const getSectionData = () => {
  //   switch (activeTab) {
  //     case 'friends':
  //       return friends.length > 0
  //         ? [{ title: `${friends.length} Friends`, data: friends }]
  //         : [];
  //     case 'requests':
  //       return friendRequests.length > 0
  //         ? [{ title: `${friendRequests.length} Friend Requests`, data: friendRequests }]
  //         : [];
  //     case 'sent':
  //       return sentRequests.length > 0
  //         ? [{ title: `${sentRequests.length} Sent Requests`, data: sentRequests }]
  //         : [];
  //     default:
  //       return [];
  //   }
  // };

  const renderEmpty = () => {
    let icon: string;
    let text: string;

    switch (activeTab) {
      case 'friends':
        icon = 'people-outline';
        text = 'No friends yet. Find and add friends to connect!';
        break;
      case 'requests':
        icon = 'person-add-outline';
        text = 'No friend requests at the moment';
        break;
      case 'sent':
        icon = 'paper-plane-outline';
        text = 'No pending requests';
        break;
      default:
        return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={64} color={Colors.light.textSecondary} />
        <CustomText style={styles.emptyText}>{text}</CustomText>
        {activeTab === 'friends' && (
          <TouchableOpacity
            style={styles.findFriendsButton}
            onPress={() => router.push('/screens/search-users')}
          >
            <CustomText style={styles.findFriendsText}>Find Friends</CustomText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.light.background, Colors.light.backgroundSecondary]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>

        <CustomText style={styles.title}>Friends</CustomText>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push('/screens/search-users')}
        >
          <Ionicons name="search" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <CustomText style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </CustomText>
          {friends.length > 0 && (
            <View style={styles.badge}>
              <CustomText style={styles.badgeText}>{friends.length}</CustomText>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <CustomText style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests
          </CustomText>
          {friendRequests.length > 0 && (
            <View style={[styles.badge, styles.requestBadge]}>
              <CustomText style={styles.badgeText}>{friendRequests.length}</CustomText>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <CustomText style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent
          </CustomText>
          {sentRequests.length > 0 && (
            <View style={styles.badge}>
              <CustomText style={styles.badgeText}>{sentRequests.length}</CustomText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {activeTab === 'friends' ? (
        <SectionList
          sections={
            friends.length > 0 ? [{ title: `${friends.length} Friends`, data: friends }] : []
          }
          renderItem={renderFriend}
          renderSectionHeader={({ section }) => (
            <CustomText style={styles.sectionHeader}>{section.title}</CustomText>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      ) : activeTab === 'requests' ? (
        <SectionList
          sections={
            friendRequests.length > 0
              ? [{ title: `${friendRequests.length} Friend Requests`, data: friendRequests }]
              : []
          }
          renderItem={renderRequest}
          renderSectionHeader={({ section }) => (
            <CustomText style={styles.sectionHeader}>{section.title}</CustomText>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      ) : (
        <SectionList
          sections={
            sentRequests.length > 0
              ? [{ title: `${sentRequests.length} Sent Requests`, data: sentRequests }]
              : []
          }
          renderItem={renderSentRequest}
          renderSectionHeader={({ section }) => (
            <CustomText style={styles.sectionHeader}>{section.title}</CustomText>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    gap: 6,
  },
  activeTab: {
    backgroundColor: Colors.light.tint,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  activeTabText: {
    color: 'white',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  requestBadge: {
    backgroundColor: Colors.light.error,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginVertical: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  requestItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  fullName: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  lastSeen: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  mutualFriends: {
    fontSize: 12,
    color: Colors.light.tint,
    marginTop: 4,
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.light.success,
  },
  declineButton: {
    backgroundColor: Colors.light.error,
  },
  pendingText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.warningLight,
    borderRadius: 16,
  },
  pendingBadgeText: {
    fontSize: 12,
    color: Colors.light.warning,
    fontWeight: '500',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  findFriendsButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 20,
  },
  findFriendsText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
