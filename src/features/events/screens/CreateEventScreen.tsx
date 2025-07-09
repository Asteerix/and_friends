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
import { EventServiceComplete, CreateEventData } from '../services/eventServiceComplete';

// Import all modals
import CostPerPersonModal from '../components/CostPerPersonModal';
import PhotoAlbumModal from '../components/PhotoAlbumModal';
import ItemsToBringModal from '../components/ItemsToBringModal';
import RSVPDeadlineModal from '../components/RSVPDeadlineModal';
import GuestQuestionnaireModal from '../components/GuestQuestionnaireModal';
import PlaylistModal from '../components/PlaylistModal';
import ManageCoHostsModal from '../components/ManageCoHostsModal';
import EventStartDateModal from '../components/EventStartDateModal';
import EventEndDateModal from '../components/EventEndDateModal';
import EventLocationSearchModal from '../components/EventLocationSearchModal';
import DressCodeModal from '../components/DressCodeModal';
import ThemeSelectionModal from '../components/ThemeSelectionModal';
import AgeRestrictionModal from '../components/AgeRestrictionModal';
import EventCapacityModal from '../components/EventCapacityModal';
import ParkingInfoModal from '../components/ParkingInfoModal';
import AccessibilityModal from '../components/AccessibilityModal';
import EventCategoryModal from '../components/EventCategoryModal';

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
  const { coverData, loadCoverData, resetCoverData } = useEventCover();
  
  // State for event details
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
  const [eventEndDate, setEventEndDate] = useState(new Date(getDefaultEventDate().getTime() + (3 * 60 * 60 * 1000)));
  const [eventEndTime, setEventEndTime] = useState(new Date(getDefaultEventDate().getTime() + (3 * 60 * 60 * 1000)));
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [showEndDateModal, setShowEndDateModal] = useState(false);
  const [location, setLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState<{
    name: string;
    address: string;
    city: string;
    postalCode?: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
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
  const [itemsToBring, setItemsToBring] = useState<Array<{id: string, name: string, quantity: number, assignedTo?: string}>>([]);
  const [playlist, setPlaylist] = useState<Array<{id: string, title: string, artist: string, spotifyUrl?: string, appleUrl?: string, youtubeUrl?: string}>>([]);
  const [playlistSettings, setPlaylistSettings] = useState<{spotifyLink?: string, appleMusicLink?: string, acceptSuggestions: boolean}>({ acceptSuggestions: true });
  const [dressCode, setDressCode] = useState<string | null>(null);
  const [ageRestriction, setAgeRestriction] = useState<string>('');
  const [capacityLimit, setCapacityLimit] = useState<string>('');
  const [parkingInfo, setParkingInfo] = useState<string>('');
  const [eventCategory, setEventCategory] = useState<string>('');
  const [accessibilityInfo, setAccessibilityInfo] = useState<string>('');
  const [eventWebsite, setEventWebsite] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [eventTheme, setEventTheme] = useState<string | null>(null);
  
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
  const [showDressCodeModal, setShowDressCodeModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [showParkingModal, setShowParkingModal] = useState(false);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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
  
  const handleDressCode = () => {
    setShowDressCodeModal(true);
  };
  
  const handleTheme = () => {
    setShowThemeModal(true);
  };
  
  const handleAgeRestriction = () => {
    setShowAgeRestrictionModal(true);
  };
  
  const handleCapacity = () => {
    setShowCapacityModal(true);
  };
  
  const handleParking = () => {
    setShowParkingModal(true);
  };
  
  const handleAccessibility = () => {
    setShowAccessibilityModal(true);
  };

  const handleSaveAsDraft = async () => {
    console.log('💾 [CreateEventScreen] Sauvegarde en brouillon...');
    Alert.alert('Save as Draft', 'Cette fonctionnalité sera bientôt disponible');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePublish = async () => {
    console.log('🚀 [CreateEventScreen] ========================================');
    console.log('🚀 [CreateEventScreen] DÉBUT DE LA PUBLICATION DE L\'ÉVÉNEMENT');
    console.log('🚀 [CreateEventScreen] ========================================');
    console.log('');
    
    // Validation des champs obligatoires
    if (!coverData.eventTitle) {
      console.warn('⚠️ [CreateEventScreen] Pas de titre personnalisé, utilisation du titre par défaut');
    }
    
    console.log('📋 [CreateEventScreen] DONNÉES COLLECTÉES:');
    console.log('  🎨 Cover Data:', {
      hasTitle: !!coverData.eventTitle,
      hasSubtitle: !!coverData.eventSubtitle,
      hasBackground: !!coverData.selectedBackground,
      hasImage: !!coverData.coverImage,
      stickersCount: coverData.placedStickers?.length || 0
    });
    console.log('  📅 Date/Heure:', eventDate.toLocaleString());
    console.log('  📍 Localisation:', location || 'Non spécifiée');
    console.log('  🔒 Privé:', isPrivate);
    console.log('  👥 Co-hosts:', coHosts.length);
    console.log('  💰 Coûts:', costs.length);
    console.log('  📸 Photos:', eventPhotos.length);
    console.log('  ⏰ RSVP Deadline:', rsvpDeadline ? rsvpDeadline.toLocaleString() : 'Non défini');
    console.log('  📋 Questionnaire:', questionnaire.length, 'questions');
    console.log('  🎁 Items à apporter:', itemsToBring.length, 'items');
    console.log('  🎵 Playlist:', playlist.length, 'chansons', playlistSettings.spotifyLink ? '(avec lien Spotify)' : '');
    console.log('');
    
    setIsLoading(true);
    
    try {
      console.log('📋 [CreateEventScreen] Préparation des données de l\'événement...');
      
      // Préparer les données pour la création
      const eventData: CreateEventData = {
        title: coverData.eventTitle || 'Nouvel événement',
        subtitle: coverData.eventSubtitle,
        description: description,
        date: eventDate,
        endDate: eventEndDate,
        endTime: eventEndTime,
        location: location,
        locationDetails: locationDetails || undefined,
        isPrivate: isPrivate,
        coverData: coverData,
        coHosts: coHosts,
        costs: costs,
        eventPhotos: eventPhotos,
        rsvpDeadline: rsvpDeadline,
        rsvpReminderEnabled: rsvpReminderEnabled,
        rsvpReminderTiming: rsvpReminderTiming,
        questionnaire: questionnaire,
        itemsToBring: itemsToBring,
        playlist: playlist,
        spotifyLink: playlistSettings.spotifyLink,
        dressCode: dressCode,
        eventTheme: eventTheme,
        ageRestriction: ageRestriction,
        capacityLimit: capacityLimit ? parseInt(capacityLimit) : undefined,
        parkingInfo: parkingInfo,
        eventCategory: eventCategory,
        accessibilityInfo: accessibilityInfo,
        eventWebsite: eventWebsite,
        contactInfo: contactInfo
      };
      
      console.log('📤 [CreateEventScreen] Envoi des données à EventService:', {
        title: eventData.title,
        date: eventData.date,
        location: eventData.location,
        hasExtras: {
          coHosts: coHosts.length,
          costs: costs.length,
          photos: eventPhotos.length,
          questionnaire: questionnaire.length,
          itemsToBring: itemsToBring.length,
          playlist: playlist.length
        }
      });
      
      // Utiliser le service complet avec gestion de TOUS les extras
      console.log('🔄 [CreateEventScreen] Utilisation de EventServiceComplete pour une création COMPLÈTE avec TOUS les extras');
      const result = await EventServiceComplete.createEvent(eventData);
      
      if (result.success) {
        console.log('✅ [CreateEventScreen] Événement créé avec succès:', result.event.id);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Réinitialiser les données de couverture
        resetCoverData();
        
        Alert.alert(
          'Succès! 🎉', 
          'Votre événement a été créé avec succès!',
          [
            {
              text: 'Voir l\'événement',
              onPress: () => {
                console.log('👁️ [CreateEventScreen] Navigation vers l\'événement:', result.event.id);
                // Navigation vers l'événement créé
                router.replace(`/event/${result.event.id}`);
              }
            },
            {
              text: 'Retour',
              onPress: () => {
                router.back();
              },
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('💥 [CreateEventScreen] Erreur lors de la publication:', error);
      
      let errorMessage = 'Une erreur est survenue lors de la création de l\'événement';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erreur', errorMessage);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      console.log('🏁 [CreateEventScreen] Fin du processus de publication');
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
                onPress={() => router.push('/debug-events')}
                accessibilityRole="button"
                accessibilityLabel="Debug"
                style={{ paddingHorizontal: 4 }}
              >
                <Ionicons name="bug-outline" size={24} color="#FFF" />
              </TouchableOpacity>
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
          {/* Description Section - Right after cover */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>About This Event</Text>
            </View>
            
            <TextInput
              style={styles.descriptionField}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell guests what to expect, what to bring, special instructions..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* When Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>When</Text>
            </View>
            
            <TouchableOpacity
              style={styles.datePickerField}
              onPress={() => setShowStartDateModal(true)}
            >
              <View style={styles.datePickerContent}>
                <View>
                  <Text style={styles.datePickerLabel}>Starts</Text>
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
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.datePickerField}
              onPress={() => setShowEndDateModal(true)}
            >
              <View style={styles.datePickerContent}>
                <View>
                  <Text style={styles.datePickerLabel}>Ends</Text>
                  <Text style={styles.datePickerText}>
                    {eventEndDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })} at {eventEndTime.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
          </View>
          
          {/* Where Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Where</Text>
            </View>
            
            <TouchableOpacity
              style={styles.locationField}
              onPress={() => setShowLocationModal(true)}
            >
              <Ionicons name="search" size={20} color="#999" />
              <Text style={[styles.locationInput, !location && { color: '#999' }]}>
                {location || "Search for a venue or address"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
          
          {/* Who's Hosting Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Who's Hosting</Text>
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
                <Ionicons name="add-circle-outline" size={16} color="#007AFF" />
                <Text style={styles.addCoHostsText}>Add Co-Hosts</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Event Details Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Event Details</Text>
            </View>
            
            <View style={styles.additionalFieldsContainer}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Category</Text>
                <TouchableOpacity 
                  style={styles.selectField}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Text style={[styles.selectFieldText, !eventCategory && styles.placeholderText]}>
                    {eventCategory || "Social, Party, Wedding, Corporate..."}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Event Features Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="options-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Event Features</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extrasScroll}>
              <View style={styles.extrasRow}>
                {/* Most frequently used extras first - Cost is #1 for nightlife events */}
                <TouchableOpacity style={[styles.extraPill, costs.length > 0 && styles.extraPillConfigured]} onPress={handleCostPerPerson}>
                  <Ionicons name="cash-outline" size={16} color={costs.length > 0 ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, costs.length > 0 && styles.extraPillTextConfigured]}>
                    {costs.length > 0 ? `${costs.length} cost${costs.length > 1 ? 's' : ''} added` : 'Entry & Costs'}
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
                
                <TouchableOpacity style={[styles.extraPill, capacityLimit && styles.extraPillConfigured]} onPress={handleCapacity}>
                  <Ionicons name="people-outline" size={16} color={capacityLimit ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, capacityLimit && styles.extraPillTextConfigured]}>
                    {capacityLimit ? `Max ${capacityLimit} guests` : 'Capacity Limit'}
                  </Text>
                  {capacityLimit ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setCapacityLimit('');
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, ageRestriction && styles.extraPillConfigured]} onPress={handleAgeRestriction}>
                  <Ionicons name="person-circle-outline" size={16} color={ageRestriction ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, ageRestriction && styles.extraPillTextConfigured]}>
                    {ageRestriction || 'Age Restriction'}
                  </Text>
                  {ageRestriction ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setAgeRestriction('');
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, dressCode && styles.extraPillConfigured]} onPress={handleDressCode}>
                  <Ionicons name="shirt-outline" size={16} color={dressCode ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, dressCode && styles.extraPillTextConfigured]}>
                    {dressCode ? `${dressCode}` : 'Dress Code'}
                  </Text>
                  {dressCode ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setDressCode(null);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
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
                
                <TouchableOpacity style={[styles.extraPill, parkingInfo && styles.extraPillConfigured]} onPress={handleParking}>
                  <Ionicons name="car-outline" size={16} color={parkingInfo ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, parkingInfo && styles.extraPillTextConfigured]}>
                    {parkingInfo ? 'Parking Info Set' : 'Parking Info'}
                  </Text>
                  {parkingInfo ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setParkingInfo('');
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
                
                <TouchableOpacity style={[styles.extraPill, itemsToBring.length > 0 && styles.extraPillConfigured]} onPress={handleItemsToBring}>
                  <Ionicons name="gift-outline" size={16} color={itemsToBring.length > 0 ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, itemsToBring.length > 0 && styles.extraPillTextConfigured]}>
                    {itemsToBring.length > 0 ? `${itemsToBring.length} item${itemsToBring.length > 1 ? 's' : ''}` : 'To Bring'}
                  </Text>
                  {itemsToBring.length > 0 ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setItemsToBring([]);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, dressCode && styles.extraPillConfigured]} onPress={handleDressCode}>
                  <Ionicons name="shirt-outline" size={16} color={dressCode ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, dressCode && styles.extraPillTextConfigured]}>
                    {dressCode ? `${dressCode}` : 'Dress Code'}
                  </Text>
                  {dressCode ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setDressCode(null);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, ageRestriction && styles.extraPillConfigured]} onPress={handleAgeRestriction}>
                  <Ionicons name="people-circle-outline" size={16} color={ageRestriction ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, ageRestriction && styles.extraPillTextConfigured]}>
                    {ageRestriction || 'Age Restriction'}
                  </Text>
                  {ageRestriction ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setAgeRestriction('');
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, eventTheme && styles.extraPillConfigured]} onPress={handleTheme}>
                  <Ionicons name="color-palette-outline" size={16} color={eventTheme ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, eventTheme && styles.extraPillTextConfigured]}>
                    {eventTheme ? `Theme: ${eventTheme}` : 'Event Theme'}
                  </Text>
                  {eventTheme ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setEventTheme(null);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.extraPill, accessibilityInfo && styles.extraPillConfigured]} onPress={handleAccessibility}>
                  <Ionicons name="accessibility-outline" size={16} color={accessibilityInfo ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, accessibilityInfo && styles.extraPillTextConfigured]}>
                    {accessibilityInfo ? 'Accessibility Set' : 'Accessibility'}
                  </Text>
                  {accessibilityInfo ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setAccessibilityInfo('');
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
                
                <TouchableOpacity style={[styles.extraPill, playlist.length > 0 && styles.extraPillConfigured]} onPress={handlePlaylist}>
                  <Ionicons name="musical-notes-outline" size={16} color={playlist.length > 0 ? "#FFF" : "#007AFF"} />
                  <Text style={[styles.extraPillText, playlist.length > 0 && styles.extraPillTextConfigured]}>
                    {playlist.length > 0 ? `${playlist.length} song${playlist.length > 1 ? 's' : ''}` : 'Playlist'}
                  </Text>
                  {playlist.length > 0 ? (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation();
                      setPlaylist([]);
                      setPlaylistSettings({ acceptSuggestions: true });
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          
          {/* Contact & Links Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Contact & Links</Text>
            </View>
            
            <View style={styles.additionalFieldsContainer}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Contact Info</Text>
                <TextInput
                  style={styles.textField}
                  value={contactInfo}
                  onChangeText={setContactInfo}
                  placeholder="Email or phone for guest questions"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Event Website</Text>
                <TextInput
                  style={styles.textField}
                  value={eventWebsite}
                  onChangeText={setEventWebsite}
                  placeholder="https://your-event-website.com"
                  placeholderTextColor="#999"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
          
          {/* Privacy Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Privacy Settings</Text>
            </View>
            
            <View style={styles.privacyCard}>
              <View style={styles.privacyLeft}>
                <Text style={styles.privacyTitle}>Private Event</Text>
                <Text style={styles.privacySubtitle}>Only people you invite can see this event</Text>
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
          console.log('📦 [CreateEventScreen] Items to bring sauvegardés:', items.length);
          // Convertir le format de la modal vers le format attendu par le service
          const formattedItems = items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity ? parseInt(item.quantity.toString()) : 1,
            assignedTo: item.assignee || undefined
          }));
          setItemsToBring(formattedItems);
          setShowItemsModal(false);
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
        onSave={(questions) => {
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
        onSave={(songs, spotifyLink) => {
          console.log('🎵 [CreateEventScreen] Playlist sauvegardée:', songs.length, 'chansons');
          // Formater les chansons pour le service
          const formattedPlaylist = songs.map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artist
          }));
          setPlaylist(formattedPlaylist);
          if (spotifyLink) {
            setPlaylistSettings({ ...playlistSettings, spotifyLink });
          }
          setShowPlaylistModal(false);
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
      
      <EventStartDateModal
        visible={showStartDateModal}
        onClose={() => setShowStartDateModal(false)}
        onSelect={(startDate, startTime) => {
          setEventDate(startDate);
          setEventTime(startTime);
          // Update end date/time if it's before the new start time
          const endDateTime = new Date(eventEndTime);
          const startDateTime = new Date(startTime);
          if (endDateTime <= startDateTime) {
            const newEndTime = new Date(startDateTime.getTime() + (3 * 60 * 60 * 1000)); // 3 hours later
            setEventEndDate(newEndTime);
            setEventEndTime(newEndTime);
          }
          setShowStartDateModal(false);
          setShowEndDateModal(true); // Automatically show end date modal
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        currentDate={eventDate}
        currentTime={eventTime}
      />
      
      <EventEndDateModal
        visible={showEndDateModal}
        onClose={() => setShowEndDateModal(false)}
        onSelect={(endDate, endTime) => {
          setEventEndDate(endDate);
          setEventEndTime(endTime);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        startDate={eventDate}
        startTime={eventTime}
        currentEndDate={eventEndDate}
        currentEndTime={eventEndTime}
      />
      
      <EventLocationSearchModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelect={(locationData) => {
          setLocationDetails(locationData);
          // Format the display string
          const displayParts = [locationData.name];
          if (locationData.city) displayParts.push(locationData.city);
          if (locationData.postalCode) displayParts.push(locationData.postalCode);
          setLocation(displayParts.join(', '));
          setShowLocationModal(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        currentLocation={location}
      />
      
      <DressCodeModal
        visible={showDressCodeModal}
        onClose={() => setShowDressCodeModal(false)}
        onSave={(dressCodeValue) => {
          setDressCode(dressCodeValue);
          setShowDressCodeModal(false);
        }}
        initialDressCode={dressCode}
      />
      
      <ThemeSelectionModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        onSave={(themeValue) => {
          setEventTheme(themeValue);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialTheme={eventTheme}
      />
      
      <AgeRestrictionModal
        visible={showAgeRestrictionModal}
        onClose={() => setShowAgeRestrictionModal(false)}
        onSave={(restriction) => {
          if (restriction) {
            const selectedOption = restriction.type;
            setAgeRestriction(selectedOption === 'all_ages' ? 'All Ages' : 
                           selectedOption === 'family_friendly' ? 'Family Friendly' :
                           selectedOption === 'kids_only' ? 'Kids Only' :
                           selectedOption === 'custom' && restriction.minAge ? `${restriction.minAge}+` :
                           selectedOption.includes('+') ? selectedOption : 'All Ages');
          } else {
            setAgeRestriction('');
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialRestriction={ageRestriction ? {
          type: ageRestriction.includes('+') ? ageRestriction : 
                ageRestriction === 'All Ages' ? 'all_ages' :
                ageRestriction === 'Family Friendly' ? 'family_friendly' :
                ageRestriction === 'Kids Only' ? 'kids_only' : 'all_ages',
          minAge: ageRestriction.includes('+') ? parseInt(ageRestriction.replace('+', '')) : undefined
        } : null}
      />
      
      <EventCapacityModal
        visible={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        onSave={(capacity) => {
          if (capacity.maxAttendees) {
            setCapacityLimit(capacity.maxAttendees.toString());
          } else {
            setCapacityLimit('');
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialCapacity={capacityLimit ? { maxAttendees: parseInt(capacityLimit) } : undefined}
      />
      
      <ParkingInfoModal
        visible={showParkingModal}
        onClose={() => setShowParkingModal(false)}
        onSave={(info) => {
          if (info.available && info.instructions) {
            setParkingInfo(info.instructions);
          } else if (!info.available && info.nearbyOptions) {
            setParkingInfo(`No parking - ${info.nearbyOptions}`);
          } else {
            setParkingInfo('');
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialParkingInfo={parkingInfo ? {
          available: !parkingInfo.includes('No parking'),
          instructions: parkingInfo.includes('No parking') ? '' : parkingInfo,
          nearbyOptions: parkingInfo.includes('No parking') ? parkingInfo.replace('No parking - ', '') : ''
        } : { available: true }}
      />
      
      <AccessibilityModal
        visible={showAccessibilityModal}
        onClose={() => setShowAccessibilityModal(false)}
        onSave={(info) => {
          const features = [];
          if (info.wheelchairAccessible) features.push('Wheelchair accessible');
          if (info.elevatorAvailable) features.push('Elevator available');
          if (info.accessibleParking) features.push('Accessible parking');
          if (info.accessibleRestrooms) features.push('Accessible restrooms');
          if (info.signLanguageInterpreter) features.push('Sign language interpreter');
          if (info.brailleAvailable) features.push('Braille materials');
          
          let accessibilityText = features.join(', ');
          if (info.additionalInfo) {
            accessibilityText = accessibilityText ? `${accessibilityText}. ${info.additionalInfo}` : info.additionalInfo;
          }
          
          setAccessibilityInfo(accessibilityText);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialAccessibility={accessibilityInfo ? {
          wheelchairAccessible: accessibilityInfo.includes('Wheelchair accessible'),
          elevatorAvailable: accessibilityInfo.includes('Elevator available'),
          accessibleParking: accessibilityInfo.includes('Accessible parking'),
          accessibleRestrooms: accessibilityInfo.includes('Accessible restrooms'),
          signLanguageInterpreter: accessibilityInfo.includes('Sign language'),
          brailleAvailable: accessibilityInfo.includes('Braille'),
          additionalInfo: accessibilityInfo
        } : undefined}
      />
      
      <EventCategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={(category) => {
          setEventCategory(category);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialCategory={eventCategory}
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
  datePickerContent: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
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
  additionalDetailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailField: {
    flex: 1,
  },
  detailFieldFull: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  detailInputMultiline: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  additionalFieldsContainer: {
    gap: 16,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textField: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  selectField: {
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
  selectFieldText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
});