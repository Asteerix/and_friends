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
  const [memories, setMemories] = useState<{ id: string; imageUri?: string; avatarUri?: string }[]>(
    []
  );
  // const insets = useSafeAreaInsets();
  const isMyProfile = true; // MOCK: à remplacer par une vraie logique si besoin
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (profile) {
      // setEditedProfile(profile);
      loadProfileStats();
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
    // Fetch memories (à adapter si tu as un hook global)
    // setMemories(...)
  }, [profile?.id]);

  // Dummy memories for now (à remplacer par hook réel)
  useEffect(() => {
    setMemories([
      { id: '1', imageUri: profile?.avatar_url, avatarUri: profile?.avatar_url },
      { id: '2', imageUri: profile?.avatar_url, avatarUri: profile?.avatar_url },
    ]);
  }, [profile?.avatar_url]);

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
            <View style={styles.flagCircle}>
              <CountryFlag
                isoCode="FR"
                size={32}
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            </View>
            <Text style={{ color: '#fff', fontSize: 16, marginLeft: 8 }}>France, Paris</Text>
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
          <TouchableOpacity style={styles.connectBtnOverlay}>
            <Text style={styles.connectBtnTextOverlay}>{isMyProfile ? 'Modifier' : 'Connect'}</Text>
          </TouchableOpacity>
          {isMyProfile && (
            <TouchableOpacity 
              style={styles.settingsBtnOverlay}
              onPress={() => navigation.navigate('screens/settings/index')}
            >
              <Ionicons name="settings-outline" size={20} color="#000" />
              <Text style={styles.settingsBtnTextOverlay}>Paramètres</Text>
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
              {/* Chips */}
              <View style={styles.chipsRowAbout}>
                {(
                  profile?.hobbies || [
                    'Photography 📸',
                    'Running 🏃‍♂️',
                    'Gaming 🎮',
                    'Pottery 🏺',
                    'Cooking 🔍',
                  ]
                ).map((chip, i) => (
                  <View
                    key={i}
                    style={styles.chipAbout}
                    accessibilityRole="text"
                    accessibilityLabel={chip}
                  >
                    <Text style={styles.chipTextAbout}>{chip}</Text>
                  </View>
                ))}
              </View>

              {/* Favorite Tune */}
              <Text style={styles.sectionLabelAbout}>Favorite Tune</Text>
              <View style={styles.tuneCardAbout} accessibilityLabel="Favorite Tune">
                <Image
                  source={require('@/assets/images/events/event_logo.png')}
                  style={styles.tuneImageAbout}
                  accessibilityLabel="Album cover"
                />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={styles.tuneTitleAbout}>Bluebird</Text>
                  <Text style={styles.tuneArtistAbout}>Lana Del Rey</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  style={styles.tunePlayButtonAbout}
                  onPress={() => setIsPlaying((prev) => !prev)}
                >
                  <View style={styles.tunePlayIconAbout}>
                    {isPlaying ? (
                      <View style={{ flexDirection: 'row' }}>
                        <View
                          style={{ width: 5, height: 18, backgroundColor: '#111', borderRadius: 2 }}
                        />
                        <View
                          style={{
                            width: 5,
                            height: 18,
                            backgroundColor: '#111',
                            borderRadius: 2,
                            marginLeft: 4,
                          }}
                        />
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 0,
                          height: 0,
                          borderTopWidth: 9,
                          borderBottomWidth: 9,
                          borderLeftWidth: 14,
                          borderTopColor: 'transparent',
                          borderBottomColor: 'transparent',
                          borderLeftColor: '#111',
                          marginLeft: 2,
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Favorite Place */}
              <Text style={styles.sectionLabelAbout}>Favorite Place</Text>
              <View style={styles.tuneCardAbout} accessibilityLabel="Favorite Place">
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={styles.tuneTitleAbout}>Tartine Bakery</Text>
                  <Text style={styles.tuneArtistAbout}>815 Valencia Street, San Francisco</Text>
                </View>
              </View>

              {/* Friends in Common */}
              <View style={styles.friendsRowAbout}>
                <Text style={styles.sectionLabelAbout}>Friends in Common</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="View All">
                  <Text style={styles.viewAllAbout}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.friendsAvatarsRowAbout}
              >
                {[...Array(6)].map((_, i) => (
                  <Image
                    key={i}
                    source={profile?.avatar_url ? { uri: profile.avatar_url } : DEFAULT_AVATAR}
                    style={styles.friendAvatarAbout}
                    accessibilityLabel={`Friend ${i + 1}`}
                  />
                ))}
                <View
                  style={styles.moreFriendsAbout}
                  accessibilityRole="text"
                  accessibilityLabel="5 more friends"
                >
                  <Text style={styles.moreFriendsTextAbout}>+5</Text>
                </View>
              </ScrollView>

              {/* Recent Events */}
              <Text style={styles.sectionLabelAbout}>Recent Events</Text>
              <View style={styles.eventCardAbout} accessibilityLabel="Recent Event">
                <View style={styles.eventImageAbout}>
                  {/* Replace with real event image */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: '#22B573',
                      borderRadius: perfectSize(12),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: perfectSize(32) }}>🥤</Text>
                  </View>
                </View>
                <View style={{ flex: 1, paddingLeft: perfectSize(12), justifyContent: 'center' }}>
                  <Text style={styles.eventTitleAbout}>Gallery Opening: Colors of Tomorrow</Text>
                  <Text style={styles.eventMetaAbout}>May 10, 6:00 PM – 9:00 PM</Text>
                  <Text style={styles.eventMetaAbout}>Soho Art Space, New York</Text>
                  <View style={styles.eventAvatarsRowAbout}>
                    {[...Array(3)].map((_, i) => (
                      <Image
                        key={i}
                        source={profile?.avatar_url ? { uri: profile.avatar_url } : DEFAULT_AVATAR}
                        style={styles.eventAvatarAbout}
                        accessibilityLabel={`Attendee ${i + 1}`}
                      />
                    ))}
                    <Text style={styles.eventGoingAbout}>+10 going</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          {activeTab === 'memories' && (
            <FlatList
              data={memories}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.memoriesGrid}
              columnWrapperStyle={styles.memoriesRow}
              renderItem={({ item }) => (
                <View style={styles.memoryCard} accessible accessibilityLabel="Memory">
                  <Image
                    source={item.imageUri ? { uri: item.imageUri } : DEFAULT_AVATAR}
                    style={styles.memoryImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.memoryTitle} numberOfLines={1} ellipsizeMode="tail">
                    Weekend Trip
                  </Text>
                  <Text style={styles.memoryViews}>100 views</Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
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
    padding: 16,
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
  memoriesGrid: {
    paddingHorizontal: perfectSize(12),
    paddingTop: perfectSize(12),
    paddingBottom: perfectSize(24),
  },
  memoriesRow: {
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: perfectSize(16),
  },
  memoryCard: {
    flex: 1,
    marginHorizontal: perfectSize(4),
    backgroundColor: '#fff',
    borderRadius: perfectSize(16),
    marginBottom: 0,
    alignItems: 'flex-start',
    minHeight: perfectSize(220),
  },
  memoryImage: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: perfectSize(16),
    backgroundColor: '#eee',
  },
  memoryTitle: {
    fontWeight: '600',
    fontSize: perfectSize(16),
    color: '#111',
    marginTop: perfectSize(8),
    marginLeft: perfectSize(2),
  },
  memoryViews: {
    color: '#888',
    fontSize: perfectSize(14),
    marginTop: perfectSize(2),
    marginLeft: perfectSize(2),
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
});
