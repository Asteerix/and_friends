import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useSession } from '@/shared/providers/SessionContext';
import CustomText, { AfterHoursText } from '@/shared/ui/CustomText';
import GradientBackground, { gradientPresets } from '@/shared/ui/GradientBackground';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 32) / 7;

const gradients = [gradientPresets.calendar1, gradientPresets.calendar2, gradientPresets.calendar3];

export default function CalendarMonthScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentGradient, setCurrentGradient] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { events, fetchEvents, loading } = useEventsAdvanced();

  useEffect(() => {
    if (session?.user) {
      void fetchEvents();
    }
  }, [session]);

  const onRefresh = async () => {
    setRefreshing(true);
    await void fetchEvents();
    setRefreshing(false);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add empty cells for days before month starts
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, day);
    });
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);

    // Change gradient
    setCurrentGradient((prev) => (prev + 1) % gradients.length);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDatePress = (day: Date) => {
    setSelectedDate(day);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Navigate to day view with selected date
    void router.push(`/calendar?selectedDate=${day.toISOString()}`);
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <GradientBackground colors={gradients[currentGradient] || ['#FF6B6B', '#FF8E53']} animated>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CustomText size="xl" color="#000">
              ←
            </CustomText>
          </TouchableOpacity>

          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => handleMonthChange('prev')} style={styles.monthButton}>
              <CustomText size="lg" color="#000">
                ‹
              </CustomText>
            </TouchableOpacity>

            <AfterHoursText size="xl" color="#000" style={styles.monthTitle}>
              {format(currentDate, 'MMMM yyyy')}
            </AfterHoursText>

            <TouchableOpacity onPress={() => handleMonthChange('next')} style={styles.monthButton}>
              <CustomText size="lg" color="#000">
                ›
              </CustomText>
            </TouchableOpacity>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <Animated.View style={[styles.calendar, { opacity: fadeAnim }]}>
          <View style={styles.weekDaysRow}>
            {weekDays.map((day, index) => (
              <View key={index} style={styles.weekDayCell}>
                <CustomText size="sm" color="#000" weight="bold" align="center">
                  {day}
                </CustomText>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {emptyDays.map((_, index) => (
              <View key={`empty-${index}`} style={styles.dayCell} />
            ))}

            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                  ]}
                  onPress={() => handleDatePress(day)}
                  activeOpacity={0.7}
                >
                  <CustomText
                    size="md"
                    color={isToday || isSelected ? '#FFF' : '#000'}
                    weight={isToday ? 'bold' : 'normal'}
                    align="center"
                  >
                    {format(day, 'd')}
                  </CustomText>

                  {dayEvents.length > 0 && (
                    <View style={styles.eventIndicators}>
                      {dayEvents.slice(0, 3).map((_, index) => (
                        <View
                          key={index}
                          style={[styles.eventDot, (isToday || isSelected) && styles.eventDotLight]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <ScrollView
          style={styles.eventsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />
          }
        >
          <CustomText size="sm" color="#666" style={styles.eventsTitle}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </CustomText>

          {getEventsForDay(selectedDate).map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/event-details?eventId=${event.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.eventTime}>
                <CustomText size="sm" color="#666">
                  {format(new Date(event.date), 'h:mm a')}
                </CustomText>
              </View>
              <View style={styles.eventInfo}>
                <CustomText size="md" weight="bold">
                  {event.title}
                </CustomText>
                {event.location && (
                  <CustomText size="sm" color="#666">
                    {event.location}
                  </CustomText>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {getEventsForDay(selectedDate).length === 0 && (
            <View style={styles.emptyState}>
              <CustomText size="md" color="#666" align="center">
                No events scheduled
              </CustomText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    marginHorizontal: 16,
  },
  calendar: {
    paddingHorizontal: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    width: CELL_SIZE,
    height: 30,
    justifyContent: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: CELL_SIZE / 2,
    marginVertical: 2,
  },
  todayCell: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  selectedCell: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  eventIndicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000',
    marginHorizontal: 1,
  },
  eventDotLight: {
    backgroundColor: '#FFF',
  },
  eventsList: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  eventsTitle: {
    marginBottom: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTime: {
    width: 80,
  },
  eventInfo: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: 40,
  },
});
