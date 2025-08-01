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
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import UnderlineDecoration from '@/features/home/components/UnderlineDecoration.svg';
import { create } from 'react-native-pixel-perfect';

import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useSession } from '@/shared/providers/SessionContext';
import { supabase } from '@/shared/lib/supabase/client';
import EventThumbnail from '@/shared/components/EventThumbnail';

const { width } = Dimensions.get('window');

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

// Time-based background images
const getTimeBasedBackground = (): ImageSourcePropType => {
  const hour = new Date().getHours();

  // Night (22:00 - 6:00)
  if (hour >= 22 || hour < 6) {
    return require('@/assets/images/night.png');
  }
  // Morning (6:00 - 12:00)
  else if (hour >= 6 && hour < 12) {
    return require('@/assets/images/morning.png');
  }
  // Day/Afternoon (12:00 - 22:00)
  else {
    return require('@/assets/images/day.png');
  }
};

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  location_details?: {
    name?: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  participants?: {
    id: string;
    avatar_url?: string;
    name?: string;
  }[];
  participants_count?: number;
  cover_image?: string;
  image_url?: string;
  event_category?: string;
  category?: string;
  extra_data?: any;
}

export default function CalendarPerfect() {
  const router = useRouter();
  const { session } = useSession();
  const { events: allEvents } = useEventsAdvanced();

  const [activeTab, setActiveTab] = useState<'today' | 'calendar'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [backgroundImage, setBackgroundImage] = useState(getTimeBasedBackground());

  const backgroundOpacity = useRef(new Animated.Value(1)).current;
  const underlinePosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (session?.user) {
      fetchCalendarEvents();
    }
  }, [session, allEvents]);

  // Update background image based on time every minute
  useEffect(() => {
    const updateBackground = () => {
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setBackgroundImage(getTimeBasedBackground());
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    };

    const interval = setInterval(updateBackground, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Animate tab underline
  useEffect(() => {
    Animated.timing(underlinePosition, {
      toValue: activeTab === 'today' ? 0 : 80,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const fetchCalendarEvents = async () => {
    if (!session?.user) return;

    try {
      // First, get all event IDs the user is participating in
      const { data: participations, error: participationsError } = await supabase
        .from('event_participants')
        .select('event_id, status')
        .eq('user_id', session.user.id);

      if (participationsError) {
        console.error('Error fetching participations:', participationsError);
        return;
      }

      if (!participations || participations.length === 0) {
        setCalendarEvents([]);
        return;
      }

      const eventIds = participations.map(p => p.event_id);

      // Then fetch all events with those IDs
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          start_time,
          end_time,
          location,
          location_details,
          cover_image,
          image_url,
          created_by,
          event_category,
          category,
          extra_data
        `)
        .in('id', eventIds);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return;
      }

      // Format events and get participant data
      const formattedEvents: CalendarEvent[] = await Promise.all(
        (events || []).map(async (event) => {
          // Get participant count
          const { count } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          // Get participant avatars
          const { data: participants } = await supabase
            .from('event_participants')
            .select(`
              profiles:user_id (
                id,
                avatar_url,
                full_name
              )
            `)
            .eq('event_id', event.id)
            .limit(4);

          return {
            id: event.id,
            title: event.title,
            date: event.date,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            location_details: event.location_details,
            cover_image: event.cover_image,
            image_url: event.image_url,
            event_category: event.event_category || event.category,
            category: event.category,
            extra_data: event.extra_data,
            participants: participants?.map((p: any) => ({
              id: p.profiles?.id,
              avatar_url: p.profiles?.avatar_url,
              name: p.profiles?.full_name,
            })).filter(p => p.id) || [],
            participants_count: count || 0,
          };
        })
      );

      setCalendarEvents(formattedEvents);
    } catch (error) {
      console.error('Error in fetchCalendarEvents:', error);
    }
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    // Use allEvents from useEventsAdvanced which has all the data
    return allEvents
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

  // path: components/CalendarPerfect.tsx

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);

    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();

    // For a Monday-start calendar, we need to adjust:
    // If Sunday (0), it should be 6 days back from the start
    // If Monday (1), it should be 0 days back
    // If Tuesday (2), it should be 1 day back, etc.
    const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const startDate = new Date(firstDay);
    startDate.setDate(1 - daysToSubtract);

    const days: Date[] = [];
    const currentDate = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const hasEvent = (date: Date) => {
    return allEvents.some((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get events for selected date with full data
  const getEventsForDate = (date: Date) => {
    // Get all events for the selected date
    const dateEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

    // Sort by time
    return dateEvents.sort((a, b) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const calendarDays = generateCalendarDays();

  return (
    <View style={styles.container}>
      {/* Background Image that extends under tab bar */}
      {activeTab === 'today' && (
        <Animated.View style={[styles.absoluteBackground, { opacity: backgroundOpacity }]}>
          <Image source={backgroundImage} style={styles.backgroundImage} resizeMode="cover" />
        </Animated.View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Tab Bar - Exactly 44pt height */}
        <View style={[styles.tabBar, activeTab === 'today' && styles.tabBarTransparent]}>
          <TouchableOpacity
            onPress={() => setActiveTab('today')}
            activeOpacity={0.7}
            style={{ alignItems: 'center', flex: 1 }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'today' && styles.activeTabText,
                activeTab === 'today' && styles.tabTextWhite,
              ]}
            >
              Today
            </Text>
            {activeTab === 'today' && (
              <UnderlineDecoration
                width={perfectSize(56)}
                height={perfectSize(4)}
                style={{ marginTop: perfectSize(4), alignSelf: 'center' }}
                accessibilityLabel="Today underline"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('calendar')}
            activeOpacity={0.7}
            style={{ alignItems: 'center', flex: 1 }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'calendar' && styles.activeTabText,
                activeTab === 'today' && styles.tabTextWhite,
              ]}
            >
              Calendar
            </Text>
            {activeTab === 'calendar' && (
              <UnderlineDecoration
                width={perfectSize(56)}
                height={perfectSize(4)}
                style={{ marginTop: perfectSize(4), alignSelf: 'center' }}
                accessibilityLabel="Calendar underline"
              />
            )}
          </TouchableOpacity>
        </View>

        {activeTab === 'today' ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[1]}
          >
            {/* Date Header - Part of gradient */}
            <View style={styles.dateHeader}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateMonth}>{todayFormatted.month}</Text>
                <Text style={styles.dateWeekday}>{todayFormatted.weekday}</Text>
              </View>
            </View>

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
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <EventThumbnail
                      key={event.id}
                      event={event}
                      onPress={() => router.push(`/screens/event-details?eventId=${event.id}`)}
                    />
                  ))
                ) : (
                  <View style={styles.noEventsContainer}>
                    <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
                    <Text style={styles.noEventsText}>
                      {searchQuery ? 'No events match your search' : 'No upcoming events'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={[styles.scrollView, styles.whiteBackground]}
            showsVerticalScrollIndicator={false}
          >
            {/* Calendar View */}
            <View style={styles.calendarContainer}>
              {/* Month Header */}
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentMonth(newMonth);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color="#000000" />
                </TouchableOpacity>

                <Text style={styles.monthText}>
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentMonth(newMonth);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={20} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Week Days */}
              <View style={styles.weekDaysRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <View key={index} style={styles.weekDayCell}>
                    <Text
                      style={[
                        styles.weekDayText,
                        (index === 5 || index === 6) && styles.weekendText,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((date, index) => {
                  const isInCurrentMonth = isCurrentMonth(date);
                  const hasEventOnDate = hasEvent(date);
                  const isTodayDate = isToday(date);
                  const isSelectedDate = isSelected(date);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCell,
                        isTodayDate && styles.todayCell,
                        isSelectedDate && styles.selectedCell,
                      ]}
                      onPress={() => setSelectedDate(date)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !isInCurrentMonth && styles.inactiveDayText,
                          isTodayDate && styles.todayText,
                          isSelectedDate && styles.selectedText,
                          (index % 7 === 5 || index % 7 === 6) &&
                            isInCurrentMonth &&
                            styles.weekendDayText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {hasEventOnDate && isInCurrentMonth && (
                        <View
                          style={[styles.eventDot, isSelectedDate && styles.eventDotSelected]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected Date Events */}
            <View style={styles.eventsSection}>
              <Text style={styles.sectionTitle}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <View style={styles.sectionUnderline} />

              <View style={styles.eventsList}>
                {getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map((event) => (
                    <EventThumbnail
                      key={event.id}
                      event={event}
                      onPress={() => router.push(`/screens/event-details?eventId=${event.id}`)}
                    />
                  ))
                ) : (
                  <View style={styles.noEventsContainer}>
                    <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
                    <Text style={styles.noEventsText}>No events on this day</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  absoluteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    zIndex: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  tabBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  tabBarTransparent: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginHorizontal: 40,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  tabTextWhite: {
    color: '#FFFFFF',
  },
  activeTabText: {
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  whiteBackground: {
    backgroundColor: '#FFFFFF',
  },
  dateHeader: {
    height: 196, // 240 - 44 (tab bar)
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
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'New York' : 'serif',
    lineHeight: 48,
  },
  dateWeekday: {
    fontSize: 42,
    fontWeight: '400',
    color: '#FFFFFF',
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  eventsSection: {
    paddingTop: 24,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 20,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  sectionUnderline: {
    height: 1,
    backgroundColor: '#007AFF',
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 16,
  },
  eventsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  eventCell: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eventImageContainer: {
    marginRight: 12,
  },
  eventImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  eventImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkerSquare: {
    width: 16,
    height: 16,
    backgroundColor: '#F0F0F0',
  },
  checkerSquareDark: {
    backgroundColor: '#E0E0E0',
  },
  eventInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  eventDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  eventDateTime: {
    fontSize: 13,
    color: '#6E6E73',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  eventLocation: {
    fontSize: 13,
    color: '#6E6E73',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goingText: {
    fontSize: 13,
    color: '#6E6E73',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    marginBottom: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  weekendText: {
    color: '#8E8E93',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    minHeight: 264, // 6 weeks * 44pt per week
  },
  dayCell: {
    width: (width - 40) / 7,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayCell: {
    backgroundColor: '#F2F2F7',
    borderRadius: 22,
  },
  selectedCell: {
    backgroundColor: '#007AFF',
    borderRadius: 22,
  },
  dayText: {
    fontSize: 17,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  inactiveDayText: {
    color: '#C7C7CC',
  },
  todayText: {
    color: '#000000',
    fontWeight: '600',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  weekendDayText: {
    color: '#8E8E93',
  },
  eventDot: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
  },
  eventDotSelected: {
    backgroundColor: '#FFFFFF',
  },
});
