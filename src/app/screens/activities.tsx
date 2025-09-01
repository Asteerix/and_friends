import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivities } from '../../hooks/useActivities';

export default function ActivitiesScreen() {
  const { activities, loading, refetch } = useActivities({
    limit: 50,
  });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'event_created':
        return 'calendar-outline';
      case 'event_joined':
        return 'person-add-outline';
      case 'friend_request':
        return 'people-outline';
      case 'story_posted':
        return 'camera-outline';
      case 'memory_shared':
        return 'images-outline';
      default:
        return 'flash-outline';
    }
  };

  const getActivityText = (activity: any) => {
    const userName = activity.user?.full_name || "Quelqu'un";
    const eventTitle = activity.event?.title;
    const targetUserName = activity.target_user?.full_name;

    switch (activity.type) {
      case 'event_created':
        return `${userName} a créé l'événement "${eventTitle}"`;
      case 'event_joined':
        return `${userName} a rejoint l'événement "${eventTitle}"`;
      case 'friend_request':
        return `${userName} a envoyé une demande d'ami à ${targetUserName}`;
      case 'story_posted':
        return `${userName} a partagé une story`;
      case 'memory_shared':
        return `${userName} a partagé un souvenir de "${eventTitle}"`;
      default:
        return activity.description || `${userName} a effectué une action`;
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'Offbeat',
            color: '#fff',
            marginLeft: 16,
          }}
        >
          Activités
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {activities.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="flash-outline" size={64} color="#666" />
            <Text
              style={{
                color: '#666',
                fontSize: 16,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              Aucune activité pour le moment
            </Text>
          </View>
        ) : (
          activities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={{
                flexDirection: 'row',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#222',
              }}
              onPress={() => {
                if (activity.event_id) {
                  void router.push(`/screens/event-details?id=${activity.event_id}`);
                } else if (activity.target_user_id) {
                  void router.push(`/screens/person-card?id=${activity.target_user_id}`);
                }
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#222',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                {activity.user?.avatar_url ? (
                  <Image
                    source={{ uri: activity.user.avatar_url }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                ) : (
                  <Ionicons name={getActivityIcon(activity.type)} size={24} color="#fff" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {getActivityText(activity)}
                </Text>
                <Text
                  style={{
                    color: '#666',
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {formatDistanceToNow(new Date(activity.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </Text>
              </View>

              {activity.event?.cover_image && (
                <Image
                  source={{ uri: activity.event.cover_image }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    marginLeft: 12,
                  }}
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
