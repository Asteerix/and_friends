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
  Animated,
  Easing,
  LayoutChangeEvent,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import UnderlineDecoration from '@/features/home/components/UnderlineDecoration.svg';
import { create } from 'react-native-pixel-perfect';
import { useNavigation } from '@react-navigation/native';

import { useProfile } from '@/hooks/useProfile';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useFriends } from '@/hooks/useFriends';
import { useStories } from '@/shared/providers/StoriesContext';
import EventCard from '@/features/home/components/EventCard';
import MemoryItem from '@/features/stories/components/MemoryItem';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';

const HEADER_HEIGHT = 700;

const TABS = [
  { key: 'about', label: 'About' },
  { key: 'memories', label: 'Memories' },
  { key: 'attended', label: 'Attended' },
  { key: 'organized', label: 'Organized' },
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

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { profile, loading, getProfileStats } = useProfile();
  const { getUserEvents } = useEventsAdvanced();
  const { friends: userFriends } = useFriends();
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
  // const insets = useSafeAreaInsets();
  const isMyProfile = true; // MOCK: à remplacer par une vraie logique si besoin
  const [isPlaying, setIsPlaying] = useState(false);
  const [jam, setJam] = useState({ 
    track_id: '', 
    title: '', 
    artist: '', 
    cover_url: '', 
    preview_url: '' 
  });
  const [restaurant, setRestaurant] = useState({ 
    id: '', 
    name: '', 
    address: '' 
  });
  const [locationDisplay, setLocationDisplay] = useState('');
  const { getStoriesByUser } = useStories();

  useEffect(() => {
    if (profile) {
      // setEditedProfile(profile);
      loadProfileStats();
      
      // Load jam/music preference from individual fields
      if (profile.jam_title || profile.jam_artist) {
        setJam({ 
          track_id: profile.jam_track_id || '', 
          title: profile.jam_title || '', 
          artist: profile.jam_artist || '',
          cover_url: profile.jam_cover_url || '',
          preview_url: profile.jam_preview_url || ''
        });
      }
      
      // Load restaurant preference from individual fields
      if (profile.selected_restaurant_name) {
        setRestaurant({ 
          id: profile.selected_restaurant_id || '', 
          name: profile.selected_restaurant_name || '', 
          address: profile.selected_restaurant_address || '' 
        });
      }
      
      // Load location
      if (profile.location) {
        setLocationDisplay(profile.location);
      }
    }
  }, [profile]);

  useEffect(() => {
    // Fetch events attended and organized
    (async () => {
      const allEvents = await getUserEvents();
      setUserEvents((allEvents || []).filter((e: any) => !e.is_creator));
      setOrganizedEvents((allEvents || []).filter((e: any) => e.is_creator));
    })();
    // Friends are now fetched from useFriends hook
  }, [profile?.id]);

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
      'USA': 'US',
      'United States': 'US',
      'United States of America': 'US',
      'UK': 'GB',
      'United Kingdom': 'GB',
      'England': 'GB',
      'Scotland': 'GB',
      'Wales': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
      'France': 'FR',
      'Germany': 'DE',
      'Italy': 'IT',
      'Spain': 'ES',
      'Japan': 'JP',
      'Brazil': 'BR',
      'Mexico': 'MX',
      'India': 'IN',
      'China': 'CN',
      'South Korea': 'KR',
      'Korea': 'KR',
      'Netherlands': 'NL',
      'Holland': 'NL',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Switzerland': 'CH',
      'Belgium': 'BE',
      'Argentina': 'AR',
      'Chile': 'CL',
      'Colombia': 'CO',
      'Portugal': 'PT',
      'Greece': 'GR',
      'Poland': 'PL',
      'Russia': 'RU',
      'Turkey': 'TR',
      'Egypt': 'EG',
      'South Africa': 'ZA',
      'New Zealand': 'NZ',
      'Ireland': 'IE',
      'Austria': 'AT',
      'Finland': 'FI',
      'Singapore': 'SG',
      'Thailand': 'TH',
      'Malaysia': 'MY',
      'Indonesia': 'ID',
      'Philippines': 'PH',
      'Vietnam': 'VN',
      'UAE': 'AE',
      'United Arab Emirates': 'AE',
      'Saudi Arabia': 'SA',
      'Israel': 'IL',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Romania': 'RO',
      'Ukraine': 'UA',
    };
    
    // Try to extract country from location (handle "City, Country" format)
    const parts = location.split(',');
    
    // Try last part first (usually country in "City, Country" format)
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim();
      
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
    const firstPart = parts[0].trim();
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
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} showsVerticalScrollIndicator={false}>
      {/* HEADER bloc avec image et overlays */}
      <View
        style={{
          height: HEADER_HEIGHT,
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back">
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
                <Text style={{ color: '#fff', fontSize: 16, marginLeft: 8 }}>{locationDisplay}</Text>
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
            <Text style={styles.connectBtnTextOverlay}>{isMyProfile ? 'Edit Profile' : 'Connect'}</Text>
          </TouchableOpacity>
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
        {/* Nouvelle barre d'onglets animée - refactorée pour correspondre au design SwiftUI */}
        <View style={{ paddingTop: perfectSize(20) }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
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
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: perfectSize(44),
                    paddingVertical: perfectSize(6),
                    paddingHorizontal: perfectSize(8),
                    ...(idx === 0 && { marginLeft: perfectSize(20) }),
                    ...(idx === TABS.length - 1 && { marginRight: perfectSize(20) }),
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <Text
                    style={{
                      fontSize: perfectSize(14),
                      fontWeight: '500',
                      color: activeTab === tab.key ? '#222' : '#888',
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={{
                      height: perfectSize(8),
                      marginTop: perfectSize(4),
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
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
              
              {/* Profile Completion Card - Only show if profile is incomplete */}
              {profile && (!profile.bio || !profile.hobbies || profile.hobbies.length < 3 || !profile.avatar_url) && (
                <View style={styles.profileCompletionCard}>
                  <View style={styles.profileCompletionHeader}>
                    <Text style={styles.profileCompletionTitle}>Complete Your Profile</Text>
                    <TouchableOpacity style={styles.dismissButton}>
                      <Text style={styles.dismissButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.profileCompletionText}>
                    {!profile.bio ? 'Add a bio to introduce yourself' : 'Drop a few more details — someone might just vibe with you.'}
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
                    {profile.hobbies.map((interest, i) => (
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
                        name={isPlaying ? "pause" : "play"} 
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
                    const storyHeight = (Dimensions.get('window').width - 32 - 16) / 3 * (16 / 9);
                    const captionPosition = story.caption_position || (storyHeight * 0.5);
                    const relativePosition = (captionPosition / Dimensions.get('window').height) * storyHeight;
                    
                    return (
                      <TouchableOpacity
                        key={story.id}
                        style={styles.memoryCard}
                        onPress={() => {
                          // Navigate to story viewer
                          navigation.navigate('screens/stories/viewer', {
                            storyId: story.id,
                            userId: story.user?.id || profile?.id,
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
                              }
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
                            <Text style={styles.memoryViewCount}>{story.views_count || story.view_count || 0}</Text>
                          </View>
                          <Text style={styles.memoryTimeText}>{formatStoryTime(story.created_at)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          {activeTab === 'attended' && (
            <View style={styles.eventsList}>
              {userEvents.map((event) => (
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
                />
              ))}
            </View>
          )}
          {activeTab === 'organized' && (
            <View style={styles.eventsList}>
              {organizedEvents.map((event) => (
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
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  albumCover: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
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
    width: (Dimensions.get('window').width - 32 - 16) / 3, // 3 columns with spacing
    aspectRatio: 9 / 16, // Instagram story aspect ratio
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 12,
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
  bioText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  memberSinceContainer: {
    marginTop: 24,
  },
  memberSince: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
