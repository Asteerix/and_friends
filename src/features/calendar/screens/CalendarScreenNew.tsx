import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import CalendarGridNew from '../components/CalendarGridNew';
import EventCell from '../components/EventCell';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useSession } from '@/shared/providers/SessionContext';
import { supabase } from '@/shared/lib/supabase/client';

const { width } = Dimensions.get('window');

// Gradient presets
const gradientPresets = [
  ['#FFE5E5', '#FFD4A3', '#FFEAA7'], // rose-orange-yellow sunset
  ['#D1E7FF', '#FFFBF0', '#FFF4D6'], // blue-cream-yellow cloudy sky
  ['#E8D5FF', '#E8D5FF', '#E8D5FF'], // violet uni
];

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  location?: string;
  participants?: any[];
  participants_count?: number;
  cover_image?: string;
}

export default function CalendarScreenNew() {
  const router = useRouter();
  const { session } = useSession();
  const { events } = useEventsAdvanced();

  const [activeTab, setActiveTab] = useState<'today' | 'calendar'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [gradientIndex, setGradientIndex] = useState(0);

  const gradientOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (session?.user) {
      fetchCalendarEvents();
    }
  }, [session, events]);

  // Rotate gradients
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(gradientOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setGradientIndex((prev) => (prev + 1) % gradientPresets.length);
        Animated.timing(gradientOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchCalendarEvents = async () => {
    if (!session?.user) return;

    try {
      const { data: participations, error } = await supabase
        .from('event_participants')
        .select(
          `
          event_id,
          status,
          events:event_id (
            id,
            title,
            date,
            location,
            cover_image,
            created_by
          )
        `
        )
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching calendar events:', error);
        return;
      }

      const formattedEvents: CalendarEvent[] =
        participations?.map((p: any) => ({
          id: p.events.id,
          title: p.events.title,
          date: p.events.date,
          location: p.events.location,
          cover_image: p.events.cover_image,
          participants: [],
          participants_count: 0,
        })) || [];

      // Get participant counts
      for (const event of formattedEvents) {
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        event.participants_count = count || 0;

        // Get first 4 participants with profiles
        const { data: participants } = await supabase
          .from('event_participants')
          .select(
            `
            profiles:user_id (
              id,
              avatar_url
            )
          `
          )
          .eq('event_id', event.id)
          .limit(4);

        event.participants =
          participants?.map((p: any) => ({
            id: p.profiles.id,
            avatar_url: p.profiles.avatar_url,
          })) || [];
      }

      setCalendarEvents(formattedEvents);
    } catch (error) {
      console.error('Error in fetchCalendarEvents:', error);
    }
  };

  const formatEventDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    const startTime = date.toLocaleTimeString('en-US', timeOptions);
    const endDate = new Date(date.getTime() + 3 * 60 * 60 * 1000); // +3 hours
    const endTime = endDate.toLocaleTimeString('en-US', timeOptions);

    return {
      date: formattedDate,
      time: `${startTime} – ${endTime}`,
    };
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return calendarEvents
      .filter((event) => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const filteredEvents = getUpcomingEvents().filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTodayDate = () => {
    const today = new Date();
    const month = today.toLocaleDateString('en-US', { month: 'long' });
    const day = today.getDate();
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
    return { month: `${month} ${day},`, weekday };
  };

  const todayFormatted = formatTodayDate();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('today')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>Today</Text>
          {activeTab === 'today' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('calendar')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
            Calendar
          </Text>
          {activeTab === 'calendar' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {activeTab === 'today' ? (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
        >
          {/* Gradient Header */}
          <Animated.View style={{ opacity: gradientOpacity }}>
            <LinearGradient
              colors={gradientPresets[gradientIndex]}
              style={styles.gradientHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.dateContainer}>
                <Text style={styles.dateMonth}>{todayFormatted.month}</Text>
                <Text style={styles.dateWeekday}>{todayFormatted.weekday}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for an event, friend"
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Upcoming Events */}
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <View style={styles.sectionUnderline} />

            <View style={styles.eventsList}>
              {filteredEvents.map((event) => {
                const { date, time } = formatEventDateTime(event.date);
                return (
                  <EventCell
                    key={event.id}
                    title={event.title}
                    date={date}
                    time={time}
                    location={event.location || 'Location TBD'}
                    participants={event.participants || []}
                    goingCount={event.participants_count || 0}
                    coverImage={event.cover_image}
                    onPress={() => router.push(`/screens/event-details?eventId=${event.id}`)}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Calendar Grid */}
          <CalendarGridNew
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            events={calendarEvents}
            onDateSelect={setSelectedDate}
            onMonthChange={(direction) => {
              const newMonth = new Date(currentMonth);
              if (direction === 'prev') {
                newMonth.setMonth(newMonth.getMonth() - 1);
              } else {
                newMonth.setMonth(newMonth.getMonth() + 1);
              }
              setCurrentMonth(newMonth);
            }}
          />

          {/* Upcoming Events */}
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <View style={styles.sectionUnderline} />

            <View style={styles.eventsList}>
              {getUpcomingEvents().map((event) => {
                const { date, time } = formatEventDateTime(event.date);
                return (
                  <EventCell
                    key={event.id}
                    title={event.title}
                    date={date}
                    time={time}
                    location={event.location || 'Location TBD'}
                    participants={event.participants || []}
                    goingCount={event.participants_count || 0}
                    coverImage={event.cover_image}
                    onPress={() => router.push(`/screens/event-details?eventId=${event.id}`)}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    marginHorizontal: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  activeTabText: {
    color: '#000000',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 2,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  gradientHeader: {
    height: 240,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  dateContainer: {
    marginTop: 60,
  },
  dateMonth: {
    fontSize: 42,
    fontWeight: '400',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'New York' : 'serif',
    lineHeight: 48,
  },
  dateWeekday: {
    fontSize: 42,
    fontWeight: '400',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'New York' : 'serif',
    lineHeight: 48,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#000000',
  },
  eventsSection: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 20,
    marginBottom: 4,
  },
  sectionUnderline: {
    height: 1,
    backgroundColor: '#007AFF',
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 16,
  },
  eventsList: {
    paddingBottom: 40,
  },
});
