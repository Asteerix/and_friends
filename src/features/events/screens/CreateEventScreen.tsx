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
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useProfile } from '@/hooks/useProfile';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useEventCover } from '../context/EventCoverContext';

// Import all modals
import CostPerPersonModal from '../components/CostPerPersonModal';
import PhotoAlbumModal from '../components/PhotoAlbumModal';
import ItemsToBringModal from '../components/ItemsToBringModal';
import RSVPDeadlineModal from '../components/RSVPDeadlineModal';
import GuestQuestionnaireModal from '../components/GuestQuestionnaireModal';
import PlaylistModal from '../components/PlaylistModal';
import ManageCoHostsModal from '../components/ManageCoHostsModal';
import EventDatePickerModal from '../components/EventDatePickerModal';

// Default event cover image
const DEFAULT_EVENT_COVER = require('../../../assets/default_avatar.png');

// Import fonts and backgrounds data
import { FONTS as IMPORTED_FONTS, BACKGROUNDS as IMPORTED_BACKGROUNDS } from '../data/eventTemplates';

// Map fonts with their styles
const FONTS = IMPORTED_FONTS.map(font => ({
  ...font,
  style: {
    fontFamily: font.value,
    fontWeight: font.name === 'AFTERPARTY' ? 'bold' as const : font.name === 'Bold Impact' ? '900' as const : font.name === 'Modern' ? '300' as const : font.name === 'Elegant' ? '500' as const : 'normal' as const,
    fontStyle: font.name === 'Classic Invite' || font.name === 'Fun Script' ? 'italic' as const : 'normal' as const
  }
}));

const BACKGROUNDS = IMPORTED_BACKGROUNDS.map(bg => ({
  ...bg,
  colors: bg.colors as [string, string]
}));

export default function CreateEventScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { coverData, loadCoverData } = useEventCover();
  
  // State for event details
  const [coverUri] = useState('');
  // Initialize event date to next Saturday at 8 PM
  const getDefaultEventDate = () => {
    const now = new Date();
    const nextSaturday = new Date(now);
    
    // Calculate days until next Saturday (6 = Saturday)
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    
    // Set time to 8 PM
    nextSaturday.setHours(20, 0, 0, 0);
    
    // Ensure it's at least 24 hours from now
    const minimumDate = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    if (nextSaturday < minimumDate) {
      // If next Saturday is too soon, go to the Saturday after
      nextSaturday.setDate(nextSaturday.getDate() + 7);
    }
    
    return nextSaturday;
  };
  
  const [eventDate, setEventDate] = useState(getDefaultEventDate());
  const [eventTime, setEventTime] = useState(getDefaultEventDate());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [coHosts, setCoHosts] = useState<Array<{id: string, name: string, avatar: string}>>([]);
  const [costs, setCosts] = useState<Array<{id: string, amount: string, currency: string, description: string}>>([]);
  const [eventPhotos, setEventPhotos] = useState<string[]>([]);
  const [rsvpDeadline, setRsvpDeadline] = useState<Date | null>(null);
  const [rsvpReminderEnabled, setRsvpReminderEnabled] = useState(false);
  const [rsvpReminderTiming, setRsvpReminderTiming] = useState('24h');
  const [questionnaire, setQuestionnaire] = useState<Array<{id: string, text: string, type: string}>>([]);
  
  // Load saved cover data when component mounts
  useEffect(() => {
    loadCoverData();
  }, []);
  
  // Modal states
  const [showCostModal, setShowCostModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showCoHostsModal, setShowCoHostsModal] = useState(false);

  const handleEditCover = () => {
    router.push('/screens/edit-event-cover');
  };

  const handleAddCoHosts = () => {
    setShowCoHostsModal(true);
  };

  const handleCostPerPerson = () => {
    setShowCostModal(true);
  };

  const handlePhotoAlbum = () => {
    setShowPhotoModal(true);
  };
  
  const handleItemsToBring = () => {
    setShowItemsModal(true);
  };
  
  const handleRSVPDeadline = () => {
    setShowRSVPModal(true);
  };
  
  const handleQuestionnaire = () => {
    setShowQuestionnaireModal(true);
  };
  
  const handlePlaylist = () => {
    setShowPlaylistModal(true);
  };

  const handleSaveAsDraft = async () => {
    Alert.alert('Save as Draft', 'Event saved as draft');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handlePublish = async () => {
    setIsLoading(true);
    
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Event published successfully');
      router.back();
    } catch (error) {
      console.error('Error publishing event:', error);
      Alert.alert('Error', 'Failed to publish event');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} showsVerticalScrollIndicator={false}>
        {/* HEADER bloc with image and overlays */}
        <View style={styles.headerContainer}>
          {/* Background image or gradient */}
          {coverData.selectedBackground && !coverData.coverImage && !coverData.selectedTemplate ? (
            <LinearGradient 
              colors={BACKGROUNDS.find(bg => bg.id === coverData.selectedBackground)?.colors || ['#C8E6C9', '#C8E6C9']} 
              style={styles.headerGradient} 
            />
          ) : coverData.selectedTemplate ? (
            <Image
              source={coverData.selectedTemplate.image}
              style={styles.headerImage}
            />
          ) : (
            <Image
              source={coverData.coverImage ? { uri: coverData.coverImage } : DEFAULT_EVENT_COVER}
              style={styles.headerImage}
            />
          )}
          
          {/* Overlay for readability */}
          <View style={styles.headerOverlay} pointerEvents="none" />
          
          {/* Placed Stickers */}
          <View style={styles.stickersLayer} pointerEvents="none">
            {coverData.placedStickers.map((sticker) => (
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
            
            <Text style={styles.headerTitle}>Create Event</Text>
            
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
          <View style={styles.eventTitleOverlay}>
            <Text style={[
              styles.eventTitleMainText, 
              coverData.eventTitle ? FONTS.find(f => f.id === coverData.selectedTitleFont)?.style : {}
            ]}>
              {coverData.eventTitle ? coverData.eventTitle : (
                <>Tap to add your{'\n'}event title</>
              )}
            </Text>
            <Text style={[
              styles.eventSubtitle,
              coverData.eventSubtitle ? FONTS.find(f => f.id === coverData.selectedSubtitleFont)?.style : {}
            ]}>
              {coverData.eventSubtitle || "Drop a punchline to get the crew\nhyped for what's coming."}
            </Text>
          </View>
          
          {/* Edit Cover button */}
          <View style={styles.editCoverContainer}>
            <TouchableOpacity 
              style={styles.editCoverBtn} 
              onPress={handleEditCover}
              accessibilityRole="button"
              accessibilityLabel="Edit Cover"
            >
              <Ionicons name="pencil-outline" size={16} color="#000" />
              <Text style={styles.editCoverBtnText}>Edit Cover</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form section */}
        <View style={styles.formSheet}>
          {/* Hosted By Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Hosted By</Text>
            </View>
            
            <View style={styles.hostedByContent}>
              <View style={styles.hostAvatarsContainer}>
                <Image
                  source={
                    profile?.avatar_url 
                      ? { uri: profile.avatar_url }
                      : DEFAULT_EVENT_COVER
                  }
                  style={[styles.hostAvatar, { zIndex: 2 }]}
                />
                {coHosts.length === 1 && coHosts[0] && (
                  <Image
                    key={coHosts[0].id}
                    source={{ uri: coHosts[0].avatar }}
                    style={[
                      styles.hostAvatar, 
                      styles.overlappingAvatar,
                      { 
                        left: 24,
                        zIndex: 1
                      }
                    ]}
                  />
                )}
                {coHosts.length > 1 && (
                  <View style={[
                    styles.hostAvatar,
                    styles.overlappingAvatar,
                    styles.moreHostsIndicator,
                    { left: 24, zIndex: 1 }
                  ]}>
                    <Text style={styles.moreHostsText}>+{coHosts.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hostName}>
                {profile?.full_name || 'Simira'}
                {coHosts.length === 1 && coHosts[0] && ` and ${coHosts[0].name}`}
                {coHosts.length > 1 && ` and ${coHosts.length} others`}
              </Text>
              <TouchableOpacity onPress={handleAddCoHosts} style={styles.addCoHostsBtn}>
                <Ionicons name="people-outline" size={16} color="#007AFF" />
                <Text style={styles.addCoHostsText}>Add Co-Hosts</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* When & Where Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>When & Where</Text>
            </View>
            
            <TouchableOpacity
              style={styles.datePickerField}
              onPress={() => setShowDatePickerModal(true)}
            >
              <Text style={styles.datePickerText}>
                {eventDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })} at {eventTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
            <View style={styles.locationField}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.locationInput}
                placeholder="Search location"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>
          
          {/* Description Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pencil-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            
            <TextInput
              style={styles.descriptionField}
              value={description}
              onChangeText={setDescription}
              placeholder="Add an event description — what to bring, logistics, etc."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* Add Extras Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Add Extras</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extrasScroll}>
              <View style={styles.extrasRow}>
                <TouchableOpacity style={[styles.extraPill, costs.length > 0 && styles.extraPillConfigured]} onPress={handleCostPerPerson}>
                  <Ionicons name="ticket-outline" size={16} color={costs.length > 0 ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, costs.length > 0 && styles.extraPillTextConfigured]}>
                    {costs.length > 0 ? `${costs.length} cost${costs.length > 1 ? 's' : ''} added` : 'Cost per person'}
                  </Text>
                  {costs.length > 0 ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setCosts([]);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, eventPhotos.length > 0 && styles.extraPillConfigured]} onPress={handlePhotoAlbum}>
                  <Ionicons name="images-outline" size={16} color={eventPhotos.length > 0 ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, eventPhotos.length > 0 && styles.extraPillTextConfigured]}>
                    {eventPhotos.length > 0 ? `${eventPhotos.length} photo${eventPhotos.length > 1 ? 's' : ''}` : 'Photo Album'}
                  </Text>
                  {eventPhotos.length > 0 ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setEventPhotos([]);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.extraPill} onPress={handleItemsToBring}>
                  <Ionicons name="gift-outline" size={16} color="#007AFF" />
                  <Text style={styles.extraPillText}>To Bring</Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, rsvpDeadline && styles.extraPillConfigured]} onPress={handleRSVPDeadline}>
                  <Ionicons name="calendar-outline" size={16} color={rsvpDeadline ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, rsvpDeadline && styles.extraPillTextConfigured]}>
                    {rsvpDeadline ? `RSVP by ${rsvpDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'RSVP deadline'}
                  </Text>
                  {rsvpDeadline ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setRsvpDeadline(null);
                      setRsvpReminderEnabled(false);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, questionnaire.length > 0 && styles.extraPillConfigured]} onPress={handleQuestionnaire}>
                  <Ionicons name="clipboard-outline" size={16} color={questionnaire.length > 0 ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, questionnaire.length > 0 && styles.extraPillTextConfigured]}>
                    {questionnaire.length > 0 ? `${questionnaire.length} question${questionnaire.length > 1 ? 's' : ''}` : 'Guest questionnaire'}
                  </Text>
                  {questionnaire.length > 0 ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setQuestionnaire([]);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.extraPill} onPress={handlePlaylist}>
                  <Ionicons name="musical-notes-outline" size={16} color="#007AFF" />
                  <Text style={styles.extraPillText}>Playlist</Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          
          {/* Privacy Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Privacy</Text>
            </View>
            
            <View style={styles.privacyCard}>
              <View style={styles.privacyLeft}>
                <Text style={styles.privacyTitle}>Invite-Only Event</Text>
                <Text style={styles.privacySubtitle}>Only invited guests can view</Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFF"
                ios_backgroundColor="#E5E5EA"
              />
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.draftButton}
              onPress={handleSaveAsDraft}
            >
              <Text style={styles.draftButtonText}>Save as Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.publishButton}
              onPress={handlePublish}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.publishButtonText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Modals */}
      <CostPerPersonModal
        visible={showCostModal}
        onClose={() => setShowCostModal(false)}
        initialCosts={costs}
        onSave={(newCosts) => {
          setCosts(newCosts);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      
      <PhotoAlbumModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        initialPhotos={eventPhotos}
        onSave={(photos) => {
          setEventPhotos(photos);
          setShowPhotoModal(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      
      <ItemsToBringModal
        visible={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        onSave={(items) => {
          console.log('Items saved:', items);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      
      <RSVPDeadlineModal
        visible={showRSVPModal}
        onClose={() => setShowRSVPModal(false)}
        onSave={(deadline, reminderEnabled, reminderTiming) => {
          setRsvpDeadline(deadline);
          setRsvpReminderEnabled(reminderEnabled);
          setRsvpReminderTiming(reminderTiming);
          setShowRSVPModal(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        eventDate={eventDate}
        initialDeadline={rsvpDeadline}
      />
      
      <GuestQuestionnaireModal
        visible={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        onSave={(questions, settings) => {
          setQuestionnaire(questions);
          setShowQuestionnaireModal(false);
          if (questions.length > 0) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }}
      />
      
      <PlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        onSave={(playlist, spotifyLink) => {
          console.log('Playlist saved:', playlist, spotifyLink);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      
      <ManageCoHostsModal
        visible={showCoHostsModal}
        onClose={() => setShowCoHostsModal(false)}
        currentCoHosts={coHosts}
        onSave={(newCoHosts) => {
          setCoHosts(newCoHosts);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      
      <EventDatePickerModal
        visible={showDatePickerModal}
        onClose={() => setShowDatePickerModal(false)}
        onSelect={(date, time) => {
          setEventDate(date);
          setEventTime(time);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        currentDate={eventDate}
        currentTime={eventTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerContainer: {
    height: 700,
    width: '100%',
    position: 'relative',
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
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1,
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
  eventTitleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -50 }],
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  eventTitleMainText: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 44,
    fontFamily: Platform.select({ ios: 'System', android: 'System', default: 'System' }),
  },
  eventSubtitle: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    opacity: 0.85,
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
  formSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 20,
    minHeight: 600,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  hostedByContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    width: 80,
    height: 32,
    position: 'relative',
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFF',
    position: 'absolute',
    left: 0,
  },
  overlappingAvatar: {
    position: 'absolute',
  },
  moreHostsIndicator: {
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreHostsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  hostName: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  addCoHostsBtn: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCoHostsText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  datePickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: '#000',
  },
  locationField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  descriptionField: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    minHeight: 110,
    textAlignVertical: 'top',
  },
  extrasScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 20,
  },
  extraPill: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 140,
  },
  extraPillText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  extraPillConfigured: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  extraPillTextConfigured: {
    color: '#FFF',
  },
  privacyCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyLeft: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
  },
  privacySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 2,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 16,
    alignItems: 'center',
  },
  draftButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  publishButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  stickersLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  staticSticker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stickerEmoji: {
    fontSize: 40,
  },
});