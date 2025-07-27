// import { useRouter } from 'expo-router';
// import React, { useEffect, useState, useRef } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Animated,
//   TextInput,
//   StatusBar,
//   Platform,
//   Dimensions,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import GradientBackground, { gradientPresets } from '@/shared/ui/GradientBackground';
// import Scribble from '@/shared/ui/Scribble';
// import EventRow from './EventRow';
// import CalendarGrid from '../components/CalendarGrid';

// import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
// import { supabase } from '@/shared/lib/supabase/client';
// import { useSession } from '@/shared/providers/SessionContext';

// // import { useProfile } from "@/hooks/useProfile";

// interface CalendarEvent {
//   id: string;
//   title: string;
//   description?: string;
//   date: string;
//   location?: string;
//   image_url?: string;
//   created_by: string;
//   participants_count?: number;
//   user_status?: 'going' | 'maybe' | 'not_going';
//   cover_bg_color?: string;
//   extra_data?: any;
//   cover_image?: string;
// }

// const gradients = [gradientPresets.calendar1, gradientPresets.calendar2, gradientPresets.calendar3];
// const { width: W } = Dimensions.get('window');

// export default function CalendarScreen() {
//   const router = useRouter();
//   const { session } = useSession();
//   const { events } = useEventsAdvanced();
//   // const { profile } = useProfile();
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
//   const [tab, setTab] = useState<'today' | 'calendar'>('today');
//   const [gradientIdx, setGradientIdx] = useState(0);
//   const fadeAnim = useRef(new Animated.Value(1)).current;
//   const [search, setSearch] = useState('');
//   const [searchFocused, setSearchFocused] = useState(false);

//   useEffect(() => {
//     if (session?.user) {
//       fetchCalendarEvents();
//     }
//   }, [session, events]);

//   // Animation gradient auto
//   useEffect(() => {
//     const interval = setInterval(() => {
//       Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start(() => {
//         setGradientIdx((g) => (g + 1) % gradients.length);
//         Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
//       });
//     }, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   const fetchCalendarEvents = async () => {
//     if (!session?.user) return;

//     try {
//       // Fetch events user is participating in
//       const { data: participations, error } = await supabase
//         .from('event_participants')
//         .select(
//           `
//           event_id,
//           status,
//           events:event_id (
//             id,
//             title,
//             description,
//             date,
//             location,
//             cover_image,
//             cover_bg_color,
//             created_by,
//             extra_data,
//             image_url
//           )
//         `
//         )
//         .eq('user_id', session.user.id);

//       if (error) {
//         console.error('Error fetching calendar events:', error);
//         // If status column doesn't exist, try without it
//         if (error.message?.includes('status')) {
//           const { data: participationsWithoutStatus, error: retryError } = await supabase
//             .from('event_participants')
//             .select(
//               `
//               event_id,
//               events:event_id (
//                 id,
//                 title,
//                 description,
//                 date,
//                 location,
//                 cover_image,
//                 cover_bg_color,
//                 created_by,
//                 extra_data,
//                 image_url
//               )
//             `
//             )
//             .eq('user_id', session.user.id);

//           if (retryError) {
//             console.error('Error fetching calendar events (retry):', retryError);
//             return;
//           }

//           const formattedEvents: CalendarEvent[] =
//             participationsWithoutStatus?.map((p: any) => ({
//               id: p.events.id,
//               title: p.events.title,
//               description: p.events.description,
//               date: p.events.date,
//               location: p.events.location,
//               image_url: p.events.cover_image || '',
//               created_by: p.events.created_by,
//               user_status: 'going', // Default to going
//               cover_bg_color: p.events.cover_bg_color,
//               extra_data: p.events.extra_data,
//               cover_image: p.events.cover_image,
//             })) || [];

//           setCalendarEvents(formattedEvents);
//           return;
//         }
//         return;
//       }

//       const formattedEvents: CalendarEvent[] =
//         participations?.map((p: any) => ({
//           id: p.events.id,
//           title: p.events.title,
//           description: p.events.description,
//           date: p.events.date,
//           location: p.events.location,
//           image_url: p.events.cover_image || '',
//           created_by: p.events.created_by,
//           user_status: p.status || 'going', // Use status if available, default to going
//           cover_bg_color: p.events.cover_bg_color,
//           extra_data: p.events.extra_data,
//           cover_image: p.events.cover_image,
//         })) || [];

//       // Also include events from the general events list
//       const allEvents = events.map((event) => ({
//         id: event.id || '',
//         title: event.title,
//         description: event.description,
//         date: event.date,
//         location: event.location,
//         image_url: event.image_url || event.cover_image || '',
//         created_by: event.created_by || '',
//         user_status: undefined,
//         extra_data: event.extra_data,
//         cover_image: event.cover_image,
//       }));

//       // Merge and deduplicate
//       const uniqueEvents = [...formattedEvents];
//       allEvents.forEach((event) => {
//         if (!uniqueEvents.find((e) => e.id === event.id)) {
//           uniqueEvents.push(event);
//         }
//       });

//       setCalendarEvents(uniqueEvents);
//     } catch (error) {
//       console.error('Error in fetchCalendarEvents:', error);
//     }
//   };

//   const getEventsForSelectedDate = () => {
//     return calendarEvents.filter((event) => {
//       const eventDate = new Date(event.date);
//       return eventDate.toDateString() === selectedDate.toDateString();
//     });
//   };

//   const getUpcomingEvents = () => {
//     const now = new Date();
//     return calendarEvents
//       .filter((event) => new Date(event.date) >= now)
//       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
//       .slice(0, 10);
//   };

//   // const changeMonth = (direction: 'prev' | 'next') => {
//   //   const newDate = new Date(selectedDate);
//   //   if (direction === 'prev') {
//   //     newDate.setMonth(newDate.getMonth() - 1);
//   //   } else {
//   //     newDate.setMonth(newDate.getMonth() + 1);
//   //   }
//   //   setSelectedDate(newDate);
//   // };

//   // const renderCalendarDay = (day: any) => {
//   //   const isSelected = day.date.toDateString() === selectedDate.toDateString();

//   //   return (
//   //     <TouchableOpacity
//   //       key={day.date.toISOString()}
//   //       style={[
//   //         styles.calendarDay,
//   //         !day.isCurrentMonth && styles.calendarDayInactive,
//   //         day.isToday && styles.calendarDayToday,
//   //         isSelected && styles.calendarDaySelected,
//   //       ]}
//   //       onPress={() => setSelectedDate(day.date)}
//   //     >
//   //       <Text
//   //         style={[
//   //           styles.calendarDayText,
//   //           !day.isCurrentMonth && styles.calendarDayTextInactive,
//   //           day.isToday && styles.calendarDayTextToday,
//   //           isSelected && styles.calendarDayTextSelected,
//   //         ]}
//   //       >
//   //         {day.date.getDate()}
//   //       </Text>
//   //       {day.events.length > 0 && (
//   //         <View style={styles.eventIndicator}>
//   //           <Text style={styles.eventIndicatorText}>{day.events.length}</Text>
//   //         </View>
//   //       )}
//   //     </TouchableOpacity>
//   //   );
//   // };

//   // const renderEventItem = ({ item }: { item: CalendarEvent }) => (
//   //   <TouchableOpacity
//   //     style={styles.eventItem}
//   //     onPress={() => {
//   //       void router.push(`/event-details?eventId=${item.id}`);
//   //     }}
//   //   >
//   //     <View style={styles.eventTime}>
//   //       <Text style={styles.eventTimeText}>
//   //         {new Date(item.date).toLocaleTimeString('fr-FR', {
//   //           hour: '2-digit',
//   //           minute: '2-digit',
//   //         })}
//   //       </Text>
//   //     </View>
//   //     <View style={styles.eventContent}>
//   //       <Text style={styles.eventTitle} numberOfLines={1}>
//   //         {item.title}
//   //       </Text>
//   //       {item.location && (
//   //         <Text style={styles.eventLocation} numberOfLines={1}>
//   //           <Ionicons name="location-outline" size={12} color="#888" />
//   //           {' ' + item.location}
//   //         </Text>
//   //       )}
//   //       {item.user_status && (
//   //         <View style={styles.statusContainer}>
//   //           <View
//   //             style={[
//   //               styles.statusBadge,
//   //               item.user_status === 'going' && styles.statusGoing,
//   //               item.user_status === 'maybe' && styles.statusMaybe,
//   //               item.user_status === 'not_going' && styles.statusNotGoing,
//   //             ]}
//   //           >
//   //             <Text style={styles.statusText}>
//   //               {item.user_status === 'going' && 'Participe'}
//   //               {item.user_status === 'maybe' && 'Peut-être'}
//   //               {item.user_status === 'not_going' && "N'y va pas"}
//   //             </Text>
//   //           </View>
//   //         </View>
//   //       )}
//   //     </View>
//   //   </TouchableOpacity>
//   // );

//   // const calendarDays = generateCalendarDays();
//   // const selectedDateEvents = getEventsForSelectedDate();
//   const upcomingEvents = getUpcomingEvents();

//   // Filtrage events par search
//   const filteredEvents = upcomingEvents.filter((e) =>
//     e.title.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
//       <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
//       {/* Tabs */}
//       <View style={styles.tabsRow}>
//         {['today', 'calendar'].map((t) => (
//           <TouchableOpacity
//             key={t}
//             style={styles.tabBtn}
//             onPress={() => setTab(t as any)}
//             activeOpacity={0.7}
//           >
//             <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
//               {t === 'today' ? 'Today' : 'Calendar'}
//             </Text>
//             {tab === t && <Scribble width={56} height={3} style={{ marginTop: 2 }} />}
//           </TouchableOpacity>
//         ))}
//       </View>
//       {/* Slide transition */}
//       <Animated.View style={{ flex: 1, width: '100%' }}>
//         {tab === 'today' ? (
//           <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
//             {/* Gradient Header */}
//             <Animated.View style={{ opacity: fadeAnim }}>
//               <GradientBackground
//                 colors={gradients[gradientIdx] ?? ['#000', '#fff']}
//                 style={styles.gradientHeader}
//                 animated
//                 duration={800}
//               >
//                 <View style={styles.gradientContent}>
//                   <Text style={styles.dateText}>{formatTodayDate(new Date())}</Text>
//                 </View>
//               </GradientBackground>
//             </Animated.View>
//             {/* SearchBar sticky */}
//             <View style={styles.searchBarWrap}>
//               <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
//                 <Ionicons
//                   name="search"
//                   size={20}
//                   color="#000"
//                   style={{ opacity: 0.4, marginRight: 8 }}
//                 />
//                 <TextInput
//                   style={styles.searchInput}
//                   placeholder="Search for an event, friend"
//                   placeholderTextColor="#8E8E93"
//                   value={search}
//                   onChangeText={setSearch}
//                   onFocus={() => setSearchFocused(true)}
//                   onBlur={() => setSearchFocused(false)}
//                   returnKeyType="search"
//                 />
//               </View>
//             </View>
//             {/* Section title + underline */}
//             <View style={styles.sectionTitleWrap}>
//               <Text style={styles.sectionTitle}>Upcoming Events</Text>
//               <Scribble width={240} height={2} style={{ marginTop: 2 }} />
//             </View>
//             {/* Liste d'événements */}
//             <View style={{ paddingBottom: 32 }}>
//               {filteredEvents.map((event) => (
//                 <EventRow
//                   key={event.id}
//                   event={mapEventRow(event)}
//                   onPress={() => {
//                     /* navigation */
//                   }}
//                 />
//               ))}
//             </View>
//           </ScrollView>
//         ) : (
//           // Calendar tab
//           <ScrollView showsVerticalScrollIndicator={false}>
//             {/* Calendar Grid */}
//             <CalendarGrid
//               selectedDate={selectedDate}
//               onDateSelect={setSelectedDate}
//               events={calendarEvents}
//               onMonthChange={() => {}}
//             />

//             {/* Events for selected date */}
//             <View style={styles.selectedDateSection}>
//               <View style={styles.selectedDateHeader}>
//                 <Text style={styles.selectedDateText}>
//                   {selectedDate.toLocaleDateString('en-US', {
//                     weekday: 'long',
//                     month: 'long',
//                     day: 'numeric',
//                   })}
//                 </Text>
//                 <Scribble width={160} height={2} style={{ marginTop: 4 }} />
//               </View>

//               {getEventsForSelectedDate().length > 0 ? (
//                 <View style={styles.selectedDateEvents}>
//                   {getEventsForSelectedDate().map((event) => (
//                     <EventRow
//                       key={event.id}
//                       event={mapEventRow(event)}
//                       onPress={() => {
//                         router.push(`/screens/event-details?eventId=${event.id}`);
//                       }}
//                     />
//                   ))}
//                 </View>
//               ) : (
//                 <View style={styles.noEventsContainer}>
//                   <Ionicons name="calendar-outline" size={48} color="#C4C4C4" />
//                   <Text style={styles.noEventsText}>No events on this day</Text>
//                 </View>
//               )}
//             </View>
//           </ScrollView>
//         )}
//       </Animated.View>
//     </SafeAreaView>
//   );
// }

// function formatTodayDate(date: Date) {
//   // Ex: May 9, Friday
//   return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'long' });
// }

// function mapEventRow(event: CalendarEvent) {
//   // Mappe CalendarEvent vers EventRow
//   return {
//     id: event.id,
//     title: event.title,
//     date: event.date,
//     location: event.location,
//     cover_image: event.cover_image || event.image_url,
//     image_url: event.image_url,
//     participants: [], // No participants data available in CalendarEvent
//     going_count: event.participants_count || 0,
//     extra_data: event.extra_data,
//   };
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFF',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E5E5',
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#222',
//   },
//   viewModeButton: {
//     width: 40,
//     height: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   calendarHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 20,
//   },
//   monthNavButton: {
//     width: 40,
//     height: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   monthTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: '#222',
//   },
//   daysOfWeek: {
//     flexDirection: 'row',
//     paddingHorizontal: 16,
//     marginBottom: 8,
//   },
//   dayOfWeek: {
//     flex: 1,
//     alignItems: 'center',
//     paddingVertical: 8,
//   },
//   dayOfWeekText: {
//     fontSize: 12,
//     fontWeight: '500',
//     color: '#888',
//   },
//   calendarGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     paddingHorizontal: 16,
//   },
//   calendarDay: {
//     width: '14.28%',
//     aspectRatio: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     position: 'relative',
//   },
//   calendarDayInactive: {
//     opacity: 0.3,
//   },
//   calendarDayToday: {
//     backgroundColor: '#E3F2FD',
//     borderRadius: 20,
//   },
//   calendarDaySelected: {
//     backgroundColor: '#007AFF',
//     borderRadius: 20,
//   },
//   calendarDayText: {
//     fontSize: 16,
//     color: '#222',
//   },
//   calendarDayTextInactive: {
//     color: '#CCC',
//   },
//   calendarDayTextToday: {
//     color: '#007AFF',
//     fontWeight: '600',
//   },
//   calendarDayTextSelected: {
//     color: '#FFF',
//     fontWeight: '600',
//   },
//   eventIndicator: {
//     position: 'absolute',
//     bottom: 2,
//     right: 2,
//     backgroundColor: '#FF6B6B',
//     borderRadius: 8,
//     minWidth: 16,
//     height: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   eventIndicatorText: {
//     fontSize: 10,
//     color: '#FFF',
//     fontWeight: '600',
//   },
//   section: {
//     padding: 16,
//   },
//   sectionTitleOld: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#222',
//     marginBottom: 16,
//   },
//   noEventsText: {
//     fontSize: 14,
//     color: '#888',
//     textAlign: 'center',
//     paddingVertical: 20,
//   },
//   eventItem: {
//     flexDirection: 'row',
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//   },
//   eventTime: {
//     width: 60,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   eventTimeText: {
//     fontSize: 12,
//     color: '#888',
//     fontWeight: '500',
//   },
//   eventContent: {
//     flex: 1,
//     paddingLeft: 12,
//   },
//   eventTitle: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#222',
//     marginBottom: 4,
//   },
//   eventLocation: {
//     fontSize: 14,
//     color: '#888',
//     marginBottom: 4,
//   },
//   statusContainer: {
//     marginTop: 4,
//   },
//   statusBadge: {
//     alignSelf: 'flex-start',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 12,
//     backgroundColor: '#F0F0F0',
//   },
//   statusGoing: {
//     backgroundColor: '#E8F5E8',
//   },
//   statusMaybe: {
//     backgroundColor: '#FFF3CD',
//   },
//   statusNotGoing: {
//     backgroundColor: '#F8D7DA',
//   },
//   statusText: {
//     fontSize: 12,
//     fontWeight: '500',
//     color: '#222',
//   },
//   emptyContainer: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#222',
//     marginTop: 16,
//     marginBottom: 8,
//   },
//   emptySubtitle: {
//     fontSize: 14,
//     color: '#888',
//     textAlign: 'center',
//   },
//   listEventItem: {
//     flexDirection: 'row',
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//   },
//   listEventDate: {
//     width: 60,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 16,
//   },
//   listEventDay: {
//     fontSize: 24,
//     fontWeight: '600',
//     color: '#222',
//   },
//   listEventMonth: {
//     fontSize: 12,
//     color: '#888',
//     textTransform: 'uppercase',
//   },
//   listEventContent: {
//     flex: 1,
//   },
//   listEventTitle: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#222',
//     marginBottom: 4,
//   },
//   listEventTime: {
//     fontSize: 14,
//     color: '#007AFF',
//     marginBottom: 4,
//   },
//   listEventLocation: {
//     fontSize: 14,
//     color: '#888',
//   },
//   tabsRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingTop: Platform.OS === 'ios' ? 24 : 12,
//     paddingBottom: 8,
//     paddingHorizontal: 24,
//     backgroundColor: '#fff',
//     zIndex: 10,
//   },
//   tabBtn: {
//     marginRight: 32,
//     paddingBottom: 4,
//   },
//   tabLabel: {
//     fontSize: 17,
//     fontWeight: '600',
//     color: '#000',
//     letterSpacing: -0.17,
//   },
//   tabLabelActive: {
//     color: '#000',
//   },
//   gradientHeader: {
//     height: 310,
//     borderBottomLeftRadius: 24,
//     borderBottomRightRadius: 24,
//     overflow: 'hidden',
//     width: W,
//   },
//   gradientContent: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     padding: 24,
//   },
//   dateText: {
//     fontFamily: Platform.OS === 'ios' ? 'New York' : undefined,
//     fontSize: 40,
//     fontWeight: '500',
//     color: '#000',
//     lineHeight: 46,
//     letterSpacing: -0.8,
//     marginBottom: 8,
//   },
//   searchBarWrap: {
//     backgroundColor: '#fff',
//     paddingHorizontal: 24,
//     paddingTop: 16,
//     paddingBottom: 8,
//     zIndex: 10,
//   },
//   searchBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: '#D7D7D7',
//     paddingHorizontal: 16,
//     height: 44,
//     shadowColor: '#000',
//     shadowOpacity: 0.03,
//     shadowRadius: 2,
//     shadowOffset: { width: 0, height: 1 },
//   },
//   searchBarFocused: {
//     borderColor: '#007AFF',
//   },
//   searchInput: {
//     flex: 1,
//     fontSize: 15,
//     color: '#000',
//     fontWeight: '400',
//     paddingVertical: 10,
//   },
//   sectionTitleWrap: {
//     paddingHorizontal: 24,
//     paddingTop: 16,
//     paddingBottom: 8,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#000',
//     marginBottom: 2,
//   },
//   selectedDateSection: {
//     paddingHorizontal: 24,
//     paddingTop: 24,
//     paddingBottom: 32,
//   },
//   selectedDateHeader: {
//     marginBottom: 16,
//   },
//   selectedDateText: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: '#000',
//     letterSpacing: -0.4,
//   },
//   selectedDateEvents: {
//     gap: 12,
//   },
//   noEventsContainer: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
// });
