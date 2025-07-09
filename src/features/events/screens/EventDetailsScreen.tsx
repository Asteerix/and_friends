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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

import { useProfile } from '@/hooks/useProfile';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { EventServiceComplete } from '../services/eventServiceComplete';
import { getCategoryDisplayName, getCategoryIcon } from '../utils/categoryHelpers';
import { useEvent } from '../context/EventProvider';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const { currentEvent: event, loading, loadEvent } = useEvent();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    console.log('📋 [EventDetailsScreen] useEffect déclenché avec eventId:', eventId);
    
    if (!eventId) {
      console.error('❌ [EventDetailsScreen] No event ID provided');
      return;
    }

    // Charger l'événement via le provider
    loadEvent(eventId);
  }, [eventId, loadEvent]);

  // Log quand l'événement est chargé
  useEffect(() => {
    if (event && !loading) {
      console.log('🎯 [EventDetailsScreen] Événement chargé:', {
        title: event.title,
        max_attendees: event.max_attendees,
        category: event.category,
        event_category: event.event_category,
        extra_data: event.extra_data
      });
    }
  }, [event, loading]);

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
  
  
  // Helper function to calculate available spots
  const calculateAvailableSpots = () => {
    if (!event?.max_attendees) return null;
    
    // Compter les participants actuels (incluant l'hôte)
    const currentAttendees = (event.current_attendees || 0) + 1; // +1 pour l'hôte
    const maxAttendees = event.max_attendees;
    const availableSpots = Math.max(0, maxAttendees - currentAttendees);
    
    return {
      current: currentAttendees,
      max: maxAttendees,
      available: availableSpots,
      isFull: availableSpots === 0
    };
  };

  const handleInvite = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Invite', 'Invite feature coming soon!');
  };

  const handleSendReminder = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Send Reminder', 'Reminder feature coming soon!');
  };
  
  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  
  const handleEditEvent = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/screens/create-event?mode=edit&id=${eventId}`);
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
              <TouchableOpacity 
                style={styles.rsvpButton}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('RSVP', 'RSVP feature coming soon!');
                }}
              >
                <Text style={styles.rsvpButtonText}>RSVP</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Essential Information Cards */}
          <View style={styles.essentialInfoSection}>
            {/* Date & Time Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="calendar-outline" size={24} color="#007AFF" />
                <Text style={styles.infoCardTitle}>Dates & Horaires</Text>
              </View>
              
              <View style={styles.dateTimeContainer}>
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeBlock}>
                    <Text style={styles.dateTimeLabel}>Début</Text>
                    <Text style={styles.dateTimeValue}>
                      {event.start_time || event.date
                        ? new Date(event.start_time || event.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })
                        : 'Non défini'}
                    </Text>
                    <Text style={styles.dateTimeHour}>
                      {event.start_time || event.date
                        ? new Date(event.start_time || event.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </Text>
                  </View>
                  
                  <View style={styles.dateTimeSeparator}>
                    <Ionicons name="arrow-forward" size={20} color="#C7C7CC" />
                  </View>
                  
                  <View style={styles.dateTimeBlock}>
                    <Text style={styles.dateTimeLabel}>Fin</Text>
                    <Text style={styles.dateTimeValue}>
                      {event.end_time
                        ? new Date(event.end_time).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })
                        : 'Non défini'}
                    </Text>
                    <Text style={styles.dateTimeHour}>
                      {event.end_time
                        ? new Date(event.end_time).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </Text>
                  </View>
                </View>
                
                {event.start_time && event.end_time && (
                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.durationText}>
                      {(() => {
                        const start = new Date(event.start_time);
                        const end = new Date(event.end_time);
                        const diff = end.getTime() - start.getTime();
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const days = Math.floor(hours / 24);
                        if (days > 0) {
                          return `${days} jour${days > 1 ? 's' : ''}`;
                        }
                        return `${hours} heure${hours > 1 ? 's' : ''}`;
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Location Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="location-outline" size={24} color="#FF3B30" />
                <Text style={styles.infoCardTitle}>Lieu</Text>
              </View>
              
              <View style={styles.locationContainer}>
                <Text style={styles.locationName}>
                  {event.venue_name || 'Lieu à définir'}
                </Text>
                {event.address && (
                  <Text style={styles.locationAddress}>{event.address}</Text>
                )}
                {(event.city || event.postal_code || event.country) && (
                  <Text style={styles.locationDetails}>
                    {[event.postal_code, event.city, event.country].filter(Boolean).join(', ')}
                  </Text>
                )}
                
                {event.coordinates && (
                  <TouchableOpacity 
                    style={styles.mapButton}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // Open in maps
                    }}
                  >
                    <Ionicons name="map" size={18} color="#007AFF" />
                    <Text style={styles.mapButtonText}>Voir sur la carte</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Capacity Card - Only show if capacity is configured */}
            {event.has_capacity_enabled && event.max_attendees !== null && event.max_attendees !== undefined && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="people-outline" size={24} color="#34C759" />
                  <Text style={styles.infoCardTitle}>Capacité</Text>
                </View>
                
                <View style={styles.capacityContainer}>
                  {event.max_attendees > 0 ? (
                    <>
                      <View style={styles.capacityMainInfo}>
                        <Text style={styles.capacityNumber}>
                          {event.current_attendees || 0}/{event.max_attendees}
                        </Text>
                        <Text style={styles.capacityLabel}>participants</Text>
                      </View>
                      
                      <View style={styles.capacityProgressContainer}>
                        <View style={styles.capacityProgressBar}>
                          <View 
                            style={[
                              styles.capacityProgressFill,
                              { 
                                width: `${((event.current_attendees || 0) / event.max_attendees) * 100}%`,
                                backgroundColor: 
                                  ((event.current_attendees || 0) / event.max_attendees) >= 1 ? '#FF3B30' :
                                  ((event.current_attendees || 0) / event.max_attendees) >= 0.8 ? '#FF9500' :
                                  '#34C759'
                              }
                            ]}
                          />
                        </View>
                      </View>
                      
                      {(() => {
                        const spots = calculateAvailableSpots();
                        if (spots?.isFull) {
                          return (
                            <View style={styles.capacityStatus}>
                              <Ionicons name="close-circle" size={16} color="#FF3B30" />
                              <Text style={styles.capacityStatusText}>Événement complet</Text>
                            </View>
                          );
                        } else if (spots?.available && spots.available <= 5) {
                          return (
                            <View style={[styles.capacityStatus, { backgroundColor: '#FFF3E0' }]}>
                              <Ionicons name="alert-circle" size={16} color="#FF9500" />
                              <Text style={[styles.capacityStatusText, { color: '#FF9500' }]}>
                                Plus que {spots.available} place{spots.available > 1 ? 's' : ''}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : event.max_attendees === 0 ? (
                    // Explicitly set to unlimited (0 means unlimited)
                    <View style={styles.unlimitedCapacity}>
                      <Ionicons name="infinite" size={32} color="#34C759" />
                      <Text style={styles.unlimitedText}>Places illimitées</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* Expandable Sections */}
          
          {/* Event Information Section */}
          <TouchableOpacity
            style={styles.expandableSection}
            onPress={() => toggleSection('eventInfo')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="information-circle-outline" size={24} color="#000" />
                <Text style={styles.sectionHeaderTitle}>Event Information</Text>
              </View>
              <Ionicons
                name={expandedSections.eventInfo ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </View>
          </TouchableOpacity>
          {expandedSections.eventInfo && (
            <View style={styles.expandedContent}>
              {/* About */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>About</Text>
                <Text style={styles.infoValue}>
                  {event.description || 'No description provided'}
                </Text>
              </View>
              
              {/* Date & Time */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date de début</Text>
                <Text style={styles.infoValue}>
                  {event.start_time || event.date
                    ? new Date(event.start_time || event.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }) + ' à ' + new Date(event.start_time || event.date).toLocaleTimeString('fr-FR', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Non définie'}
                </Text>
              </View>
              
              {event.end_time && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date de fin</Text>
                  <Text style={styles.infoValue}>
                    {new Date(event.end_time).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }) + ' à ' + new Date(event.end_time).toLocaleTimeString('fr-FR', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              
              {/* Location */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Adresse complète</Text>
                <View>
                  <Text style={styles.infoValue}>
                    {event.venue_name || 'Lieu à définir'}
                  </Text>
                  {event.address && (
                    <Text style={styles.infoSubValue}>
                      {event.address}
                    </Text>
                  )}
                  {(event.city || event.postal_code || event.country) && (
                    <Text style={styles.infoSubValue}>
                      {[event.postal_code, event.city, event.country].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {event.coordinates && (
                    <TouchableOpacity 
                      style={styles.mapLink}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="map-outline" size={16} color="#007AFF" />
                      <Text style={styles.mapLinkText}>Voir sur la carte</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Category */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category</Text>
                <View style={styles.categoryContainer}>
                  <Text style={styles.categoryIcon}>
                    {getCategoryIcon(event.extra_data?.event_category || event.event_category || event.category)}
                  </Text>
                  <Text style={styles.infoValue}>
                    {getCategoryDisplayName(event.extra_data?.event_category || event.event_category || event.category)}
                  </Text>
                </View>
              </View>
              
              {/* Theme */}
              {event.event_theme && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Theme</Text>
                  <Text style={styles.infoValue}>
                    {event.event_theme}
                  </Text>
                </View>
              )}
              
              {/* Website */}
              {event.event_website && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Website</Text>
                  <Text style={[styles.infoValue, { color: '#007AFF' }]}>
                    {event.event_website}
                  </Text>
                </View>
              )}
              
              {/* Contact */}
              {event.contact_info && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact</Text>
                  <Text style={styles.infoValue}>
                    {event.contact_info}
                  </Text>
                </View>
              )}
              
              {/* Privacy */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Privacy</Text>
                <View style={styles.privacyBadge}>
                  <Ionicons 
                    name={event.is_private ? "lock-closed" : "globe-outline"} 
                    size={16} 
                    color={event.is_private ? "#666" : "#007AFF"} 
                  />
                  <Text style={styles.privacyText}>
                    {event.is_private ? 'Private Event' : 'Public Event'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Guest Management Section */}
          <TouchableOpacity
            style={styles.expandableSection}
            onPress={() => toggleSection('guestManagement')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="people-outline" size={24} color="#000" />
                <Text style={styles.sectionHeaderTitle}>Guest Management</Text>
              </View>
              <Ionicons
                name={expandedSections.guestManagement ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </View>
          </TouchableOpacity>
          {expandedSections.guestManagement && (
            <View style={styles.expandedContent}>
              {/* Hosts & Co-hosts */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hosts</Text>
                <View>
                  <View style={styles.hostsContainer}>
                    <Image
                      source={event.organizer?.avatar_url ? { uri: event.organizer.avatar_url } : DEFAULT_EVENT_COVER}
                      style={styles.hostMiniAvatar}
                    />
                    <Text style={styles.infoValue}>
                      {event.organizer?.full_name || event.organizer?.username || 'Unknown'}
                    </Text>
                  </View>
                  {event.co_hosts && event.co_hosts.length > 0 && (
                    <View style={styles.coHostsList}>
                      {event.co_hosts.map((coHost: any) => (
                        <View key={coHost.id} style={styles.hostsContainer}>
                          <Image
                            source={{ uri: coHost.avatar }}
                            style={styles.hostMiniAvatar}
                          />
                          <Text style={styles.infoValue}>{coHost.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Capacity */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Capacité</Text>
                <View>
                  <Text style={styles.infoValue}>
                    {(() => {
                      const spots = calculateAvailableSpots();
                      if (!spots) return 'Pas de limite';
                      return `${spots.current} / ${spots.max} participants`;
                    })()}
                  </Text>
                  {(() => {
                    const spots = calculateAvailableSpots();
                    if (spots) {
                      if (spots.isFull) {
                        return (
                          <Text style={[styles.infoSubValue, { color: '#FF3B30', fontWeight: '600' }]}>
                            Événement complet
                          </Text>
                        );
                      } else if (spots.available <= 5) {
                        return (
                          <Text style={[styles.infoSubValue, { color: '#FF9500', fontWeight: '600' }]}>
                            Plus que {spots.available} place{spots.available > 1 ? 's' : ''} !
                          </Text>
                        );
                      } else {
                        return (
                          <Text style={[styles.infoSubValue, { color: '#34C759' }]}>
                            {spots.available} place{spots.available > 1 ? 's' : ''} disponible{spots.available > 1 ? 's' : ''}
                          </Text>
                        );
                      }
                    }
                    return null;
                  })()}
                </View>
              </View>
              
              {/* Age Restriction */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age Restriction</Text>
                <Text style={styles.infoValue}>
                  {event.age_restriction || 'All ages'}
                </Text>
              </View>
              
              {/* RSVP Deadline */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>RSVP Deadline</Text>
                <Text style={styles.infoValue}>
                  {event.rsvp_deadline
                    ? new Date(event.rsvp_deadline).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'No deadline'}
                </Text>
              </View>
              
              {/* Guest Questionnaire */}
              {event.questionnaire?.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Questionnaire</Text>
                  <Text style={styles.infoValue}>
                    {event.questionnaire.length} questions
                  </Text>
                </View>
              )}
              
              {/* Guest List */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Attendees</Text>
                <View style={styles.attendeesPreview}>
                  <View style={styles.attendeeAvatars}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <View key={i} style={[styles.attendeeAvatar, { marginLeft: i > 1 ? -10 : 0 }]}>
                        <Ionicons name="person" size={20} color="#999" />
                      </View>
                    ))}
                  </View>
                  <Text style={styles.attendeesText}>
                    {event.current_attendees || 0} going
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Event Features Section */}
          <TouchableOpacity
            style={styles.expandableSection}
            onPress={() => toggleSection('eventFeatures')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="sparkles-outline" size={24} color="#000" />
                <Text style={styles.sectionHeaderTitle}>Event Features</Text>
              </View>
              <Ionicons
                name={expandedSections.eventFeatures ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </View>
          </TouchableOpacity>
          {expandedSections.eventFeatures && (
            <View style={styles.expandedContent}>
              {/* Costs */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Entry & Costs</Text>
                <View>
                  {event.costs && event.costs.length > 0 ? (
                    event.costs.map((cost: any, index: number) => (
                      <Text key={index} style={styles.infoValue}>
                        {cost.currency} {cost.amount} - {cost.description}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.infoValue}>Free event</Text>
                  )}
                </View>
              </View>
              
              {/* Dress Code */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dress Code</Text>
                <Text style={styles.infoValue}>
                  {event.dress_code || 'Come as you are'}
                </Text>
              </View>
              
              {/* Items to Bring */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Items to Bring</Text>
                <Text style={styles.infoValue}>
                  {event.items_to_bring?.length > 0
                    ? `${event.items_to_bring.length} items`
                    : 'Nothing required'}
                </Text>
              </View>
              
              {/* Photo Album */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Photo Album</Text>
                <View>
                  {event.event_photos && event.event_photos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.photoPreview}>
                        {event.event_photos.slice(0, 4).map((photo: string, index: number) => (
                          <Image key={index} source={{ uri: photo }} style={styles.previewPhoto} />
                        ))}
                        {event.event_photos.length > 4 && (
                          <View style={[styles.previewPhoto, styles.morePhotos]}>
                            <Text style={styles.morePhotosText}>+{event.event_photos.length - 4}</Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  ) : (
                    <Text style={styles.infoValue}>No photos</Text>
                  )}
                </View>
              </View>
              
              {/* Playlist */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Playlist</Text>
                <Text style={styles.infoValue}>
                  {event.playlist?.length > 0
                    ? `${event.playlist.length} songs`
                    : 'No playlist'}
                  {event.spotify_link && ' (Spotify linked)'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Logistics Section */}
          <TouchableOpacity
            style={styles.expandableSection}
            onPress={() => toggleSection('logistics')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="map-outline" size={24} color="#000" />
                <Text style={styles.sectionHeaderTitle}>Logistics & Accessibility</Text>
              </View>
              <Ionicons
                name={expandedSections.logistics ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </View>
          </TouchableOpacity>
          {expandedSections.logistics && (
            <View style={styles.expandedContent}>
              {/* Map */}
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
              
              {/* Parking */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Parking</Text>
                <Text style={styles.infoValue}>
                  {event.parking_info || 'No parking info'}
                </Text>
              </View>
              
              {/* Accessibility */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Accessibility</Text>
                <Text style={styles.infoValue}>
                  {event.accessibility_info || 'No accessibility info'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Cancel Event Button for hosts */}
          {isHost && (
            <TouchableOpacity 
              style={styles.cancelEventButton} 
              onPress={() => {
                Alert.alert(
                  'Cancel Event',
                  'Are you sure you want to cancel this event? This action cannot be undone.',
                  [
                    {
                      text: 'No',
                      style: 'cancel',
                    },
                    {
                      text: 'Yes, Cancel Event',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const result = await EventServiceComplete.cancelEvent(eventId!);
                          if (result.success) {
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Success', 'Event has been cancelled.', [
                              {
                                text: 'OK',
                                onPress: () => router.back(),
                              },
                            ]);
                          } else {
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            Alert.alert('Error', result.error || 'Failed to cancel event');
                          }
                        } catch (error) {
                          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          Alert.alert('Error', 'An error occurred while cancelling the event');
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={styles.cancelEventButtonText}>Cancel Event</Text>
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
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 12,
  },
  statText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  expandableSection: {
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  infoSubValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  hostsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  hostMiniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  coHostsList: {
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  photoPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  previewPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  morePhotos: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
  },
  morePhotosText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  attendeesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cancelEventButton: {
    backgroundColor: '#FFE6E6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  cancelEventButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  titleTouchArea: {
    width: '100%',
    alignItems: 'center',
  },
  subtitleTouchArea: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  placeholderText: {
    opacity: 0.7,
    fontStyle: 'italic',
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
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  editModalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  editModalInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  subtitleHelper: {
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  subtitleHelperText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  addressContainer: {
    flex: 1,
  },
  addressText: {
    lineHeight: 20,
  },
  availableSpotsText: {
    color: '#34C759',
    fontWeight: '500',
  },
  fullEventText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  // Enhanced Quick Stats styles
  enhancedQuickStats: {
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statCardSubText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fullEventMainText: {
    color: '#FF3B30',
  },
  fullEventSubText: {
    color: '#FF3B30',
    opacity: 0.8,
  },
  // Enhanced location styles
  locationSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: -16,
    marginVertical: 8,
  },
  infoLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  addressMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  addressStreetText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  addressCityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  mapButtonEnhanced: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  mapButtonTextEnhanced: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Date & Time enhanced styles
  dateTimeSection: {
    backgroundColor: '#EEF6FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: -16,
    marginVertical: 8,
  },
  dateTimeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1E4FF',
  },
  dateTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    lineHeight: 24,
  },
  multiDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  multiDayText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Capacity enhanced styles
  capacitySection: {
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: -16,
    marginVertical: 8,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  capacityFullText: {
    color: '#FF3B30',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  progressBarFull: {
    backgroundColor: '#FF3B30',
  },
  capacityWarning: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Quick Info styles (CreateEventScreen style)
  quickInfoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F8F8',
    gap: 16,
  },
  quickInfoField: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  quickInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  quickInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickInfoText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  quickInfoTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginLeft: 28,
  },
  quickInfoSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginLeft: 28,
  },
  fullEventSubtext: {
    color: '#FF3B30',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  mapLinkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Professional Key Info Section
  keyInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  keyInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  keyInfoGrid: {
    gap: 12,
  },
  keyInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  dateCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  locationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  capacityCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  keyInfoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  keyInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyInfoCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  keyInfoCardContent: {
    gap: 12,
  },
  // Essential Information Section Styles
  essentialInfoSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  // Date Time Styles
  dateTimeContainer: {
    gap: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  dateTimeSeparator: {
    paddingHorizontal: 16,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dateTimeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateTimeHour: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  // Location Styles
  locationContainer: {
    gap: 8,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  locationAddress: {
    fontSize: 16,
    color: '#333',
  },
  locationDetails: {
    fontSize: 14,
    color: '#666',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  // Capacity Styles
  capacityContainer: {
    gap: 12,
  },
  capacityMainInfo: {
    alignItems: 'center',
  },
  capacityNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  capacityLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  capacityProgressContainer: {
    paddingHorizontal: 20,
  },
  capacityProgressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  capacityStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  unlimitedCapacity: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  unlimitedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
});