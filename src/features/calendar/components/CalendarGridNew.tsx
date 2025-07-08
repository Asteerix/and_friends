import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarEvent {
  id: string;
  date: string;
}

interface CalendarGridNewProps {
  currentMonth: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (direction: 'prev' | 'next') => void;
}

const { width } = Dimensions.get('window');

export default function CalendarGridNew({
  currentMonth,
  selectedDate,
  events,
  onDateSelect,
  onMonthChange,
}: CalendarGridNewProps) {
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Get the first day of the week (Sunday = 0)
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const days: Date[] = [];
    const currentDate = new Date(startDate);

    // Generate 6 weeks of days (42 days)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const hasEvent = (date: Date) => {
    return events.some((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const calendarDays = generateCalendarDays();
  const monthYearText = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onMonthChange('prev')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#8E8E93" />
        </TouchableOpacity>
        
        <Text style={styles.monthText}>{monthYearText}</Text>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onMonthChange('next')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Week Days */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => {
          const isInCurrentMonth = isCurrentMonth(date);
          const hasEventOnDate = hasEvent(date);
          const isSelected = 
            selectedDate.getDate() === date.getDate() &&
            selectedDate.getMonth() === date.getMonth() &&
            selectedDate.getFullYear() === date.getFullYear();
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDayCell,
              ]}
              onPress={() => onDateSelect(date)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  !isInCurrentMonth && styles.inactiveDayText,
                  isSelected && styles.selectedDayText,
                ]}
              >
                {date.getDate()}
              </Text>
              {hasEventOnDate && isInCurrentMonth && (
                <View style={styles.eventDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: (width - 40) / 7,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 15,
    color: '#000000',
  },
  inactiveDayText: {
    color: '#C7C7CC',
  },
  eventDot: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  selectedDayCell: {
    backgroundColor: '#000000',
    borderRadius: 20,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});