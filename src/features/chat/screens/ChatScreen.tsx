import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { create } from 'react-native-pixel-perfect';
import { formatDistanceToNow } from 'date-fns';
import ChatCard, { ChatCardProps } from '../components/ChatCard';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import SearchIcon from '@/assets/svg/search.svg';
import LongUnderlineDecoration from '@/features/home/components/LongUnderlineDecoration.svg';
import NotificationBadge from '@/shared/ui/NotificationBadge';
import { useMessagesAdvanced } from '@/hooks/useMessagesAdvanced';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const ChatScreen: React.FC = React.memo(() => {
  const router = useRouter();
  const { chats, loading } = useMessagesAdvanced();
  const [search, setSearch] = React.useState('');

  // Organisation des chats par catégorie
  const circles = useMemo(
    () =>
      chats.filter((c) => {
        // Les groupes incluent les chats d'événements annulés (qui ont "(annulé)" dans le nom)
        return c.is_group && (!c.event_id || c.name?.includes('(annulé)'));
      }),
    [chats]
  );
  const events = useMemo(
    () =>
      chats.filter((c) => {
        // Seulement les chats d'événements actifs
        return !!c.event_id && !c.name?.includes('(annulé)');
      }),
    [chats]
  );
  const friends = useMemo(() => chats.filter((c) => !c.is_group && !c.event_id), [chats]);

  // Filtrage par recherche
  const filterChats = (arr: typeof chats) =>
    arr.filter(
      (c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.last_message?.content?.toLowerCase().includes(search.toLowerCase())
    );

  // Mapping vers ChatCardProps
  const mapCircle = (c: any): ChatCardProps => ({
    type: 'group',
    color: c.name?.includes('(annulé)') ? '#9CA3AF' : '#FF4B6E', // Gris pour les événements annulés
    title: c.name || 'Group',
    subtitle: c.last_message?.content || 'No messages yet',
    timestamp: c.last_message?.created_at
      ? formatDistanceToNow(new Date(c.last_message.created_at), { addSuffix: true })
      : '',
    onPress: () => router.push(`/chat/conversation/${c.id}`),
  });
  const mapEvent = (c: any): ChatCardProps => ({
    type: 'event',
    color: '#FFE066', // TODO: couleur dynamique si dispo
    title: c.name || 'Event Chat',
    subtitle: c.last_message?.content || 'No messages yet',
    author: c.last_message?.sender?.full_name || '',
    preview: c.last_message?.content || '',
    timestamp: c.last_message?.created_at
      ? formatDistanceToNow(new Date(c.last_message.created_at), { addSuffix: true })
      : '',
    onPress: () => router.push(`/chat/conversation/${c.id}`),
  });
  const mapFriend = (c: any): ChatCardProps => ({
    type: 'friend',
    avatar:
      c.participants?.find((p: any) => !p.is_admin)?.avatar_url ||
      'https://ui-avatars.com/api/?name=F&size=40',
    title: c.name || 'Friend',
    subtitle: c.last_message?.content || 'No messages yet',
    isPhoto: c.last_message?.message_type === 'image',
    timestamp: c.last_message?.created_at
      ? formatDistanceToNow(new Date(c.last_message.created_at), { addSuffix: true })
      : '',
    onPress: () => router.push(`/chat/conversation/${c.id}`),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <TouchableOpacity
          style={styles.headerIconLeft}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <BackButton
            width={perfectSize(22)}
            height={perfectSize(22)}
            fill="#000"
            color="#000"
            stroke="#000"
          />
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper} pointerEvents="none">
          <Text style={styles.headerTitle} accessibilityRole="header" accessibilityLabel="Chat">
            Chat
          </Text>
        </View>
        <View style={styles.headerIconsRight}>
          <TouchableOpacity
            style={styles.headerCircleButton}
            accessibilityRole="button"
            accessibilityLabel="Open chat requests"
            activeOpacity={0.7}
          >
            <ChatButton width={perfectSize(41)} height={perfectSize(41)} />
          </TouchableOpacity>
          <View style={styles.headerNotificationWrapper}>
            <TouchableOpacity
              style={styles.headerCircleButton}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              activeOpacity={0.7}
            >
              <NotificationButton width={perfectSize(41)} height={perfectSize(41)} />
              <NotificationBadge count={2} size="small" position="top-right" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* SearchBar */}
      <View style={styles.searchBarWrapper}>
        <SearchIcon width={perfectSize(21)} height={perfectSize(20)} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a friend, group, or event"
          placeholderTextColor="#BDBDBD"
          accessibilityLabel="Search for a friend, group, or event"
          returnKeyType="search"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Circles */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText} numberOfLines={1}>
            Circles
          </Text>
          <TouchableOpacity
            style={styles.addCircleButton}
            accessibilityRole="button"
            accessibilityLabel="Add circle"
          >
            <Text style={styles.addCirclePlus}>+</Text>
          </TouchableOpacity>
        </View>
        <LongUnderlineDecoration
          width={Dimensions.get('window').width - perfectSize(64)}
          height={perfectSize(4)}
          style={styles.underline}
        />
        {filterChats(circles).map((item, idx) => (
          <View key={item.id || idx} style={styles.cardSpacing}>
            <ChatCard {...mapCircle(item)} />
          </View>
        ))}
        {/* Upcoming Event Chats */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText} numberOfLines={1}>
            Upcoming Event Chats
          </Text>
        </View>
        <LongUnderlineDecoration
          width={Dimensions.get('window').width - perfectSize(64)}
          height={perfectSize(4)}
          style={styles.underline}
        />
        {filterChats(events).map((item, idx) => (
          <View key={item.id || idx} style={styles.cardSpacing}>
            <ChatCard {...mapEvent(item)} />
          </View>
        ))}
        {/* Friends */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText} numberOfLines={1}>
            Friends
          </Text>
        </View>
        <LongUnderlineDecoration
          width={Dimensions.get('window').width - perfectSize(64)}
          height={perfectSize(4)}
          style={styles.underline}
        />
        {filterChats(friends).map((item, idx) => (
          <View key={item.id || idx} style={styles.cardSpacing}>
            <ChatCard {...mapFriend(item)} />
          </View>
        ))}
        {loading && (
          <Text style={{ textAlign: 'center', marginTop: perfectSize(24) }}>Loading…</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: perfectSize(64),
    paddingHorizontal: perfectSize(16),
    backgroundColor: '#FFF',
    position: 'relative',
    marginBottom: perfectSize(8),
  },
  headerIconLeft: {
    width: perfectSize(40),
    height: perfectSize(40),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: perfectSize(64),
    zIndex: 1,
  },
  headerTitle: {
    fontSize: perfectSize(22),
    color: '#222',
    fontFamily: Platform.select({ ios: 'AfterHours', android: 'AfterHours', default: 'System' }),
    fontWeight: '400',
    textAlign: 'center',
  },
  headerIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    zIndex: 2,
  },
  headerCircleButton: {
    width: perfectSize(41),
    height: perfectSize(41),
    borderRadius: perfectSize(20.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: perfectSize(12),
    backgroundColor: 'transparent',
  },
  headerNotificationWrapper: {
    position: 'relative',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: perfectSize(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: perfectSize(16),
    height: perfectSize(48),
    marginBottom: perfectSize(16),
    paddingHorizontal: perfectSize(12),
  },
  searchIcon: {
    marginRight: perfectSize(8),
  },
  searchInput: {
    flex: 1,
    fontSize: perfectSize(16),
    color: '#222',
    fontFamily: Platform.select({ ios: 'SF Pro Text', android: 'Roboto', default: 'System' }),
    height: perfectSize(48),
  },
  scrollContent: {
    paddingBottom: perfectSize(32),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: perfectSize(32),
    marginRight: perfectSize(32),
    marginBottom: perfectSize(4),
    marginTop: perfectSize(20),
    minHeight: perfectSize(36),
  },
  sectionHeaderText: {
    fontSize: perfectSize(17),
    fontWeight: '600',
    color: '#222',
    fontFamily: Platform.select({ ios: 'SF Pro Text', android: 'Roboto', default: 'System' }),
    textAlignVertical: 'center',
    paddingVertical: perfectSize(4),
    flex: 1,
  },
  addCircleButton: {
    width: perfectSize(48),
    height: perfectSize(32),
    borderRadius: perfectSize(16),
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: perfectSize(8),
    alignSelf: 'center',
  },
  addCirclePlus: {
    fontSize: perfectSize(24),
    color: '#222',
    fontWeight: '400',
    marginTop: -2,
  },
  underline: {
    marginLeft: perfectSize(32),
    marginRight: perfectSize(32),
    marginBottom: perfectSize(16),
    marginTop: perfectSize(0),
  },
  cardSpacing: {
    marginBottom: perfectSize(8),
  },
});

export default ChatScreen;
