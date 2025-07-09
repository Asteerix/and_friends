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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

import { useProfile } from '@/hooks/useProfile';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { EventServiceComplete } from '../services/eventServiceComplete';

// Default event cover image
const DEFAULT_EVENT_COVER = require('../../../assets/default_avatar.png');

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
  const { profile } = useProfile();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvent = async () => {
      console.log('📋 [EventDetailsScreen] useEffect déclenché avec eventId:', eventId);
      
      if (!eventId) {
        console.error('❌ [EventDetailsScreen] No event ID provided');
        setLoading(false);
        return;
      }

      try {
        const result = await EventServiceComplete.getEvent(eventId);
        if (result.success) {
          setEvent(result.event);
        } else {
          console.error('Failed to load event:', result.error);
          Alert.alert('Error', 'Failed to load event details');
        }
      } catch (error) {
        console.error('Error loading event:', error);
        Alert.alert('Error', 'An error occurred while loading the event');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  // Helper function to get title font style
  const getTitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === event?.cover_data?.selectedTitleFont);
    return font?.style || {};
  };

  // Helper function to get subtitle font style
  const getSubtitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === event?.cover_data?.selectedSubtitleFont);
    return font?.style || {};
  };

  const handleInvite = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Invite', 'Invite feature coming soon!');
  };

  const handleSendReminder = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Send Reminder', 'Reminder feature coming soon!');
  };

  const handleEditEvent = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Edit Event', 'Edit feature coming soon!');
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
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverData = event.cover_data || {};
  const isHost = event.created_by === profile?.id;

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} showsVerticalScrollIndicator={false}>
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
              source={event.organizer?.avatar_url ? { uri: event.organizer.avatar_url } : DEFAULT_EVENT_COVER}
              style={styles.hostAvatar}
            />
            <Text style={styles.hostedByText}>
              Hosted by {event.organizer?.full_name || event.organizer?.username || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Details section */}
        <View style={styles.detailsSheet}>
          {/* Action buttons */}
          {isHost ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
                <Ionicons name="person-add-outline" size={20} color="#FFF" />
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reminderButton} onPress={handleSendReminder}>
                <Ionicons name="notifications-outline" size={20} color="#007AFF" />
                <Text style={styles.reminderButtonText}>Send Reminder</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.rsvpButton}>
                <Text style={styles.rsvpButtonText}>RSVP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* About Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description || 'No description provided'}</Text>
          </View>

          {/* Time Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Time</Text>
            <View style={styles.timeRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <View style={styles.timeDetails}>
                <Text style={styles.timeText}>
                  {event.start_time
                    ? new Date(event.start_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Date not set'}
                </Text>
                <Text style={styles.timeSubtext}>
                  {event.start_time
                    ? new Date(event.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Time not set'}
                  {event.end_time &&
                    ` - ${new Date(event.end_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`}
                </Text>
              </View>
            </View>
            {event.rsvp_deadline && (
              <View style={styles.rsvpDeadline}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF9500" />
                <Text style={styles.rsvpDeadlineText}>
                  RSVP by{' '}
                  {new Date(event.rsvp_deadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Location Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationContent}>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={20} color="#666" />
                <View style={styles.locationDetails}>
                  <Text style={styles.locationName}>
                    {event.venue_name || event.address || 'Location TBD'}
                  </Text>
                  {event.city && (
                    <Text style={styles.locationAddress}>
                      {[event.city, event.country].filter(Boolean).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
              {event.coordinates?.lat && event.coordinates?.lng && (
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: event.coordinates.lat,
                      longitude: event.coordinates.lng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: event.coordinates.lat,
                        longitude: event.coordinates.lng,
                      }}
                    />
                  </MapView>
                </View>
              )}
            </View>
          </View>

          {/* Who's Coming Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Who's Coming</Text>
            <View style={styles.attendeesContainer}>
              <View style={styles.attendeeAvatars}>
                {/* Show first 5 attendee avatars */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={[styles.attendeeAvatar, { marginLeft: i > 1 ? -10 : 0 }]}>
                    <Ionicons name="person" size={20} color="#999" />
                  </View>
                ))}
              </View>
              <Text style={styles.attendeesText}>
                {event.current_attendees || 0} going
                {event.max_attendees && ` • ${event.max_attendees - (event.current_attendees || 0)} spots left`}
              </Text>
            </View>
          </View>

          {/* Additional Details */}
          {(event.dress_code || event.age_restriction || event.price) && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailsGrid}>
                {event.dress_code && (
                  <View style={styles.detailItem}>
                    <Ionicons name="shirt-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>{event.dress_code}</Text>
                  </View>
                )}
                {event.age_restriction && (
                  <View style={styles.detailItem}>
                    <Ionicons name="person-circle-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>{event.age_restriction}</Text>
                  </View>
                )}
                {event.price && event.price > 0 && (
                  <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>
                      {event.currency || 'EUR'} {event.price}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Edit Event Button for hosts */}
          {isHost && (
            <TouchableOpacity style={styles.editEventButton} onPress={handleEditEvent}>
              <Ionicons name="create-outline" size={20} color="#007AFF" />
              <Text style={styles.editEventButtonText}>Edit Event</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
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
    backgroundColor: '#FFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  headerContainer: {
    height: 700,
    width: '100%',
    position: 'relative',
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
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
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1,
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
  detailsSheet: {
    backgroundColor: '#FFF',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  inviteButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reminderButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rsvpButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeDetails: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  timeSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  rsvpDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5E6',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rsvpDeadlineText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  locationContent: {
    gap: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mapContainer: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  map: {
    flex: 1,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  attendeeAvatars: {
    flexDirection: 'row',
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeesText: {
    fontSize: 16,
    color: '#333',
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
  },
  editEventButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  editEventButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});