import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { debounce } from 'lodash';
import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFriends, Friend } from '@/hooks/useFriends';
import { Colors } from '@/shared/config/Colors';
import CustomText from '@/shared/ui/CustomText';
import RatingDisplay from '@/shared/components/RatingDisplay';

export default function SearchUsersScreen() {
  const insets = useSafeAreaInsets();
  const { searchUsers, sendFriendRequest } = useFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      try {
        const results = await searchUsers(query);
        setSearchResults(results);
      } catch (error: unknown) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 500),
    [searchUsers]
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      setLoading(true);
      debouncedSearch(text);
    } else {
      setSearchResults([]);
    }
  };

  const handleSendRequest = async (user: Friend) => {
    try {
      setSendingRequest(user.id);
      await sendFriendRequest(user.id);

      // Update the user's status in search results
      setSearchResults((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, friend_status: 'pending' } : u))
      );

      Alert.alert('Success', `Friend request sent to ${user.username}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already sent')) {
        Alert.alert('Info', 'Friend request already sent');
      } else {
        Alert.alert('Error', 'Failed to send friend request');
      }
    } finally {
      setSendingRequest(null);
    }
  };

  const handleUserPress = (user: Friend) => {
    void router.push({
      pathname: '/screens/person-card',
      params: { userId: user.id },
    });
  };

  const renderActionButton = (user: Friend) => {
    if (sendingRequest === user.id) {
      return <ActivityIndicator size="small" color={Colors.light.tint} />;
    }

    switch (user.friend_status) {
      case 'accepted':
        return (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
            <CustomText style={styles.statusText}>Friends</CustomText>
          </View>
        );
      case 'pending':
        return (
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={20} color={Colors.light.warning} />
            <CustomText style={styles.statusText}>Pending</CustomText>
          </View>
        );
      case 'blocked':
        return null;
      default:
        return (
          <TouchableOpacity style={styles.addButton} onPress={() => handleSendRequest(user)}>
            <Ionicons name="person-add-outline" size={20} color="white" />
          </TouchableOpacity>
        );
    }
  };

  const renderUser = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/100' }}
        style={styles.avatar}
        contentFit="cover"
      />

      <View style={styles.userInfo}>
        <CustomText style={styles.username}>@{item.username}</CustomText>
        <CustomText style={styles.fullName}>{item.full_name}</CustomText>
        <RatingDisplay userId={item.id} size="medium" style={{ marginTop: 4 }} />
        {item.bio && (
          <CustomText style={styles.bio} numberOfLines={1}>
            {item.bio}
          </CustomText>
        )}
        {item.mutual_friends_count && item.mutual_friends_count > 0 && (
          <CustomText style={styles.mutualFriends}>
            {item.mutual_friends_count} mutual friend{item.mutual_friends_count > 1 ? 's' : ''}
          </CustomText>
        )}
      </View>

      {renderActionButton(item)}
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) return null;

    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={Colors.light.textSecondary} />
          <CustomText style={styles.emptyText}>Search for friends by username or name</CustomText>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={Colors.light.textSecondary} />
        <CustomText style={styles.emptyText}>No users found for "{searchQuery}"</CustomText>
      </View>
    );
  };

  const handleRefresh = async () => {
    if (!searchQuery.trim()) return;

    setRefreshing(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
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

        <CustomText style={styles.title}>Find Friends</CustomText>

        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => router.push('/screens/qr-scanner')}
        >
          <Ionicons name="qr-code-outline" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or name..."
          placeholderTextColor={Colors.light.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
          >
            <Ionicons name="close-circle" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <FlatList
        data={searchResults}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.tint}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {loading && searchQuery.trim() && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
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
  qrButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.light.text,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  userInfo: {
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
  bio: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  mutualFriends: {
    fontSize: 12,
    color: Colors.light.tint,
    marginTop: 4,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
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
  },
  loadingOverlay: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
