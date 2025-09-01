import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import React from 'react';
import {
  Image,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/shared/lib/supabase/client';

const rsvpStatuses = [
  { id: 'going', label: 'Going', icon: 'checkmark-circle', color: '#4CAF50' },
  { id: 'maybe', label: 'Maybe', icon: 'help-circle', color: '#FF9800' },
  { id: 'not-going', label: 'Not Going', icon: 'close-circle', color: '#F44336' },
];

export default function RSVPManagementScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ eventId: string }>();
  const { eventId } = params;
  const { events, updateRSVP } = useEvents();

  const [refreshing, setRefreshing] = useState(false);
  const [attendees, setAttendees] = useState<any>({
    going: [],
    maybe: [],
    'not-going': [],
  });

  const event = events.find((e) => e.id === eventId);

  useEffect(() => {
    loadAttendees();
  }, [eventId]);

  const loadAttendees = async () => {
    if (!eventId) return;

    try {
      console.log('🔍 [RSVPManagement] Loading attendees for event:', eventId);

      // Fetch event participants with their profile data
      const { data: participants, error } = await supabase
        .from('event_participants')
        .select(
          `
          status,
          user_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `
        )
        .eq('event_id', eventId);

      if (error) {
        console.error('❌ [RSVPManagement] Error loading attendees:', error);
        // Fall back to empty state instead of mock data
        setAttendees({
          going: [],
          maybe: [],
          'not-going': [],
        });
        return;
      }

      if (!participants) {
        console.log('ℹ️ [RSVPManagement] No participants found');
        setAttendees({
          going: [],
          maybe: [],
          'not-going': [],
        });
        return;
      }

      console.log('✅ [RSVPManagement] Found', participants.length, 'participants');

      // Group participants by status
      const groupedAttendees = {
        going: [] as any[],
        maybe: [] as any[],
        'not-going': [] as any[],
      };

      participants.forEach((participant) => {
        const profile = participant.profiles;
        if (!profile) return;

        const attendee = {
          id: profile.id,
          name: profile.full_name || profile.username || 'Anonymous',
          username: profile.username || 'user',
          avatar: profile.avatar_url,
        };

        const status = participant.status as keyof typeof groupedAttendees;
        if (groupedAttendees[status]) {
          groupedAttendees[status].push(attendee);
        }
      });

      console.log('📊 [RSVPManagement] Attendees grouped:', {
        going: groupedAttendees.going.length,
        maybe: groupedAttendees.maybe.length,
        'not-going': groupedAttendees['not-going'].length,
      });

      setAttendees(groupedAttendees);
    } catch (error) {
      console.error('💥 [RSVPManagement] Fatal error loading attendees:', error);
      setAttendees({
        going: [],
        maybe: [],
        'not-going': [],
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAttendees();
    setRefreshing(false);
  };

  const handleChangeRSVP = async (newStatus: string) => {
    if (!eventId) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('🔄 [RSVPManagement] Updating RSVP status to:', newStatus);

      const result = await updateRSVP(eventId, newStatus);

      if (result.error) {
        console.error('❌ [RSVPManagement] Error updating RSVP:', result.error);
        return;
      }

      console.log('✅ [RSVPManagement] RSVP updated successfully');

      // Refresh attendees list to reflect the change
      await loadAttendees();
    } catch (error) {
      console.error('💥 [RSVPManagement] Fatal error updating RSVP:', error);
    }
  };

  const sections = [
    {
      title: 'Going',
      data: attendees.going,
      count: attendees.going.length,
      color: '#4CAF50',
    },
    {
      title: 'Maybe',
      data: attendees.maybe,
      count: attendees.maybe.length,
      color: '#FF9800',
    },
    {
      title: 'Not Going',
      data: attendees['not-going'],
      count: attendees['not-going'].length,
      color: '#F44336',
    },
  ].filter((section) => section.data.length > 0);

  const renderAttendee = ({ item }: any) => (
    <TouchableOpacity
      style={styles.attendeeCard}
      onPress={() => router.push('/screens/person-card')}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.attendeeInfo}>
        <Text style={styles.attendeeName}>{item.name}</Text>
        <Text style={styles.attendeeUsername}>@{item.username}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>({section.count})</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#45B7D1', '#3498DB']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Who's Coming</Text>
          <Text style={styles.eventTitle}>{event?.title}</Text>
          <Text style={styles.eventDate}>
            {event && format(new Date(event.date), 'EEEE, MMMM d • h:mm a')}
          </Text>
        </View>
      </LinearGradient>

      {/* RSVP Status Selector */}
      <View style={styles.rsvpSelector}>
        <Text style={styles.rsvpSelectorTitle}>Your RSVP:</Text>
        <View style={styles.rsvpOptions}>
          {rsvpStatuses.map((status) => (
            <TouchableOpacity
              key={status.id}
              style={[
                styles.rsvpOption,
                event?.userRSVP === status.id && styles.rsvpOptionActive,
                { borderColor: status.color },
                event?.userRSVP === status.id && { backgroundColor: status.color },
              ]}
              onPress={() => handleChangeRSVP(status.id)}
            >
              <Ionicons
                name={status.icon as any}
                size={20}
                color={event?.userRSVP === status.id ? 'white' : status.color}
              />
              <Text
                style={[
                  styles.rsvpOptionText,
                  event?.userRSVP === status.id && styles.rsvpOptionTextActive,
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Attendees List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendee}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#45B7D1" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🎉</Text>
            <Text style={styles.emptyStateText}>Be the first to RSVP!</Text>
          </View>
        }
      />
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rsvpSelector: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  rsvpSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rsvpOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  rsvpOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    gap: 6,
  },
  rsvpOptionActive: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  rsvpOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  rsvpOptionTextActive: {
    color: 'white',
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#45B7D1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  attendeeUsername: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
});
