import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import CategoryTabs from '@/features/home/components/CategoryTabs';
import HeaderGreeting from '@/features/home/components/HeaderGreeting';
import SearchBar from '@/features/home/components/SearchBar';
import SectionHeader from '@/features/home/components/SectionHeader';
import MiniMap from '@/features/map/components/MiniMap';
import StoriesStrip from '@/features/stories/components/StoriesStrip';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { EVENT_CATEGORIES } from '@/features/events/utils/categoryHelpers';
import { usePendingFriendRequests } from '@/shared/hooks/usePendingFriendRequests';
import EventThumbnail from '@/shared/components/EventThumbnail';
import { useSession } from '@/shared/providers/SessionContext';

const getCategories = (t: any) => [
  { id: 'all', label: t('common.all') },
  ...EVENT_CATEGORIES.slice(0, 6), // Take first 6 categories
];

// Sample event images for demo
// const EVENT_IMAGES = [
//   "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop", // Concert
//   "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=400&h=400&fit=crop", // Art
//   "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=400&fit=crop", // Festival
//   "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop", // Party
//   "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop", // Conference
// ];

const HomeScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const [activeCategory, setActiveCategory] = useState(0);
  const { events = [], loading: eventsLoading } = useEventsAdvanced();
  const { profile, loading: profileLoading } = useProfile();
  const { currentStep, isComplete, loading: onboardingLoading } = useOnboardingStatus();
  const CATEGORIES = getCategories(t);

  // Process any pending friend requests from ContactsFriendsScreen
  usePendingFriendRequests();

  // Filter events by category
  const filteredEvents = events.filter((event) => {
    if (activeCategory === 0) return true; // Show all
    const selectedCategory = CATEGORIES[activeCategory];
    return event.event_category === selectedCategory.id;
  });

  // Get events user is going to - ONLY events where user has confirmed participation
  const userGoingEvents = events.filter((event) => event.user_status === 'going');

  // Get events based on interests using user's profile data
  const getInterestBasedEvents = () => {
    if (!profile) return [];

    const userInterests = [
      ...(profile.interests || []),
      ...(profile.hobbies || []),
      profile.jam_preference,
      profile.restaurant_preference,
      profile.path,
    ]
      .filter(Boolean)
      .map((i) => i?.toLowerCase());

    // Score events based on interest matching
    const scoredEvents = events.map((event) => {
      let score = 0;

      // Check category match
      if (
        event.event_category &&
        userInterests.some(
          (interest) =>
            event.event_category.toLowerCase().includes(interest) ||
            interest.includes(event.event_category.toLowerCase())
        )
      ) {
        score += 3;
      }

      // Check title/description match
      const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
      userInterests.forEach((interest) => {
        if (eventText.includes(interest)) {
          score += 2;
        }
      });

      // Check tags match
      if (event.tags) {
        event.tags.forEach((tag) => {
          if (
            userInterests.some(
              (interest) =>
                tag.toLowerCase().includes(interest) || interest.includes(tag.toLowerCase())
            )
          ) {
            score += 1;
          }
        });
      }

      return { ...event, interestScore: score };
    });

    // Return top events with score > 0, sorted by score
    return scoredEvents
      .filter((e) => e.interestScore > 0)
      .sort((a, b) => b.interestScore - a.interestScore)
      .slice(0, 3);
  };

  const interestEvents = getInterestBasedEvents();

  // Get events with friends going - ONLY show if user has friends attending
  const getFriendsEvents = () => {
    // For now, we'll check if there are participants that aren't the current user
    // In a real app, this would check against the user's friends list
    return events
      .filter((event) => {
        // Skip if user is already going
        if (event.user_status === 'going') return false;

        // Check if there are other participants (potential friends)
        const hasOtherParticipants =
          event.participants &&
          event.participants.length > 0 &&
          event.participants.some((p) => p.id !== profile?.id);

        return hasOtherParticipants && (event.participants_count || 0) > 0;
      })
      .sort((a, b) => (b.participants_count || 0) - (a.participants_count || 0))
      .slice(0, 3);
  };

  const friendsEvents = getFriendsEvents();

  // Sort all events by participant count (biggest first)
  const allEventsSorted = filteredEvents.sort(
    (a, b) => (b.participants_count || 0) - (a.participants_count || 0)
  );

  // Redirection onboarding si nécessaire
  useEffect(() => {
    if (!onboardingLoading && !isComplete && currentStep) {
      // Mappe l'étape à la route
      const stepToRoute: Record<string, string> = {
        PhoneVerification: '/phone-verification',
        NameInput: '/name-input',
        AvatarPick: '/avatar-pick',
        ContactsPermission: '/contacts-permission',
        LocationPermission: '/location-permission',
        AgeInput: '/age-input',
        PathInput: '/path-input',
        JamPicker: '/jam-picker',
        RestaurantPicker: '/restaurant-picker',
        HobbyPicker: '/hobby-picker',
      };
      const route = stepToRoute[currentStep] || '/name-input';
      router.replace(route);
    }
  }, [onboardingLoading, isComplete, currentStep, router]);

  const handleEventPress = (eventId: string) => {
    void router.push(`/screens/event-details?eventId=${eventId}`);
  };

  if (profileLoading || eventsLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/background.png')}
        style={styles.backgroundContainer}
        imageStyle={styles.backgroundImage}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <HeaderGreeting />
            <StoriesStrip />
          </View>
        </SafeAreaView>
        <View style={styles.whiteContainer}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <SearchBar />
            <CategoryTabs
              categories={CATEGORIES.map((cat) => cat.label)}
              activeIndex={activeCategory}
              onPress={setActiveCategory}
            />
            <MiniMap />
            <SectionHeader
              title={t('home.sections.allEvents', 'All Events')}
              onViewAll={() => router.push('/events-list?section=all')}
            />
            {allEventsSorted.slice(0, 2).map((event) => (
              <EventThumbnail
                key={`all-${event.id}`}
                event={event}
                onPress={() => handleEventPress(event.id)}
                currentUserId={session?.user?.id}
              />
            ))}
            {interestEvents.length > 0 && (
              <>
                <SectionHeader
                  title={t('home.sections.basedOnInterests', 'Based on Your Interests')}
                  onViewAll={() => router.push('/events-list?section=interests')}
                />
                {interestEvents.map((event) => (
                  <EventThumbnail
                    key={`interest-${event.id}`}
                    event={event}
                    onPress={() => handleEventPress(event.id)}
                    currentUserId={session?.user?.id}
                  />
                ))}
              </>
            )}
            {friendsEvents.length > 0 && (
              <>
                <SectionHeader
                  title={t('home.sections.friendsGoing', 'Your Friends Are Going To')}
                  onViewAll={() => router.push('/events-list?section=friends')}
                />
                {friendsEvents.slice(0, 2).map((event) => (
                  <EventThumbnail
                    key={`friends-${event.id}`}
                    event={event}
                    onPress={() => handleEventPress(event.id)}
                    currentUserId={session?.user?.id}
                  />
                ))}
              </>
            )}
            {userGoingEvents.length > 0 && (
              <>
                <SectionHeader
                  title={t('home.sections.eventsYouAreGoing', 'Events You Are Going To')}
                  onViewAll={() => router.push('/events-list?section=going')}
                />
                {userGoingEvents.slice(0, 2).map((event) => (
                  <EventThumbnail
                    key={`going-${event.id}`}
                    event={event}
                    onPress={() => handleEventPress(event.id)}
                    currentUserId={session?.user?.id}
                  />
                ))}
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    fontFamily: 'Georgia',
    lineHeight: 38,
  },
  greetingName: {
    fontSize: 32,
    fontStyle: 'italic',
    fontWeight: '400',
    fontFamily: 'Georgia',
  },
  storiesRow: { flexDirection: 'row', marginVertical: 18, paddingLeft: 4 },
  storyItemAdd: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  storyAddPlus: { fontSize: 32, color: '#B0B0B0' },
  storyItem: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#eee',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  storyImage: { width: 70, height: 70, borderRadius: 18 },
  storyAvatarCircle: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  storyAvatar: { width: 24, height: 24, borderRadius: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 18,
  },
  searchIcon: { fontSize: 20, color: '#C7C7CC', marginRight: 8 },
  searchInput: { flex: 1, fontSize: 17, color: '#222' },
  categoriesRow: { flexDirection: 'row', marginBottom: 18, paddingLeft: 2 },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    marginRight: 10,
  },
  categoryBtnActive: { backgroundColor: '#222' },
  categoryText: { fontSize: 16, color: '#222' },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  mapPreview: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    backgroundColor: '#eee',
    marginBottom: 18,
    alignSelf: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  mapImage: { width: '100%', height: '100%' },
  mapExpandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapExpandIcon: { fontSize: 18, color: '#222' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  sectionViewAll: { fontSize: 15, color: '#888', fontWeight: '500' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  eventImage: { width: 70, height: 70, borderRadius: 12, marginRight: 14 },
  eventTitle: { fontSize: 17, fontWeight: 'bold', color: '#222' },
  eventDate: { fontSize: 15, color: '#666', marginTop: 2 },
  eventLocation: { fontSize: 14, color: '#888', marginTop: 2 },
  eventAttendees: { fontSize: 13, color: '#888', marginTop: 2 },
  safe: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backgroundContainer: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backgroundImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  whiteContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 20,
  },
});

export default HomeScreen;
