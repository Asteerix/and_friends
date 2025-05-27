import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SectionList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useEvents } from "@/hooks/useEvents";
import * as Haptics from 'expo-haptics';

const rsvpStatuses = [
  { id: 'going', label: 'Going', icon: 'checkmark-circle', color: '#4CAF50' },
  { id: 'maybe', label: 'Maybe', icon: 'help-circle', color: '#FF9800' },
  { id: 'not-going', label: 'Not Going', icon: 'close-circle', color: '#F44336' },
];

export default function RSVPManagementScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params as any;
  const { events, updateRSVP } = useEvents();
  
  const [refreshing, setRefreshing] = useState(false);
  const [attendees, setAttendees] = useState<any>({
    going: [],
    maybe: [],
    'not-going': [],
  });

  const event = events.find(e => e.id === eventId);

  useEffect(() => {
    loadAttendees();
  }, [eventId]);

  const loadAttendees = async () => {
    // TODO: Load attendees from Supabase
    // For now, using mock data
    setAttendees({
      going: [
        { id: '1', name: 'John Doe', avatar: null, username: 'johndoe' },
        { id: '2', name: 'Jane Smith', avatar: null, username: 'janesmith' },
        { id: '3', name: 'Mike Johnson', avatar: null, username: 'mikej' },
      ],
      maybe: [
        { id: '4', name: 'Sarah Williams', avatar: null, username: 'sarahw' },
        { id: '5', name: 'Tom Brown', avatar: null, username: 'tomb' },
      ],
      'not-going': [
        { id: '6', name: 'Emily Davis', avatar: null, username: 'emilyd' },
      ],
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAttendees();
    setRefreshing(false);
  };

  const handleChangeRSVP = async (newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateRSVP(eventId, newStatus);
    // Refresh attendees list
    loadAttendees();
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
  ].filter(section => section.data.length > 0);

  const renderAttendee = ({ item }: any) => (
    <TouchableOpacity
      style={styles.attendeeCard}
      onPress={() => navigation.navigate('PersonCard', { person: item })}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
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
      <LinearGradient
        colors={['#45B7D1', '#3498DB']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#45B7D1"
          />
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