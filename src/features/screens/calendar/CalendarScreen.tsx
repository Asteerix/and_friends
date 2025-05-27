import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { useEvents } from "@/hooks/useEvents";
import EventCardNew from "@/components/EventCardNew";

const { width } = Dimensions.get('window');

const gradientColors: [string, string][] = [
  ['#FF6B6B', '#FF8787'],
  ['#4ECDC4', '#44A3AA'],
  ['#45B7D1', '#3498DB'],
  ['#96CEB4', '#88C999'],
  ['#DDA0DD', '#BA55D3'],
];

export default function CalendarScreen() {
  const [selectedTab, setSelectedTab] = useState<'today' | 'calendar'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { events, loading } = useEvents();
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const colorIndex = useRef(0);
  const [currentColors, setCurrentColors] = useState(gradientColors[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      colorIndex.current = (colorIndex.current + 1) % gradientColors.length;
      setCurrentColors(gradientColors[colorIndex.current]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab: 'today' | 'calendar') => {
    setSelectedTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === 'today' ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const startDay = monthStart.getDay();
    const emptyDays = Array(startDay).fill(null);

    return [...emptyDays, ...days];
  };

  const eventsForSelectedDate = events.filter(event =>
    isSameDay(new Date(event.date), selectedDate)
  );

  const todayEvents = events.filter(event =>
    isSameDay(new Date(event.date), new Date())
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentColors}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.dateText}>
            {format(new Date(), 'EEEE')}
          </Text>
          <Text style={styles.dateNumber}>
            {format(new Date(), 'd')}
          </Text>
          <Text style={styles.monthText}>
            {format(new Date(), 'MMMM yyyy')}
          </Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'today' && styles.activeTab]}
            onPress={() => handleTabChange('today')}
          >
            <Text style={[styles.tabText, selectedTab === 'today' && styles.activeTabText]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'calendar' && styles.activeTab]}
            onPress={() => handleTabChange('calendar')}
          >
            <Text style={[styles.tabText, selectedTab === 'calendar' && styles.activeTabText]}>
              Calendar
            </Text>
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, width / 2 - 40],
                  }),
                }],
              },
            ]}
          />
        </View>
      </LinearGradient>

      {selectedTab === 'today' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.eventsContainer}>
            <Text style={styles.sectionTitle}>Today's Events</Text>
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => (
                <EventCardNew key={event.id} event={event} style={styles.eventCard} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🌴</Text>
                <Text style={styles.emptyStateText}>No events today</Text>
                <Text style={styles.emptyStateSubtext}>Time to relax!</Text>
              </View>
            )}
          </View>

          <View style={styles.eventsContainer}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {events
              .filter(event => new Date(event.date) > new Date())
              .slice(0, 5)
              .map((event) => (
                <EventCardNew key={event.id} event={event} style={styles.eventCard} />
              ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonthText}>
                {format(currentMonth, 'MMMM yyyy')}
              </Text>
            </View>
            
            <View style={styles.weekDaysContainer}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <Text key={index} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysContainer}>
              {renderCalendarDays().map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    day && isToday(day) && styles.todayCell,
                    day && isSameDay(day, selectedDate) && styles.selectedDayCell,
                  ]}
                  onPress={() => day && setSelectedDate(day)}
                  disabled={!day}
                >
                  {day && (
                    <>
                      <Text
                        style={[
                          styles.dayText,
                          isToday(day) && styles.todayText,
                          isSameDay(day, selectedDate) && styles.selectedDayText,
                        ]}
                      >
                        {format(day, 'd')}
                      </Text>
                      {events.some(event => isSameDay(new Date(event.date), day)) && (
                        <View style={styles.eventDot} />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectedDateEvents}>
            <Text style={styles.selectedDateTitle}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </Text>
            {eventsForSelectedDate.length > 0 ? (
              eventsForSelectedDate.map((event) => (
                <EventCardNew key={event.id} event={event} style={styles.eventCard} />
              ))
            ) : (
              <Text style={styles.noEventsText}>No events on this day</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  dateNumber: {
    fontSize: 72,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    lineHeight: 80,
  },
  monthText: {
    fontSize: 20,
    color: 'white',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {},
  tabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: (width - 80) / 2,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  eventsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  eventCard: {
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#999',
  },
  calendarContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  todayCell: {
    backgroundColor: 'rgba(70, 183, 209, 0.1)',
    borderRadius: 20,
  },
  selectedDayCell: {
    backgroundColor: '#45B7D1',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  todayText: {
    color: '#45B7D1',
    fontWeight: '600',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B6B',
    position: 'absolute',
    bottom: 8,
  },
  selectedDateEvents: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  noEventsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});