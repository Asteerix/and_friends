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

          {/* Empty space at bottom */}
          <View style={{ height: 24 }} />
          
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
              <TouchableOpacity style={styles.joinEventButton} onPress={handleJoinEvent}>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.joinEventButtonText}>Join Event</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.hostButtonsRow}>
                <TouchableOpacity style={styles.inviteFriendsButton} onPress={handleShare}>
                  <Ionicons name="person-add-outline" size={20} color="#FFF" />
                  <Text style={styles.inviteFriendsText}>Invite Friends</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.sendUpdateButton}>
                  <Ionicons name="paper-plane-outline" size={20} color="#007AFF" />
                  <Text style={styles.sendUpdateText}>Send Reminder</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.moreOptionsButton}>
                  <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* About Section - Redesigned */}
          <View style={styles.aboutSectionWrapper}>
            {/* Host Section at the Top */}
            <View style={styles.hostSectionCard}>
              <View style={styles.hostMainInfo}>
                <Image 
                  source={{ 
                    uri: event.organizer?.avatar_url || 
                         event.extra_data?.host?.avatar || 
                         'https://via.placeholder.com/56' 
                  }} 
                  style={styles.hostMainAvatar} 
                />
                <View style={styles.hostTextInfo}>
                  <Text style={styles.hostedByLabel}>HOSTED BY</Text>
                  <Text style={styles.hostMainName}>
                    {event.organizer?.full_name || event.extra_data?.host?.name || 'Host'}
                  </Text>
                  {event.organizer?.username && (
                    <Text style={styles.hostUsername}>@{event.organizer.username}</Text>
                  )}
                </View>
                {!isHost && (
                  <TouchableOpacity style={styles.messageHostButton}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Co-hosts inline */}
              {event.has_cohosts_enabled && coHosts.length > 0 && (
                <View style={styles.coHostsInline}>
                  <Text style={styles.withText}>with</Text>
                  <View style={styles.coHostsAvatars}>
                    {coHosts.slice(0, 3).map((coHost: any, index: number) => (
                      <Image 
                        key={coHost.id || index}
                        source={{ uri: coHost.avatar || 'https://via.placeholder.com/36' }} 
                        style={[styles.coHostSmallAvatar, index > 0 && { marginLeft: -12 }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.coHostsNames}>
                    {coHosts.slice(0, 2).map((c: any) => c.name.split(' ')[0]).join(', ')}
                    {coHosts.length > 2 && ` +${coHosts.length - 2}`}
                  </Text>
                </View>
              )}
            </View>
            
            {/* About Description Below */}
            <View style={styles.aboutDescriptionCard}>
              <View style={styles.aboutTitleRow}>
                <View style={styles.aboutIconContainer}>
                  <Ionicons name="document-text" size={20} color="#007AFF" />
                </View>
                <Text style={styles.aboutSectionTitle}>About</Text>
              </View>
              <Text style={styles.aboutText}>
                {event.description || 'Get ready for an unforgettable experience! More details coming soon.'}
              </Text>
              {event.description && event.description.length > 200 && (
                <TouchableOpacity style={styles.readMoreButton}>
                  <Text style={styles.readMoreText}>Read more</Text>
                  <Ionicons name="chevron-down" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Info Cards */}
          <View style={styles.quickInfoSection}>
            {/* Date & Time Card */}
            <TouchableOpacity style={styles.infoCard} activeOpacity={0.8}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="calendar" size={24} color="#007AFF" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Date & Time</Text>
                <Text style={styles.infoCardValue}>
                  {formatDate(event.start_time).split(',')[0]}
                  {event.end_time && new Date(event.end_time).toDateString() !== new Date(event.start_time).toDateString() && 
                    ` - ${formatDate(event.end_time).split(',')[0]}`}
                </Text>
                <Text style={styles.infoCardSubValue}>
                  {formatTime(event.start_time)}{event.end_time && ` - ${formatTime(event.end_time)}`}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Location Card */}
            <TouchableOpacity style={styles.infoCard} activeOpacity={0.8}>
              <View style={[styles.infoCardIcon, { backgroundColor: '#F0F7FF' }]}>
                <Ionicons name="location" size={24} color="#0051D5" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Location</Text>
                <Text style={styles.infoCardValue} numberOfLines={1}>
                  {event.venue_name || event.location_details?.name || 'TBD'}
                </Text>
                {event.address && (
                  <Text style={styles.infoCardSubValue} numberOfLines={1}>
                    {event.address}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Capacity Card */}
            {event.has_capacity_enabled && (
              <TouchableOpacity style={styles.infoCard} activeOpacity={0.8}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#E8F2FF' }]}>
                  <Ionicons name="people" size={24} color="#0051D5" />
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardLabel}>Capacity</Text>
                  <Text style={styles.infoCardValue}>
                    {event.max_attendees === 0 ? 'Unlimited' : 
                     `${event.current_attendees || 0}/${event.max_attendees}`}
                  </Text>
                  {event.max_attendees > 0 && (
                    <View style={styles.miniProgressBar}>
                      <View 
                        style={[
                          styles.miniProgressFill,
                          { 
                            width: `${((event.current_attendees || 0) / event.max_attendees) * 100}%`,
                            backgroundColor: 
                              ((event.current_attendees || 0) / event.max_attendees) >= 1 ? '#8E8E93' :
                              ((event.current_attendees || 0) / event.max_attendees) >= 0.8 ? '#007AFF' :
                              '#0051D5'
                          }
                        ]}
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Category Card */}
            <TouchableOpacity style={styles.infoCard} activeOpacity={0.8}>
              <View style={[styles.infoCardIcon, { backgroundColor: '#F0F7FF' }]}>
                <Ionicons 
                  name={getCategoryIcon(event.category || event.event_category || 'social')} 
                  size={24} 
                  color="#007AFF" 
                />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Category</Text>
                <Text style={styles.infoCardValue}>
                  {getCategoryDisplayName(event.category || event.event_category || 'social')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Event Gallery */}
          {event.has_photos_enabled && eventPhotos.length > 0 && (
            <View style={styles.gallerySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Event Gallery</Text>
                <Text style={styles.photoCount}>{eventPhotos.length} photos</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryScroll}
              >
                {eventPhotos.map((photo: string, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.galleryImageContainer}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: photo }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Location Section with Map */}
          {event.coordinates && (
            <View style={styles.locationSection}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: event.coordinates.lat || event.coordinates.latitude,
                    longitude: event.coordinates.lng || event.coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
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
                <View style={styles.mapOverlay}>
                  <View style={styles.locationDetails}>
                    <Ionicons name="location" size={20} color="#FFF" />
                    <View style={styles.locationTextContainer}>
                      <Text style={styles.locationName}>
                        {event.venue_name || event.location_details?.name || 'Event Location'}
                      </Text>
                      {event.address && (
                        <Text style={styles.locationAddress}>
                          {event.address}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.directionsButton}>
                    <Text style={styles.directionsText}>Get Directions</Text>
                    <Ionicons name="navigate" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Attendees Section */}
          <View style={styles.attendeesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Who's Going</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.attendeesContainer}>
              <View style={styles.attendeesList}>
                {[1, 2, 3, 4, 5].map((_, index) => (
                  <Image 
                    key={index}
                    source={{ uri: `https://i.pravatar.cc/100?img=${index + 10}` }} 
                    style={[
                      styles.attendeeAvatar,
                      index > 0 && { marginLeft: -16 }
                    ]}
                  />
                ))}
                <View style={[styles.attendeeAvatar, styles.moreAttendees, { marginLeft: -16 }]}>
                  <Text style={styles.moreAttendeesText}>+{(event.current_attendees || 5) - 5}</Text>
                </View>
              </View>
              
              <View style={styles.attendeesStats}>
                <Text style={styles.attendeesCount}>
                  {event.current_attendees || 12} attending
                </Text>
                <Text style={[styles.spotsLeft, 
                  event.has_capacity_enabled && event.max_attendees > 0 && 
                  event.max_attendees - (event.current_attendees || 0) <= 5 && 
                  { color: '#007AFF' }
                ]}>
                  {event.has_capacity_enabled && event.max_attendees > 0 
                    ? `${event.max_attendees - (event.current_attendees || 0)} spots left`
                    : 'Open event'}
                </Text>
              </View>
            </View>
          </View>

          {/* Event Details - Enhanced Presentation */}
          {(event.has_dress_code_enabled || event.has_theme_enabled || event.has_age_restriction_enabled || 
            event.extra_data?.allow_plus_ones) && (
            <View style={styles.eventDetailsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Good to Know</Text>
                <View style={styles.detailsBadge}>
                  <Ionicons name="sparkles" size={16} color="#007AFF" />
                </View>
              </View>
              
              <View style={styles.detailsCard}>
                {/* Dress Code */}
                {event.has_dress_code_enabled && event.extra_data?.dress_code && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="shirt" size={24} color="#007AFF" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailTitle}>Dress Code</Text>
                      <Text style={styles.detailValue}>{event.extra_data.dress_code}</Text>
                      <Text style={styles.detailHint}>Dress to impress! Follow the dress code for the best experience.</Text>
                    </View>
                  </View>
                )}
                
                {/* Theme */}
                {event.has_theme_enabled && event.extra_data?.event_theme && (
                  <View style={[styles.detailItem, event.has_dress_code_enabled && styles.detailItemBorder]}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="color-palette" size={24} color="#0051D5" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailTitle}>Event Theme</Text>
                      <Text style={styles.detailValue}>{event.extra_data.event_theme}</Text>
                      <Text style={styles.detailHint}>Get creative with the theme! It's part of the fun.</Text>
                    </View>
                  </View>
                )}
                
                {/* Age Restriction */}
                {event.has_age_restriction_enabled && event.extra_data?.age_restriction && (
                  <View style={[styles.detailItem, (event.has_dress_code_enabled || event.has_theme_enabled) && styles.detailItemBorder]}>
                    <View style={styles.detailIconContainer}>
                      <MaterialCommunityIcons name="account-check" size={24} color="#007AFF" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailTitle}>Age Requirement</Text>
                      <Text style={styles.detailValue}>{event.extra_data.age_restriction}</Text>
                      <Text style={styles.detailHint}>Please bring valid ID if required.</Text>
                    </View>
                  </View>
                )}

                {/* Plus Ones */}
                {event.extra_data?.allow_plus_ones && (
                  <View style={[styles.detailItem, (event.has_dress_code_enabled || event.has_theme_enabled || event.has_age_restriction_enabled) && styles.detailItemBorder]}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="person-add" size={24} color="#0051D5" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailTitle}>Bringing Someone?</Text>
                      <Text style={styles.detailValue}>
                        {event.extra_data.max_plus_ones ? `You can bring up to ${event.extra_data.max_plus_ones} guest${event.extra_data.max_plus_ones > 1 ? 's' : ''}` : 'Plus ones are welcome!'}
                      </Text>
                      <Text style={styles.detailHint}>Let the host know if you're bringing someone.</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Costs Section - Enhanced */}
          {event.has_costs_enabled && costs.length > 0 && (
            <View style={styles.costsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Entry & Costs</Text>
                <View style={styles.costsBadge}>
                  <Ionicons name="cash-outline" size={16} color="#007AFF" />
                  <Text style={styles.costsBadgeText}>
                    ${costs.reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0).toFixed(0)} total
                  </Text>
                </View>
              </View>
              <View style={styles.costsCard}>
                <View style={styles.costsIntro}>
                  <Ionicons name="information-circle" size={20} color="#007AFF" />
                  <Text style={styles.costsIntroText}>
                    Here's what you'll need to budget for this event
                  </Text>
                </View>
                {costs.map((cost: any, index: number) => (
                  <View key={cost.id || index} style={styles.costItem}>
                    <View style={styles.costInfo}>
                      <Text style={styles.costDescription}>{cost.description}</Text>
                      {cost.is_required && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>Required</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.costAmount}>${cost.amount}</Text>
                  </View>
                ))}
                <View style={styles.costTotal}>
                  <View>
                    <Text style={styles.costTotalLabel}>Total per person</Text>
                    <Text style={styles.costPaymentHint}>Payment collected at the event</Text>
                  </View>
                  <Text style={styles.costTotalAmount}>
                    ${costs.reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Items to Bring */}
          {event.has_items_enabled && items.length > 0 && (
            <View style={styles.itemsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>What to Bring</Text>
                <View style={styles.itemsCount}>
                  <Text style={styles.itemsCountText}>{items.length} items</Text>
                </View>
              </View>
              <View style={styles.itemsCard}>
                {items.map((item: any, index: number) => (
                  <TouchableOpacity 
                    key={item.id || index} 
                    style={styles.itemRow}
                    activeOpacity={item.assignedTo ? 1 : 0.7}
                  >
                    <View style={styles.itemCheckbox}>
                      <Ionicons 
                        name={item.assignedTo ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={item.assignedTo ? "#007AFF" : "#C7C7CC"} 
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, item.assignedTo && styles.itemNameAssigned]}>
                        {item.name || item.item_name}
                      </Text>
                      {item.quantity > 1 && (
                        <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                      )}
                    </View>
                    {item.assignedTo ? (
                      <View style={styles.assignedBadge}>
                        <Text style={styles.assignedText}>Taken</Text>
                      </View>
                    ) : (
                      <View style={styles.availableBadge}>
                        <Text style={styles.availableText}>Available</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Guest Questionnaire */}
          {event.has_questionnaire_enabled && questionnaire.length > 0 && (
            <View style={styles.questionnaireSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Questions for Guests</Text>
                <Text style={styles.questionsCount}>{questionnaire.length} questions</Text>
              </View>
              <View style={styles.questionsCard}>
                {questionnaire.map((question: any, index: number) => (
                  <View key={question.id || index} style={styles.questionItem}>
                    <View style={styles.questionNumber}>
                      <Text style={styles.questionNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.questionContent}>
                      <Text style={styles.questionText}>
                        {question.question || question.question_text || question.text}
                      </Text>
                      {question.is_required && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>Required</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                <View style={styles.questionsNote}>
                  <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
                  <Text style={styles.questionsNoteText}>
                    You'll answer these questions when joining the event
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Additional Info */}
          {(event.has_parking_info_enabled || event.has_accessibility_enabled || 
            event.has_contact_enabled || event.has_website_enabled) && (
            <View style={styles.additionalInfoSection}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              
              <View style={styles.infoCards}>
                {/* Parking */}
                {event.has_parking_info_enabled && event.extra_data?.parking_info && (
                  <TouchableOpacity style={styles.infoItemCard} activeOpacity={0.7}>
                    <View style={styles.infoItemHeader}>
                      <Ionicons name="car" size={20} color="#007AFF" />
                      <Text style={styles.infoItemTitle}>Parking</Text>
                    </View>
                    <Text style={styles.infoItemText}>{event.extra_data.parking_info}</Text>
                  </TouchableOpacity>
                )}
                
                {/* Accessibility */}
                {event.has_accessibility_enabled && event.extra_data?.accessibility_info && (
                  <TouchableOpacity style={styles.infoItemCard} activeOpacity={0.7}>
                    <View style={styles.infoItemHeader}>
                      <MaterialCommunityIcons name="wheelchair-accessibility" size={20} color="#007AFF" />
                      <Text style={styles.infoItemTitle}>Accessibility</Text>
                    </View>
                    <Text style={styles.infoItemText}>{event.extra_data.accessibility_info}</Text>
                  </TouchableOpacity>
                )}
                
                {/* Contact */}
                {event.has_contact_enabled && event.extra_data?.contact_info && (
                  <TouchableOpacity 
                    style={styles.infoItemCard} 
                    activeOpacity={0.7}
                    onPress={handleCallContact}
                  >
                    <View style={styles.infoItemHeader}>
                      <Ionicons name="call" size={20} color="#0051D5" />
                      <Text style={styles.infoItemTitle}>Contact</Text>
                    </View>
                    <Text style={[styles.infoItemText, styles.linkText]}>
                      {event.extra_data.contact_info}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Website */}
                {event.has_website_enabled && event.extra_data?.event_website && (
                  <TouchableOpacity 
                    style={styles.infoItemCard} 
                    activeOpacity={0.7}
                    onPress={handleOpenWebsite}
                  >
                    <View style={styles.infoItemHeader}>
                      <Ionicons name="globe" size={20} color="#007AFF" />
                      <Text style={styles.infoItemTitle}>Website</Text>
                    </View>
                    <Text style={[styles.infoItemText, styles.linkText]}>
                      {event.extra_data.event_website}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* RSVP Deadline Section */}
          {event.has_rsvp_deadline_enabled && event.extra_data?.rsvp_deadline && (
            <View style={styles.rsvpSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RSVP Information</Text>
              </View>
              <View style={styles.rsvpCard}>
                <View style={styles.rsvpIconContainer}>
                  <Ionicons name="calendar-outline" size={32} color="#007AFF" />
                </View>
                <View style={styles.rsvpContent}>
                  <Text style={styles.rsvpTitle}>RSVP by {new Date(event.extra_data.rsvp_deadline).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}</Text>
                  <Text style={styles.rsvpSubtitle}>
                    Please confirm your attendance before the deadline
                  </Text>
                  {event.extra_data?.rsvp_reminder_enabled && (
                    <View style={styles.reminderBadge}>
                      <Ionicons name="notifications" size={14} color="#007AFF" />
                      <Text style={styles.reminderText}>Reminder set</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Playlist Section */}
          {event.has_playlist_enabled && (event.extra_data?.playlist?.length > 0 || event.extra_data?.spotify_link) && (
            <View style={styles.playlistSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Event Playlist</Text>
                <View style={styles.musicBadge}>
                  <Ionicons name="musical-notes" size={16} color="#007AFF" />
                  <Text style={styles.musicBadgeText}>
                    {event.extra_data?.playlist?.length || 0} songs
                  </Text>
                </View>
              </View>
              <View style={styles.playlistCard}>
                {event.extra_data?.spotify_link && (
                  <TouchableOpacity 
                    style={styles.spotifyButton}
                    onPress={() => Linking.openURL(event.extra_data.spotify_link)}
                  >
                    <Ionicons name="logo-spotify" size={24} color="#1DB954" />
                    <Text style={styles.spotifyButtonText}>Open in Spotify</Text>
                    <Ionicons name="arrow-forward" size={18} color="#666" />
                  </TouchableOpacity>
                )}
                {event.extra_data?.playlist?.length > 0 && (
                  <View style={styles.playlistPreview}>
                    <Text style={styles.playlistPreviewTitle}>Featured tracks</Text>
                    {event.extra_data.playlist.slice(0, 3).map((song: any, index: number) => (
                      <View key={index} style={styles.songItem}>
                        <Text style={styles.songName}>{song.name}</Text>
                        <Text style={styles.songArtist}>{song.artist}</Text>
                      </View>
                    ))}
                    {event.extra_data.playlist.length > 3 && (
                      <Text style={styles.moreTracksText}>
                        +{event.extra_data.playlist.length - 3} more tracks
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.playlistInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
                  <Text style={styles.playlistInfoText}>
                    Get the party started with our curated playlist!
                  </Text>
                </View>
              </View>
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
  eventInfoContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    zIndex: 50,
  },
  eventTypeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  eventDateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  eventTimeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
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
    backgroundColor: '#F8F9FA',
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingBottom: 100,
    minHeight: 600,
  },
  
  // Primary Actions
  primaryActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  
  // Guest Join Button
  joinEventButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  joinEventButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  
  // Host Action Buttons
  hostButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteFriendsButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inviteFriendsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sendUpdateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendUpdateText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  moreOptionsButton: {
    width: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Info Section
  quickInfoSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  infoCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  infoCardSubValue: {
    fontSize: 14,
    color: '#666666',
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // About Section - Redesigned
  aboutSectionWrapper: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  
  // Host Section
  hostSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 12,
  },
  hostMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostMainAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  hostTextInfo: {
    flex: 1,
  },
  hostedByLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hostMainName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  hostUsername: {
    fontSize: 14,
    color: '#666666',
  },
  coHostsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  withText: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 12,
  },
  coHostsAvatars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  coHostSmallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  coHostsNames: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  
  // About Description
  aboutDescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  aboutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  aboutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
    marginBottom: 20,
  },
  hostInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  hostInfoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  hostInfoContent: {
    flex: 1,
  },
  hostInfoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  hostInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  messageHostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gallery Section
  gallerySection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  photoCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  galleryScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  galleryImageContainer: {
    marginRight: 12,
  },
  galleryImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
  },
  
  // Location Section
  locationSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 81, 213, 0.9)',
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Attendees Section
  attendeesSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  viewAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  attendeesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  attendeesList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  attendeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  moreAttendees: {
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAttendeesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  attendeesStats: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  attendeesCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  spotsLeft: {
    fontSize: 14,
    color: '#007AFF',
  },

  // Event Details - Extras
  extrasSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  extrasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  extraCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  extraCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginHorizontal: 6,
    marginBottom: 12,
    flex: 1,
    minWidth: '45%',
  },
  extraLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  extraValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },

  // Event Details - Enhanced
  eventDetailsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  detailsBadge: {
    backgroundColor: '#E3F2FD',
    padding: 6,
    borderRadius: 8,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  detailItem: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  detailItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  detailHint: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },

  // Costs Section
  costsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  costsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  costsBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  costsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  costsIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  costsIntroText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  costInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costDescription: {
    fontSize: 16,
    color: '#000000',
  },
  requiredBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0051D5',
  },
  costAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  costTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#F2F2F7',
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  costPaymentHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  costTotalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF',
  },

  // Items Section
  itemsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  itemsCount: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  itemsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemCheckbox: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  assignedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  assignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Questionnaire Section
  questionnaireSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  questionsCount: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  questionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  questionCard: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
  },
  questionRequired: {
    fontSize: 12,
    color: '#0051D5',
    fontWeight: '500',
    marginTop: 4,
  },

  // Additional Info Section
  additionalInfoSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  infoCards: {
    gap: 12,
  },
  infoItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  infoItemText: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },

  // Bottom actions
  // RSVP Section
  rsvpSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  rsvpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rsvpIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rsvpContent: {
    flex: 1,
  },
  rsvpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  rsvpSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  reminderText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Playlist Section
  playlistSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  musicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  musicBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  playlistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  spotifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  spotifyButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  playlistPreview: {
    marginBottom: 16,
  },
  playlistPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  songItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  songName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 13,
    color: '#666',
  },
  moreTracksText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 12,
  },
  playlistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
  },
  playlistInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

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
    borderColor: '#FFE5E5',
  },
  cancelEventButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  
  // Missing items styles
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  itemsIntro: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemDetails: {
    flex: 1,
  },
  itemNameAssigned: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  availableBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  availableText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  itemsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  itemsFooterText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  
  // New Items styles
  itemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemsBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  itemsContainer: {
    gap: 16,
  },
  itemsHeaderCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  itemsHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsHeaderContent: {
    flex: 1,
  },
  itemsHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemsHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCardAssigned: {
    backgroundColor: '#F8F8F8',
    borderColor: '#E3E3E8',
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconAssigned: {
    backgroundColor: '#E8F2FF',
  },
  claimedTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  claimedTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  availableTag: {
    backgroundColor: '#F0FFF0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  availableTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  itemCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  itemCardNameClaimed: {
    color: '#8E8E93',
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  quantityText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  assignedToInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignedToText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  itemsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
  },
  itemsHintText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  
  // New Questionnaire styles
  questionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questionsBadgeText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  questionsContainer: {
    gap: 16,
  },
  questionsHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  questionsHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  questionsHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  questionsListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  questionItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionIndexBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  questionIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  requiredIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
  },
  questionTextContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000',
    marginBottom: 12,
  },
  answerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
  },
  answerPreviewText: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  questionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
  },
  questionsFooterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionsFooterText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  
  // Simpler questionnaire styles
  questionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
  },
  questionsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F8F8F8',
  },
  questionsNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
  },
});