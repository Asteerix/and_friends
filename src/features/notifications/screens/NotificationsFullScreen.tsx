import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNotifications, type Notification } from '@/shared/providers/NotificationProvider';
export default function NotificationsFullScreen() {
  const router = useRouter();
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await markAsRead(notificationId);
    if (error) {
      Alert.alert('Erreur', 'Impossible de marquer la notification comme lue');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const { error } = await deleteNotification(notificationId);
    if (error) {
      Alert.alert('Erreur', 'Impossible de supprimer la notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event_invite':
        return 'calendar-outline';
      case 'chat_message':
        return 'chatbubble-outline';
      case 'friend_request':
        return 'person-add-outline';
      case 'event_reminder':
        return 'alarm-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleMarkAsRead(item.id)}
      onLongPress={() => {
        Alert.alert('Supprimer', 'Voulez-vous supprimer cette notification ?', [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            onPress: () => {
              void handleDeleteNotification(item.id);
            },
          },
        ]);
      }}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={24}
          color={item.read ? '#888' : '#007AFF'}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
          {item.title}
        </Text>
        {item.body && <Text style={styles.notificationMessage}>{item.body}</Text>}
        <Text style={styles.notificationTime}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const handleMarkAllAsRead = async () => {
    const { error } = await markAllAsRead();
    if (error) {
      Alert.alert('Erreur', 'Impossible de marquer toutes les notifications comme lues');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtitle}>
            Vous recevrez ici vos notifications d'événements et de messages
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  markAllText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FF',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#888',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    marginTop: 8,
  },
});
