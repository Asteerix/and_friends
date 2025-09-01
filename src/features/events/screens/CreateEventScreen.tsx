import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useEventCover } from '../context/EventCoverContext';
import { CreateEventData } from '../services/eventServiceComplete';
import { useEvent } from '../context/EventProvider';
import { getCategoryDisplayName } from '../utils/categoryHelpers';

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
import BottomModal from '../components/BottomModal';

// Default event cover image

// Import fonts and backgrounds data
import {
  FONTS as IMPORTED_FONTS,
  BACKGROUNDS as IMPORTED_BACKGROUNDS,
} from '../data/eventTemplates';
import NotificationButton from '@/assets/svg/notification-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import { useProfile } from '@/hooks/useProfile';
import BackButton from '@/assets/svg/back-button.svg';
const DEFAULT_EVENT_COVER = require('@/assets/default_avatar.png');

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

export default function CreateEventScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { profile } = useProfile();
  const { coverData, loadCoverData, resetCoverData, updateCoverData } = useEventCover();
  const {
    createEvent: createEventInProvider,
    updateEvent: updateEventInProvider,
    updateEventExtras,
    subscribeToEventUpdates,
    loadEvent,
    currentEvent,
  } = useEvent();

  // Check if we're in edit mode
  const isEditMode = searchParams.mode === 'edit';
  const eventId = searchParams.id as string | undefined;
  const [loadingEvent, setLoadingEvent] = useState(false);

  // Debounce refs
  const titleDebounceRef = useRef<NodeJS.Timeout>();
  const subtitleDebounceRef = useRef<NodeJS.Timeout>();
  const descriptionDebounceRef = useRef<NodeJS.Timeout>();
  const updateDebounceRef = useRef<NodeJS.Timeout>();

  // Modal states for editing title and subtitle
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempSubtitle, setTempSubtitle] = useState('');

  // Helper function to safely update event in edit mode
  const safeUpdateEvent = async (updates: Partial<CreateEventData>) => {
    if (isEditMode && eventId && updateDebounceRef.current === undefined) {
      updateDebounceRef.current = setTimeout(async () => {
        await updateEventInProvider(eventId, updates);
        updateDebounceRef.current = undefined;
      }, 500);
    }
  };

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
    const minimumDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (nextSaturday < minimumDate) {
      // If next Saturday is too soon, go to the Saturday after
      nextSaturday.setDate(nextSaturday.getDate() + 7);
    }

    return nextSaturday;
  };

  const [eventDate, setEventDate] = useState(getDefaultEventDate());
  const [eventTime, setEventTime] = useState(getDefaultEventDate());
  const [eventEndDate, setEventEndDate] = useState(
    new Date(getDefaultEventDate().getTime() + 3 * 60 * 60 * 1000)
  );
  const [eventEndTime, setEventEndTime] = useState(
    new Date(getDefaultEventDate().getTime() + 3 * 60 * 60 * 1000)
  );
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
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [coHosts, setCoHosts] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [costs, setCosts] = useState<
    Array<{ id: string; amount: string; currency: string; description: string }>
  >([]);
  const [eventPhotos, setEventPhotos] = useState<string[]>([]);
  const [rsvpDeadline, setRsvpDeadline] = useState<Date | null>(null);
  const [rsvpReminderEnabled, setRsvpReminderEnabled] = useState(false);
  const [rsvpReminderTiming, setRsvpReminderTiming] = useState('24h');
  const [questionnaire, setQuestionnaire] = useState<
    Array<{
      id: string;
      text: string;
      type: 'short' | 'multiple' | 'host-answer';
      options?: string[];
      hostAnswer?: string;
      required?: boolean;
    }>
  >([]);
  const [questionnaireSettings, setQuestionnaireSettings] = useState({
    allowSkipAll: true,
    showResponsesLive: true,
  });
  const [itemsToBring, setItemsToBring] = useState<
    Array<{
      id: string;
      name: string;
      quantity: number;
      assignedTo?: string;
      type?: 'required' | 'suggested' | 'open';
    }>
  >([]);
  const [itemsSettings, setItemsSettings] = useState({
    allowGuestSuggestions: true,
    requireSignup: false,
    showQuantities: true,
  });
  const [playlist, setPlaylist] = useState<
    Array<{
      id: string;
      title: string;
      artist: string;
      spotifyUrl?: string;
      appleUrl?: string;
      youtubeUrl?: string;
    }>
  >([]);
  const [playlistSettings, setPlaylistSettings] = useState<{
    spotifyLink?: string;
    appleMusicLink?: string;
    acceptSuggestions: boolean;
  }>({ acceptSuggestions: true });
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
    if (isEditMode && eventId) {
      loadExistingEvent();
    } else {
      loadCoverData();
    }
  }, [isEditMode, eventId]);

  // Debug category changes
  useEffect(() => {
    console.log('🏷️ [CreateEventScreen] eventCategory state changed to:', eventCategory);
  }, [eventCategory]);

  // Load existing event data for editing
  const loadExistingEvent = async () => {
    if (!eventId) return;

    setLoadingEvent(true);
    try {
      // Use provider to load event
      await loadEvent(eventId);
      // Subscribe to real-time updates
      subscribeToEventUpdates(eventId);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event details');
      router.back();
    } finally {
      setLoadingEvent(false);
    }
  };

  // Effect to populate form when event is loaded
  useEffect(() => {
    if (currentEvent && isEditMode) {
      const event = currentEvent;
      console.log('📥 [CreateEventScreen] Événement chargé pour édition:', {
        title: event.title,
        max_attendees: event.max_attendees,
        category: event.category,
        event_category: event.event_category,
      });

      // Update cover data
      if (event.cover_data) {
        updateCoverData(event.cover_data);
      }

      // Update all form fields
      setEventDate(event.start_time ? new Date(event.start_time) : getDefaultEventDate());
      setEventTime(event.start_time ? new Date(event.start_time) : getDefaultEventDate());
      setEventEndDate(
        event.end_time
          ? new Date(event.end_time)
          : new Date(getDefaultEventDate().getTime() + 3 * 60 * 60 * 1000)
      );
      setEventEndTime(
        event.end_time
          ? new Date(event.end_time)
          : new Date(getDefaultEventDate().getTime() + 3 * 60 * 60 * 1000)
      );
      setLocation(event.venue_name || event.address || '');
      setLocationDetails({
        name: event.venue_name || '',
        address: event.address || '',
        city: event.city || '',
        postalCode: event.postal_code,
        country: event.country || '',
        coordinates: event.coordinates,
      });
      setDescription(event.description || '');
      setIsPrivate(event.is_private ?? true);
      // Charger les co-hosts depuis extra_data ou event_cohosts
      if (event.has_cohosts_enabled) {
        const loadedCoHosts = event.extra_data?.co_organizers || event.event_cohosts || [];
        setCoHosts(
          loadedCoHosts.map((ch: any) => ({
            id: ch.user_id || ch.id,
            name: ch.full_name || ch.name || 'Unknown',
            avatar: ch.avatar_url || ch.avatar || '',
          }))
        );
        console.log('👥 [CreateEventScreen] Co-hosts restaurés (activé):', loadedCoHosts.length);
      } else {
        setCoHosts([]);
      }

      // Charger les coûts depuis event_costs
      if (event.has_costs_enabled) {
        setCosts(event.event_costs || []);
        console.log(
          '💰 [CreateEventScreen] Coûts restaurés (activé):',
          event.event_costs?.length || 0
        );
      } else {
        setCosts([]);
      }

      // Charger les photos depuis event_photos
      if (event.has_photos_enabled) {
        // S'assurer de ne charger que les URLs uniques
        const photosFromDb =
          event.event_photos?.map((p: any) => {
            if (typeof p === 'string') return p;
            return p.photo_url || p.url || p;
          }) || [];

        // Éliminer les doublons
        const uniquePhotos = Array.from(new Set(photosFromDb)) as string[];
        setEventPhotos(uniquePhotos);
        console.log('📸 [CreateEventScreen] Photos restaurées (activé):', uniquePhotos.length);
        console.log('📸 [CreateEventScreen] Photos data:', event.event_photos);
      } else {
        setEventPhotos([]);
      }

      setRsvpDeadline(event.rsvp_deadline ? new Date(event.rsvp_deadline) : null);
      setRsvpReminderEnabled(event.rsvp_reminder_enabled || false);
      setRsvpReminderTiming(event.rsvp_reminder_timing || '24h');

      // Charger le questionnaire depuis event_questionnaire
      if (event.has_questionnaire_enabled) {
        const loadedQuestionnaire =
          event.event_questionnaire?.map((q: any) => ({
            id: q.id,
            text: q.question || q.question_text,
            type: q.type || q.question_type || 'short',
            options:
              q.options || q.question_options
                ? JSON.parse(q.options || q.question_options)
                : undefined,
            hostAnswer: q.host_answer || undefined,
            required: q.is_required || false,
          })) || [];
        setQuestionnaire(loadedQuestionnaire);

        // Charger les settings du questionnaire
        const settings = event.extra_data?.questionnaireSettings || {
          allowSkipAll: true,
          showResponsesLive: true,
        };
        setQuestionnaireSettings(settings);

        console.log(
          '❓ [CreateEventScreen] Questions restaurées (activé):',
          loadedQuestionnaire.length
        );
      } else {
        setQuestionnaire([]);
      }

      // Charger les items depuis extra_data en priorité (avec types) ou event_items
      if (event.has_items_enabled) {
        let loadedItems = [];

        // Priorité à extra_data car il contient les types
        if (event.extra_data?.itemsToBring && event.extra_data.itemsToBring.length > 0) {
          loadedItems = event.extra_data.itemsToBring;
          console.log('🎁 [CreateEventScreen] Items from extra_data.itemsToBring:', loadedItems);
        } else if (event.extra_data?.items_to_bring && event.extra_data.items_to_bring.length > 0) {
          loadedItems = event.extra_data.items_to_bring;
          console.log('🎁 [CreateEventScreen] Items from extra_data.items_to_bring:', loadedItems);
        } else if (event.event_items && event.event_items.length > 0) {
          // Fallback sur event_items sans types
          loadedItems = event.event_items.map((item: any) => ({
            id: item.id,
            name: item.name || item.item_name,
            quantity: item.quantity || item.quantity_needed || 1,
            assignedTo: item.assigned_to || null,
            type: 'suggested', // Défaut car pas de type dans la DB
          }));
          console.log('🎁 [CreateEventScreen] Items from event_items (no types):', loadedItems);
        }

        setItemsToBring(loadedItems);
        console.log('🎁 [CreateEventScreen] Items restaurés (activé):', loadedItems.length);

        // Charger aussi les settings
        if (event.extra_data?.itemsSettings) {
          setItemsSettings(event.extra_data.itemsSettings);
          console.log(
            '⚙️ [CreateEventScreen] ItemsSettings restaurés:',
            event.extra_data.itemsSettings
          );
        }
      } else {
        setItemsToBring([]);
      }

      // Charger la playlist depuis event_playlists
      if (event.has_playlist_enabled) {
        const loadedPlaylist =
          event.event_playlists?.map((song: any) => ({
            id: song.id,
            title: song.song_title,
            artist: song.artist,
            spotifyUrl: song.spotify_url || song.spotify_link,
          })) || [];
        setPlaylist(loadedPlaylist);
        console.log('🎵 [CreateEventScreen] Playlist restaurée (activé):', loadedPlaylist.length);
        setPlaylistSettings({
          spotifyLink: event.spotify_link,
          acceptSuggestions: true,
        });
      } else {
        setPlaylist([]);
        setPlaylistSettings({
          spotifyLink: undefined,
          acceptSuggestions: true,
        });
      }
      // Charger depuis extra_data en priorité, puis depuis les colonnes
      // IMPORTANT: Utiliser les flags has_*_enabled pour savoir si un extra a été activé

      // Dress Code
      if (event.has_dress_code_enabled) {
        setDressCode(event.extra_data?.dress_code || event.dress_code || '');
        console.log(
          '👗 [CreateEventScreen] Dress Code restauré (activé):',
          event.extra_data?.dress_code || event.dress_code
        );
      } else {
        setDressCode(null);
      }

      // Age Restriction
      if (event.has_age_restriction_enabled) {
        setAgeRestriction(event.extra_data?.age_restriction || event.age_restriction || '');
        console.log(
          '🔞 [CreateEventScreen] Age Restriction restauré (activé):',
          event.extra_data?.age_restriction || event.age_restriction
        );
      } else {
        setAgeRestriction('');
      }

      // Gérer le cas où capacity_limit est 0 (illimité) ou un nombre
      // IMPORTANT: Utiliser has_capacity_enabled pour savoir si la capacité a été activée
      if (event.has_capacity_enabled) {
        // Chercher dans extra_data en priorité, puis dans max_attendees pour compatibilité
        const capacityValue = event.extra_data?.capacity_limit ?? event.max_attendees;
        setCapacityLimit(
          capacityValue !== null && capacityValue !== undefined ? capacityValue.toString() : ''
        );
        console.log('👥 [CreateEventScreen] Capacité restaurée (activée):', capacityValue);
      } else {
        setCapacityLimit('');
        console.log('👥 [CreateEventScreen] Capacité non activée');
      }

      // Parking Info
      if (event.has_parking_info_enabled) {
        const restoredParkingInfo =
          event.extra_data?.parkingInfo ||
          event.extra_data?.parking_info ||
          event.parking_info ||
          '';
        console.log('🚗 [CreateEventScreen] Parking Info sources:', {
          extraDataParkingInfo: event.extra_data?.parkingInfo,
          extraDataParking_info: event.extra_data?.parking_info,
          eventParking_info: event.parking_info,
          final: restoredParkingInfo,
        });
        setParkingInfo(restoredParkingInfo);
        console.log('🚗 [CreateEventScreen] Parking Info restauré (activé):', restoredParkingInfo);
      } else {
        setParkingInfo('');
      }

      // Category - toujours charger
      const loadedCategory =
        event.extra_data?.event_category || event.event_category || event.category || '';
      console.log('🏷️ [CreateEventScreen] Chargement de la catégorie:', {
        fromExtraData: event.extra_data?.event_category,
        fromEventCategory: event.event_category,
        fromCategory: event.category,
        final: loadedCategory,
      });
      setEventCategory(loadedCategory);

      // Accessibility Info
      if (event.has_accessibility_enabled) {
        setAccessibilityInfo(
          event.extra_data?.accessibility_info || event.accessibility_info || ''
        );
        console.log(
          '♿ [CreateEventScreen] Accessibility Info restauré (activé):',
          event.extra_data?.accessibility_info || event.accessibility_info
        );
      } else {
        setAccessibilityInfo('');
      }

      // Event Website
      if (event.has_website_enabled) {
        setEventWebsite(event.extra_data?.event_website || event.event_website || '');
        console.log(
          '🌐 [CreateEventScreen] Event Website restauré (activé):',
          event.extra_data?.event_website || event.event_website
        );
      } else {
        setEventWebsite('');
      }

      // Contact Info
      if (event.has_contact_enabled) {
        setContactInfo(event.extra_data?.contact_info || event.contact_info || '');
        console.log(
          '📞 [CreateEventScreen] Contact Info restauré (activé):',
          event.extra_data?.contact_info || event.contact_info
        );
      } else {
        setContactInfo('');
      }

      // Event Theme
      if (event.has_theme_enabled) {
        setEventTheme(event.extra_data?.event_theme || event.event_theme || '');
        console.log(
          '🎨 [CreateEventScreen] Event Theme restauré (activé):',
          event.extra_data?.event_theme || event.event_theme
        );
      } else {
        setEventTheme(null);
      }
    }
  }, [currentEvent, isEditMode]);

  // Set random gradient if no cover is set
  useEffect(() => {
    if (
      !coverData.selectedBackground &&
      !coverData.coverImage &&
      !coverData.uploadedImage &&
      !coverData.selectedTemplate
    ) {
      const randomBg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
      if (randomBg) {
        updateCoverData({ selectedBackground: randomBg.id });
      }
    }
  }, [
    coverData.selectedBackground,
    coverData.coverImage,
    coverData.uploadedImage,
    coverData.selectedTemplate,
  ]);

  // Helper function to get title font style
  const getTitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === coverData.selectedTitleFont);
    return font?.style || {};
  };

  // Helper function to get subtitle font style
  const getSubtitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === coverData.selectedSubtitleFont);
    return font?.style || {};
  };

  // Validation function to check if required fields are filled
  const isFormValid = () => {
    const validations = {
      title: !!coverData.eventTitle?.trim(),
      subtitle: !!coverData.eventSubtitle?.trim(),
      location: !!location?.trim(),
      eventDate: !!eventDate,
      description: !!description?.trim(),
      category: !!eventCategory,
    };

    console.log('🔍 [CreateEventScreen] Validation du formulaire:', validations);
    console.log('🔍 [CreateEventScreen] Mode édition:', isEditMode);

    return !!(
      coverData.eventTitle?.trim() && // Title is required
      coverData.eventSubtitle?.trim() && // Subtitle is required
      location?.trim() && // Location is required
      eventDate && // Date is required
      description?.trim() && // Description is required
      eventCategory // Category is required
    );
  };

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
  const [showCoverConfirmModal, setShowCoverConfirmModal] = useState(false);

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

  const handleCancel = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isEditMode) {
      router.back();
    } else {
      Alert.alert(
        'Cancel Event Creation',
        'Are you sure you want to cancel? All changes will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: () => {
              resetCoverData();
              router.back();
            },
          },
        ]
      );
    }
  };

  const handleSaveAsDraft = async () => {
    console.log('💾 [CreateEventScreen] Sauvegarde en brouillon...');
    Alert.alert('Save as Draft', 'Cette fonctionnalité sera bientôt disponible');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const performUpdate = async () => {
    if (!eventId) {
      console.error("❌ [CreateEventScreen] Pas d'eventId pour la mise à jour!");
      Alert.alert('Erreur', "ID de l'événement manquant");
      return;
    }

    console.log("🔄 [CreateEventScreen] Début de la mise à jour de l'événement");
    console.log('🏷️ [CreateEventScreen] Catégorie sélectionnée:', eventCategory);
    console.log('🆔 [CreateEventScreen] Event ID:', eventId);

    setIsLoading(true);
    try {
      // Préparer les données de mise à jour
      const updateData: Partial<CreateEventData> = {
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
        eventCategory: eventCategory,
        coHosts: coHosts,
        costs: costs,
        eventPhotos: eventPhotos,
        rsvpDeadline: rsvpDeadline,
        rsvpReminderEnabled: rsvpReminderEnabled,
        rsvpReminderTiming: rsvpReminderTiming,
        questionnaire: questionnaire,
        questionnaireSettings: questionnaireSettings,
        itemsToBring: itemsToBring,
        itemsSettings: itemsSettings,
        playlist: playlist,
        spotifyLink: playlistSettings.spotifyLink,
        dressCode: dressCode,
        eventTheme: eventTheme,
        ageRestriction: ageRestriction,
        capacityLimit: capacityLimit !== '' ? parseInt(capacityLimit) : undefined,
        parkingInfo: parkingInfo,
        accessibilityInfo: accessibilityInfo,
        eventWebsite: eventWebsite,
        contactInfo: contactInfo,
      };

      console.log('🚗 [CreateEventScreen] Parking info being sent to update:', parkingInfo);
      console.log('🚗 [CreateEventScreen] Type of parking info:', typeof parkingInfo);

      console.log('📝 [CreateEventScreen] Données à mettre à jour:', {
        title: updateData.title,
        category: updateData.eventCategory,
        hasDescription: !!updateData.description,
        hasLocation: !!updateData.location,
        capacityLimit: capacityLimit,
        capacityLimitParsed: updateData.capacityLimit,
        extras: {
          coHosts: coHosts.length,
          costs: costs.length,
          photos: eventPhotos.length,
        },
      });

      // Utiliser le provider pour mettre à jour l'événement
      console.log('🚀 [CreateEventScreen] Appel de updateEventInProvider...');
      const result = await updateEventInProvider(eventId, updateData);
      console.log('📥 [CreateEventScreen] Résultat de updateEventInProvider:', result);

      if (result.success) {
        console.log('✅ [CreateEventScreen] Mise à jour réussie via provider');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Recharger l'événement pour s'assurer que toutes les données sont à jour
        await loadEvent(eventId);

        Alert.alert('Succès! 🎉', 'Votre événement a été mis à jour avec succès!', [
          {
            text: "Voir l'événement",
            onPress: () => router.push(`/screens/event-details?id=${eventId}`),
          },
        ]);
      } else {
        throw new Error(result.error || 'Failed to update event');
      }
    } catch (error) {
      console.error('❌ [CreateEventScreen] ERREUR LORS DE LA MISE À JOUR:', error);
      console.error(
        '❌ [CreateEventScreen] Stack trace:',
        error instanceof Error ? error.stack : 'No stack trace'
      );
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Failed to update event');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      console.log('🏁 [CreateEventScreen] Fin de performUpdate');
    }
  };

  const performPublish = async () => {
    console.log('🚀 [CreateEventScreen] ========================================');
    console.log("🚀 [CreateEventScreen] DÉBUT DE LA PUBLICATION DE L'ÉVÉNEMENT");
    console.log('🚀 [CreateEventScreen] ========================================');
    console.log('');

    console.log('📋 [CreateEventScreen] DONNÉES COLLECTÉES:');
    console.log('  🎨 Cover Data:', {
      hasTitle: !!coverData.eventTitle,
      hasSubtitle: !!coverData.eventSubtitle,
      hasBackground: !!coverData.selectedBackground,
      hasImage: !!coverData.coverImage,
      stickersCount: coverData.placedStickers?.length || 0,
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
    console.log(
      '  🎵 Playlist:',
      playlist.length,
      'chansons',
      playlistSettings.spotifyLink ? '(avec lien Spotify)' : ''
    );
    console.log('');

    setIsLoading(true);

    try {
      console.log("📋 [CreateEventScreen] Préparation des données de l'événement...");

      // Préparer les données pour la création
      console.log('🏷️ [CreateEventScreen] Catégorie actuelle avant création:', eventCategory);
      console.log('🏷️ [CreateEventScreen] Type:', typeof eventCategory);
      console.log('🏷️ [CreateEventScreen] Longueur:', eventCategory?.length);

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
        eventCategory: eventCategory,
        host: profile
          ? {
              id: profile.id,
              name: profile.full_name || profile.username || 'Host',
              avatar: profile.avatar_url,
            }
          : undefined,
        coHosts: coHosts,
        costs: costs,
        eventPhotos: eventPhotos,
        rsvpDeadline: rsvpDeadline,
        rsvpReminderEnabled: rsvpReminderEnabled,
        rsvpReminderTiming: rsvpReminderTiming,
        questionnaire: questionnaire,
        questionnaireSettings: questionnaireSettings,
        itemsToBring: itemsToBring,
        itemsSettings: itemsSettings,
        playlist: playlist,
        spotifyLink: playlistSettings.spotifyLink,
        dressCode: dressCode,
        eventTheme: eventTheme,
        ageRestriction: ageRestriction,
        capacityLimit: capacityLimit !== '' ? parseInt(capacityLimit) : undefined,
        parkingInfo: parkingInfo,
        accessibilityInfo: accessibilityInfo,
        eventWebsite: eventWebsite,
        contactInfo: contactInfo,
      };

      console.log('📤 [CreateEventScreen] Envoi des données à EventService:', {
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        location: eventData.location,
        host: eventData.host,
        eventCategory: eventData.eventCategory,
        hasExtras: {
          coHosts: coHosts.length,
          costs: costs.length,
          photos: eventPhotos.length,
          questionnaire: questionnaire.length,
          itemsToBring: itemsToBring.length,
          playlist: playlist.length,
        },
      });

      // Utiliser le provider pour créer l'événement et mettre à jour l'état local
      console.log(
        '🔄 [CreateEventScreen] Utilisation du EventProvider pour création avec mise à jour immédiate'
      );
      const result = await createEventInProvider(eventData);

      if (result.success) {
        console.log('✅ [CreateEventScreen] Événement créé avec succès:', result.event.id);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Réinitialiser les données de couverture et validation
        resetCoverData();
        setHasAttemptedSubmit(false);

        // S'abonner aux mises à jour en temps réel
        subscribeToEventUpdates(result.event.id);

        Alert.alert('Succès! 🎉', 'Votre événement a été créé avec succès!', [
          {
            text: "Voir l'événement",
            onPress: () => {
              console.log("👁️ [CreateEventScreen] Navigation vers l'événement:", result.event.id);
              // Navigation vers l'événement créé
              // L'état est déjà mis à jour dans le provider
              router.replace(`/screens/event-details?id=${result.event.id}`);
            },
          },
          {
            text: 'Retour',
            onPress: () => {
              router.back();
            },
            style: 'cancel',
          },
        ]);
      }
    } catch (error) {
      console.error('💥 [CreateEventScreen] Erreur lors de la publication:', error);

      let errorMessage = "Une erreur est survenue lors de la création de l'événement";
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

  const handlePublish = async () => {
    console.log('🎯 [CreateEventScreen] handlePublish appelé');
    console.log('🎯 [CreateEventScreen] isEditMode:', isEditMode);
    console.log('🎯 [CreateEventScreen] eventId:', eventId);

    // Set validation attempt flag
    setHasAttemptedSubmit(true);

    // Check validation
    if (!isFormValid()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Scroll to top to show the first error
      return;
    }

    if (isEditMode) {
      console.log('✅ [CreateEventScreen] Mode édition - appel de performUpdate');
      await performUpdate();
    } else {
      // Check if user has customized the cover
      const hasCustomCover = !!(
        coverData.uploadedImage ||
        coverData.coverImage ||
        coverData.selectedTemplate
      );
      if (!hasCustomCover) {
        // Show confirmation modal for default cover
        setShowCoverConfirmModal(true);
        return;
      }

      // If has custom cover, publish directly
      await performPublish();
    }
  };

  if (loadingEvent) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

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
              <Text style={styles.placeholderCoverText}>Default Event Cover</Text>
              <Text style={styles.placeholderCoverSubtext}>Tap "Edit Cover" to customize</Text>
            </View>
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

            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Event' : 'Create Event'}</Text>

            <View style={styles.rightIcons}>
              {!isEditMode && (
                <TouchableOpacity
                  onPress={() =>
                    router.push('/screens/event-details?id=f0328675-03b0-4efb-bb4c-ce0f319dd4e6')
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Test Event"
                  style={{ paddingHorizontal: 4 }}
                >
                  <Ionicons name="eye-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              )}
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
            <TouchableOpacity
              onPress={() => {
                setTempTitle(coverData.eventTitle || '');
                setIsEditingTitle(true);
              }}
              style={styles.titleTouchArea}
            >
              <Text
                style={[
                  styles.eventTitle,
                  getTitleFontStyle(),
                  !coverData.eventTitle && styles.placeholderText,
                ]}
              >
                {coverData.eventTitle || 'Tap to add your\nevent title'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setTempSubtitle(coverData.eventSubtitle || '');
                setIsEditingSubtitle(true);
              }}
              style={styles.subtitleTouchArea}
            >
              <Text
                style={[
                  styles.eventSubtitle,
                  getSubtitleFontStyle(),
                  !coverData.eventSubtitle && styles.placeholderText,
                ]}
              >
                {coverData.eventSubtitle ||
                  "Drop a punchline to get the crew\nhyped for what's coming."}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Edit Cover button */}
          <View style={styles.editCoverContainer}>
            <TouchableOpacity
              style={[
                styles.editCoverBtn,
                hasAttemptedSubmit &&
                  !coverData.uploadedImage &&
                  !coverData.coverImage &&
                  !coverData.selectedTemplate &&
                  styles.editCoverBtnError,
              ]}
              onPress={handleEditCover}
              accessibilityRole="button"
              accessibilityLabel="Edit Cover"
            >
              <Ionicons name="pencil-outline" size={16} color="#000" />
              <Text style={styles.editCoverBtnText}>
                {!coverData.uploadedImage && !coverData.coverImage && !coverData.selectedTemplate
                  ? 'Add Cover *'
                  : 'Edit Cover'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form section */}
        <View style={styles.formSheet}>
          {/* Cover Recommendation Info Box */}
          <View style={styles.coverInfoBox}>
            <View style={styles.coverInfoIcon}>
              <Ionicons name="sparkles" size={20} color="#007AFF" />
            </View>
            <View style={styles.coverInfoContent}>
              <Text style={styles.coverInfoTitle}>Make Your Event Stand Out!</Text>
              <Text style={styles.coverInfoText}>
                A custom cover makes your event more attractive and memorable. Tap "Edit Cover"
                above to add photos, templates, or stickers!
              </Text>
            </View>
          </View>
          {/* Event Hosts & Organizers Section - AT THE TOP */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Event Hosts & Organizers</Text>
            </View>

            <View style={styles.hostedByContent}>
              <View style={styles.hostAvatarsContainer}>
                <Image
                  source={profile?.avatar_url ? { uri: profile.avatar_url } : DEFAULT_EVENT_COVER}
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
                        zIndex: 1,
                      },
                    ]}
                  />
                )}
                {coHosts.length > 1 && (
                  <View
                    style={[
                      styles.hostAvatar,
                      styles.overlappingAvatar,
                      styles.moreHostsIndicator,
                      { left: 24, zIndex: 1 },
                    ]}
                  >
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

          {/* Required fields helper */}
          <View style={styles.requiredFieldsHelper}>
            <Text style={styles.requiredFieldsText}>
              <Text style={styles.requiredAsterisk}>*</Text> Required fields
            </Text>
          </View>

          {/* REQUIRED FIELDS SECTION */}

          {/* Event Title Section - REQUIRED */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="text-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>
                Event Title <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </View>

            <TextInput
              style={[
                styles.textField,
                hasAttemptedSubmit && !coverData.eventTitle?.trim() && styles.fieldError,
              ]}
              value={coverData.eventTitle || ''}
              onChangeText={async (text) => {
                updateCoverData({ eventTitle: text });
                // Update in provider if in edit mode with debounce
                if (isEditMode && eventId) {
                  if (titleDebounceRef.current) {
                    clearTimeout(titleDebounceRef.current);
                  }
                  titleDebounceRef.current = setTimeout(async () => {
                    await updateEventInProvider(eventId, { title: text });
                  }, 500);
                }
              }}
              placeholder="Enter your event title"
              placeholderTextColor="#999"
              maxLength={50}
            />
            <Text style={styles.characterCount}>{(coverData.eventTitle || '').length}/50</Text>
          </View>

          {/* Event Subtitle Section - REQUIRED */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>
                Event Subtitle <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </View>

            <TextInput
              style={[
                styles.textField,
                hasAttemptedSubmit && !coverData.eventSubtitle?.trim() && styles.fieldError,
              ]}
              value={coverData.eventSubtitle || ''}
              onChangeText={async (text) => {
                updateCoverData({ eventSubtitle: text });
                // Update in provider if in edit mode with debounce
                if (isEditMode && eventId) {
                  if (subtitleDebounceRef.current) {
                    clearTimeout(subtitleDebounceRef.current);
                  }
                  subtitleDebounceRef.current = setTimeout(async () => {
                    await updateEventInProvider(eventId, { subtitle: text });
                  }, 500);
                }
              }}
              placeholder="Add a catchy tagline for your event"
              placeholderTextColor="#999"
              maxLength={100}
            />
            <Text style={styles.characterCount}>{(coverData.eventSubtitle || '').length}/100</Text>
          </View>

          {/* Category Section - REQUIRED */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>
                What Type of Event <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.selectField,
                hasAttemptedSubmit && !eventCategory && styles.fieldError,
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[styles.selectFieldText, !eventCategory && styles.placeholderText]}>
                {eventCategory ? getCategoryDisplayName(eventCategory) : 'Choose a category'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Description Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>
                Event Description <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </View>

            <TextInput
              style={[
                styles.descriptionField,
                hasAttemptedSubmit && !description?.trim() && styles.fieldError,
              ]}
              value={description}
              onChangeText={async (text) => {
                setDescription(text);
                // Update in provider if in edit mode with debounce
                if (isEditMode && eventId) {
                  if (descriptionDebounceRef.current) {
                    clearTimeout(descriptionDebounceRef.current);
                  }
                  descriptionDebounceRef.current = setTimeout(async () => {
                    await updateEventInProvider(eventId, { description: text });
                  }, 500);
                }
              }}
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
              <Text style={styles.sectionTitle}>
                Date & Time <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
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
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {eventTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
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
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {eventEndTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
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
              <Text style={styles.sectionTitle}>
                Location <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.locationField,
                hasAttemptedSubmit && !location?.trim() && styles.fieldError,
              ]}
              onPress={() => setShowLocationModal(true)}
            >
              <Ionicons name="search" size={20} color="#999" />
              <Text style={[styles.locationInput, !location && { color: '#999' }]}>
                {location || 'Search for a venue or address'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Privacy Settings - REQUIRED */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>
                Who Can See This Event <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </View>

            <View style={styles.privacyCard}>
              <View style={styles.privacyLeft}>
                <Text style={styles.privacyTitle}>Private Event</Text>
                <Text style={styles.privacySubtitle}>
                  Only people you invite can see this event
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={async (value) => {
                  setIsPrivate(value);
                  // Update in provider if in edit mode
                  if (isEditMode && eventId) {
                    await updateEventInProvider(eventId, { isPrivate: value });
                  }
                }}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFF"
                ios_backgroundColor="#E5E5EA"
              />
            </View>
          </View>

          {/* OPTIONAL FIELDS DIVIDER */}
          <View style={styles.optionalFieldsDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.optionalFieldsText}>Optional Information</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Event Features Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="options-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Add Special Features</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.extrasScroll}
            >
              <View style={styles.extrasRow}>
                {/* Most frequently used extras first - Cost is #1 for nightlife events */}
                <TouchableOpacity
                  style={[styles.extraPill, costs.length > 0 && styles.extraPillConfigured]}
                  onPress={handleCostPerPerson}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={costs.length > 0 ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.extraPillText,
                      costs.length > 0 && styles.extraPillTextConfigured,
                    ]}
                  >
                    {costs.length > 0
                      ? `${costs.length} cost${costs.length > 1 ? 's' : ''} added`
                      : 'Entry & Costs'}
                  </Text>
                  {costs.length > 0 ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setCosts([]);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, capacityLimit !== '' && styles.extraPillConfigured]}
                  onPress={handleCapacity}
                >
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={capacityLimit !== '' ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.extraPillText,
                      capacityLimit !== '' && styles.extraPillTextConfigured,
                    ]}
                  >
                    {capacityLimit !== ''
                      ? capacityLimit === '0'
                        ? 'Illimité'
                        : `Max ${capacityLimit} guests`
                      : 'Capacity Limit'}
                  </Text>
                  {capacityLimit !== '' ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setCapacityLimit('');
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, ageRestriction && styles.extraPillConfigured]}
                  onPress={handleAgeRestriction}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={16}
                    color={ageRestriction ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[styles.extraPillText, ageRestriction && styles.extraPillTextConfigured]}
                  >
                    {ageRestriction || 'Age Restriction'}
                  </Text>
                  {ageRestriction ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setAgeRestriction('');
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, dressCode && styles.extraPillConfigured]}
                  onPress={handleDressCode}
                >
                  <Ionicons name="shirt-outline" size={16} color={dressCode ? '#FFF' : '#007AFF'} />
                  <Text style={[styles.extraPillText, dressCode && styles.extraPillTextConfigured]}>
                    {dressCode ? `${dressCode}` : 'Dress Code'}
                  </Text>
                  {dressCode ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setDressCode(null);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, rsvpDeadline && styles.extraPillConfigured]}
                  onPress={handleRSVPDeadline}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={rsvpDeadline ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[styles.extraPillText, rsvpDeadline && styles.extraPillTextConfigured]}
                  >
                    {rsvpDeadline
                      ? `RSVP by ${rsvpDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : 'RSVP deadline'}
                  </Text>
                  {rsvpDeadline ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setRsvpDeadline(null);
                        setRsvpReminderEnabled(false);
                        setRsvpReminderTiming('24h');
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, parkingInfo && styles.extraPillConfigured]}
                  onPress={handleParking}
                >
                  <Ionicons name="car-outline" size={16} color={parkingInfo ? '#FFF' : '#007AFF'} />
                  <Text
                    style={[styles.extraPillText, parkingInfo && styles.extraPillTextConfigured]}
                  >
                    {parkingInfo
                      ? (() => {
                          try {
                            const parsed = JSON.parse(parkingInfo);
                            if (!parsed.available) return 'No Parking';
                            const types: { [key: string]: string } = {
                              free: 'Free Parking',
                              paid: 'Paid Parking',
                              street: 'Street Parking',
                              valet: 'Valet Service',
                              limited: 'Limited Parking',
                            };
                            return types[parsed.type] || 'Parking Info Set';
                          } catch {
                            return 'Parking Info Set';
                          }
                        })()
                      : 'Parking Info'}
                  </Text>
                  {parkingInfo ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        console.log('🚗 [CreateEventScreen] Clearing parking info');
                        setParkingInfo('');
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, eventPhotos.length > 0 && styles.extraPillConfigured]}
                  onPress={handlePhotoAlbum}
                >
                  <Ionicons
                    name="images-outline"
                    size={16}
                    color={eventPhotos.length > 0 ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.extraPillText,
                      eventPhotos.length > 0 && styles.extraPillTextConfigured,
                    ]}
                  >
                    {eventPhotos.length > 0
                      ? `${eventPhotos.length} photo${eventPhotos.length > 1 ? 's' : ''}`
                      : 'Photo Album'}
                  </Text>
                  {eventPhotos.length > 0 ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setEventPhotos([]);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, itemsToBring.length > 0 && styles.extraPillConfigured]}
                  onPress={handleItemsToBring}
                >
                  <Ionicons
                    name="gift-outline"
                    size={16}
                    color={itemsToBring.length > 0 ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.extraPillText,
                      itemsToBring.length > 0 && styles.extraPillTextConfigured,
                    ]}
                  >
                    {itemsToBring.length > 0
                      ? `${itemsToBring.length} item${itemsToBring.length > 1 ? 's' : ''}`
                      : 'To Bring'}
                  </Text>
                  {itemsToBring.length > 0 ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setItemsToBring([]);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, eventTheme && styles.extraPillConfigured]}
                  onPress={handleTheme}
                >
                  <Ionicons
                    name="color-palette-outline"
                    size={16}
                    color={eventTheme ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[styles.extraPillText, eventTheme && styles.extraPillTextConfigured]}
                  >
                    {eventTheme ? `Theme: ${eventTheme}` : 'Event Theme'}
                  </Text>
                  {eventTheme ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setEventTheme(null);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, accessibilityInfo && styles.extraPillConfigured]}
                  onPress={handleAccessibility}
                >
                  <Ionicons
                    name="accessibility-outline"
                    size={16}
                    color={accessibilityInfo ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.extraPillText,
                      accessibilityInfo && styles.extraPillTextConfigured,
                    ]}
                  >
                    {accessibilityInfo ? 'Accessibility Set' : 'Accessibility'}
                  </Text>
                  {accessibilityInfo ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setAccessibilityInfo('');
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, questionnaire.length > 0 && styles.extraPillConfigured]}
                  onPress={handleQuestionnaire}
                >
                  <Ionicons
                    name="clipboard-outline"
                    size={16}
                    color={questionnaire.length > 0 ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.extraPillText,
                      questionnaire.length > 0 && styles.extraPillTextConfigured,
                    ]}
                  >
                    {questionnaire.length > 0
                      ? `${questionnaire.length} question${questionnaire.length > 1 ? 's' : ''}`
                      : 'Guest questionnaire'}
                  </Text>
                  {questionnaire.length > 0 ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setQuestionnaire([]);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="add" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.extraPill, playlist.length > 0 && styles.extraPillConfigured]}
                  onPress={handlePlaylist}
                >
                  <Ionicons
                    name="musical-notes-outline"
                    size={16}
                    color={playlist.length > 0 ? '#FFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.extraPillText,
                      playlist.length > 0 && styles.extraPillTextConfigured,
                    ]}
                  >
                    {playlist.length > 0
                      ? `${playlist.length} song${playlist.length > 1 ? 's' : ''}`
                      : 'Playlist'}
                  </Text>
                  {playlist.length > 0 ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setPlaylist([]);
                        setPlaylistSettings({
                          spotifyLink: undefined,
                          appleMusicLink: undefined,
                          acceptSuggestions: true,
                        });
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
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
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>

            <View style={styles.additionalFieldsContainer}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Contact Info</Text>
                <TextInput
                  style={styles.textField}
                  value={contactInfo}
                  onChangeText={setContactInfo}
                  placeholder="Email or phone for guest questions (optional)"
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
                  placeholder="https://your-event-website.com (optional)"
                  placeholderTextColor="#999"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.draftButton}
              onPress={isEditMode ? handleCancel : handleSaveAsDraft}
            >
              <Text style={styles.draftButtonText}>{isEditMode ? 'Cancel' : 'Save as Draft'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.publishButton}
              onPress={handlePublish}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.publishButtonText}>{isEditMode ? 'Update' : 'Publish'}</Text>
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
        onSave={async (newCosts) => {
          setCosts(newCosts);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, { costs: newCosts });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <PhotoAlbumModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        initialPhotos={eventPhotos}
        onSave={async (photos) => {
          console.log('📸 [CreateEventScreen] Saving photos:', photos.length, 'photos');
          console.log('📸 [CreateEventScreen] Photo URLs:', photos);
          setEventPhotos(photos);
          setShowPhotoModal(false);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, { eventPhotos: photos });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <ItemsToBringModal
        visible={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        initialItems={itemsToBring.map((item) => ({
          id: item.id,
          name: item.name,
          assignee: item.assignedTo || '',
          quantity: item.quantity?.toString() || '1',
          showQuantity: !!item.quantity && item.quantity > 1,
          showAssignee: !!item.assignedTo,
          type: item.type || 'suggested',
        }))}
        initialSettings={itemsSettings}
        onSave={async (items, settings) => {
          console.log('📦 [CreateEventScreen] Items to bring sauvegardés:', items.length);
          console.log('📦 [CreateEventScreen] Items détails:', items);
          console.log('⚙️ [CreateEventScreen] Settings:', settings);
          // Convertir le format de la modal vers le format attendu par le service
          const formattedItems = items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity ? parseInt(item.quantity.toString()) : 1,
            assignedTo: item.assignee || undefined,
            type: item.type || 'suggested',
          }));
          console.log('📦 [CreateEventScreen] Items formatés:', formattedItems);
          setItemsToBring(formattedItems);
          setItemsSettings(settings);
          setShowItemsModal(false);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            console.log('📦 [CreateEventScreen] Mise à jour via updateEventExtras...');
            await updateEventExtras(eventId, {
              itemsToBring: formattedItems,
              itemsSettings: settings,
            });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <RSVPDeadlineModal
        visible={showRSVPModal}
        onClose={() => setShowRSVPModal(false)}
        onSave={async (deadline, reminderEnabled, reminderTiming) => {
          setRsvpDeadline(deadline);
          setRsvpReminderEnabled(reminderEnabled);
          setRsvpReminderTiming(reminderTiming);
          setShowRSVPModal(false);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, {
              rsvpDeadline: deadline,
              rsvpReminderEnabled: reminderEnabled,
              rsvpReminderTiming: reminderTiming,
            });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        eventDate={eventDate}
        initialDeadline={rsvpDeadline}
      />

      <GuestQuestionnaireModal
        visible={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        initialQuestions={questionnaire}
        initialSettings={questionnaireSettings}
        onSave={async (questions, settings) => {
          setQuestionnaire(questions);
          setQuestionnaireSettings(settings);
          setShowQuestionnaireModal(false);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, {
              questionnaire: questions,
              questionnaireSettings: settings,
            });
          }
          if (questions.length > 0) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }}
      />

      <PlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        onSave={async (songs, spotifyLink) => {
          console.log('🎵 [CreateEventScreen] Playlist sauvegardée:', songs.length, 'chansons');
          // Formater les chansons pour le service
          const formattedPlaylist = songs.map((song) => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
          }));
          setPlaylist(formattedPlaylist);
          if (spotifyLink) {
            setPlaylistSettings({ ...playlistSettings, spotifyLink });
          }
          setShowPlaylistModal(false);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, {
              playlist: formattedPlaylist,
              playlistSettings: {
                spotifyLink: spotifyLink || null,
                appleMusicLink: null,
                acceptSuggestions: true,
              },
            });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <ManageCoHostsModal
        visible={showCoHostsModal}
        onClose={() => setShowCoHostsModal(false)}
        currentCoHosts={coHosts}
        onSave={async (newCoHosts) => {
          setCoHosts(newCoHosts);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, { coHosts: newCoHosts });
          }
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
            const newEndTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours later
            setEventEndDate(newEndTime);
            setEventEndTime(newEndTime);
          }
          setShowStartDateModal(false);
          setShowEndDateModal(true); // Automatically show end date modal
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            updateEventInProvider(eventId, {
              date: startDate,
            });
          }
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
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            updateEventInProvider(eventId, {
              endDate: endDate,
              endTime: endTime,
            });
          }
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
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            updateEventInProvider(eventId, {
              location: displayParts.join(', '),
              locationDetails: locationData,
            });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        currentLocation={location}
      />

      <DressCodeModal
        visible={showDressCodeModal}
        onClose={() => setShowDressCodeModal(false)}
        onSave={async (dressCodeValue) => {
          setDressCode(dressCodeValue);
          setShowDressCodeModal(false);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, { dressCode: dressCodeValue });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialDressCode={dressCode}
      />

      <ThemeSelectionModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        onSave={async (themeValue) => {
          setEventTheme(themeValue);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, { eventTheme: themeValue });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialTheme={eventTheme}
      />

      <AgeRestrictionModal
        visible={showAgeRestrictionModal}
        onClose={() => setShowAgeRestrictionModal(false)}
        onSave={async (restriction) => {
          if (restriction) {
            const selectedOption = restriction.type;
            setAgeRestriction(
              selectedOption === 'all_ages'
                ? 'All Ages'
                : selectedOption === 'family_friendly'
                  ? 'Family Friendly'
                  : selectedOption === 'kids_only'
                    ? 'Kids Only'
                    : selectedOption === 'custom' && restriction.minAge
                      ? `${restriction.minAge}+`
                      : selectedOption.includes('+')
                        ? selectedOption
                        : 'All Ages'
            );
          } else {
            setAgeRestriction('');
          }
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            const ageRestrictionValue = restriction
              ? restriction.type === 'all_ages'
                ? 'All Ages'
                : restriction.type === 'family_friendly'
                  ? 'Family Friendly'
                  : restriction.type === 'kids_only'
                    ? 'Kids Only'
                    : restriction.type === 'custom' && restriction.minAge
                      ? `${restriction.minAge}+`
                      : restriction.type.includes('+')
                        ? restriction.type
                        : 'All Ages'
              : '';
            await updateEventExtras(eventId, { ageRestriction: ageRestrictionValue });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialRestriction={
          ageRestriction
            ? {
                type: ageRestriction.includes('+')
                  ? ageRestriction
                  : ageRestriction === 'All Ages'
                    ? 'all_ages'
                    : ageRestriction === 'Family Friendly'
                      ? 'family_friendly'
                      : ageRestriction === 'Kids Only'
                        ? 'kids_only'
                        : 'all_ages',
                minAge: ageRestriction.includes('+')
                  ? parseInt(ageRestriction.replace('+', ''))
                  : undefined,
              }
            : null
        }
      />

      <EventCapacityModal
        visible={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        onSave={async (capacity) => {
          console.log('💾 [CreateEventScreen] Capacité reçue du modal:', capacity);
          if (capacity.maxAttendees !== undefined) {
            setCapacityLimit(capacity.maxAttendees.toString());
            console.log(
              '💾 [CreateEventScreen] Capacité définie à:',
              capacity.maxAttendees.toString()
            );
          } else {
            setCapacityLimit('');
            console.log('💾 [CreateEventScreen] Capacité effacée');
          }
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, { capacityLimit: capacity.maxAttendees });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialCapacity={
          capacityLimit !== '' ? { maxAttendees: parseInt(capacityLimit) } : undefined
        }
      />

      <ParkingInfoModal
        visible={showParkingModal}
        onClose={() => setShowParkingModal(false)}
        onSave={async (info) => {
          // Store parking info as JSON string to preserve all details
          const parkingData = JSON.stringify(info);
          console.log('🚗 [CreateEventScreen] Saving parking info:', info);
          console.log('🚗 [CreateEventScreen] JSON stringified:', parkingData);
          console.log('🚗 [CreateEventScreen] Previous parking info:', parkingInfo);
          setParkingInfo(parkingData);

          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            console.log('🚗 [CreateEventScreen] Updating parking info via updateEventExtras');
            const updateResult = await updateEventExtras(eventId, { parkingInfo: parkingData });
            console.log('🚗 [CreateEventScreen] Update result:', updateResult);
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialParkingInfo={
          parkingInfo
            ? (() => {
                try {
                  // Try to parse as JSON first (new format)
                  console.log(
                    '🚗 [CreateEventScreen] Attempting to parse parking info:',
                    parkingInfo
                  );
                  const parsed = JSON.parse(parkingInfo);
                  console.log(
                    '🚗 [CreateEventScreen] Successfully parsed parking info for modal:',
                    parsed
                  );
                  return parsed;
                } catch (error) {
                  // Fallback for old string format
                  console.log(
                    '🚗 [CreateEventScreen] Failed to parse as JSON, using fallback:',
                    error
                  );
                  console.log(
                    '🚗 [CreateEventScreen] Fallback parsing for old format:',
                    parkingInfo
                  );
                  return {
                    available: parkingInfo !== '' && !parkingInfo.includes('No parking'),
                    type: '', // No type in old format
                    instructions: parkingInfo.includes('No parking') ? '' : parkingInfo,
                    nearbyOptions: parkingInfo.includes('No parking')
                      ? parkingInfo.replace('No parking - ', '')
                      : '',
                  };
                }
              })()
            : { available: true }
        }
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
            accessibilityText = accessibilityText
              ? `${accessibilityText}. ${info.additionalInfo}`
              : info.additionalInfo;
          }

          setAccessibilityInfo(accessibilityText);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialAccessibility={
          accessibilityInfo
            ? {
                wheelchairAccessible: accessibilityInfo.includes('Wheelchair accessible'),
                elevatorAvailable: accessibilityInfo.includes('Elevator available'),
                accessibleParking: accessibilityInfo.includes('Accessible parking'),
                accessibleRestrooms: accessibilityInfo.includes('Accessible restrooms'),
                signLanguageInterpreter: accessibilityInfo.includes('Sign language'),
                brailleAvailable: accessibilityInfo.includes('Braille'),
                additionalInfo: accessibilityInfo,
              }
            : undefined
        }
      />

      <EventCategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={async (category) => {
          console.log('🏷️ [CreateEventScreen] Catégorie sélectionnée dans le modal:', category);
          console.log('🏷️ [CreateEventScreen] Type de la catégorie:', typeof category);
          console.log('🏷️ [CreateEventScreen] Longueur:', category.length);
          setEventCategory(category);
          console.log('🏷️ [CreateEventScreen] State eventCategory après set:', eventCategory);
          // Update in provider if in edit mode
          if (isEditMode && eventId) {
            await updateEventExtras(eventId, { eventCategory: category });
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        initialCategory={eventCategory}
      />

      {/* Title Edit Modal */}
      <BottomModal
        visible={isEditingTitle}
        onClose={() => setIsEditingTitle(false)}
        title="Edit Event Title"
        height={300}
        onSave={
          tempTitle.trim()
            ? () => {
                updateCoverData({ eventTitle: tempTitle });
                setIsEditingTitle(false);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            : undefined
        }
        saveButtonText="Save Title"
      >
        <View style={styles.editModalContent}>
          <TextInput
            style={styles.editModalInput}
            value={tempTitle}
            onChangeText={setTempTitle}
            placeholder="Enter event title..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            maxLength={50}
            autoFocus
          />
          <Text style={styles.characterCount}>{tempTitle.length}/50</Text>
        </View>
      </BottomModal>

      {/* Subtitle Edit Modal */}
      <BottomModal
        visible={isEditingSubtitle}
        onClose={() => setIsEditingSubtitle(false)}
        title="Edit Event Subtitle"
        height={350}
        onSave={
          tempSubtitle.trim()
            ? () => {
                updateCoverData({ eventSubtitle: tempSubtitle });
                setIsEditingSubtitle(false);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            : undefined
        }
        saveButtonText="Save Subtitle"
      >
        <View style={styles.editModalContent}>
          <TextInput
            style={styles.editModalInput}
            value={tempSubtitle}
            onChangeText={setTempSubtitle}
            placeholder="Enter a catchy subtitle..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            maxLength={100}
            autoFocus
          />
          <Text style={styles.characterCount}>{tempSubtitle.length}/100</Text>
          <View style={styles.subtitleHelper}>
            <Text style={styles.subtitleHelperText}>
              💡 Tip: Use a fun tagline to get people excited about your event!
            </Text>
          </View>
        </View>
      </BottomModal>

      {/* Cover Confirmation Modal */}
      <Modal
        visible={showCoverConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCoverConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="image-outline" size={48} color="#007AFF" />
            </View>

            <Text style={styles.confirmModalTitle}>No Custom Cover?</Text>

            <Text style={styles.confirmModalMessage}>
              You haven't customized your event cover yet. A personalized cover makes your event
              more attractive and helps guests recognize it easily.
            </Text>

            <Text style={styles.confirmModalSubMessage}>
              Would you like to customize your cover now?
            </Text>

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalButton}
                onPress={() => {
                  setShowCoverConfirmModal(false);
                  handleEditCover();
                }}
              >
                <Text style={styles.confirmModalButtonText}>Customize Cover</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalSecondaryButton]}
                onPress={async () => {
                  setShowCoverConfirmModal(false);
                  await performPublish();
                }}
              >
                <Text
                  style={[styles.confirmModalButtonText, styles.confirmModalSecondaryButtonText]}
                >
                  Publish Anyway
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  titleTouchArea: {
    width: '100%',
    alignItems: 'center',
  },
  subtitleTouchArea: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
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
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
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
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  editCoverBtnError: {
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  fieldError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  placeholderCoverText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    opacity: 0.7,
  },
  placeholderCoverSubtext: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 8,
    opacity: 0.5,
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  requiredAsterisk: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '400',
  },
  requiredFieldsHelper: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  requiredFieldsText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  optionalFieldsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  optionalFieldsText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginHorizontal: 16,
  },
  coverInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: -10,
    gap: 12,
  },
  coverInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInfoContent: {
    flex: 1,
  },
  coverInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  coverInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  editModalInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  modalCharacterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 16,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  editModalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  confirmModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  confirmModalSubMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmModalButtons: {
    width: '100%',
    gap: 12,
  },
  confirmModalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmModalSecondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmModalButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  confirmModalSecondaryButtonText: {
    color: '#666',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
