import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/SessionContext";
import { useEventsAdvanced } from "@/hooks/useEventsAdvanced";
import { useProfile } from "@/hooks/useProfile";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  image_url?: string;
  created_by: string;
  participants_count?: number;
  user_status?: "going" | "maybe" | "not_going";
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { session } = useSession();
  const { events, loading, fetchEvents } = useEventsAdvanced();
  const { profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  useEffect(() => {
    if (session?.user) {
      fetchCalendarEvents();
    }
  }, [session, events]);

  const fetchCalendarEvents = async () => {
    if (!session?.user) return;

    try {
      // Fetch events user is participating in
      const { data: participations, error } = await supabase
        .from("event_participants")
        .select(`
          status,
          events (
            id,
            title,
            description,
            date,
            location,
            image_url,
            created_by
          )
        `)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error fetching calendar events:", error);
        return;
      }

      const formattedEvents: CalendarEvent[] = participations?.map((p: any) => ({
        id: p.events.id,
        title: p.events.title,
        description: p.events.description,
        date: p.events.date,
        location: p.events.location,
        image_url: p.events.image_url,
        created_by: p.events.created_by,
        user_status: p.status,
      })) || [];

      // Also include events from the general events list
      const allEvents = events.map(event => ({
        id: event.id || "",
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        image_url: "",
        created_by: event.created_by || "",
        user_status: undefined,
      }));

      // Merge and deduplicate
      const uniqueEvents = [...formattedEvents];
      allEvents.forEach(event => {
        if (!uniqueEvents.find(e => e.id === event.id)) {
          uniqueEvents.push(event);
        }
      });

      setCalendarEvents(uniqueEvents);
    } catch (error) {
      console.error("Error in fetchCalendarEvents:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    await fetchCalendarEvents();
    setRefreshing(false);
  };

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dayEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === currentDate.toDateString();
      });

      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === new Date().toDateString(),
        events: dayEvents,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const getEventsForSelectedDate = () => {
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === selectedDate.toDateString();
    });
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return calendarEvents
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  };

  const changeMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const renderCalendarDay = (day: any) => {
    const isSelected = day.date.toDateString() === selectedDate.toDateString();
    
    return (
      <TouchableOpacity
        key={day.date.toISOString()}
        style={[
          styles.calendarDay,
          !day.isCurrentMonth && styles.calendarDayInactive,
          day.isToday && styles.calendarDayToday,
          isSelected && styles.calendarDaySelected,
        ]}
        onPress={() => setSelectedDate(day.date)}
      >
        <Text
          style={[
            styles.calendarDayText,
            !day.isCurrentMonth && styles.calendarDayTextInactive,
            day.isToday && styles.calendarDayTextToday,
            isSelected && styles.calendarDayTextSelected,
          ]}
        >
          {day.date.getDate()}
        </Text>
        {day.events.length > 0 && (
          <View style={styles.eventIndicator}>
            <Text style={styles.eventIndicatorText}>{day.events.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEventItem = ({ item }: { item: CalendarEvent }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={() => {
        (navigation as any).navigate("EventDetails", { eventId: item.id });
      }}
    >
      <View style={styles.eventTime}>
        <Text style={styles.eventTimeText}>
          {new Date(item.date).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.location && (
          <Text style={styles.eventLocation} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#888" />
            {" " + item.location}
          </Text>
        )}
        {item.user_status && (
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              item.user_status === "going" && styles.statusGoing,
              item.user_status === "maybe" && styles.statusMaybe,
              item.user_status === "not_going" && styles.statusNotGoing,
            ]}>
              <Text style={styles.statusText}>
                {item.user_status === "going" && "Participe"}
                {item.user_status === "maybe" && "Peut-être"}
                {item.user_status === "not_going" && "N'y va pas"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const calendarDays = generateCalendarDays();
  const selectedDateEvents = getEventsForSelectedDate();
  const upcomingEvents = getUpcomingEvents();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendrier</Text>
        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === "month" ? "list" : "month")}
        >
          <Ionicons 
            name={viewMode === "month" ? "list-outline" : "calendar-outline"} 
            size={24} 
            color="#222" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewMode === "month" ? (
          <>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                style={styles.monthNavButton}
                onPress={() => changeMonth("prev")}
              >
                <Ionicons name="chevron-back-outline" size={24} color="#222" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
              <TouchableOpacity 
                style={styles.monthNavButton}
                onPress={() => changeMonth("next")}
              >
                <Ionicons name="chevron-forward-outline" size={24} color="#222" />
              </TouchableOpacity>
            </View>

            {/* Days of week */}
            <View style={styles.daysOfWeek}>
              {DAYS.map((day) => (
                <View key={day} style={styles.dayOfWeek}>
                  <Text style={styles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map(renderCalendarDay)}
            </View>

            {/* Selected Date Events */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
              {selectedDateEvents.length === 0 ? (
                <Text style={styles.noEventsText}>Aucun événement ce jour</Text>
              ) : (
                <FlatList
                  data={selectedDateEvents}
                  renderItem={renderEventItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
          </>
        ) : (
          /* List View */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Événements à venir</Text>
            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="#CCC" />
                <Text style={styles.emptyTitle}>Aucun événement</Text>
                <Text style={styles.emptySubtitle}>
                  Rejoignez des événements pour les voir ici
                </Text>
              </View>
            ) : (
              <FlatList
                data={upcomingEvents}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listEventItem}
                    onPress={() => {
                      (navigation as any).navigate("EventDetails", { eventId: item.id });
                    }}
                  >
                    <View style={styles.listEventDate}>
                      <Text style={styles.listEventDay}>
                        {new Date(item.date).getDate()}
                      </Text>
                      <Text style={styles.listEventMonth}>
                        {MONTHS[new Date(item.date).getMonth()].substring(0, 3)}
                      </Text>
                    </View>
                    <View style={styles.listEventContent}>
                      <Text style={styles.listEventTitle}>{item.title}</Text>
                      <Text style={styles.listEventTime}>
                        {new Date(item.date).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      {item.location && (
                        <Text style={styles.listEventLocation}>
                          <Ionicons name="location-outline" size={12} color="#888" />
                          {" " + item.location}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  viewModeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
  },
  daysOfWeek: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dayOfWeek: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  calendarDayInactive: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
  },
  calendarDaySelected: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: "#222",
  },
  calendarDayTextInactive: {
    color: "#CCC",
  },
  calendarDayTextToday: {
    color: "#007AFF",
    fontWeight: "600",
  },
  calendarDayTextSelected: {
    color: "#FFF",
    fontWeight: "600",
  },
  eventIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#FF6B6B",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  eventIndicatorText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "600",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 16,
  },
  noEventsText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingVertical: 20,
  },
  eventItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  eventTime: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTimeText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  eventContent: {
    flex: 1,
    paddingLeft: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  statusContainer: {
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
  },
  statusGoing: {
    backgroundColor: "#E8F5E8",
  },
  statusMaybe: {
    backgroundColor: "#FFF3CD",
  },
  statusNotGoing: {
    backgroundColor: "#F8D7DA",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#222",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  listEventItem: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  listEventDate: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  listEventDay: {
    fontSize: 24,
    fontWeight: "600",
    color: "#222",
  },
  listEventMonth: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
  },
  listEventContent: {
    flex: 1,
  },
  listEventTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
    marginBottom: 4,
  },
  listEventTime: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  listEventLocation: {
    fontSize: 14,
    color: "#888",
  },
});