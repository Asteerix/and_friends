import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { create } from 'react-native-pixel-perfect';
import SearchIcon from '@/assets/svg/search.svg';
import ChatButtonIcon from '@/assets/svg/chat-button.svg';
import NotificationButtonIcon from '@/assets/svg/notification-button.svg';
import BackButtonIcon from '@/assets/svg/back-button.svg';
import LongUnderlineDecoration from '@/features/home/components/LongUnderlineDecoration.svg';
import NotificationBadge from '@/features/notifications/components/NotificationBadge';
import { useNotifications } from '@/shared/providers/NotificationProvider';
import type { Notification } from '@/hooks/useNotifications';
import EmptyState from '../components/EmptyState';
import NotificationItem from '../components/NotificationItem';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = React.memo(({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'all', label: 'Recent activity' },
    { id: 'unread', label: 'Unread' },
  ];
  return (
    <View style={tabStyles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={tabStyles.tab}
          onPress={() => onTabChange(tab.id)}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
        >
          <Text style={[tabStyles.tabText, activeTab === tab.id && tabStyles.activeTabText]}>
            {tab.label}
          </Text>
          {activeTab === tab.id && (
            <View style={tabStyles.underlineWrap}>
              <LongUnderlineDecoration width="100%" height={perfectSize(4)} />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
});

const SearchBar: React.FC = React.memo(() => (
  <View style={searchStyles.container}>
    <SearchIcon width={perfectSize(20)} height={perfectSize(20)} style={searchStyles.icon} />
    <Text
      style={searchStyles.input}
      accessibilityLabel="Search for an event or friend"
      accessibilityRole="search"
    >
      Search for an event or friend
    </Text>
  </View>
));

const NotificationsScreen: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { notifications, loading, markAsRead, unreadCount } = useNotifications();
  const unreadNotifications = notifications.filter(n => !n.read);
  const router = useRouter();

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case 'all':
        return notifications;
      case 'unread':
        return unreadNotifications;
      default:
        return notifications;
    }
  }, [notifications, unreadNotifications, activeTab]);

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.type === 'event_invite' || notification.type === 'rsvp_update') {
      if (notification.related_event_id) {
        void router.push(`/screens/event-details?eventId=${notification.related_event_id}`);
      }
    } else if (notification.type === 'new_message') {
      if (notification.related_chat_id) {
        void router.push(`/screens/conversation?chatId=${notification.related_chat_id}`);
      }
    } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      if (notification.related_user_id) {
        void router.push(`/screens/person-card?userId=${notification.related_user_id}`);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtnMinimal}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <BackButtonIcon width={perfectSize(24)} height={perfectSize(24)} />
        </TouchableOpacity>
        <View style={styles.headerTitleAbsolute} pointerEvents="none">
          <Text style={styles.headerTitle} accessibilityRole="header">
            Notifications
          </Text>
        </View>
        <View style={styles.iconsRow}>
          <TouchableOpacity
            onPress={() => router.push('/screens/chat')}
            accessibilityLabel="Open chat"
            accessibilityRole="button"
            style={styles.iconBtn}
          >
            <ChatButtonIcon width={perfectSize(40)} height={perfectSize(40)} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/screens/notifications')}
            accessibilityLabel="Open notifications"
            accessibilityRole="button"
            style={styles.iconBtn}
          >
            <NotificationButtonIcon width={perfectSize(40)} height={perfectSize(40)} />
            <NotificationBadge count={unreadCount} />
          </TouchableOpacity>
        </View>
      </View>
      <SearchBar />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      {loading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => {
                void handleNotificationPress(item);
              }}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            filteredData.length === 0 ? styles.emptyList : undefined,
            { paddingTop: perfectSize(12) },
          ]}
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: perfectSize(16),
    marginTop: perfectSize(8),
    height: perfectSize(56),
    position: 'relative',
  },
  headerTitleAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  headerTitle: {
    fontSize: perfectSize(22),
    color: '#222',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
    fontWeight: '400',
    textAlign: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: perfectSize(12),
    position: 'relative',
  },
  backBtnMinimal: {
    width: perfectSize(40),
    height: perfectSize(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(20),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: perfectSize(8),
    paddingBottom: perfectSize(14),
    position: 'relative',
  },
  tabText: {
    fontSize: perfectSize(18),
    color: '#999',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  underlineWrap: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

const searchStyles = StyleSheet.create({
  container: {
    height: perfectSize(48),
    borderRadius: perfectSize(12),
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: perfectSize(16),
    marginBottom: perfectSize(20),
    paddingHorizontal: perfectSize(16),
  },
  icon: {
    marginRight: perfectSize(12),
  },
  input: {
    flex: 1,
    fontSize: perfectSize(17),
    color: '#000',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
    paddingVertical: 0,
  },
});

export default NotificationsScreen;
