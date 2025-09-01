import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  cover_bg_color?: string;
}

interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events: CalendarEvent[];
  onMonthChange: (date: Date) => void;
}

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - 48) / 7;

export default function CalendarGrid({
  selectedDate,
  onDateSelect,
  events,
  onMonthChange,
}: CalendarGridProps) {
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth]);

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

    setCalendarDays(days);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    onMonthChange(newMonth);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
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

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const renderCalendarDay = (date: Date, index: number) => {
    const dayEvents = getEventsForDate(date);
    const isInCurrentMonth = isCurrentMonth(date);
    const isTodayDate = isToday(date);
    const isSelectedDate = isSelected(date);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.calendarCell,
          isTodayDate && styles.todayCell,
          isSelectedDate && styles.selectedCell,
        ]}
        onPress={() => onDateSelect(date)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayNumber,
            !isInCurrentMonth && styles.inactiveDay,
            isTodayDate && styles.todayText,
            isSelectedDate && styles.selectedText,
          ]}
        >
          {date.getDate()}
        </Text>

        {dayEvents.length > 0 && (
          <View style={styles.eventIndicators}>
            {dayEvents.slice(0, 3).map((event, idx) => (
              <View
                key={idx}
                style={[styles.eventDot, { backgroundColor: event.cover_bg_color || '#007AFF' }]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const monthYearText = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => changeMonth('prev')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.monthText}>{monthYearText}</Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => changeMonth('next')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Week Days Header */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => renderCalendarDay(date, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.4,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: CELL_WIDTH,
    height: CELL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
  },
  inactiveDay: {
    color: '#C4C4C4',
  },
  todayCell: {
    backgroundColor: '#F0F8FF',
    borderRadius: CELL_WIDTH / 2,
  },
  todayText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedCell: {
    backgroundColor: '#000',
    borderRadius: CELL_WIDTH / 2,
  },
  selectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  eventIndicators: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
