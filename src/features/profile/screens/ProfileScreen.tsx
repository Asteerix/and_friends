import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import UnderlineDecoration from '@/features/home/components/UnderlineDecoration.svg';
import { create } from 'react-native-pixel-perfect';
import { useNavigation } from '@react-navigation/native';

import { useProfile } from '@/hooks/useProfile';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useFriends } from '@/hooks/useFriends';
import { useRatings } from '@/hooks/useRatings';
import { useStories } from '@/shared/providers/StoriesContext';
import EventCard from '@/features/home/components/EventCard';
import RatingModal from '@/features/events/components/RatingModal';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { supabase } from '@/shared/lib/supabase/client';

const TABS = [
  { key: 'about', label: 'About' },
  { key: 'attended', label: 'Attended' },
  { key: 'organized', label: 'Organized' },
  { key: 'memories', label: 'Memories' },
  { key: 'friends', label: 'Friends' },
  { key: 'ratings', label: 'Ratings' },
];

// Définir le chemin de l'avatar par défaut
const DEFAULT_AVATAR = require('../../../assets/default_avatar.png'); // eslint-disable-line @typescript-eslint/no-var-requires

// Helper pour vérifier si une image est valide (non vide, non null, non undefined)
function isValidAvatar(url?: string | null) {
  return (
    !!url &&
    typeof url === 'string' &&
    url.trim() !== '' &&
    !url.endsWith('null') &&
    !url.endsWith('undefined')
  );
}

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface ProfileScreenProps {
  userId?: string;
}

export default function ProfileScreen({ userId }: ProfileScreenProps = {}) {
  const navigation = useNavigation<any>();
  const {
    profile: currentUserProfile,
    loading: currentUserLoading,
    getProfileStats,
  } = useProfile();
  const { profile: otherUserProfile, loading: otherUserLoading } = useUserProfile(
    userId && userId !== currentUserProfile?.id ? userId : null
  );
  const { getUserEvents } = useEventsAdvanced();
  const { 
    friends: userFriends,
    friendRequests,
    sentRequests,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    checkFriendStatus
  } = useFriends();
  const {
    getUserRatingStats,
    getUserGivenRatings,
    getUserReceivedRatings,
    canRateUser,
  } = useRatings();
  // const [editing, setEditing] = useState(false);
  // const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  // const [profileStats, setProfileStats] = useState<{
  //   eventsCreated: number;
  //   eventsParticipated: number;
  //   friendsCount: number;
  // } | null>(null);
  // const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('about');
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [organizedEvents, setOrganizedEvents] = useState<any[]>([]);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [activeRatingTab, setActiveRatingTab] = useState<'received' | 'given'>('received');
  const [ratingsReceived, setRatingsReceived] = useState<any[]>([]);
  const [ratingsGiven, setRatingsGiven] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState<{
    average_rating: number;
    total_ratings: number;
    rating_distribution: Record<string, number>;
  } | null>(null);
  // Friends tab states
  const [friendsSubTab, setFriendsSubTab] = useState<'friends' | 'received' | 'sent' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendsSortBy, setFriendsSortBy] = useState<'name' | 'date' | 'recent' | 'mutual'>('name');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [receivedSearchQuery, setReceivedSearchQuery] = useState('');
  // Events tab states
  const [attendedSubTab, setAttendedSubTab] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');
  const [organizedSubTab, setOrganizedSubTab] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');
  const [eventsSearchQuery, setEventsSearchQuery] = useState('');
  const [eventsSortBy, setEventsSortBy] = useState<'date' | 'name' | 'participants'>('date');
  // const insets = useSafeAreaInsets();
  const isMyProfile = !userId || userId === currentUserProfile?.id;
  const profile = isMyProfile ? currentUserProfile : otherUserProfile;
  const loading = isMyProfile ? currentUserLoading : otherUserLoading;
  const [isPlaying, setIsPlaying] = useState(false);
  const [jam, setJam] = useState({
    track_id: '',
    title: '',
    artist: '',
    cover_url: '',
    preview_url: '',
  });
  const [restaurant, setRestaurant] = useState({
    id: '',
    name: '',
    address: '',
  });
  const [locationDisplay, setLocationDisplay] = useState('');
  const { getStoriesByUser } = useStories();
  const responsive = useResponsive();
  const styles = createStyles(responsive);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [existingRating, setExistingRating] = useState<{ rating: number; comment: string | null } | undefined>();
  const [canRate, setCanRate] = useState(false);

  useEffect(() => {
    if (profile) {
      // setEditedProfile(profile);
      if (isMyProfile) {
        loadProfileStats();
      }

      // Load ratings data
      loadRatings(profile.id);

      console.log('Profile data:', {
        jam_title: profile.jam_title,
        jam_artist: profile.jam_artist,
        selected_restaurant_name: profile.selected_restaurant_name,
        hobbies: profile.hobbies,
        location: profile.location
      });

      // Load jam/music preference from individual fields
      if (profile.jam_title || profile.jam_artist) {
        setJam({
          track_id: profile.jam_track_id || '',
          title: profile.jam_title || '',
          artist: profile.jam_artist || '',
          cover_url: profile.jam_cover_url || '',
          preview_url: profile.jam_preview_url || '',
        });
      }

      // Load restaurant preference from individual fields
      if (profile.selected_restaurant_name) {
        setRestaurant({
          id: profile.selected_restaurant_id || '',
          name: profile.selected_restaurant_name || '',
          address: profile.selected_restaurant_address || '',
        });
      }

      // Load location
      if (profile.location) {
        setLocationDisplay(profile.location);
      }
    }
  }, [profile, isMyProfile]);

  useEffect(() => {
    // Fetch events attended and organized
    if (profile?.id) {
      (async () => {
        let allEvents;
        if (isMyProfile) {
          allEvents = await getUserEvents();
        } else {
          allEvents = await fetchUserEvents(profile.id);
        }
        
        setUserEvents((allEvents || []).filter((e: any) => !e.is_creator));
        setOrganizedEvents((allEvents || []).filter((e: any) => e.is_creator));
      })();
    }
  }, [profile?.id, isMyProfile, getUserEvents]);

  // Fetch user stories (memories - they don't expire)
  useEffect(() => {
    if (profile?.id) {
      (async () => {
        const stories = await getStoriesByUser(profile.id);
        // Sort stories by created_at to show most recent first
        const sortedStories = (stories || []).sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Most recent first
        });
        setUserStories(sortedStories);
      })();
    }
  }, [profile?.id, getStoriesByUser]);

  const loadProfileStats = async () => {
    await getProfileStats();
    // setProfileStats(stats);
  };

  const fetchUserEvents = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          status,
          events (
            id,
            title,
            description,
            date,
            end_date,
            location,
            image_url,
            created_by,
            participants_count,
            profiles:created_by (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'going');

      if (error) {
        console.error('Error fetching user events:', error);
        return [];
      }

      return data?.map((item: any) => ({
        ...item.events,
        is_creator: item.events.created_by === userId,
        organizer: item.events.profiles
      })) || [];
    } catch (error) {
      console.error('Error in fetchUserEvents:', error);
      return [];
    }
  };

  const loadRatings = async (targetUserId: string) => {
    try {
      // Load rating statistics
      const stats = await getUserRatingStats(targetUserId);
      if (stats) {
        setRatingStats({
          average_rating: stats.average_rating,
          total_ratings: stats.total_ratings,
          rating_distribution: stats.rating_distribution
        });
      }

      // Load received ratings
      const received = await getUserReceivedRatings(targetUserId);
      setRatingsReceived(received);

      // Load given ratings
      const given = await getUserGivenRatings(targetUserId);
      setRatingsGiven(given);

      // Check if current user can rate this user and load existing rating
      if (!isMyProfile && currentUserProfile?.id && targetUserId) {
        const canRateResult = await canRateUser(targetUserId);
        setCanRate(canRateResult);

        // Check if user has already rated this person
        const myGivenRatings = await getUserGivenRatings(currentUserProfile.id);
        const existingUserRating = myGivenRatings.find(r => r.to_user_id === targetUserId);
        if (existingUserRating) {
          setExistingRating({
            rating: existingUserRating.rating,
            comment: existingUserRating.comment
          });
        }
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  // const saveProfile = async () => {
  //   if (!editedProfile) return;

  //   setSaveLoading(true);
  //   try {
  //     const result = await updateProfile(editedProfile);

  //     if (result.error) {
  //       Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
  //       return;
  //     }

  //     setEditing(false);
  //     Alert.alert('Succès', 'Profil mis à jour avec succès');
  //     loadProfileStats(); // Refresh stats
  //   } catch (error) {
  //     console.error('Unexpected error:', error);
  //     Alert.alert('Erreur', "Une erreur inattendue s'est produite");
  //   } finally {
  //     setSaveLoading(false);
  //   }
  // };

  // const signOut = async () => {
  //   Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
  //     { text: 'Annuler', style: 'cancel' },
  //     {
  //       text: 'Déconnexion',
  //       style: 'destructive',
  //       onPress: async () => {
  //         await supabase.auth.signOut();
  //         if (setSession) {
  //           setSession(null);
  //         }
  //       },
  //     },
  //   ]);
  // };

  // const handleChangeAvatar = async () => {
  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ['images'],
  //     allowsEditing: true,
  //     aspect: [1, 1],
  //     quality: 0.8,
  //   });

  //   if (!result.canceled && result.assets[0]) {
  //     setSaveLoading(true);
  //     try {
  //       const uploadResult = await uploadAvatar(result.assets[0].uri);
  //       if (uploadResult.error) {
  //         Alert.alert('Erreur', 'Impossible de changer la photo de profil');
  //       } else {
  //         Alert.alert('Succès', 'Photo de profil mise à jour');
  //       }
  //     } catch (error) {
  //       console.error('Error uploading avatar:', error);
  //       Alert.alert('Erreur', "Une erreur s'est produite");
  //     } finally {
  //       setSaveLoading(false);
  //     }
  //   }
  // };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Helper function to get country ISO code from location string
  const getCountryISOCode = (location: string) => {
    if (!location) return 'US';

    // Common country mappings
    const countryMappings: { [key: string]: string } = {
      USA: 'US',
      'United States': 'US',
      'United States of America': 'US',
      UK: 'GB',
      'United Kingdom': 'GB',
      England: 'GB',
      Scotland: 'GB',
      Wales: 'GB',
      Canada: 'CA',
      Australia: 'AU',
      France: 'FR',
      Germany: 'DE',
      Italy: 'IT',
      Spain: 'ES',
      Japan: 'JP',
      Brazil: 'BR',
      Mexico: 'MX',
      India: 'IN',
      China: 'CN',
      'South Korea': 'KR',
      Korea: 'KR',
      Netherlands: 'NL',
      Holland: 'NL',
      Sweden: 'SE',
      Norway: 'NO',
      Denmark: 'DK',
      Switzerland: 'CH',
      Belgium: 'BE',
      Argentina: 'AR',
      Chile: 'CL',
      Colombia: 'CO',
      Portugal: 'PT',
      Greece: 'GR',
      Poland: 'PL',
      Russia: 'RU',
      Turkey: 'TR',
      Egypt: 'EG',
      'South Africa': 'ZA',
      'New Zealand': 'NZ',
      Ireland: 'IE',
      Austria: 'AT',
      Finland: 'FI',
      Singapore: 'SG',
      Thailand: 'TH',
      Malaysia: 'MY',
      Indonesia: 'ID',
      Philippines: 'PH',
      Vietnam: 'VN',
      UAE: 'AE',
      'United Arab Emirates': 'AE',
      'Saudi Arabia': 'SA',
      Israel: 'IL',
      'Czech Republic': 'CZ',
      Hungary: 'HU',
      Romania: 'RO',
      Ukraine: 'UA',
    };

    // Try to extract country from location (handle "City, Country" format)
    const parts = location.split(',');

    // Try last part first (usually country in "City, Country" format)
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1]?.trim() || '';

      // Check if it's a known country
      if (countryMappings[lastPart]) {
        return countryMappings[lastPart];
      }

      // If it's already a 2-letter code
      if (lastPart.length === 2) {
        return lastPart.toUpperCase();
      }
    }

    // Try first part (in case location is just country name)
    const firstPart = parts[0]?.trim() || '';
    if (countryMappings[firstPart]) {
      return countryMappings[firstPart];
    }

    // If it's already a 2-letter code
    if (firstPart.length === 2) {
      return firstPart.toUpperCase();
    }

    // Default to US
    return 'US';
  };

  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return `Member since ${date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })}`;
  };

  // Handle friend search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Sort friends based on selected criteria
  const getSortedFriends = () => {
    const friendsCopy = [...userFriends];
    
    switch (friendsSortBy) {
      case 'name':
        return friendsCopy.sort((a, b) => 
          (a.full_name || a.username).localeCompare(b.full_name || b.username)
        );
      case 'date':
        return friendsCopy.sort((a, b) => {
          const dateA = new Date(a.friendship_date || 0).getTime();
          const dateB = new Date(b.friendship_date || 0).getTime();
          return dateB - dateA; // Most recent first
        });
      case 'recent':
        return friendsCopy.sort((a, b) => {
          const lastSeenA = new Date(a.last_seen || 0).getTime();
          const lastSeenB = new Date(b.last_seen || 0).getTime();
          return lastSeenB - lastSeenA; // Most recently active first
        });
      case 'mutual':
        return friendsCopy.sort((a, b) => {
          const mutualA = a.mutual_friends_count || 0;
          const mutualB = b.mutual_friends_count || 0;
          if (mutualB !== mutualA) {
            return mutualB - mutualA; // Most mutual friends first
          }
          // Secondary sort by name if mutual count is same
          return (a.full_name || a.username).localeCompare(b.full_name || b.username);
        });
      default:
        return friendsCopy;
    }
  };

  // Filter friends based on search query
  const getFilteredFriends = () => {
    if (!friendsSearchQuery.trim()) return getSortedFriends();
    
    const query = friendsSearchQuery.toLowerCase();
    return getSortedFriends().filter(friend => 
      friend.username?.toLowerCase().includes(query) ||
      friend.full_name?.toLowerCase().includes(query) ||
      friend.bio?.toLowerCase().includes(query)
    );
  };

  // Filter received requests based on search query
  const getFilteredReceivedRequests = () => {
    if (!receivedSearchQuery.trim()) return friendRequests;
    
    const query = receivedSearchQuery.toLowerCase();
    return friendRequests.filter(request => 
      request.username?.toLowerCase().includes(query) ||
      request.full_name?.toLowerCase().includes(query)
    );
  };


  // Filter events by status (upcoming, ongoing, past)
  const filterEventsByStatus = (events: any[], status: 'upcoming' | 'ongoing' | 'past') => {
    const now = new Date();
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const eventEndDate = event.end_date ? new Date(event.end_date) : new Date(eventDate.getTime() + 3 * 60 * 60 * 1000); // Default 3 hours duration
      
      switch (status) {
        case 'upcoming':
          return eventDate > now;
        case 'ongoing':
          return eventDate <= now && eventEndDate >= now;
        case 'past':
          return eventEndDate < now;
        default:
          return true;
      }
    });
  };

  // Sort events based on selected criteria
  const sortEvents = (events: any[], sortBy: string) => {
    const eventsCopy = [...events];
    
    switch (sortBy) {
      case 'date':
        return eventsCopy.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
      case 'name':
        return eventsCopy.sort((a, b) => 
          (a.title || '').localeCompare(b.title || '')
        );
      case 'participants':
        return eventsCopy.sort((a, b) => 
          (b.participants_count || 0) - (a.participants_count || 0)
        );
      default:
        return eventsCopy;
    }
  };

  // Filter events by search query
  const filterEventsBySearch = (events: any[], query: string) => {
    if (!query.trim()) return events;
    
    const searchQuery = query.toLowerCase();
    return events.filter(event => 
      event.title?.toLowerCase().includes(searchQuery) ||
      event.location?.toLowerCase().includes(searchQuery) ||
      event.description?.toLowerCase().includes(searchQuery)
    );
  };

  // Get filtered and sorted events
  const getProcessedEvents = (events: any[], status: 'upcoming' | 'ongoing' | 'past') => {
    let processed = filterEventsByStatus(events, status);
    processed = filterEventsBySearch(processed, eventsSearchQuery);
    processed = sortEvents(processed, eventsSortBy);
    return processed;
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Format time for stories
  const formatStoryTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <>
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} showsVerticalScrollIndicator={false}>
      {/* HEADER bloc avec image et overlays */}
      <View
        style={{
          height: responsive.headerHeight,
          width: '100%',
          position: 'relative',
          backgroundColor: '#222',
          overflow: 'hidden',
        }}
      >
        <Image
          source={
            profile && isValidAvatar(profile.cover_url)
              ? { uri: profile.cover_url }
              : profile && isValidAvatar(profile.avatar_url)
                ? { uri: profile.avatar_url }
                : DEFAULT_AVATAR
          }
          style={styles.headerImage}
        />
        {/* Overlay sombre léger pour lisibilité des boutons */}
        <View style={styles.headerOverlay} pointerEvents="none" />
        {/* Ligne d'icônes avec pseudo centré entre back, messages et notifications */}
        <View
          style={[
            styles.topIconsRowOverlay,
            {
              top: 64,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            disabled={isMyProfile}
          >
            <View style={{ opacity: isMyProfile ? 0 : 1 }}>
              <BackButton width={24} height={24} fill="#FFF" color="#FFF" stroke="#FFF" />
            </View>
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              minWidth: 0,
            }}
          >
            <Text
              style={styles.usernameInline}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              accessibilityRole="text"
            >
              @{profile?.username || 'user'}
            </Text>
          </View>
          {isMyProfile && (
            <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Messages"
                style={{ paddingHorizontal: 4 }}
              >
                <ChatButton width={40} height={40} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={{ paddingHorizontal: 4 }}
              >
                <NotificationButton width={40} height={40} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Infos en bas à gauche */}
        <View style={styles.infoOverlay}>
          <View style={styles.flagRow}>
            {locationDisplay && (
              <>
                <View style={styles.flagCircle}>
                  <CountryFlag
                    isoCode={getCountryISOCode(locationDisplay)}
                    size={32}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                  />
                </View>
                <Text style={{ color: '#fff', fontSize: 16, marginLeft: 8 }}>
                  {locationDisplay}
                </Text>
              </>
            )}
          </View>
          <Text style={styles.nameOverlay}>
            {profile?.full_name || profile?.display_name || 'User'}
            {profile?.birth_date && !profile?.hide_birth_date
              ? `, ${calculateAge(profile.birth_date)}`
              : ''}
          </Text>
          <Text style={styles.metaOverlay}>
            {profile?.path || 'Explorer'} • {userFriends.length} friends
          </Text>
        </View>
        {/* Boutons Connect/Modifier et Paramètres en bas à gauche */}
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity
            style={styles.connectBtnOverlay}
            onPress={() => {
              if (isMyProfile) {
                navigation.navigate('screens/profile/edit');
              }
            }}
          >
            <Text style={styles.connectBtnTextOverlay}>
              {isMyProfile ? 'Edit Profile' : 'Connect'}
            </Text>
          </TouchableOpacity>
          {!isMyProfile && profile && canRate && (
            <TouchableOpacity
              style={styles.rateBtnOverlay}
              onPress={() => setShowRatingModal(true)}
            >
              <Ionicons name="star" size={16} color="#FFF" />
              <Text style={styles.rateBtnTextOverlay}>
                {existingRating ? 'Update Rating' : 'Rate'}
              </Text>
            </TouchableOpacity>
          )}
          {isMyProfile && (
            <TouchableOpacity
              style={styles.settingsBtnOverlay}
              onPress={() => navigation.navigate('screens/settings/index')}
            >
              <Text style={styles.settingsBtnTextOverlay}>Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Sheet blanche avec tabs, arrondi qui remonte sur l'image */}
      <View style={styles.tabsSheet}>
        {/* Nouvelle barre d'onglets animée avec scroll horizontal */}
        <View style={{ paddingTop: perfectSize(20) }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{
              paddingHorizontal: perfectSize(20),
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                minHeight: perfectSize(44),
                position: 'relative',
              }}
            >
              {TABS.map((tab, idx) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={({ pressed }) => [
                    {
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: perfectSize(44),
                      paddingVertical: perfectSize(6),
                      paddingHorizontal: perfectSize(16),
                      marginRight: idx < TABS.length - 1 ? perfectSize(8) : 0,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: perfectSize(14),
                        fontWeight: '500',
                        color: activeTab === tab.key ? '#222' : '#888',
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                    <View
                      style={{
                        height: perfectSize(8),
                        marginTop: perfectSize(4),
                        justifyContent: 'center',
                        alignItems: 'center',
                        minWidth: perfectSize(56),
                      }}
                    >
                      {activeTab === tab.key ? (
                        <UnderlineDecoration
                          width={perfectSize(56)}
                          height={perfectSize(4)}
                          style={{ alignSelf: 'center' }}
                          accessibilityLabel={`${tab.label} underline`}
                        />
                      ) : (
                        <View style={{ height: perfectSize(4) }} />
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
        {/* Tab content */}
        <View style={{ minHeight: 300 }}>
          {activeTab === 'about' && (
            <View style={styles.aboutContainer}>
              {/* Bio Section - First thing shown */}
              {profile?.bio && (
                <View style={styles.bioSection}>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              )}

              {/* Profile Completion Card - Only show if profile is incomplete and it's my profile */}
              {isMyProfile &&
                profile &&
                (!profile.bio ||
                  !profile.hobbies ||
                  profile.hobbies.length < 3 ||
                  !profile.avatar_url) && (
                  <View style={styles.profileCompletionCard}>
                    <View style={styles.profileCompletionHeader}>
                      <Text style={styles.profileCompletionTitle}>Complete Your Profile</Text>
                      <TouchableOpacity style={styles.dismissButton}>
                        <Text style={styles.dismissButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.profileCompletionText}>
                      {!profile.bio
                        ? 'Add a bio to introduce yourself'
                        : 'Drop a few more details — someone might just vibe with you.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.completeProfileButton}
                      onPress={() => navigation.navigate('screens/profile/edit')}
                    >
                      <Text style={styles.completeProfileButtonText}>Complete Profile</Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Talk to Me About Section */}
              {profile?.hobbies && profile.hobbies.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Talk to Me About</Text>
                  <View style={styles.interestsContainer}>
                    {profile.hobbies.map((interest: any, i: any) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.interestTag}
                        accessibilityRole="button"
                        accessibilityLabel={interest}
                      >
                        <Text style={styles.interestTagText}>{interest}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* On Repeat Section */}
              {jam.title && (
                <>
                  <Text style={styles.sectionTitle}>On Repeat</Text>
                  <TouchableOpacity style={styles.songCard} activeOpacity={0.8}>
                    <View style={styles.songAlbumArt}>
                      {jam.cover_url ? (
                        <Image source={{ uri: jam.cover_url }} style={styles.albumCover} />
                      ) : (
                        <View style={styles.albumPlaceholder}>
                          <Ionicons name="musical-note" size={24} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.songInfo}>
                      <Text style={styles.songTitle}>{jam.title}</Text>
                      <Text style={styles.songArtist}>{jam.artist}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => setIsPlaying(!isPlaying)}
                      accessibilityRole="button"
                      accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                    >
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={20}
                        color="#FFF"
                        style={isPlaying ? {} : { marginLeft: 2 }}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </>
              )}

              {/* Go-To Spot Section */}
              {restaurant.name && (
                <>
                  <Text style={styles.sectionTitle}>Go-To Spot</Text>
                  <View style={styles.placeCard}>
                    <View style={styles.placeIcon}>
                      <Text style={styles.placeEmoji}>📍</Text>
                    </View>
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName}>{restaurant.name}</Text>
                      <Text style={styles.placeAddress}>{restaurant.address}</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Member Since - Moved before bio */}
              <View style={styles.memberSinceContainer}>
                <Text style={styles.memberSince}>{formatMemberSince(profile?.created_at)}</Text>
              </View>
            </View>
          )}
          {activeTab === 'friends' && (
            <View style={styles.friendsContainer}>
              {/* Friends sub-tabs - only show for own profile */}
              {isMyProfile && (
                <View style={styles.friendsSubTabContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.friendsSubTabScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.friendsSubTab,
                        friendsSubTab === 'friends' && styles.friendsSubTabActive,
                      ]}
                      onPress={() => setFriendsSubTab('friends')}
                    >
                      <View style={styles.friendsSubTabContent}>
                        <Text
                          style={[
                            styles.friendsSubTabText,
                            friendsSubTab === 'friends' && styles.friendsSubTabTextActive,
                          ]}
                        >
                          Friends
                        </Text>
                        <View style={[
                          styles.tabCountBadge,
                          friendsSubTab === 'friends' && styles.tabCountBadgeActive
                        ]}>
                          <Text style={[
                            styles.tabCountText,
                            friendsSubTab === 'friends' && styles.tabCountTextActive
                          ]}>
                            {userFriends.length}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.friendsSubTab,
                        friendsSubTab === 'search' && styles.friendsSubTabActive,
                      ]}
                      onPress={() => setFriendsSubTab('search')}
                    >
                      <View style={styles.friendsSubTabContent}>
                        <Ionicons 
                          name="search" 
                          size={18} 
                          color={friendsSubTab === 'search' ? '#FFF' : '#666'} 
                        />
                        <Text
                          style={[
                            styles.friendsSubTabText,
                            friendsSubTab === 'search' && styles.friendsSubTabTextActive,
                          ]}
                        >
                          Search
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.friendsSubTab,
                        friendsSubTab === 'received' && styles.friendsSubTabActive,
                      ]}
                      onPress={() => setFriendsSubTab('received')}
                    >
                      <View style={styles.friendsSubTabContent}>
                        <Text
                          style={[
                            styles.friendsSubTabText,
                            friendsSubTab === 'received' && styles.friendsSubTabTextActive,
                          ]}
                        >
                          Received
                        </Text>
                        {friendRequests.length > 0 ? (
                          <View style={styles.requestBadge}>
                            <Text style={styles.requestBadgeText}>{friendRequests.length}</Text>
                          </View>
                        ) : (
                          <View style={[
                            styles.tabCountBadge,
                            friendsSubTab === 'received' && styles.tabCountBadgeActive
                          ]}>
                            <Text style={[
                              styles.tabCountText,
                              friendsSubTab === 'received' && styles.tabCountTextActive
                            ]}>
                              0
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.friendsSubTab,
                        friendsSubTab === 'sent' && styles.friendsSubTabActive,
                      ]}
                      onPress={() => setFriendsSubTab('sent')}
                    >
                      <View style={styles.friendsSubTabContent}>
                        <Text
                          style={[
                            styles.friendsSubTabText,
                            friendsSubTab === 'sent' && styles.friendsSubTabTextActive,
                          ]}
                        >
                          Sent
                        </Text>
                        <View style={[
                          styles.tabCountBadge,
                          friendsSubTab === 'sent' && styles.tabCountBadgeActive
                        ]}>
                          <Text style={[
                            styles.tabCountText,
                            friendsSubTab === 'sent' && styles.tabCountTextActive
                          ]}>
                            {sentRequests.length}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}

              {/* Friends list */}
              {(friendsSubTab === 'friends' || !isMyProfile) && (
                userFriends.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Ionicons name="people-outline" size={48} color="#CCC" />
                    <Text style={styles.emptySectionText}>No friends yet</Text>
                    <Text style={styles.emptySectionSubtext}>
                      {isMyProfile
                        ? 'Connect with people to grow your network'
                        : "This user hasn't added any friends yet"}
                    </Text>
                    {isMyProfile && (
                      <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => setFriendsSubTab('search')}
                      >
                        <Text style={styles.searchButtonText}>Find Friends</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.friendsList}>
                    {/* Search bar for friends */}
                    {isMyProfile && userFriends.length > 3 && (
                      <View style={styles.friendsSearchContainer}>
                        <View style={styles.friendsSearchInputContainer}>
                          <Ionicons name="search" size={16} color="#999" />
                          <TextInput
                            style={styles.friendsSearchInput}
                            placeholder="Search friends..."
                            value={friendsSearchQuery}
                            onChangeText={setFriendsSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                          />
                        </View>
                      </View>
                    )}
                    
                    {/* Sort options for friends */}
                    {isMyProfile && getFilteredFriends().length > 1 && (
                      <View style={styles.sortContainer}>
                        <TouchableOpacity 
                          style={styles.sortButton}
                          onPress={() => setShowSortOptions(!showSortOptions)}
                        >
                          <Ionicons name="funnel-outline" size={16} color="#007AFF" />
                          <Text style={styles.sortButtonText}>
                            Sort by {friendsSortBy === 'name' ? 'Name' : friendsSortBy === 'date' ? 'Friendship Date' : friendsSortBy === 'recent' ? 'Activity' : 'Mutual Friends'}
                          </Text>
                          <Ionicons 
                            name={showSortOptions ? "chevron-up" : "chevron-down"} 
                            size={16} 
                            color="#007AFF" 
                          />
                        </TouchableOpacity>
                        
                        {showSortOptions && (
                          <View style={styles.sortOptions}>
                            <TouchableOpacity 
                              style={[styles.sortOption, friendsSortBy === 'name' && styles.sortOptionActive]}
                              onPress={() => { setFriendsSortBy('name'); setShowSortOptions(false); }}
                            >
                              <Ionicons name="text-outline" size={16} color={friendsSortBy === 'name' ? '#007AFF' : '#666'} />
                              <Text style={[styles.sortOptionText, friendsSortBy === 'name' && styles.sortOptionTextActive]}>
                                Name (A-Z)
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.sortOption, friendsSortBy === 'date' && styles.sortOptionActive]}
                              onPress={() => { setFriendsSortBy('date'); setShowSortOptions(false); }}
                            >
                              <Ionicons name="calendar-outline" size={16} color={friendsSortBy === 'date' ? '#007AFF' : '#666'} />
                              <Text style={[styles.sortOptionText, friendsSortBy === 'date' && styles.sortOptionTextActive]}>
                                Recently Added
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.sortOption, friendsSortBy === 'recent' && styles.sortOptionActive]}
                              onPress={() => { setFriendsSortBy('recent'); setShowSortOptions(false); }}
                            >
                              <Ionicons name="time-outline" size={16} color={friendsSortBy === 'recent' ? '#007AFF' : '#666'} />
                              <Text style={[styles.sortOptionText, friendsSortBy === 'recent' && styles.sortOptionTextActive]}>
                                Recently Active
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.sortOption, friendsSortBy === 'mutual' && styles.sortOptionActive]}
                              onPress={() => { setFriendsSortBy('mutual'); setShowSortOptions(false); }}
                            >
                              <Ionicons name="people-outline" size={16} color={friendsSortBy === 'mutual' ? '#007AFF' : '#666'} />
                              <Text style={[styles.sortOptionText, friendsSortBy === 'mutual' && styles.sortOptionTextActive]}>
                                Mutual Friends
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                    
                    {getFilteredFriends().length === 0 && friendsSearchQuery ? (
                      <View style={styles.emptySection}>
                        <Ionicons name="search" size={48} color="#CCC" />
                        <Text style={styles.emptySectionText}>No friends found</Text>
                        <Text style={styles.emptySectionSubtext}>
                          Try searching with a different name
                        </Text>
                      </View>
                    ) : (
                      getFilteredFriends().map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        style={styles.friendCard}
                        onPress={() =>
                          navigation.navigate('screens/profile/index', { userId: friend.id })
                        }
                      >
                        <Image
                          source={friend.avatar_url ? { uri: friend.avatar_url } : DEFAULT_AVATAR}
                          style={styles.friendAvatar}
                        />
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{friend.full_name || friend.username}</Text>
                          <Text style={styles.friendUsername}>@{friend.username}</Text>
                          {friend.bio && (
                            <Text style={styles.friendBio} numberOfLines={1}>
                              {friend.bio}
                            </Text>
                          )}
                          {friend.mutual_friends_count && friend.mutual_friends_count > 0 && (
                            <Text style={styles.mutualFriends}>
                              {friend.mutual_friends_count} mutual friend{friend.mutual_friends_count > 1 ? 's' : ''}
                            </Text>
                          )}
                          {friend.last_seen && (
                            <View style={styles.lastSeenContainer}>
                              <View style={[
                                styles.activityDot,
                                { 
                                  backgroundColor: new Date(friend.last_seen).getTime() > Date.now() - 300000 
                                    ? '#34C759' // Online (active in last 5 minutes)
                                    : new Date(friend.last_seen).getTime() > Date.now() - 3600000
                                    ? '#FFD60A' // Recently active (last hour)
                                    : '#C7C7CC' // Offline
                                }
                              ]} />
                              <Text style={styles.lastSeenText}>
                                {new Date(friend.last_seen).getTime() > Date.now() - 300000
                                  ? 'Active now'
                                  : `Active ${formatStoryTime(friend.last_seen)}`}
                              </Text>
                            </View>
                          )}
                        </View>
                        {isMyProfile && (
                          <TouchableOpacity
                            style={styles.moreButton}
                            onPress={() => removeFriend(friend.id)}
                          >
                            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                  </View>
                )
              )}

              {/* Received Requests */}
              {friendsSubTab === 'received' && isMyProfile && (
                <View style={styles.requestsContainer}>
                  {friendRequests.length === 0 ? (
                    <View style={styles.emptySection}>
                      <Ionicons name="mail-open-outline" size={48} color="#CCC" />
                      <Text style={styles.emptySectionText}>No received requests</Text>
                      <Text style={styles.emptySectionSubtext}>
                        When someone sends you a friend request, it will appear here
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Search bar for received requests */}
                      {friendRequests.length > 3 && (
                        <View style={styles.friendsSearchContainer}>
                          <View style={styles.friendsSearchInputContainer}>
                            <Ionicons name="search" size={16} color="#999" />
                            <TextInput
                              style={styles.friendsSearchInput}
                              placeholder="Search received requests..."
                              value={receivedSearchQuery}
                              onChangeText={setReceivedSearchQuery}
                              autoCapitalize="none"
                              autoCorrect={false}
                              clearButtonMode="while-editing"
                            />
                          </View>
                        </View>
                      )}
                      
                      <Text style={styles.requestSectionTitle}>
                        {getFilteredReceivedRequests().length} Friend Request{getFilteredReceivedRequests().length !== 1 ? 's' : ''}
                        {receivedSearchQuery && ` matching "${receivedSearchQuery}"`}
                      </Text>
                      
                      {getFilteredReceivedRequests().length === 0 && receivedSearchQuery ? (
                        <View style={styles.emptySection}>
                          <Ionicons name="search" size={48} color="#CCC" />
                          <Text style={styles.emptySectionText}>No requests found</Text>
                          <Text style={styles.emptySectionSubtext}>
                            Try searching with a different name
                          </Text>
                        </View>
                      ) : (
                        getFilteredReceivedRequests().sort((a, b) => {
                        // Sort by mutual friends count (descending) then by name
                        if (b.mutual_friends_count !== a.mutual_friends_count) {
                          return b.mutual_friends_count - a.mutual_friends_count;
                        }
                        return (a.full_name || a.username).localeCompare(b.full_name || b.username);
                      }).map((request) => (
                        <View key={request.id} style={styles.requestCard}>
                          <TouchableOpacity
                            style={styles.requestUserInfo}
                            onPress={() =>
                              navigation.navigate('screens/profile/index', { userId: request.id })
                            }
                          >
                            <Image
                              source={request.avatar_url ? { uri: request.avatar_url } : DEFAULT_AVATAR}
                              style={styles.friendAvatar}
                            />
                            <View style={styles.friendInfo}>
                              <Text style={styles.friendName}>{request.full_name || request.username}</Text>
                              <Text style={styles.friendUsername}>@{request.username}</Text>
                              {request.mutual_friends_count > 0 && (
                                <Text style={styles.mutualFriends}>
                                  {request.mutual_friends_count} mutual friends
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={styles.acceptButton}
                              onPress={() => acceptFriendRequest(request.id)}
                            >
                              <Text style={styles.acceptButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.declineButton}
                              onPress={() => declineFriendRequest(request.id)}
                            >
                              <Text style={styles.declineButtonText}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                    </>
                  )}
                </View>
              )}

              {/* Sent Requests */}
              {friendsSubTab === 'sent' && isMyProfile && (
                <View style={styles.requestsContainer}>
                  {sentRequests.length === 0 ? (
                    <View style={styles.emptySection}>
                      <Ionicons name="send-outline" size={48} color="#CCC" />
                      <Text style={styles.emptySectionText}>No sent requests</Text>
                      <Text style={styles.emptySectionSubtext}>
                        Friend requests you've sent will appear here
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.requestSectionTitle}>
                        {sentRequests.length} Pending Request{sentRequests.length > 1 ? 's' : ''}
                      </Text>
                      {sentRequests.sort((a, b) => {
                        // Sort by request date (most recent first)
                        return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
                      }).map((request) => (
                        <TouchableOpacity
                          key={request.id}
                          style={styles.requestCard}
                          onPress={() =>
                            navigation.navigate('screens/profile/index', { userId: request.id })
                          }
                        >
                          <Image
                            source={request.avatar_url ? { uri: request.avatar_url } : DEFAULT_AVATAR}
                            style={styles.friendAvatar}
                          />
                          <View style={styles.friendInfo}>
                            <Text style={styles.friendName}>{request.full_name || request.username}</Text>
                            <Text style={styles.friendUsername}>@{request.username}</Text>
                            <View style={styles.requestMetaContainer}>
                              <Text style={styles.pendingText}>Sent {formatStoryTime(request.request_date)}</Text>
                              {request.mutual_friends_count > 0 && (
                                <Text style={styles.mutualFriends}>
                                  · {request.mutual_friends_count} mutual friend{request.mutual_friends_count > 1 ? 's' : ''}
                                </Text>
                              )}
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.cancelRequestButton}
                            onPress={() => {
                              // Cancel request functionality can be added here
                              console.log('Cancel request:', request.id);
                            }}
                          >
                            <Ionicons name="close-circle" size={22} color="#999" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              )}

              {/* Search */}
              {friendsSubTab === 'search' && isMyProfile && (
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by username or name..."
                      value={searchQuery}
                      onChangeText={handleSearch}
                      autoCapitalize="none"
                      autoCorrect={false}
                      clearButtonMode="while-editing"
                    />
                  </View>

                  {isSearching && (
                    <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
                  )}

                  {searchResults.length > 0 && (
                    <ScrollView style={styles.searchResultsList}>
                      <Text style={styles.searchResultsCount}>
                        {searchResults.length} result{searchResults.length > 1 ? 's' : ''} found
                      </Text>
                      {searchResults.sort((a, b) => {
                        // Sort by: 1) mutual friends count, 2) friend status, 3) name
                        if (b.mutual_friends_count !== a.mutual_friends_count) {
                          return b.mutual_friends_count - a.mutual_friends_count;
                        }
                        if (a.friend_status !== b.friend_status) {
                          const statusOrder: Record<string, number> = { 'accepted': 0, 'pending': 1 };
                          const aOrder = a.friend_status ? (statusOrder[a.friend_status] ?? 2) : 2;
                          const bOrder = b.friend_status ? (statusOrder[b.friend_status] ?? 2) : 2;
                          return aOrder - bOrder;
                        }
                        return (a.full_name || a.username).localeCompare(b.full_name || b.username);
                      }).map((user) => (
                        <View key={user.id} style={styles.searchResultCard}>
                          <TouchableOpacity
                            style={styles.searchResultUserInfo}
                            onPress={() =>
                              navigation.navigate('screens/profile/index', { userId: user.id })
                            }
                          >
                            <Image
                              source={user.avatar_url ? { uri: user.avatar_url } : DEFAULT_AVATAR}
                              style={styles.friendAvatar}
                            />
                            <View style={styles.friendInfo}>
                              <Text style={styles.friendName}>{user.full_name || user.username}</Text>
                              <Text style={styles.friendUsername}>@{user.username}</Text>
                              {user.mutual_friends_count > 0 && (
                                <Text style={styles.mutualFriends}>
                                  {user.mutual_friends_count} mutual friends
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                          {user.friend_status === 'accepted' ? (
                            <View style={styles.friendStatusBadge}>
                              <Text style={styles.friendStatusText}>Friends</Text>
                            </View>
                          ) : user.friend_status === 'pending' ? (
                            <View style={styles.pendingStatusBadge}>
                              <Text style={styles.pendingStatusText}>Pending</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.addFriendButton}
                              onPress={async () => {
                                try {
                                  await sendFriendRequest(user.id);
                                  // Refresh search results to update status
                                  handleSearch(searchQuery);
                                } catch (error) {
                                  console.error('Failed to send friend request:', error);
                                }
                              }}
                            >
                              <Ionicons name="person-add" size={18} color="#007AFF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <View style={styles.emptySection}>
                      <Ionicons name="search" size={48} color="#CCC" />
                      <Text style={styles.emptySectionText}>No users found</Text>
                      <Text style={styles.emptySectionSubtext}>
                        Try searching with a different username or name
                      </Text>
                    </View>
                  )}

                  {searchQuery.length === 0 && (
                    <View style={styles.emptySection}>
                      <Ionicons name="search" size={48} color="#CCC" />
                      <Text style={styles.emptySectionText}>Find new friends</Text>
                      <Text style={styles.emptySectionSubtext}>
                        Search for people by their username or name
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          {activeTab === 'ratings' && (
            <View style={styles.ratingsContainer}>
              {/* Rating Statistics */}
              {ratingStats && ratingStats.total_ratings > 0 && (
                <View style={styles.ratingStatsContainer}>
                  <View style={styles.ratingStatsMain}>
                    <Text style={styles.ratingAverage}>
                      {ratingStats.average_rating.toFixed(1)}
                    </Text>
                    <View style={styles.ratingStarsLarge}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= Math.round(ratingStats.average_rating) ? 'star' : 'star-outline'}
                          size={24}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                    <Text style={styles.totalRatingsText}>
                      {ratingStats.total_ratings} rating{ratingStats.total_ratings > 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  {/* Rating Distribution */}
                  <View style={styles.ratingDistribution}>
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = ratingStats.rating_distribution[rating.toString()] || 0;
                      const percentage = ratingStats.total_ratings > 0 
                        ? (count / ratingStats.total_ratings) * 100 
                        : 0;
                      
                      return (
                        <View key={rating} style={styles.ratingDistributionRow}>
                          <Text style={styles.ratingDistributionLabel}>{rating}</Text>
                          <View style={styles.ratingDistributionBarContainer}>
                            <View 
                              style={[
                                styles.ratingDistributionBar,
                                { width: `${percentage}%` }
                              ]} 
                            />
                          </View>
                          <Text style={styles.ratingDistributionCount}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Rating tabs */}
              <View style={styles.ratingTabsContainer}>
                <TouchableOpacity
                  style={[
                    styles.ratingTab,
                    activeRatingTab === 'received' && styles.ratingTabActive,
                  ]}
                  onPress={() => setActiveRatingTab('received')}
                >
                  <Text
                    style={[
                      styles.ratingTabText,
                      activeRatingTab === 'received' && styles.ratingTabTextActive,
                    ]}
                  >
                    Received
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ratingTab, activeRatingTab === 'given' && styles.ratingTabActive]}
                  onPress={() => setActiveRatingTab('given')}
                >
                  <Text
                    style={[
                      styles.ratingTabText,
                      activeRatingTab === 'given' && styles.ratingTabTextActive,
                    ]}
                  >
                    Given
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Ratings content */}
              {activeRatingTab === 'received' ? (
                ratingsReceived.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Ionicons name="star-outline" size={48} color="#CCC" />
                    <Text style={styles.emptySectionText}>No ratings received yet</Text>
                    <Text style={styles.emptySectionSubtext}>
                      {isMyProfile
                        ? 'Ratings from your friends will appear here'
                        : "This user hasn't received any ratings yet"}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.ratingsList}>
                    {ratingsReceived.map((rating, index) => (
                      <View key={index} style={styles.ratingCard}>
                        <View style={styles.ratingHeader}>
                          <Image
                            source={
                              rating.from_user?.avatar_url
                                ? { uri: rating.from_user.avatar_url }
                                : DEFAULT_AVATAR
                            }
                            style={styles.ratingUserAvatar}
                          />
                          <View style={styles.ratingUserInfo}>
                            <Text style={styles.ratingUserName}>
                              {rating.from_user?.full_name || 'Anonymous'}
                            </Text>
                            <View style={styles.ratingStars}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                  key={star}
                                  name={star <= rating.rating ? 'star' : 'star-outline'}
                                  size={16}
                                  color="#FFD700"
                                />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.ratingDate}>
                            {formatStoryTime(rating.created_at)}
                          </Text>
                        </View>
                        {rating.comment && (
                          <Text style={styles.ratingComment}>{rating.comment}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )
              ) : ratingsGiven.length === 0 ? (
                <View style={styles.emptySection}>
                  <Ionicons name="star-half-outline" size={48} color="#CCC" />
                  <Text style={styles.emptySectionText}>No ratings given yet</Text>
                  <Text style={styles.emptySectionSubtext}>
                    {isMyProfile
                      ? 'Rate your friends after events'
                      : "This user hasn't given any ratings yet"}
                  </Text>
                </View>
              ) : (
                <View style={styles.ratingsList}>
                  {ratingsGiven.map((rating, index) => (
                    <View key={index} style={styles.ratingCard}>
                      <View style={styles.ratingHeader}>
                        <Image
                          source={
                            rating.to_user?.avatar_url
                              ? { uri: rating.to_user.avatar_url }
                              : DEFAULT_AVATAR
                          }
                          style={styles.ratingUserAvatar}
                        />
                        <View style={styles.ratingUserInfo}>
                          <Text style={styles.ratingUserName}>
                            {rating.to_user?.full_name || 'User'}
                          </Text>
                          <View style={styles.ratingStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= rating.rating ? 'star' : 'star-outline'}
                                size={16}
                                color="#FFD700"
                              />
                            ))}
                          </View>
                        </View>
                        <Text style={styles.ratingDate}>{formatStoryTime(rating.created_at)}</Text>
                      </View>
                      {rating.comment && <Text style={styles.ratingComment}>{rating.comment}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          {activeTab === 'memories' && (
            <View style={styles.memoriesContainer}>
              {userStories.length === 0 ? (
                <View style={styles.emptyMemories}>
                  <Ionicons name="images-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyMemoriesText}>No memories yet</Text>
                  <Text style={styles.emptyMemoriesSubtext}>Your stories will appear here</Text>
                </View>
              ) : (
                <View style={styles.memoriesGrid}>
                  {userStories.map((story) => {
                    const storyHeight = ((responsive.width - 32 - 16) / 3) * (16 / 9);
                    const captionPosition = story.caption_position || storyHeight * 0.5;
                    const relativePosition = (captionPosition / responsive.height) * storyHeight;

                    return (
                      <TouchableOpacity
                        key={story.id}
                        style={styles.memoryCard}
                        onPress={() => {
                          // Navigate to user memories viewer
                          navigation.navigate('screens/stories/userMemoriesViewer', {
                            userId: profile?.id,
                            storyId: story.id,
                          });
                        }}
                      >
                        <Image
                          source={{ uri: story.image_url || story.media_url }}
                          style={styles.memoryImage}
                          resizeMode="cover"
                        />

                        {/* Caption overlay - positioned like in the original story */}
                        {(story.caption || story.text) && (
                          <View
                            style={[
                              styles.memoryCaptionContainer,
                              {
                                top: relativePosition - 20, // Center the caption vertically
                              },
                            ]}
                          >
                            <View style={styles.memoryCaptionBox}>
                              <Text style={styles.memoryCaptionText}>
                                {story.caption || story.text}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Stats overlay at bottom */}
                        <View style={styles.memoryBottomOverlay}>
                          <View style={styles.memoryStats}>
                            <Ionicons name="eye-outline" size={14} color="#FFF" />
                            <Text style={styles.memoryViewCount}>
                              {story.views_count || story.view_count || 0}
                            </Text>
                          </View>
                          <Text style={styles.memoryTimeText}>
                            {formatStoryTime(story.created_at)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          {activeTab === 'attended' && (
            <View style={styles.eventsContainer}>
              {/* Events sub-tabs */}
              <View style={styles.eventsSubTabContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsSubTabScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.eventsSubTab,
                      attendedSubTab === 'upcoming' && styles.eventsSubTabActive,
                    ]}
                    onPress={() => setAttendedSubTab('upcoming')}
                  >
                    <Text
                      style={[
                        styles.eventsSubTabText,
                        attendedSubTab === 'upcoming' && styles.eventsSubTabTextActive,
                      ]}
                    >
                      Upcoming ({getProcessedEvents(userEvents, 'upcoming').length})
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.eventsSubTab,
                      attendedSubTab === 'ongoing' && styles.eventsSubTabActive,
                    ]}
                    onPress={() => setAttendedSubTab('ongoing')}
                  >
                    <Text
                      style={[
                        styles.eventsSubTabText,
                        attendedSubTab === 'ongoing' && styles.eventsSubTabTextActive,
                      ]}
                    >
                      Ongoing ({getProcessedEvents(userEvents, 'ongoing').length})
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.eventsSubTab,
                      attendedSubTab === 'past' && styles.eventsSubTabActive,
                    ]}
                    onPress={() => setAttendedSubTab('past')}
                  >
                    <Text
                      style={[
                        styles.eventsSubTabText,
                        attendedSubTab === 'past' && styles.eventsSubTabTextActive,
                      ]}
                    >
                      Past ({getProcessedEvents(userEvents, 'past').length})
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Search and sort */}
              {userEvents.length > 0 && (
                <View style={styles.eventsControlsContainer}>
                  <View style={styles.eventsSearchContainer}>
                    <Ionicons name="search" size={16} color="#999" />
                    <TextInput
                      style={styles.eventsSearchInput}
                      placeholder="Search events..."
                      value={eventsSearchQuery}
                      onChangeText={setEventsSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      clearButtonMode="while-editing"
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.eventsSortButton}
                    onPress={() => {
                      // Cycle through sort options
                      const sortOptions = ['date', 'name', 'participants'];
                      const currentIndex = sortOptions.indexOf(eventsSortBy);
                      const nextIndex = (currentIndex + 1) % sortOptions.length;
                      setEventsSortBy(sortOptions[nextIndex] as any);
                    }}
                  >
                    <Ionicons 
                      name={
                        eventsSortBy === 'date' ? 'calendar-outline' :
                        eventsSortBy === 'name' ? 'text-outline' :
                        'people-outline'
                      } 
                      size={16} 
                      color="#007AFF" 
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Events list */}
              <View style={styles.eventsList}>
                {getProcessedEvents(userEvents, attendedSubTab).length === 0 ? (
                  <View style={styles.emptySection}>
                    <Ionicons 
                      name={
                        attendedSubTab === 'upcoming' ? 'calendar' :
                        attendedSubTab === 'ongoing' ? 'time' :
                        'calendar-outline'
                      } 
                      size={48} 
                      color="#CCC" 
                    />
                    <Text style={styles.emptySectionText}>
                      No {attendedSubTab} events
                    </Text>
                    <Text style={styles.emptySectionSubtext}>
                      {attendedSubTab === 'upcoming' 
                        ? "You don't have any upcoming events"
                        : attendedSubTab === 'ongoing'
                        ? "No events happening right now"
                        : "You haven't attended any past events"}
                    </Text>
                  </View>
                ) : (
                  getProcessedEvents(userEvents, attendedSubTab).map((event) => (
                    <EventCard
                      key={event.id}
                      title={event.title}
                      date={event.date}
                      location={event.location || ''}
                      thumbnail={event.image_url || ''}
                      participants={(event.participants || []).map(
                        (p: any) => p.avatar_url || DEFAULT_AVATAR
                      )}
                      goingText={`+${event.participants_count || 10} going`}
                      onPress={() => {}}
                      event={event}
                    />
                  ))
                )}
              </View>
            </View>
          )}
          {activeTab === 'organized' && (
            <View style={styles.eventsContainer}>
              {/* Events sub-tabs */}
              <View style={styles.eventsSubTabContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsSubTabScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.eventsSubTab,
                      organizedSubTab === 'upcoming' && styles.eventsSubTabActive,
                    ]}
                    onPress={() => setOrganizedSubTab('upcoming')}
                  >
                    <Text
                      style={[
                        styles.eventsSubTabText,
                        organizedSubTab === 'upcoming' && styles.eventsSubTabTextActive,
                      ]}
                    >
                      Upcoming ({getProcessedEvents(organizedEvents, 'upcoming').length})
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.eventsSubTab,
                      organizedSubTab === 'ongoing' && styles.eventsSubTabActive,
                    ]}
                    onPress={() => setOrganizedSubTab('ongoing')}
                  >
                    <Text
                      style={[
                        styles.eventsSubTabText,
                        organizedSubTab === 'ongoing' && styles.eventsSubTabTextActive,
                      ]}
                    >
                      Ongoing ({getProcessedEvents(organizedEvents, 'ongoing').length})
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.eventsSubTab,
                      organizedSubTab === 'past' && styles.eventsSubTabActive,
                    ]}
                    onPress={() => setOrganizedSubTab('past')}
                  >
                    <Text
                      style={[
                        styles.eventsSubTabText,
                        organizedSubTab === 'past' && styles.eventsSubTabTextActive,
                      ]}
                    >
                      Past ({getProcessedEvents(organizedEvents, 'past').length})
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Search and sort */}
              {organizedEvents.length > 0 && (
                <View style={styles.eventsControlsContainer}>
                  <View style={styles.eventsSearchContainer}>
                    <Ionicons name="search" size={16} color="#999" />
                    <TextInput
                      style={styles.eventsSearchInput}
                      placeholder="Search events..."
                      value={eventsSearchQuery}
                      onChangeText={setEventsSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      clearButtonMode="while-editing"
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.eventsSortButton}
                    onPress={() => {
                      // Cycle through sort options
                      const sortOptions = ['date', 'name', 'participants'];
                      const currentIndex = sortOptions.indexOf(eventsSortBy);
                      const nextIndex = (currentIndex + 1) % sortOptions.length;
                      setEventsSortBy(sortOptions[nextIndex] as any);
                    }}
                  >
                    <Ionicons 
                      name={
                        eventsSortBy === 'date' ? 'calendar-outline' :
                        eventsSortBy === 'name' ? 'text-outline' :
                        'people-outline'
                      } 
                      size={16} 
                      color="#007AFF" 
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Events list */}
              <View style={styles.eventsList}>
                {getProcessedEvents(organizedEvents, organizedSubTab).length === 0 ? (
                  <View style={styles.emptySection}>
                    <Ionicons 
                      name={
                        organizedSubTab === 'upcoming' ? 'megaphone' :
                        organizedSubTab === 'ongoing' ? 'mic' :
                        'megaphone-outline'
                      } 
                      size={48} 
                      color="#CCC" 
                    />
                    <Text style={styles.emptySectionText}>
                      No {organizedSubTab} events organized
                    </Text>
                    <Text style={styles.emptySectionSubtext}>
                      {organizedSubTab === 'upcoming' 
                        ? "You haven't organized any upcoming events"
                        : organizedSubTab === 'ongoing'
                        ? "No events you're organizing are happening now"
                        : "You haven't organized any past events"}
                    </Text>
                  </View>
                ) : (
                  getProcessedEvents(organizedEvents, organizedSubTab).map((event) => (
                    <EventCard
                      key={event.id}
                      title={event.title}
                      date={event.date}
                      location={event.location || ''}
                      thumbnail={event.image_url || ''}
                      participants={(event.participants || []).map(
                        (p: any) => p.avatar_url || DEFAULT_AVATAR
                      )}
                      goingText={`+${event.participants_count || 10} going`}
                      onPress={() => {}}
                      event={event}
                    />
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
    
    {/* Rating Modal */}
    {profile && !isMyProfile && (
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        user={{
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name || profile.username,
          avatar_url: profile.avatar_url,
        }}
        existingRating={existingRating}
        onSuccess={() => {
          // Reload ratings after successful submission
          loadRatings(profile.id);
        }}
      />
    )}
    </>
  );
}

const createStyles = (responsive: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
    },
    usernameInline: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 22,
      maxWidth: 180,
      textAlign: 'center',
      fontFamily: Platform.select({ ios: 'AfterHours', android: 'AfterHours', default: 'System' }),
    },
    topIconsRowOverlay: {
      position: 'absolute',
      top: 64,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      zIndex: 10,
      height: 48,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    infoOverlay: {
      position: 'absolute',
      left: 24,
      bottom: 140,
      zIndex: 10,
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    flagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    flagCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    nameOverlay: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 2,
    },
    metaOverlay: {
      color: '#fff',
      fontSize: 16,
      marginBottom: 8,
    },
    bottomButtonsContainer: {
      position: 'absolute',
      left: 24,
      bottom: 72,
      flexDirection: 'row',
      gap: 12,
      zIndex: 10,
    },
    connectBtnOverlay: {
      backgroundColor: '#fff',
      borderRadius: 12,
      paddingHorizontal: 32,
      paddingVertical: 12,
    },
    connectBtnTextOverlay: {
      color: '#000',
      fontWeight: '600',
      fontSize: 18,
    },
    settingsBtnOverlay: {
      backgroundColor: '#fff',
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rateBtnOverlay: {
      backgroundColor: '#FFD700',
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rateBtnTextOverlay: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 16,
    },
    settingsBtnTextOverlay: {
      color: '#000',
      fontWeight: '600',
      fontSize: 18,
    },
    tabsSheet: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      marginTop: -24,
      paddingTop: 0,
      zIndex: 20,
      minHeight: 60,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    aboutContainer: {
      padding: 20,
    },
    profileCompletionCard: {
      backgroundColor: '#E8F3FF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    profileCompletionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    profileCompletionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
      flex: 1,
    },
    dismissButton: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    dismissButtonText: {
      fontSize: 20,
      color: '#007AFF',
      fontWeight: '400',
    },
    profileCompletionText: {
      fontSize: 14,
      color: '#333',
      lineHeight: 20,
      marginBottom: 16,
    },
    completeProfileButton: {
      backgroundColor: '#007AFF',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignSelf: 'flex-start',
    },
    completeProfileButtonText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000',
      marginBottom: 12,
      marginTop: 8,
    },
    interestsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
    },
    interestTag: {
      backgroundColor: '#E8F3FF',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      marginBottom: 8,
    },
    interestTagText: {
      color: '#007AFF',
      fontSize: 14,
      fontWeight: '500',
    },
    songCard: {
      backgroundColor: '#F5F5F7',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    songAlbumArt: {
      width: 48,
      height: 48,
      borderRadius: 8,
      marginRight: 12,
      overflow: 'hidden',
    },
    albumCover: {
      width: '100%',
      height: '100%',
    },
    albumPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    songInfo: {
      flex: 1,
    },
    songTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
      marginBottom: 2,
    },
    songArtist: {
      fontSize: 14,
      color: '#666',
    },
    playButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    placeCard: {
      backgroundColor: '#F5F5F7',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    placeIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: '#FFE500',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    placeEmoji: {
      fontSize: 24,
    },
    placeInfo: {
      flex: 1,
    },
    placeName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
      marginBottom: 2,
    },
    placeAddress: {
      fontSize: 14,
      color: '#666',
    },
    chipsRowAbout: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      alignSelf: 'center',
      marginBottom: perfectSize(12),
    },
    chipAbout: {
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: '#E5E5EA',
      borderRadius: perfectSize(8),
      paddingHorizontal: perfectSize(14),
      paddingVertical: perfectSize(6),
      marginRight: perfectSize(6),
      marginBottom: perfectSize(6),
      justifyContent: 'center',
      alignItems: 'center',
    },
    chipTextAbout: {
      color: '#111',
      fontSize: perfectSize(15),
      fontWeight: '400',
      textAlign: 'center',
    },
    sectionLabelAbout: {
      fontSize: 15,
      color: '#888',
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    tuneCardAbout: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: '#E5E5EA',
      borderRadius: perfectSize(6),
      paddingHorizontal: perfectSize(20),
      paddingVertical: perfectSize(10),
      marginBottom: perfectSize(12),
    },
    tuneImageAbout: {
      width: 40,
      height: 40,
      borderRadius: 8,
      marginRight: 12,
      alignSelf: 'center',
    },
    tuneTitleAbout: {
      fontWeight: '600',
      fontSize: perfectSize(16),
      color: '#111',
      marginBottom: perfectSize(2),
    },
    tuneArtistAbout: {
      color: '#888',
      fontSize: perfectSize(13),
    },
    tunePlayButtonAbout: {
      marginLeft: perfectSize(12),
      justifyContent: 'center',
      alignItems: 'center',
      width: perfectSize(32),
      height: perfectSize(32),
      borderRadius: perfectSize(16),
    },
    tunePlayIconAbout: {
      justifyContent: 'center',
      alignItems: 'center',
      width: perfectSize(24),
      height: perfectSize(24),
    },
    friendsRowAbout: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    viewAllAbout: {
      color: '#007AFF',
      fontSize: 16,
      fontWeight: '600',
    },
    friendsAvatarsRowAbout: {
      marginLeft: 8,
    },
    friendAvatarAbout: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginRight: 8,
      borderWidth: 2,
      borderColor: '#fff',
      backgroundColor: '#eee',
    },
    moreFriendsAbout: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#F5F5F7',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    bioText: {
      fontSize: 16,
      color: '#333',
      lineHeight: 24,
      marginBottom: 24,
    },
    moreFriendsTextAbout: {
      color: '#888',
      fontWeight: '600',
      fontSize: 18,
    },
    eventCardAbout: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F7',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    eventImageAbout: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 12,
    },
    eventTitleAbout: {
      fontWeight: '600',
      fontSize: 15,
      color: '#222',
    },
    eventMetaAbout: {
      color: '#888',
      fontSize: 13,
    },
    eventAvatarsRowAbout: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    eventAvatarAbout: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 4,
    },
    eventGoingAbout: {
      color: '#007AFF',
      fontSize: 14,
      fontWeight: '600',
    },
    memoriesContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      minHeight: 400,
    },
    memoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    emptyMemories: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyMemoriesText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
      marginTop: 16,
    },
    emptyMemoriesSubtext: {
      fontSize: 14,
      color: '#999',
      marginTop: 4,
    },
    memoryCard: {
      width: (responsive.width - 32 - 16) / 3, // 3 columns with spacing
      aspectRatio: 9 / 16, // Instagram story aspect ratio
      marginHorizontal: 4,
      marginBottom: responsive.scaleHeight(8),
      borderRadius: responsive.scaleWidth(12),
      overflow: 'hidden',
      backgroundColor: '#F0F0F0',
      position: 'relative',
    },
    memoryImage: {
      width: '100%',
      height: '100%',
    },
    memoryCaptionContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 4,
      zIndex: 2,
    },
    memoryCaptionBox: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: '90%',
    },
    memoryCaptionText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 14,
    },
    memoryBottomOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      paddingBottom: 6,
      paddingHorizontal: 6,
      paddingTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    memoryStats: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    memoryViewCount: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '600',
      marginLeft: 2,
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    memoryTimeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '600',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    eventsList: {
      padding: 16,
      gap: 12,
    },
    sectionFriends: {
      marginTop: 16,
      paddingHorizontal: 16,
    },
    friendAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 8,
      borderWidth: 2,
      borderColor: '#fff',
      backgroundColor: '#eee',
    },
    moreFriends: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#F5F5F7',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    moreFriendsText: {
      color: '#888',
      fontWeight: '600',
      fontSize: 16,
    },
    sectionEvents: {
      marginTop: 16,
      paddingHorizontal: 16,
      marginBottom: 32,
    },
    headerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.32)',
      zIndex: 1,
      ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)' } : {}),
    },
    bioSection: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    memberSinceContainer: {
      marginTop: 24,
    },
    memberSince: {
      fontSize: 14,
      color: '#999',
      textAlign: 'center',
    },
    friendsContainer: {
      flex: 1,
      minHeight: 400,
    },
    friendsList: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    friendCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    friendInfo: {
      flex: 1,
      marginLeft: 12,
    },
    friendName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
      marginBottom: 2,
    },
    friendUsername: {
      fontSize: 14,
      color: '#666',
      marginBottom: 4,
    },
    friendBio: {
      fontSize: 13,
      color: '#999',
      lineHeight: 18,
    },
    emptySection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptySectionText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
      marginTop: 16,
    },
    emptySectionSubtext: {
      fontSize: 14,
      color: '#999',
      marginTop: 4,
      textAlign: 'center',
    },
    ratingsContainer: {
      flex: 1,
      minHeight: 400,
    },
    ratingStatsContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E7',
    },
    ratingStatsMain: {
      alignItems: 'center',
      marginBottom: 16,
    },
    ratingAverage: {
      fontSize: 48,
      fontWeight: '700',
      color: '#000',
      marginBottom: 8,
    },
    ratingStarsLarge: {
      flexDirection: 'row',
      gap: 4,
      marginBottom: 4,
    },
    totalRatingsText: {
      fontSize: 16,
      color: '#666',
      marginTop: 4,
    },
    ratingDistribution: {
      marginTop: 8,
    },
    ratingDistributionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    ratingDistributionLabel: {
      width: 20,
      fontSize: 14,
      color: '#666',
      textAlign: 'right',
    },
    ratingDistributionBarContainer: {
      flex: 1,
      height: 8,
      backgroundColor: '#E5E5E7',
      borderRadius: 4,
      marginHorizontal: 8,
      overflow: 'hidden',
    },
    ratingDistributionBar: {
      height: '100%',
      backgroundColor: '#FFD700',
      borderRadius: 4,
    },
    ratingDistributionCount: {
      width: 30,
      fontSize: 14,
      color: '#666',
      textAlign: 'left',
    },
    ratingTabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 12,
    },
    ratingTab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: '#F5F5F7',
    },
    ratingTabActive: {
      backgroundColor: '#007AFF',
    },
    ratingTabText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#666',
    },
    ratingTabTextActive: {
      color: '#FFF',
    },
    ratingsList: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    ratingCard: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    ratingHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    ratingUserAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    ratingUserInfo: {
      flex: 1,
    },
    ratingUserName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
      marginBottom: 4,
    },
    ratingStars: {
      flexDirection: 'row',
      gap: 2,
    },
    ratingDate: {
      fontSize: 12,
      color: '#999',
    },
    ratingComment: {
      fontSize: 14,
      color: '#333',
      lineHeight: 20,
    },
    // Friends sub-tab styles
    friendsSubTabContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    friendsSubTabScroll: {
      gap: 12,
    },
    friendsSubTab: {
      minWidth: 100,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F5F5F7',
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    friendsSubTabContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 6,
    },
    friendsSubTabActive: {
      backgroundColor: '#007AFF',
    },
    friendsSubTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
    },
    friendsSubTabTextActive: {
      color: '#FFF',
    },
    requestBadge: {
      backgroundColor: '#FF3B30',
      borderRadius: 10,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    requestBadgeText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '700',
    },
    searchButton: {
      backgroundColor: '#007AFF',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginTop: 16,
    },
    searchButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
    moreButton: {
      padding: 8,
    },
    // Request styles
    requestsContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    requestSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
      marginBottom: 12,
    },
    requestCard: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    requestUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    requestActions: {
      flexDirection: 'row',
      gap: 12,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: '#007AFF',
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    acceptButtonText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    declineButton: {
      flex: 1,
      backgroundColor: '#F0F0F0',
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    declineButtonText: {
      color: '#333',
      fontSize: 14,
      fontWeight: '600',
    },
    mutualFriends: {
      fontSize: 12,
      color: '#999',
      marginTop: 2,
    },
    pendingText: {
      fontSize: 12,
      color: '#999',
      fontStyle: 'italic',
    },
    // Search styles
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F7',
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 44,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: '#000',
    },
    searchResultsList: {
      marginTop: 16,
    },
    searchResultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    searchResultUserInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    friendStatusBadge: {
      backgroundColor: '#E8F3FF',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    friendStatusText: {
      color: '#007AFF',
      fontSize: 12,
      fontWeight: '600',
    },
    pendingStatusBadge: {
      backgroundColor: '#FFF3CD',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pendingStatusText: {
      color: '#856404',
      fontSize: 12,
      fontWeight: '600',
    },
    addFriendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#E8F3FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // New styles for improved friends tab
    tabCountBadge: {
      backgroundColor: '#E0E0E0',
      borderRadius: 10,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    tabCountBadgeActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    tabCountText: {
      color: '#666',
      fontSize: 12,
      fontWeight: '700',
    },
    tabCountTextActive: {
      color: '#FFF',
    },
    sortContainer: {
      marginBottom: 16,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F7',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    sortButtonText: {
      color: '#007AFF',
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
    },
    sortOptions: {
      marginTop: 8,
      backgroundColor: '#FFF',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    sortOptionActive: {
      backgroundColor: '#F0F8FF',
    },
    sortOptionText: {
      fontSize: 14,
      color: '#666',
      flex: 1,
    },
    sortOptionTextActive: {
      color: '#007AFF',
      fontWeight: '600',
    },
    lastSeenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 6,
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    lastSeenText: {
      fontSize: 12,
      color: '#999',
    },
    requestMetaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    cancelRequestButton: {
      padding: 8,
    },
    searchResultsCount: {
      fontSize: 14,
      color: '#666',
      marginBottom: 12,
      fontWeight: '500',
    },
    friendsSearchContainer: {
      marginBottom: 16,
    },
    friendsSearchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F7',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 36,
      gap: 8,
    },
    friendsSearchInput: {
      flex: 1,
      fontSize: 14,
      color: '#000',
    },
    // Events styles
    eventsContainer: {
      flex: 1,
    },
    eventsSubTabContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    eventsSubTabScroll: {
      gap: 8,
    },
    eventsSubTab: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#F5F5F7',
      marginRight: 8,
    },
    eventsSubTabActive: {
      backgroundColor: '#007AFF',
    },
    eventsSubTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
    },
    eventsSubTabTextActive: {
      color: '#FFF',
    },
    eventsControlsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      alignItems: 'center',
    },
    eventsSearchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F7',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 36,
      gap: 8,
    },
    eventsSearchInput: {
      flex: 1,
      fontSize: 14,
      color: '#000',
    },
    eventsSortButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F5F5F7',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
