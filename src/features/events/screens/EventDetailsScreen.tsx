import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  UIManager,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

import { useProfile } from '@/hooks/useProfile';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import { getCategoryDisplayName } from '../utils/categoryHelpers';
import { useEvent } from '../context/EventProvider';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


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
  const { currentEvent: event, loading, loadEvent, updateEvent } = useEvent();
  const [questionResponses, setQuestionResponses] = useState<{ [key: string]: string }>({});

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

  const handleClaimItem = async (itemId: string | number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!profile?.id) {
      Alert.alert('Sign in required', 'Please sign in to claim items');
      return;
    }

    // Update the item to mark it as claimed
    const updatedItems = items.map((item: any) => 
      (item.id || items.indexOf(item)) === itemId 
        ? { ...item, assignedTo: profile.id } 
        : item
    );

    const result = await updateEvent(eventId!, {
      itemsToBring: updatedItems
    });

    if (result.success) {
      Alert.alert('Success', 'Item claimed successfully!');
    } else {
      Alert.alert('Error', 'Failed to claim item');
    }
  };

  const handleQuestionResponse = (questionId: string, text: string) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: text
    }));
  };

  const handleSubmitResponses = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Validate required questions
    const requiredQuestions = questionnaire.filter((q: any) => q.is_required);
    const missingResponses = requiredQuestions.filter((q: any) => {
      const questionId = q.id || questionnaire.indexOf(q);
      return !questionResponses[questionId] || questionResponses[questionId].trim() === '';
    });

    if (missingResponses.length > 0) {
      Alert.alert('Missing responses', 'Please answer all required questions');
      return;
    }

    // In a real app, save responses to database
    Alert.alert('Success', 'Your responses have been submitted!');
    
    // TODO: Implement actual submission to database
    // const result = await EventServiceComplete.submitQuestionnaireResponses(
    //   eventId!, 
    //   profile!.id, 
    //   questionResponses
    // );
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
          {/* Primary Actions - Airbnb Style */}
          <View style={styles.primaryActionsContainer}>
            {!isHost ? (
              <TouchableOpacity style={styles.joinEventButton} onPress={handleJoinEvent}>
                <Text style={styles.joinEventButtonText}>Request to Join</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.hostActionsContainer}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="share-outline" size={20} color="#000" />
                    <Text style={styles.shareButtonText}>Share</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Host & About Section - Airbnb Style */}
          <View style={styles.hostAboutSection}>
            <Text style={styles.sectionTitle}>Meet your host</Text>
            <View style={styles.hostCard}>
              <View style={styles.hostInfo}>
                <Image 
                  source={{ 
                    uri: event.organizer?.avatar_url || 
                         event.extra_data?.host?.avatar || 
                         'https://via.placeholder.com/64' 
                  }} 
                  style={styles.hostAvatar} 
                />
                <View style={styles.hostDetails}>
                  <Text style={styles.hostName}>
                    {event.organizer?.full_name || event.extra_data?.host?.name || 'Host'}
                  </Text>
                  <Text style={styles.hostRole}>Event host</Text>
                </View>
              </View>
              {!isHost && (
                <TouchableOpacity style={styles.messageHostBtn}>
                  <Text style={styles.messageHostText}>Message host</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.aboutTitle}>About this event</Text>
            <Text style={styles.aboutDescription}>
              {event.description || 'Join us for an amazing experience! The host will share more details soon.'}
            </Text>
            {event.description && event.description.length > 200 && (
              <TouchableOpacity style={styles.showMoreButton}>
                <Text style={styles.showMoreText}>Show more</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Essential Info - Airbnb Style */}
          <View style={styles.essentialInfoSection}>
            <View style={styles.essentialInfoGrid}>
              {/* Date */}
              <View style={styles.essentialInfoItem}>
                <Ionicons name="calendar-outline" size={20} color="#000" />
                <View style={styles.essentialInfoContent}>
                  <Text style={styles.essentialInfoTitle}>
                    {formatDate(event.start_time).split(',')[0]}
                    {event.end_time && new Date(event.end_time).toDateString() !== new Date(event.start_time).toDateString() && 
                      ` - ${formatDate(event.end_time).split(',')[0]}`}
                  </Text>
                  <Text style={styles.essentialInfoSubtitle}>
                    {formatTime(event.start_time)}{event.end_time && ` - ${formatTime(event.end_time)}`}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.essentialInfoItem}>
                <Ionicons name="location-outline" size={20} color="#000" />
                <View style={styles.essentialInfoContent}>
                  <Text style={styles.essentialInfoTitle} numberOfLines={1}>
                    {event.venue_name || event.location_details?.name || 'Location TBD'}
                  </Text>
                  {event.address && (
                    <Text style={styles.essentialInfoSubtitle} numberOfLines={1}>
                      {event.address}
                    </Text>
                  )}
                </View>
              </View>

              {/* Attendees */}
              {event.has_capacity_enabled && (
                <View style={styles.essentialInfoItem}>
                  <Ionicons name="people-outline" size={20} color="#000" />
                  <View style={styles.essentialInfoContent}>
                    <Text style={styles.essentialInfoTitle}>
                      {event.current_attendees || 0} going
                    </Text>
                    <Text style={styles.essentialInfoSubtitle}>
                      {event.max_attendees === 0 ? 'No limit' : 
                       `${event.max_attendees - (event.current_attendees || 0)} spots left`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Type */}
              <View style={styles.essentialInfoItem}>
                <Ionicons name="pricetag-outline" size={20} color="#000" />
                <View style={styles.essentialInfoContent}>
                  <Text style={styles.essentialInfoTitle}>
                    {getCategoryDisplayName(event.category || event.event_category || 'social')}
                  </Text>
                  <Text style={styles.essentialInfoSubtitle}>
                    {event.is_private ? 'Private event' : 'Public event'}
                  </Text>
                </View>
              </View>
            </View>
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

          {/* Location Section - Airbnb Style */}
          {event.coordinates && (
            <View style={styles.locationSection}>
              <Text style={styles.sectionTitle}>Where you'll be</Text>
              <View style={styles.locationContent}>
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
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>
                    {event.venue_name || event.location_details?.name || 'Event Location'}
                  </Text>
                  {event.address && (
                    <Text style={styles.locationAddress}>
                      {event.address}
                    </Text>
                  )}
                  <TouchableOpacity style={styles.getDirectionsButton} onPress={() => {
                    const coords = event.coordinates;
                    const lat = coords.lat || coords.latitude;
                    const lng = coords.lng || coords.longitude;
                    const url = Platform.OS === 'ios' 
                      ? `maps:0,0?q=${lat},${lng}`
                      : `geo:0,0?q=${lat},${lng}`;
                    Linking.openURL(url);
                  }}>
                    <Text style={styles.getDirectionsText}>Get directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Attendees Section - Airbnb Style */}
          <View style={styles.attendeesSection}>
            <Text style={styles.sectionTitle}>Who's coming</Text>
            <View style={styles.attendeesInfo}>
              <View style={styles.attendeesHeader}>
                <Text style={styles.attendeesMainText}>
                  {event.current_attendees || 12} guests
                </Text>
                {event.has_capacity_enabled && event.max_attendees > 0 && (
                  <Text style={styles.attendeesSubText}>
                    {event.max_attendees - (event.current_attendees || 0)} spots available
                  </Text>
                )}
              </View>
              
              <View style={styles.attendeesPreview}>
                <View style={styles.attendeesList}>
                  {[1, 2, 3, 4].map((_, index) => (
                    <Image 
                      key={index}
                      source={{ uri: `https://i.pravatar.cc/100?img=${index + 10}` }} 
                      style={[
                        styles.attendeeAvatar,
                        index > 0 && { marginLeft: -12 }
                      ]}
                    />
                  ))}
                  {(event.current_attendees || 12) > 4 && (
                    <View style={[styles.attendeeAvatar, styles.moreAttendees, { marginLeft: -12 }]}>
                      <Text style={styles.moreAttendeesText}>+{(event.current_attendees || 12) - 4}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.viewGuestsButton}>
                  <Text style={styles.viewGuestsText}>Show all</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Things to Know - Airbnb Style */}
          {(event.has_dress_code_enabled || event.has_theme_enabled || event.has_age_restriction_enabled || 
            event.extra_data?.allow_plus_ones) && (
            <View style={styles.thingsToKnowSection}>
              <Text style={styles.sectionTitle}>Things to know</Text>
              
              <View style={styles.thingsToKnowGrid}>
                {/* Dress Code */}
                {event.has_dress_code_enabled && event.extra_data?.dress_code && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="shirt-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>Dress code</Text>
                      <Text style={styles.thingToKnowValue}>{event.extra_data.dress_code}</Text>
                    </View>
                  </View>
                )}
                
                {/* Theme */}
                {event.has_theme_enabled && event.extra_data?.event_theme && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="color-palette-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>Event theme</Text>
                      <Text style={styles.thingToKnowValue}>{event.extra_data.event_theme}</Text>
                    </View>
                  </View>
                )}
                
                {/* Age Restriction */}
                {event.has_age_restriction_enabled && event.extra_data?.age_restriction && (
                  <View style={styles.thingToKnowItem}>
                    <MaterialCommunityIcons name="account-check-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>Age requirement</Text>
                      <Text style={styles.thingToKnowValue}>{event.extra_data.age_restriction}</Text>
                    </View>
                  </View>
                )}

                {/* Plus Ones */}
                {event.extra_data?.allow_plus_ones && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="person-add-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>Guests allowed</Text>
                      <Text style={styles.thingToKnowValue}>
                        {event.extra_data.max_plus_ones ? `Bring up to ${event.extra_data.max_plus_ones} guest${event.extra_data.max_plus_ones > 1 ? 's' : ''}` : 'Plus ones welcome'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Price Details - Airbnb Style */}
          {event.has_costs_enabled && costs.length > 0 && (
            <View style={styles.priceSection}>
              <Text style={styles.sectionTitle}>Price details</Text>
              <View style={styles.priceCard}>
                {costs.map((cost: any, index: number) => (
                  <View key={cost.id || index} style={styles.priceRow}>
                    <Text style={styles.priceLabel}>{cost.description}</Text>
                    <Text style={styles.priceValue}>${cost.amount}</Text>
                  </View>
                ))}
                <View style={styles.priceDivider} />
                <View style={styles.priceRow}>
                  <Text style={styles.priceTotalLabel}>Total</Text>
                  <Text style={styles.priceTotalValue}>
                    ${costs.reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Items to Bring - Professional Style */}
          {event.has_items_enabled && items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>What to bring</Text>
              <View style={styles.itemsContainer}>
                {items.map((item: any, index: number) => (
                  <View key={item.id || index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemMainInfo}>
                        <Text style={styles.itemName}>
                          {item.name || item.item_name}
                        </Text>
                        {item.quantity > 1 && (
                          <Text style={styles.itemQuantity}>Quantity needed: {item.quantity}</Text>
                        )}
                      </View>
                      {item.assignedTo ? (
                        <View style={styles.itemAssignedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                          <Text style={styles.itemAssignedText}>Taken</Text>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.itemClaimButton}
                          onPress={() => handleClaimItem(item.id || index)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.itemClaimText}>I'll bring this</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {item.assignedTo && (
                      <Text style={styles.itemBroughtBy}>
                        {item.assignedTo === profile?.id ? 'You' : 'A guest'} will bring this
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Guest Questionnaire - Interactive */}
          {event.has_questionnaire_enabled && questionnaire.length > 0 && (
            <View style={styles.questionnaireSection}>
              <Text style={styles.sectionTitle}>Questions from the host</Text>
              
              {/* For Hosts - Show Responses */}
              {isHost ? (
                <View style={styles.responsesContainer}>
                  <Text style={styles.responsesIntro}>Guest responses:</Text>
                  {questionnaire.map((question: any, index: number) => (
                    <View key={question.id || index} style={styles.responseCard}>
                      <Text style={styles.responseQuestion}>
                        {question.question || question.question_text || question.text}
                      </Text>
                      <View style={styles.responsesGrid}>
                        {/* Mock responses - in real app, fetch from database */}
                        {[1, 2, 3].map((guestId) => (
                          <View key={guestId} style={styles.guestResponse}>
                            <View style={styles.guestResponseHeader}>
                              <Image 
                                source={{ uri: `https://i.pravatar.cc/100?img=${guestId}` }} 
                                style={styles.guestResponseAvatar}
                              />
                              <Text style={styles.guestResponseName}>Guest {guestId}</Text>
                            </View>
                            <Text style={styles.guestResponseText}>
                              {/* Example response */}
                              Lorem ipsum response to the question
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                /* For Guests - Answer Form */
                <View style={styles.questionsForm}>
                  {questionnaire.map((question: any, index: number) => (
                    <View key={question.id || index} style={styles.questionFormItem}>
                      <Text style={styles.questionLabel}>
                        {question.question || question.question_text || question.text}
                        {question.is_required && <Text style={styles.requiredStar}> *</Text>}
                      </Text>
                      <TextInput
                        style={styles.questionInput}
                        placeholder="Type your answer here..."
                        placeholderTextColor="#8E8E93"
                        multiline
                        numberOfLines={3}
                        value={questionResponses[question.id] || ''}
                        onChangeText={(text) => handleQuestionResponse(question.id, text)}
                      />
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={styles.submitResponsesButton}
                    onPress={handleSubmitResponses}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitResponsesText}>Submit Responses</Text>
                  </TouchableOpacity>
                  {questionnaire.some((q: any) => q.is_required) && (
                    <Text style={styles.questionsNote}>* Required questions</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Additional Info - Airbnb Style */}
          {(event.has_parking_info_enabled || event.has_accessibility_enabled || 
            event.has_contact_enabled || event.has_website_enabled) && (
            <View style={styles.additionalInfoSection}>
              <Text style={styles.sectionTitle}>Good to know</Text>
              
              <View style={styles.additionalInfoGrid}>
                {/* Parking */}
                {event.has_parking_info_enabled && event.extra_data?.parking_info && (
                  <View style={styles.additionalInfoItem}>
                    <Ionicons name="car-outline" size={20} color="#000" />
                    <View style={styles.additionalInfoContent}>
                      <Text style={styles.additionalInfoTitle}>Parking</Text>
                      <Text style={styles.additionalInfoValue}>{event.extra_data.parking_info}</Text>
                    </View>
                  </View>
                )}
                
                {/* Accessibility */}
                {event.has_accessibility_enabled && event.extra_data?.accessibility_info && (
                  <View style={styles.additionalInfoItem}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={20} color="#000" />
                    <View style={styles.additionalInfoContent}>
                      <Text style={styles.additionalInfoTitle}>Accessibility</Text>
                      <Text style={styles.additionalInfoValue}>{event.extra_data.accessibility_info}</Text>
                    </View>
                  </View>
                )}
                
                {/* Contact */}
                {event.has_contact_enabled && event.extra_data?.contact_info && (
                  <TouchableOpacity 
                    style={styles.additionalInfoItem} 
                    activeOpacity={0.7}
                    onPress={handleCallContact}
                  >
                    <Ionicons name="call-outline" size={20} color="#000" />
                    <View style={styles.additionalInfoContent}>
                      <Text style={styles.additionalInfoTitle}>Contact</Text>
                      <Text style={[styles.additionalInfoValue, styles.linkTextBlue]}>
                        {event.extra_data.contact_info}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                
                {/* Website */}
                {event.has_website_enabled && event.extra_data?.event_website && (
                  <TouchableOpacity 
                    style={styles.additionalInfoItem} 
                    activeOpacity={0.7}
                    onPress={handleOpenWebsite}
                  >
                    <Ionicons name="globe-outline" size={20} color="#000" />
                    <View style={styles.additionalInfoContent}>
                      <Text style={styles.additionalInfoTitle}>Website</Text>
                      <Text style={[styles.additionalInfoValue, styles.linkTextBlue]} numberOfLines={1}>
                        {event.extra_data.event_website}
                      </Text>
                    </View>
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
                    <MaterialCommunityIcons name="spotify" size={24} color="#1DB954" />
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
  
  // Location Section - Airbnb Style
  locationSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  locationContent: {
    gap: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  locationInfo: {
    gap: 8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
  },
  locationAddress: {
    fontSize: 14,
    color: '#717171',
  },
  getDirectionsButton: {
    marginTop: 8,
  },
  getDirectionsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    textDecorationLine: 'underline',
  },

  // Attendees Section - Airbnb Style
  attendeesSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  attendeesInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  attendeesHeader: {
    marginBottom: 20,
  },
  attendeesMainText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  attendeesSubText: {
    fontSize: 14,
    color: '#717171',
  },
  attendeesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendeesList: {
    flexDirection: 'row',
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  viewGuestsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  viewGuestsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  moreAttendees: {
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAttendeesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222222',
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
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  itemsCount: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#717171',
  },
  itemAssignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  itemAssignedText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  itemClaimButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  itemClaimText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemBroughtBy: {
    fontSize: 14,
    color: '#717171',
    marginTop: 12,
  },

  // Questionnaire Section
  questionnaireSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },

  // Additional Info Section - Airbnb Style
  additionalInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  additionalInfoGrid: {
    gap: 24,
  },
  additionalInfoItem: {
    flexDirection: 'row',
    gap: 16,
  },
  additionalInfoContent: {
    flex: 1,
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#222222',
    marginBottom: 4,
  },
  additionalInfoValue: {
    fontSize: 14,
    color: '#717171',
  },
  linkTextBlue: {
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
  itemsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
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
  
  // Simpler questionnaire styles
  questionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  questionsIntro: {
    fontSize: 16,
    color: '#222222',
    marginBottom: 20,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingLeft: 8,
  },
  questionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#717171',
    marginTop: 8,
    marginRight: 12,
  },
  requiredStar: {
    color: '#FF3B30',
    fontWeight: '600',
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
  
  // Airbnb/Hinge style updates
  hostActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  shareButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Essential Info - Airbnb Style
  essentialInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  essentialInfoGrid: {
    gap: 20,
  },
  essentialInfoItem: {
    flexDirection: 'row',
    gap: 16,
  },
  essentialInfoContent: {
    flex: 1,
  },
  essentialInfoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 2,
  },
  essentialInfoSubtitle: {
    fontSize: 14,
    color: '#717171',
  },
  
  // Host & About Section - Airbnb Style
  hostAboutSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  hostCard: {
    marginBottom: 24,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  hostRole: {
    fontSize: 14,
    color: '#717171',
  },
  messageHostBtn: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222222',
  },
  messageHostText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#DDDDDD',
    marginVertical: 24,
  },
  aboutTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 16,
  },
  aboutDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#222222',
  },
  showMoreButton: {
    marginTop: 12,
  },
  showMoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    textDecorationLine: 'underline',
  },
  
  // Things to Know - Airbnb Style
  thingsToKnowSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  thingsToKnowGrid: {
    gap: 24,
  },
  thingToKnowItem: {
    flexDirection: 'row',
    gap: 16,
  },
  thingToKnowContent: {
    flex: 1,
  },
  thingToKnowTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#222222',
    marginBottom: 4,
  },
  thingToKnowValue: {
    fontSize: 14,
    color: '#717171',
  },
  
  // Price Section - Airbnb Style
  priceSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 16,
    color: '#222222',
  },
  priceValue: {
    fontSize: 16,
    color: '#222222',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#DDDDDD',
    marginVertical: 16,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  priceTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  itemAssignee: {
    fontSize: 14,
    color: '#717171',
    marginTop: 2,
  },
  
  // Questions Section - Airbnb Style
  // Questionnaire styles for hosts
  responsesContainer: {
    gap: 20,
  },
  responsesIntro: {
    fontSize: 16,
    color: '#222222',
    marginBottom: 16,
  },
  responseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  responseQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 16,
  },
  responsesGrid: {
    gap: 12,
  },
  guestResponse: {
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    padding: 12,
  },
  guestResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guestResponseAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  guestResponseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  guestResponseText: {
    fontSize: 14,
    color: '#717171',
    lineHeight: 20,
  },
  
  // Questionnaire styles for guests
  questionsForm: {
    gap: 20,
  },
  questionFormItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#222222',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitResponsesButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitResponsesText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  questionsFooterText: {
    fontSize: 14,
    color: '#717171',
    marginTop: 16,
    fontStyle: 'italic',
  },
});