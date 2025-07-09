import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  UIManager,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/hooks/useProfile';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import { EventServiceComplete } from '../services/eventServiceComplete';
import { getCategoryDisplayName, getCategoryIcon } from '../utils/categoryHelpers';
import { useEvent } from '../context/EventProvider';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Import fonts and backgrounds data
import {
  FONTS as IMPORTED_FONTS,
  BACKGROUNDS as IMPORTED_BACKGROUNDS,
} from '../data/eventTemplates';

// Map fonts with their styles
const FONTS = IMPORTED_FONTS.map((font) => ({
  ...font,
  style: {
    fontFamily: font.value,
    fontWeight:
      font.name === 'AFTERPARTY'
        ? ('bold' as const)
        : font.name === 'Bold Impact'
          ? ('900' as const)
          : font.name === 'Modern'
            ? ('300' as const)
            : font.name === 'Elegant'
              ? ('500' as const)
              : ('normal' as const),
    fontStyle:
      font.name === 'Classic Invite' || font.name === 'Fun Script'
        ? ('italic' as const)
        : ('normal' as const),
  },
}));

const BACKGROUNDS = IMPORTED_BACKGROUNDS.map((bg) => ({
  ...bg,
  colors: bg.colors as [string, string],
}));

interface EventDetailsScreenProps {
  eventId?: string;
}

export default function EventDetailsScreen({ eventId }: EventDetailsScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { currentEvent: event, loading, loadEvent } = useEvent();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    if (!eventId) {
      console.error('❌ [EventDetailsScreen] No event ID provided');
      return;
    }
    loadEvent(eventId);
  }, [eventId, loadEvent]);

  // Helper functions for fonts
  const getTitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === event?.cover_data?.selectedTitleFont);
    return font?.style || {};
  };

  const getSubtitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === event?.cover_data?.selectedSubtitleFont);
    return font?.style || {};
  };

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleEditEvent = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/screens/create-event?mode=edit&id=${eventId}`);
  };

  const handleJoinEvent = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Join Event', 'Join event functionality coming soon!');
  };

  const handleShare = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Share', 'Share functionality coming soon!');
  };

  const handleOpenWebsite = () => {
    if (event?.extra_data?.event_website) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let url = event.extra_data.event_website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  const handleCallContact = () => {
    if (event?.extra_data?.contact_info) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const phoneNumber = event.extra_data.contact_info.replace(/\D/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="calendar-outline" size={64} color="#C7C7CC" />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverData = event.cover_data || {};
  const isHost = event.created_by === profile?.id;
  const eventPhotos = event.extra_data?.event_photos || [];
  const costs = event.event_costs || event.extra_data?.costs || [];
  const items = event.event_items || event.extra_data?.items_to_bring || [];
  const questionnaire = event.event_questionnaire || event.extra_data?.questionnaire || [];
  const coHosts = event.event_cohosts || event.extra_data?.co_organizers || [];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* HEADER bloc with image and overlays */}
        <View style={styles.headerContainer}>
          {/* Background image or gradient */}
          {coverData.selectedBackground && !coverData.coverImage && !coverData.selectedTemplate ? (
            <LinearGradient
              colors={
                BACKGROUNDS.find((bg) => bg.id === coverData.selectedBackground)?.colors || [
                  '#C8E6C9',
                  '#C8E6C9',
                ]
              }
              style={styles.headerGradient}
            />
          ) : coverData.selectedTemplate ? (
            <Image source={coverData.selectedTemplate.image} style={styles.headerImage} />
          ) : coverData.coverImage || coverData.uploadedImage ? (
            <Image
              source={{ uri: coverData.coverImage || coverData.uploadedImage }}
              style={styles.headerImage}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <Ionicons name="image-outline" size={80} color="#FFF" style={{ opacity: 0.5 }} />
            </View>
          )}

          {/* Overlay for readability */}
          <View style={styles.headerOverlay} pointerEvents="none" />

          {/* Placed Stickers */}
          <View style={styles.stickersLayer} pointerEvents="none">
            {coverData.placedStickers?.map((sticker: any) => (
              <View
                key={sticker.id}
                style={[
                  styles.staticSticker,
                  {
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: [{ scale: sticker.scale }, { rotate: `${sticker.rotation}deg` }],
                  },
                ]}
              >
                <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
              </View>
            ))}
          </View>

          {/* Top navigation bar */}
          <View style={styles.topNavBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <BackButton width={24} height={24} fill="#FFF" color="#FFF" stroke="#FFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Event Details</Text>

            <View style={styles.rightIcons}>
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

          {/* Event title overlay */}
          <View style={styles.eventTitleContainer}>
            <Text style={[styles.eventTitle, getTitleFontStyle()]}>
              {event.title || 'Untitled Event'}
            </Text>
            {event.subtitle && (
              <Text style={[styles.eventSubtitle, getSubtitleFontStyle()]}>{event.subtitle}</Text>
            )}
          </View>

          {/* Host avatar at bottom */}
          <View style={styles.hostContainer}>
            <Image
              source={event.organizer?.avatar_url ? { uri: event.organizer.avatar_url } : require('../../../assets/default_avatar.png')}
              style={styles.hostAvatar}
            />
            <Text style={styles.hostedByText}>
              Hosted by {event.organizer?.full_name || event.organizer?.username || 'Unknown'}
            </Text>
          </View>
          
          {/* Edit Event button for hosts */}
          {isHost && (
            <View style={styles.editCoverContainer}>
              <TouchableOpacity
                style={styles.editCoverBtn}
                onPress={handleEditEvent}
                accessibilityRole="button"
                accessibilityLabel="Edit Event"
              >
                <Ionicons name="create-outline" size={16} color="#000" />
                <Text style={styles.editCoverBtnText}>Edit Event</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Details section */}
        <View style={styles.detailsSheet}>
          {/* Primary Actions */}
          <View style={styles.primaryActionsContainer}>
            {!isHost ? (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={handleJoinEvent}>
                  <Text style={styles.primaryButtonText}>Invite</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Send Reminder</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Invite Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Send Update</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
                </TouchableOpacity>
              </>
            )}
          </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>
            {event.description || 'No description provided.'}
          </Text>
          
          {/* Host info inline */}
          <View style={styles.hostRow}>
            <Image 
              source={{ 
                uri: event.organizer?.avatar_url || 
                     event.extra_data?.host?.avatar || 
                     'https://via.placeholder.com/36' 
              }} 
              style={styles.hostAvatarSmall} 
            />
            {event.has_cohosts_enabled && coHosts.length > 0 && coHosts[0] && (
              <Image 
                source={{ 
                  uri: coHosts[0].user?.avatar_url || 
                       coHosts[0].avatar || 
                       'https://via.placeholder.com/36' 
                }} 
                style={[styles.hostAvatarSmall, styles.coHostOverlap]} 
              />
            )}
            <View style={styles.hostTextInfo}>
              <Text style={styles.byText}>by {event.organizer?.full_name || event.extra_data?.host?.name || 'Host'}
                {event.has_cohosts_enabled && coHosts.length > 0 && ` & ${coHosts[0].user?.full_name || coHosts[0].name || 'Co-host'}`}
              </Text>
            </View>
            {!isHost && (
              <TouchableOpacity style={styles.messageButton}>
                <Ionicons name="chatbubble-outline" size={18} color="#007AFF" />
                <Text style={styles.messageText}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <View style={styles.timeRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.timeText}>
              {formatDate(event.start_time)} • {formatTime(event.start_time)} - {event.end_time ? formatTime(event.end_time) : '10 PM'}
            </Text>
          </View>
        </View>


        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          {event.coordinates && (
            <View style={styles.mapPreview}>
              <MapView
                style={styles.mapSmall}
                initialRegion={{
                  latitude: event.coordinates.lat || event.coordinates.latitude,
                  longitude: event.coordinates.lng || event.coordinates.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: event.coordinates.lat || event.coordinates.latitude,
                    longitude: event.coordinates.lng || event.coordinates.longitude,
                  }}
                />
              </MapView>
            </View>
          )}
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.locationText}>
              {event.address || event.location_details?.address || event.venue_name || 'Location TBD'}
            </Text>
          </View>
        </View>

        {/* Who's Coming Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Who's Coming</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.attendeesRow}>
            {[1, 2, 3, 4, 5, 6].map((_, index) => (
              <Image 
                key={index}
                source={{ uri: 'https://i.pravatar.cc/100?img=' + (index + 1) }} 
                style={[
                  styles.attendeeAvatar,
                  index > 0 && styles.attendeeOverlap
                ]}
              />
            ))}
            <View style={styles.moreAttendeesCircle}>
              <Text style={styles.moreAttendeesText}>+{event.current_attendees || 5}</Text>
            </View>
          </View>
          
          <Text style={styles.attendeesInfo}>
            {event.current_attendees || 2} going • {3} not going • {event.has_capacity_enabled && event.max_attendees > 0 ? `${event.max_attendees - (event.current_attendees || 0)} spots left` : '1 maybe'}
          </Text>
        </View>

        {/* Event Photos */}
        {event.has_photos_enabled && eventPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {eventPhotos.map((photo: string, index: number) => (
                <Image 
                  key={index}
                  source={{ uri: photo }} 
                  style={styles.eventPhotoSmall} 
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Additional Details - Simplified */}
        {(event.has_dress_code_enabled || event.has_theme_enabled || event.has_age_restriction_enabled) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            
            {event.has_dress_code_enabled && event.extra_data?.dress_code && (
              <View style={styles.detailRow}>
                <Ionicons name="shirt-outline" size={18} color="#666" />
                <Text style={styles.detailText}>Dress Code: {event.extra_data.dress_code}</Text>
              </View>
            )}
            
            {event.has_theme_enabled && event.extra_data?.event_theme && (
              <View style={styles.detailRow}>
                <Ionicons name="color-palette-outline" size={18} color="#666" />
                <Text style={styles.detailText}>Theme: {event.extra_data.event_theme}</Text>
              </View>
            )}
            
            {event.has_age_restriction_enabled && event.extra_data?.age_restriction && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="account-check-outline" size={18} color="#666" />
                <Text style={styles.detailText}>Age: {event.extra_data.age_restriction}</Text>
              </View>
            )}

            {event.has_capacity_enabled && (
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={18} color="#666" />
                <Text style={styles.detailText}>
                  Capacity: {event.max_attendees === 0 ? 'Unlimited' : `${event.current_attendees || 0}/${event.max_attendees}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Costs - Simplified */}
        {event.has_costs_enabled && costs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost</Text>
            {costs.map((cost: any, index: number) => (
              <View key={cost.id || index} style={styles.costRowSimple}>
                <Text style={styles.costTextSimple}>{cost.description}</Text>
                <Text style={styles.costAmountSimple}>${cost.amount}</Text>
              </View>
            ))}
            <View style={styles.costTotal}>
              <Text style={styles.costTotalText}>Total per person</Text>
              <Text style={styles.costTotalAmount}>
                ${costs.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0)}
              </Text>
            </View>
          </View>
        )}

        {/* What to Bring - Simplified */}
        {event.has_items_enabled && items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to Bring</Text>
            {items.map((item: any, index: number) => (
              <View key={item.id || index} style={styles.itemRowSimple}>
                <View style={styles.itemCircle} />
                <Text style={styles.itemTextSimple}>
                  {item.name || item.item_name}
                  {item.quantity > 1 && ` (${item.quantity})`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Extra Info - Only if available */}
        {(event.has_parking_info_enabled || event.has_accessibility_enabled || event.has_contact_enabled || event.has_website_enabled) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Info</Text>
            
            {event.has_parking_info_enabled && event.extra_data?.parking_info && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Parking</Text>
                <Text style={styles.infoText}>{event.extra_data.parking_info}</Text>
              </View>
            )}
            
            {event.has_accessibility_enabled && event.extra_data?.accessibility_info && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Accessibility</Text>
                <Text style={styles.infoText}>{event.extra_data.accessibility_info}</Text>
              </View>
            )}
          </View>
        )}

          {/* Bottom Action Buttons */}
          {isHost ? (
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.editEventButton} onPress={handleEditEvent}>
                <Text style={styles.editEventButtonText}>Edit Event</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelEventButton}>
                <Text style={styles.cancelEventButtonText}>Cancel Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ height: 40 }} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header Section
  headerContainer: {
    position: 'relative',
    height: 700,
    width: '100%',
    backgroundColor: '#222',
    overflow: 'hidden',
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
  headerGradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1,
  },
  eventSticker: {
    position: 'absolute',
    fontSize: 48,
  },
  topNavBar: {
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 22,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'System', android: 'System', default: 'System' }),
  },
  rightIcons: {
    flexDirection: 'row',
  },
  editCoverContainer: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 72,
    zIndex: 100,
  },
  editCoverBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editCoverBtnText: {
    color: '#000',
    fontWeight: '500',
    fontSize: 16,
  },
  eventTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -50 }],
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  eventTitle: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 44,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  eventSubtitle: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  hostContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 50,
  },
  hostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  hostedByText: {
    color: '#FFF',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickersLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  staticSticker: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerEmoji: {
    fontSize: 40,
  },

  // Details section
  detailsSheet: {
    backgroundColor: '#FFF',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  // Primary Actions
  primaryActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  moreButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sections
  section: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  viewAllLink: {
    fontSize: 15,
    color: '#007AFF',
  },

  // About section
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    marginBottom: 16,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  hostAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coHostOverlap: {
    marginLeft: -12,
  },
  hostTextInfo: {
    marginLeft: 12,
    flex: 1,
  },
  byText: {
    fontSize: 15,
    color: '#666666',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#007AFF',
  },

  // Time section
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 15,
    color: '#000000',
  },

  // Location section
  mapPreview: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mapSmall: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationText: {
    fontSize: 15,
    color: '#000000',
    flex: 1,
  },

  // Attendees section
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  attendeeOverlap: {
    marginLeft: -16,
  },
  moreAttendeesCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -16,
  },
  moreAttendeesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  attendeesInfo: {
    fontSize: 14,
    color: '#666666',
  },

  // Photos section
  photosScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  eventPhotoSmall: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },


  // Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#000000',
  },

  // Cost section
  costRowSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costTextSimple: {
    fontSize: 15,
    color: '#666666',
  },
  costAmountSimple: {
    fontSize: 15,
    color: '#000000',
  },
  costTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  costTotalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  costTotalAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },

  // Items section
  itemRowSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  itemCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  itemTextSimple: {
    fontSize: 15,
    color: '#000000',
  },

  // Info section
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 15,
    color: '#000000',
  },

  // Bottom actions
  bottomActions: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  editEventButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editEventButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelEventButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cancelEventButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
});