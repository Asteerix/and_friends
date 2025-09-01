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
import { useTranslation } from 'react-i18next';
import { useEvent } from '../context/EventProvider';
import { LinearGradient } from 'expo-linear-gradient';
import EventOptionsButton from '../components/EventOptionsButton';
import { getCategoryDisplayName, getCategoryIcon } from '../utils/categoryHelpers';
import { EventServiceComplete } from '../services/eventServiceComplete';
import BottomModal from '../components/BottomModal';
import CostPerPersonModal from '../components/CostPerPersonModal';
import PhotoAlbumModal from '../components/PhotoAlbumModal';
import ItemsToBringModal from '../components/ItemsToBringModal';
import RSVPDeadlineModal from '../components/RSVPDeadlineModal';
import GuestQuestionnaireModal from '../components/GuestQuestionnaireModal';
import PlaylistModal from '../components/PlaylistModal';
import ManageCoHostsModal from '../components/ManageCoHostsModal';
import DressCodeModal from '../components/DressCodeModal';
import ThemeSelectionModal from '../components/ThemeSelectionModal';
import AgeRestrictionModal from '../components/AgeRestrictionModal';
import EventCapacityModal from '../components/EventCapacityModal';
import ParkingInfoModal from '../components/ParkingInfoModal';
import AccessibilityModal from '../components/AccessibilityModal';
import EventCategoryModal from '../components/EventCategoryModal';
import WhosBringingModal from '../components/WhosBringingModal';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Import fonts and backgrounds data
import {
  FONTS as IMPORTED_FONTS,
  BACKGROUNDS as IMPORTED_BACKGROUNDS,
} from '../data/eventTemplates';
import { useSession } from '@/shared/providers/SessionContext';
import NotificationButton from '@/assets/svg/notification-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import BackButton from '@/assets/svg/back-button.svg';
import { useEvents } from '@/hooks/useEvents';
import { useRatings } from '@/hooks/useRatings';
import { useProfile } from '@/hooks/useProfile';
import { useEventAttendees } from '@/hooks/useEventAttendees';

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
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { session } = useSession();
  const { attendees } = useEventAttendees(eventId);
  const { updateRSVP } = useEvents();
  const {
    currentEvent: event,
    loading,
    loadEvent,
    updateEvent,
    subscribeToEventUpdates,
    unsubscribeFromEventUpdates,
    updateEventExtras,
  } = useEvent();
  const { getUserRatingStats } = useRatings();
  const [questionResponses, setQuestionResponses] = useState<{ [key: string]: string }>({});
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [itemBringers, setItemBringers] = useState<{ [itemId: string]: string[] }>({});
  const [showBringersModal, setShowBringersModal] = useState(false);
  const [selectedItemForBringers, setSelectedItemForBringers] = useState<any>(null);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [showHostsModal, setShowHostsModal] = useState(false);
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
  const [allQuestionnaireResponses, setAllQuestionnaireResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [organizerRating, setOrganizerRating] = useState<{
    average_rating: number;
    total_ratings: number;
  } | null>(null);
  const [coHostsRatings, setCoHostsRatings] = useState<
    Record<
      string,
      {
        average_rating: number;
        total_ratings: number;
      }
    >
  >({});

  useEffect(() => {
    if (!eventId) {
      console.error('❌ [EventDetailsScreen] No event ID provided');
      return;
    }
    loadEvent(eventId);
    subscribeToEventUpdates(eventId);

    // Cleanup subscription on unmount
    return () => {
      unsubscribeFromEventUpdates();
    };
  }, [eventId]);

  // Load organizer rating when event is loaded
  useEffect(() => {
    const loadOrganizerRating = async () => {
      if (event?.organizer?.id) {
        const stats = await getUserRatingStats(event.organizer.id);
        if (stats) {
          setOrganizerRating({
            average_rating: stats.average_rating,
            total_ratings: stats.total_ratings,
          });
        }
      }
    };

    loadOrganizerRating();
  }, [event?.organizer?.id, getUserRatingStats]);

  // Load co-hosts ratings when event is loaded
  useEffect(() => {
    const loadCoHostsRatings = async () => {
      const coHosts = event?.extra_data?.coHosts || [];
      const ratings: Record<string, { average_rating: number; total_ratings: number }> = {};

      for (const coHost of coHosts) {
        if (coHost.id || coHost.user_id) {
          const userId = coHost.id || coHost.user_id;
          const stats = await getUserRatingStats(userId);
          if (stats) {
            ratings[userId] = {
              average_rating: stats.average_rating,
              total_ratings: stats.total_ratings,
            };
          }
        }
      }

      setCoHostsRatings(ratings);
    };

    if (event?.extra_data?.coHosts?.length > 0) {
      loadCoHostsRatings();
    }
  }, [event?.extra_data?.coHosts, getUserRatingStats]);

  // Charger les réponses au questionnaire
  const loadQuestionnaireResponses = async () => {
    if (!eventId || !event || questionnaire.length === 0) return;

    setLoadingResponses(true);
    console.log('🔄 [EventDetailsScreen] Chargement des réponses au questionnaire...');
    console.log('📋 [EventDetailsScreen] Questions:', questionnaire);

    const result = await EventServiceComplete.getQuestionnaireResponses(eventId);

    if (result.success && result.responses) {
      console.log('✅ [EventDetailsScreen] Réponses chargées:', result.responses.length);
      console.log('📊 [EventDetailsScreen] Détail des réponses:', result.responses);
      setAllQuestionnaireResponses(result.responses);
    } else {
      console.error(
        '❌ [EventDetailsScreen] Erreur lors du chargement des réponses:',
        result.error
      );
    }

    setLoadingResponses(false);
  };

  // Load items with bringers function
  const loadItemsWithBringers = async () => {
    if (!eventId || !event) return;

    console.log("🔄 [loadItemsWithBringers] Chargement des bringers pour l'événement", eventId);

    // D'abord charger depuis extra_data si disponible
    const extraDataBringers = event.extra_data?.itemBringers || {};
    console.log('📦 [loadItemsWithBringers] Bringers depuis extra_data:', extraDataBringers);

    const bringers: { [itemId: string]: string[] } = {};

    // Charger les items depuis extra_data (anciens items)
    const itemsFromExtraData = event.extra_data?.itemsToBring || [];
    console.log('📋 [loadItemsWithBringers] Items depuis extra_data:', itemsFromExtraData);

    itemsFromExtraData.forEach((item: any) => {
      // Pour les items required, tout le monde doit apporter
      if (item.type === 'required') {
        bringers[item.id] = attendees.map((a) => a.id);
        console.log(`✅ [loadItemsWithBringers] Item required ${item.id}: tous les attendees`);
      } else if (extraDataBringers[item.id]) {
        // Utiliser les bringers depuis extra_data
        bringers[item.id] = extraDataBringers[item.id];
        console.log(
          `📌 [loadItemsWithBringers] Item ${item.id} a ${extraDataBringers[item.id].length} bringers`
        );
      } else {
        bringers[item.id] = [];
        console.log(`❌ [loadItemsWithBringers] Item ${item.id} n'a pas de bringers`);
      }
    });

    // Ensuite charger depuis la table event_items (nouveaux items avec UUID)
    const result = await EventServiceComplete.getEventItemsWithBringers(eventId);
    if (result.success && result.items) {
      console.log('📊 [loadItemsWithBringers] Items depuis la table:', result.items);

      result.items.forEach((item: any) => {
        // Pour les items required, tout le monde doit apporter
        if (item.type === 'required') {
          bringers[item.id] = attendees.map((a) => a.id);
        } else if (extraDataBringers[item.id]) {
          // Utiliser les bringers depuis extra_data en priorité
          bringers[item.id] = extraDataBringers[item.id];
        } else if (item.event_item_bringers) {
          // Sinon utiliser la table event_item_bringers si elle existe
          bringers[item.id] = item.event_item_bringers.map((b: any) => b.user_id);
        } else {
          bringers[item.id] = [];
        }
      });
    }

    console.log('🎯 [loadItemsWithBringers] Bringers finaux:', bringers);
    setItemBringers(bringers);
  };

  // Load items with bringers when event changes
  useEffect(() => {
    if (eventId && event) {
      loadItemsWithBringers();

      // Charger aussi les réponses au questionnaire
      if (event.extra_data?.questionnaire?.length > 0 || event.event_questionnaire?.length > 0) {
        console.log('📋 [useEffect] Questionnaire trouvé, chargement des réponses...');
        loadQuestionnaireResponses();
      }
    }
  }, [eventId, event, attendees]);

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
    if (!eventId || !session?.user) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Show RSVP options
    Alert.alert(
      t('events.details.rsvpTitle', 'RSVP to Event'),
      t('events.details.rsvpMessage', 'Please select your response:'),
      [
        {
          text: t('events.details.going', 'Going'),
          onPress: () => handleRSVPSelection('going'),
          style: 'default',
        },
        {
          text: t('events.details.maybe', 'Maybe'),
          onPress: () => handleRSVPSelection('maybe'),
          style: 'default',
        },
        {
          text: t('events.details.notGoing', 'Not Going'),
          onPress: () => handleRSVPSelection('not-going'),
          style: 'default',
        },
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleRSVPSelection = async (status: string) => {
    if (!eventId) return;

    try {
      console.log('🔄 [EventDetails] Updating RSVP to:', status);

      const result = await updateRSVP(eventId, status);

      if (result.error) {
        console.error('❌ [EventDetails] RSVP error:', result.error);
        Alert.alert(
          t('events.details.rsvpError', 'Error'),
          t('events.details.rsvpErrorMessage', 'Failed to update RSVP. Please try again.')
        );
        return;
      }

      console.log('✅ [EventDetails] RSVP updated successfully');

      // Show success feedback
      const statusMessages = {
        going: t('events.details.rsvpGoingSuccess', "You're going! 🎉"),
        maybe: t('events.details.rsvpMaybeSuccess', "You're interested! 🤔"),
        'not-going': t('events.details.rsvpNotGoingSuccess', "You won't be attending 😔"),
      };

      Alert.alert(
        t('events.details.rsvpSuccess', 'RSVP Updated'),
        statusMessages[status as keyof typeof statusMessages] || 'RSVP updated!'
      );

      // Refresh event data to reflect the change
      if (loadEvent) {
        await loadEvent();
      }
    } catch (error) {
      console.error('💥 [EventDetails] Fatal RSVP error:', error);
      Alert.alert(
        t('events.details.rsvpError', 'Error'),
        t('events.details.rsvpErrorMessage', 'Failed to update RSVP. Please try again.')
      );
    }
  };

  const handleSuggestItem = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('events.details.suggestItem', 'Suggest an Item'),
      t('events.details.suggestItemMessage', 'What item would you like to suggest?'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('events.details.suggest', 'Suggest'),
          onPress: () => {
            // In a real app, this would open a modal or form
            Alert.alert(
              t('common.comingSoon', 'Coming Soon'),
              t(
                'events.details.itemSuggestionComingSoon',
                'Item suggestion feature will be available soon!'
              )
            );
          },
        },
      ]
    );
  };

  const renderItemCard = (item: any, index: number) => {
    const itemType = item.type || 'suggested';
    const bringers = itemBringers[item.id] || [];
    const isBringingThis = bringers.includes(profile?.id || '');

    console.log(`🎁 [renderItemCard] Item ${item.id} (${item.name}):`, {
      type: itemType,
      bringers: bringers,
      isBringingThis: isBringingThis,
      profileId: profile?.id,
    });
    const bringersCount = bringers.length;

    // Pour required, tout le monde doit apporter
    const isRequired = itemType === 'required';
    const canToggle = !isRequired; // On peut seulement toggle suggested et open

    const typeConfigs = {
      required: { color: '#FF3B30', icon: 'alert-circle', label: 'Required' },
      suggested: { color: '#FF9500', icon: 'bulb-outline', label: 'Suggested' },
      open: { color: '#34C759', icon: 'add-circle-outline', label: 'Open' },
    };
    const typeConfig = typeConfigs[itemType as keyof typeof typeConfigs] || typeConfigs.suggested;

    const handleItemPress = async () => {
      if (isRequired) return; // Required items ne peuvent pas être modifiés

      if (canToggle && profile?.id) {
        const userId = profile.id;
        const shouldAdd = !isBringingThis;

        // Optimistic update
        const newBringers = [...bringers];
        if (shouldAdd) {
          newBringers.push(userId);
        } else {
          const index = newBringers.indexOf(userId);
          if (index > -1) newBringers.splice(index, 1);
        }

        setItemBringers((prev) => ({
          ...prev,
          [item.id]: newBringers,
        }));

        // Sauvegarder dans Supabase
        const result = await EventServiceComplete.toggleItemBringer(
          item.id,
          userId,
          shouldAdd,
          eventId
        );

        if (!result.success) {
          // Rollback on error
          setItemBringers((prev) => ({
            ...prev,
            [item.id]: bringers,
          }));
          Alert.alert(
            t('errors.general'),
            t('events.details.itemUpdateError', 'Could not update item. Please try again.')
          );
        }
        // Si succès, on garde l'update optimiste qui a déjà été fait
      }
    };

    const handleShowBringers = async () => {
      // Pour les items required, montrer tous les attendees
      if (itemType === 'required') {
        const allAttendees = attendees.map((attendee: any) => ({
          id: attendee.id,
          name:
            attendee.id === profile?.id
              ? 'You'
              : attendee.full_name || attendee.username || 'Anonymous',
          avatar: attendee.avatar_url || null,
        }));

        setSelectedItemForBringers({
          ...item,
          bringers: allAttendees,
        });
        setShowBringersModal(true);
      } else {
        // Pour les autres items, charger les détails des bringers depuis Supabase
        const result = await EventServiceComplete.getItemBringers(item.id, eventId);

        if (result.success && result.bringers) {
          const bringersWithProfiles = result.bringers.map((b: any) => ({
            id: b.user_id,
            name:
              b.user_id === profile?.id
                ? 'You'
                : b.user?.full_name || b.user?.username || 'Anonymous',
            avatar: b.user?.avatar_url || null,
          }));

          setSelectedItemForBringers({
            ...item,
            bringers: bringersWithProfiles,
          });
          setShowBringersModal(true);
        }
      }
    };

    return (
      <TouchableOpacity
        key={item.id || index}
        style={[styles.todoItem, (isRequired || isBringingThis) && styles.todoItemCompleted]}
        onPress={handleItemPress}
        activeOpacity={canToggle ? 0.7 : 1}
        disabled={isRequired}
      >
        <View style={styles.todoLeft}>
          <View
            style={[
              styles.todoCheckbox,
              (isRequired || isBringingThis) && styles.todoCheckboxCompleted,
            ]}
          >
            {(isRequired || isBringingThis) && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </View>
          <View style={styles.todoContent}>
            <View style={styles.todoHeader}>
              <Text
                style={[
                  styles.todoText,
                  (isRequired || isBringingThis) && styles.todoTextCompleted,
                ]}
              >
                {item.name || item.item_name}
                {itemsSettings.showQuantities &&
                  item.quantity &&
                  item.quantity > 1 &&
                  ` (${item.quantity})`}
              </Text>
            </View>
            {item.assignedTo && item.assignedTo !== 'Anyone' && (
              <Text style={styles.todoAssignedText}>Assigned to {item.assignedTo}</Text>
            )}
            {isRequired && <Text style={styles.todoRequiredText}>Everyone must bring this</Text>}
          </View>
        </View>

        {/* Afficher le nombre de personnes qui apportent */}
        {!isRequired && (
          <View style={styles.todoRightSection}>
            {/* Compteur de bringers - toujours visible */}
            <TouchableOpacity
              style={styles.bringersCount}
              onPress={handleShowBringers}
              activeOpacity={0.7}
            >
              {bringersCount > 0 ? (
                <>
                  <View style={styles.bringersAvatars}>
                    {/* Mini avatars des 3 premières personnes */}
                    {bringers.slice(0, 3).map((bringerId, idx) => (
                      <View
                        key={bringerId}
                        style={[
                          styles.miniAvatar,
                          { marginLeft: idx > 0 ? -8 : 0, zIndex: 3 - idx },
                        ]}
                      >
                        <Text style={styles.miniAvatarText}>
                          {bringerId === profile?.id ? 'Y' : 'U'}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.bringersCountText}>{bringersCount}</Text>
                </>
              ) : (
                <Text style={styles.bringersCountText}>0</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </TouchableOpacity>

            {/* Bouton pour toggle */}
            <TouchableOpacity
              style={[styles.todoClaimButton, isBringingThis && styles.todoClaimButtonActive]}
              onPress={handleItemPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.todoClaimText, isBringingThis && styles.todoClaimTextActive]}>
                {isBringingThis ? "I won't bring" : "I'll bring"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleQuestionResponse = (questionId: string, text: string) => {
    setQuestionResponses((prev) => ({
      ...prev,
      [questionId]: text,
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
      Alert.alert(
        t('events.details.missingResponses', 'Missing responses'),
        t('events.details.answerAllQuestions', 'Please answer all required questions')
      );
      return;
    }

    if (!profile?.id) {
      Alert.alert(
        t('auth.signInRequired', 'Sign in required'),
        t('events.details.signInToRespond', 'Please sign in to submit responses')
      );
      return;
    }

    // Submit responses to database
    const result = await EventServiceComplete.submitQuestionnaireResponses(
      eventId!,
      profile.id,
      questionResponses
    );

    if (result.success) {
      Alert.alert(
        t('common.success'),
        t('events.details.responsesSubmitted', 'Your responses have been submitted!')
      );
      // Clear responses after successful submission
      setQuestionResponses({});
    } else {
      Alert.alert(
        t('errors.general'),
        result.error || t('events.details.submitResponsesError', 'Failed to submit responses')
      );
    }
  };

  const handleOpenWebsite = () => {
    if (eventWebsite) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let url = eventWebsite;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  const handleCallContact = () => {
    if (contactInfo) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const phoneNumber = contactInfo.replace(/\D/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
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
        <Text style={styles.errorText}>{t('events.errors.notFound', 'Event not found')}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>{t('common.goBack', 'Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Extract cover data - prioritize extra_data.coverData over cover_data
  const coverData = event.extra_data?.coverData || event.cover_data || {};
  const isHost = event.created_by === profile?.id;

  // Extract data from event object - prioritize extra_data for consistency
  const costs = event.extra_data?.costs || event.event_costs || [];
  const eventPhotos =
    event.extra_data?.eventPhotos ||
    event.extra_data?.event_photos ||
    event.event_photos?.map((p: any) => p.photo_url || p) ||
    [];
  // Priorité aux items depuis extra_data car ils contiennent le type
  const items = (() => {
    // D'abord vérifier dans extra_data
    if (event.extra_data?.itemsToBring && event.extra_data.itemsToBring.length > 0) {
      console.log(
        '🎁 [EventDetailsScreen] Items from itemsToBring:',
        event.extra_data.itemsToBring
      );
      // S'assurer que assignedTo est bien mappé
      return event.extra_data.itemsToBring.map((item: any) => ({
        ...item,
        assignedTo: item.assignedTo || item.assigned_to || item.assignee || null,
      }));
    }
    if (event.extra_data?.items_to_bring && event.extra_data.items_to_bring.length > 0) {
      console.log(
        '🎁 [EventDetailsScreen] Items from items_to_bring:',
        event.extra_data.items_to_bring
      );
      // S'assurer que assignedTo est bien mappé
      return event.extra_data.items_to_bring.map((item: any) => ({
        ...item,
        assignedTo: item.assignedTo || item.assigned_to || item.assignee || null,
      }));
    }
    // Sinon utiliser event_items mais sans le type
    if (event.event_items && event.event_items.length > 0) {
      console.log('🎁 [EventDetailsScreen] Items from event_items (no type):', event.event_items);
      return event.event_items.map((item: any) => ({
        ...item,
        name: item.name || item.item_name,
        quantity: item.quantity || item.quantity_needed || 1,
        assignedTo: item.assigned_to || item.assignedTo || null,
        type: 'suggested', // Défaut car pas de type dans la DB
      }));
    }
    return [];
  })();

  console.log('🎁 [EventDetailsScreen] Final items extracted:', items);
  console.log('🎁 [EventDetailsScreen] Event extra_data:', event.extra_data);
  console.log('🎁 [EventDetailsScreen] Raw event_items:', event.event_items);
  // Log each item's assignedTo value
  items.forEach((item: any, index: number) => {
    console.log(`🎁 [EventDetailsScreen] Item ${index} assignedTo:`, item.assignedTo);
  });
  const coHosts = event.extra_data?.coHosts || event.event_cohosts || event.co_organizers || [];
  const questionnaire =
    event.extra_data?.questionnaire ||
    event.event_questionnaire?.map((q: any) => ({
      ...q,
      text: q.question_text || q.question || q.text,
      type: q.question_type || q.type || 'short',
      options: q.question_options
        ? typeof q.question_options === 'string'
          ? JSON.parse(q.question_options)
          : q.question_options
        : q.options || [],
      required: q.is_required || q.required || false,
    })) ||
    [];
  const playlist = event.extra_data?.playlist || event.event_playlists || [];
  const playlistSettings = event.extra_data?.playlistSettings || {
    spotifyLink: event.extra_data?.spotifyLink,
    appleMusicLink: event.extra_data?.appleMusicLink,
    acceptSuggestions: true,
  };
  const itemsSettings = event.extra_data?.itemsSettings || {
    allowGuestSuggestions: true,
    requireSignup: false,
    showQuantities: true,
  };
  const questionnaireSettings = event.extra_data?.questionnaireSettings || {
    allowSkipAll: true,
    showResponsesLive: true,
  };
  const dressCode = event.extra_data?.dressCode || event.dress_code || null;
  const eventTheme = event.extra_data?.eventTheme || event.theme || null;
  const ageRestriction = event.extra_data?.ageRestriction || event.age_restriction || null;
  const parkingInfo = event.extra_data?.parkingInfo || event.parking_info || null;
  console.log('🚗 [EventDetailsScreen] Parking info from event:', {
    fromExtraData: event.extra_data?.parkingInfo,
    fromParkingInfo: event.parking_info,
    final: parkingInfo,
    hasParkingEnabled: event.has_parking_info_enabled,
  });
  const accessibilityInfo = event.extra_data?.accessibilityInfo || event.accessibility_info || null;
  const capacityLimit = event.extra_data?.capacityLimit || event.max_attendees || null;
  const eventCategory = event.extra_data?.eventCategory || event.category || null;
  const eventWebsite = event.extra_data?.eventWebsite || event.event_website || null;
  const contactInfo = event.extra_data?.contactInfo || event.contact_info || null;
  const rsvpDeadline = event.rsvp_deadline || event.extra_data?.rsvpDeadline || null;
  const rsvpReminderEnabled =
    event.rsvp_reminder_enabled || event.extra_data?.rsvpReminderEnabled || false;
  const rsvpReminderTiming =
    event.rsvp_reminder_timing || event.extra_data?.rsvpReminderTiming || '24h';

  // Calculer les statistiques pour une question à choix multiple
  const getMultipleChoiceStats = (questionId: string, options: string[]) => {
    console.log('🔍 [getMultipleChoiceStats] Question ID:', questionId);
    console.log('🔍 [getMultipleChoiceStats] Options:', options);
    console.log('🔍 [getMultipleChoiceStats] Toutes les réponses:', allQuestionnaireResponses);

    const responsesForQuestion = allQuestionnaireResponses.filter(
      (r) => r.question_id === questionId
    );

    console.log('🔍 [getMultipleChoiceStats] Réponses pour cette question:', responsesForQuestion);

    const stats = options.map((option) => {
      const count = responsesForQuestion.filter((r) => r.answer === option).length;
      return {
        option,
        count,
        percentage:
          responsesForQuestion.length > 0 ? (count / responsesForQuestion.length) * 100 : 0,
      };
    });

    return {
      stats,
      totalVotes: responsesForQuestion.length,
    };
  };

  // Obtenir les réponses texte pour une question
  const getTextResponses = (questionId: string) => {
    return allQuestionnaireResponses
      .filter((r) => r.question_id === questionId)
      .map((r) => ({
        answer: r.answer,
        user: r.user || { full_name: 'Anonymous' },
        submitted_at: r.submitted_at,
      }))
      .slice(0, 5); // Limiter à 5 réponses pour l'affichage
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} bounces={true}>
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
              <EventOptionsButton
                eventId={eventId}
                eventTitle={event.title || 'Untitled Event'}
                organizerId={event.created_by}
                isOrganizer={isHost}
                isAttending={attendees.some((a) => a.user_id === session?.user?.id)}
                onEdit={handleEditEvent}
                onDelete={() => router.back()}
                onLeave={() => router.back()}
                trigger={
                  <View style={{ paddingHorizontal: 4 }}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                  </View>
                }
              />
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

          {/* Gradient overlay for bottom section */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.coverBottomGradient}
            pointerEvents="none"
          />

          {/* Info bar and CTA at bottom of cover */}
          <View style={styles.coverBottomSection}>
            {/* Privacy indicator - centered above price */}
            <View style={styles.privacyBadge}>
              <Ionicons
                name={event.is_private ? 'lock-closed' : 'globe-outline'}
                size={18}
                color="#FFF"
              />
              <Text style={styles.privacyBadgeText}>
                {event.is_private ? 'Private Event' : 'Public Event'}
              </Text>
            </View>

            {/* Price info */}
            {costs.length > 0 && (
              <View style={styles.coverPriceInfo}>
                <Text style={styles.coverPriceText}>
                  $
                  {costs
                    .reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0)
                    .toFixed(0)}{' '}
                  per person
                </Text>
              </View>
            )}

            {/* Capacity bar */}
            {capacityLimit && capacityLimit > 0 && (
              <View style={styles.coverCapacityInfo}>
                <View style={styles.coverCapacityBar}>
                  <View
                    style={[
                      styles.coverCapacityFill,
                      {
                        width: `${Math.min(((event.current_attendees || 0) / capacityLimit) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.coverCapacityText}>
                  {event.current_attendees || 0} attending
                  {(event.current_attendees || 0) < capacityLimit &&
                    ` • ${capacityLimit - (event.current_attendees || 0)} spots remaining`}
                </Text>
                {/* Waitlist info */}
                {event.extra_data?.waitlistEnabled &&
                  (event.current_attendees || 0) >= capacityLimit && (
                    <View style={styles.waitlistInfo}>
                      <Ionicons name="list-circle" size={16} color="#FF9500" />
                      <Text style={styles.waitlistText}>
                        {event.waitlist_count || 0} on waitlist
                        {event.user_waitlist_position &&
                          ` • You're #${event.user_waitlist_position}`}
                      </Text>
                    </View>
                  )}
              </View>
            )}

            {/* CTA Button - different for host vs guest */}
            {!isHost ? (
              <TouchableOpacity
                style={[
                  styles.coverCTAButton,
                  event.user_waitlist_position && styles.coverCTAButtonWaitlist,
                ]}
                onPress={handleJoinEvent}
              >
                <Text style={styles.coverCTAText}>
                  {event.user_status === 'attending'
                    ? "You're Going!"
                    : event.user_status === 'pending'
                      ? 'Request Pending'
                      : event.user_waitlist_position
                        ? 'Join Waitlist'
                        : capacityLimit &&
                            (event.current_attendees || 0) >= capacityLimit &&
                            event.extra_data?.waitlistEnabled
                          ? 'Join Waitlist'
                          : !event.extra_data?.autoApprove
                            ? 'Request to Join'
                            : event.is_private
                              ? 'Request to Join'
                              : 'Reserve Your Spot'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.hostPreviewBadge}>
                <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                <Text style={styles.hostPreviewText}>
                  {t('events.details.hostPreview', 'Host Preview')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Details section */}
        <View style={styles.detailsSheet}>
          {/* HERO SECTION - Combined Info */}
          <View style={styles.heroSection}>
            {/* Host buttons */}
            {isHost && (
              <View style={styles.hostButtonsRow}>
                <TouchableOpacity style={styles.inviteButton}>
                  <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.inviteButtonText}>
                    {t('events.details.invite', 'Invite')}
                  </Text>
                </TouchableOpacity>
                {!event.extra_data?.autoApprove && event.pending_requests?.length > 0 && (
                  <TouchableOpacity
                    style={[styles.sendReminderButton, styles.pendingRequestsButton]}
                    onPress={() => setShowAttendeesModal(true)}
                  >
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{event.pending_requests.length}</Text>
                    </View>
                    <Text style={styles.pendingRequestsButtonText}>
                      {t('events.details.pendingRequests', 'Pending Requests')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.sendReminderButton}>
                  <Ionicons name="send-outline" size={18} color="#007AFF" />
                  <Text style={styles.sendReminderButtonText}>
                    {t('events.details.sendReminder', 'Send Reminder')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            )}
            {/* Event Title (already in header, but keeping for reference) */}

            {/* Host Card with Rating - Enhanced Design */}
            <View style={styles.organizerCard}>
              <View style={styles.hostMainSection}>
                <View style={styles.hostCardTop}>
                  <Image
                    source={{
                      uri:
                        event.organizer?.avatar_url ||
                        event.extra_data?.host?.avatar ||
                        'https://via.placeholder.com/60',
                    }}
                    style={styles.organizerAvatar}
                  />
                  <View style={styles.organizerInfo}>
                    <Text style={styles.hostLabel}>
                      {t('events.details.hostedBy', 'Hosted by')}
                    </Text>
                    <Text style={styles.organizerName}>
                      {event.organizer?.full_name || event.extra_data?.host?.name || 'Host'}
                    </Text>
                    <View style={styles.hostRatingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={
                            star <= Math.floor(organizerRating?.average_rating || 0)
                              ? 'star'
                              : 'star-outline'
                          }
                          size={14}
                          color="#FFB800"
                          style={{ marginRight: 1 }}
                        />
                      ))}
                      {organizerRating && organizerRating.total_ratings > 0 && (
                        <Text style={styles.hostRatingText}>
                          {organizerRating.average_rating.toFixed(1)} •{' '}
                          {organizerRating.total_ratings} rating
                          {organizerRating.total_ratings > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.messageHostBtn}>
                  <LinearGradient
                    colors={['#007AFF', '#0051D5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.messageButtonGradient}
                  >
                    <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
                    <Text style={styles.messageHostBtnText}>{t('chat.title')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Co-hosts section */}
              {event.extra_data?.coHosts && event.extra_data.coHosts.length > 0 && (
                <View style={styles.coHostDivider}>
                  <Text style={styles.coHostLabel}>
                    {t('events.details.coHostedWith', 'Co-hosted with')}
                  </Text>
                  <View style={styles.coHostsList}>
                    {event.extra_data.coHosts.slice(0, 3).map((coHost: any, index: number) => {
                      const userId = coHost.id || coHost.user_id;
                      const rating = coHostsRatings[userId];
                      return (
                        <View key={coHost.id || index} style={styles.coHostItem}>
                          <Image
                            source={{ uri: coHost.avatar || 'https://via.placeholder.com/40' }}
                            style={styles.coHostAvatar}
                          />
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.coHostName}>{coHost.name}</Text>
                            {rating && rating.total_ratings > 0 && (
                              <>
                                <Ionicons name="star" size={12} color="#FFD700" />
                                <Text style={{ fontSize: 12, color: '#666' }}>
                                  {rating.average_rating.toFixed(1)}
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                    {event.extra_data.coHosts.length > 3 && (
                      <Text style={styles.moreCoHosts}>
                        +{event.extra_data.coHosts.length - 3} more
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Date/Time/Location */}
            <View style={styles.heroInfoGrid}>
              <View style={styles.heroInfoItem}>
                <Ionicons name="calendar-outline" size={20} color="#000" />
                <View style={styles.heroInfoContent}>
                  <Text style={styles.heroInfoTitle}>
                    {formatDate(event.start_time).split(',')[0]}
                    {event.end_date &&
                      formatDate(event.end_date).split(',')[0] !==
                        formatDate(event.start_time).split(',')[0] &&
                      ` - ${formatDate(event.end_date).split(',')[0]}`}
                  </Text>
                  <Text style={styles.heroInfoSubtitle}>
                    {formatTime(event.start_time)}
                    {event.end_time || event.end_date
                      ? ` - ${formatTime(event.end_time || event.end_date)}`
                      : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.heroInfoItem}>
                <Ionicons name="location-outline" size={20} color="#000" />
                <View style={styles.heroInfoContent}>
                  <Text style={styles.heroInfoTitle} numberOfLines={1}>
                    {event.venue_name || event.location_details?.name || 'Location TBD'}
                  </Text>
                  {event.address && (
                    <Text style={styles.heroInfoSubtitle} numberOfLines={1}>
                      {event.address}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Who's Coming Section */}
            <View style={styles.capacityAndAttendeesSection}>
              {/* Who's coming - Photos avec noms */}
              <View style={styles.attendeesPreview}>
                <View style={styles.attendeesRow}>
                  <View style={styles.attendeesLeft}>
                    <View style={styles.attendeesList}>
                      {[1, 2, 3].map((_, index) => (
                        <Image
                          key={index}
                          source={{ uri: `https://i.pravatar.cc/100?img=${index + 10}` }}
                          style={[styles.attendeeAvatar, index > 0 && { marginLeft: -12 }]}
                        />
                      ))}
                      {(event.current_attendees || 12) > 3 && (
                        <View
                          style={[styles.attendeeAvatar, styles.moreAttendees, { marginLeft: -12 }]}
                        >
                          <Text style={styles.moreAttendeesText}>
                            +{(event.current_attendees || 12) - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.attendeesText}>
                      Marie, Paul et {(event.current_attendees || 12) - 2} autres
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAttendeesModal(true)}
                    style={styles.viewAllButton}
                  >
                    <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Spots remaining message if limited */}
              {capacityLimit && capacityLimit > 0 && (
                <Text style={styles.spotsRemainingText}>
                  {(event.current_attendees || 0) >= capacityLimit
                    ? event.extra_data?.waitlistEnabled
                      ? `🔥 Event full • ${event.waitlist_count || 0} on waitlist`
                      : '🔥 Event full • No waitlist available'
                    : capacityLimit - (event.current_attendees || 0) < 20
                      ? `🔥 Plus que ${capacityLimit - (event.current_attendees || 0)} places!`
                      : `${capacityLimit - (event.current_attendees || 0)} spots available`}
                </Text>
              )}

              {/* Approval type indicator */}
              {!event.extra_data?.autoApprove && (
                <View style={styles.approvalIndicator}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#FF9500" />
                  <Text style={styles.approvalText}>
                    {t('events.details.hostApprovalRequired', 'Host approval required')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* About Section with Integrated Category */}
          <View style={styles.aboutSection}>
            <View style={styles.aboutHeader}>
              <Text style={styles.sectionTitle}>{t('events.details.about')}</Text>
              {(event.extra_data?.event_category || event.event_category || event.category) && (
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagIcon}>
                    {getCategoryIcon(
                      event.extra_data?.event_category ||
                        event.event_category ||
                        event.category ||
                        'social'
                    )}
                  </Text>
                  <Text style={styles.categoryTagText}>
                    {getCategoryDisplayName(
                      event.extra_data?.event_category ||
                        event.event_category ||
                        event.category ||
                        'social'
                    )}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.aboutDescription}>
              {event.description ||
                t(
                  'events.details.defaultDescription',
                  'Join us for an amazing experience! The host will share more details soon.'
                )}
            </Text>
            {event.description && event.description.length > 200 && (
              <TouchableOpacity style={styles.showMoreButton}>
                <Text style={styles.showMoreText}>{t('common.showMore')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* La section Who's Coming est maintenant fusionnée dans le Hero */}

          {/* Things to Know - Grouped and Moved Up */}
          {(dressCode ||
            eventTheme ||
            ageRestriction ||
            event.extra_data?.allowPlusOnes ||
            rsvpDeadline ||
            contactInfo ||
            eventWebsite ||
            parkingInfo) && (
            <View style={styles.thingsToKnowSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t('events.details.thingsToKnow', 'Things to know')}
                </Text>
              </View>

              <View style={styles.thingsToKnowGrid}>
                {/* RSVP Deadline - Moved here */}
                {rsvpDeadline && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="timer-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.rsvpDeadline', 'RSVP deadline')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>
                        {new Date(event.extra_data.rsvp_deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dress Code */}
                {dressCode && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="shirt-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.dressCode', 'Dress code')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>{dressCode}</Text>
                    </View>
                  </View>
                )}

                {/* Theme */}
                {eventTheme && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="color-palette-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.eventTheme', 'Event theme')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>{eventTheme}</Text>
                    </View>
                  </View>
                )}

                {/* Age Restriction */}
                {ageRestriction && (
                  <View style={styles.thingToKnowItem}>
                    <MaterialCommunityIcons name="account-check-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.ageRequirement', 'Age requirement')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>{ageRestriction}</Text>
                    </View>
                  </View>
                )}

                {/* Plus Ones */}
                {event.extra_data?.allow_plus_ones && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="person-add-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.guestsAllowed', 'Guests allowed')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>
                        {event.extra_data.max_plus_ones
                          ? `Bring up to ${event.extra_data.max_plus_ones} guest${event.extra_data.max_plus_ones > 1 ? 's' : ''}`
                          : 'Plus ones welcome'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Event Type */}
                <View style={styles.thingToKnowItem}>
                  <Ionicons name="pricetag-outline" size={20} color="#000" />
                  <View style={styles.thingToKnowContent}>
                    <Text style={styles.thingToKnowTitle}>
                      {t('events.details.eventType', 'Event type')}
                    </Text>
                    <Text style={styles.thingToKnowValue}>
                      {getCategoryDisplayName(
                        event.extra_data?.event_category ||
                          event.event_category ||
                          event.category ||
                          'social'
                      )}
                    </Text>
                  </View>
                </View>

                {/* Capacity Limit */}
                {capacityLimit && capacityLimit > 0 && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="people-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.eventCapacity', 'Event capacity')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>
                        Limited to {capacityLimit} guests
                        {event.extra_data?.waitlistEnabled && ' • Waitlist available'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Approval Type */}
                {!event.extra_data?.autoApprove && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.registration', 'Registration')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>
                        {t('events.details.hostApprovalRequired', 'Host approval required')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Contact Info */}
                {contactInfo && (
                  <View style={styles.thingToKnowItem}>
                    <Ionicons name="call-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.contact', 'Contact')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>{contactInfo}</Text>
                    </View>
                  </View>
                )}

                {/* Event Website */}
                {eventWebsite && (
                  <TouchableOpacity
                    style={styles.thingToKnowItem}
                    onPress={() => Linking.openURL(eventWebsite)}
                  >
                    <Ionicons name="globe-outline" size={20} color="#000" />
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.website', 'Website')}
                      </Text>
                      <Text
                        style={[
                          styles.thingToKnowValue,
                          { color: '#007AFF', textDecorationLine: 'underline' },
                        ]}
                      >
                        {eventWebsite.replace(/^https?:\/\//, '')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Parking */}
                {parkingInfo && (
                  <View style={styles.thingToKnowItem}>
                    <Text style={{ fontSize: 20 }}>
                      {(() => {
                        try {
                          const parsed = JSON.parse(parkingInfo);
                          if (!parsed.available) return '🚫';
                          const emojis: { [key: string]: string } = {
                            free: '🆓',
                            paid: '💳',
                            street: '🛣️',
                            valet: '🚗',
                            limited: '⚠️',
                          };
                          return emojis[parsed.type] || '🅿️';
                        } catch {
                          return '🅿️';
                        }
                      })()}
                    </Text>
                    <View style={styles.thingToKnowContent}>
                      <Text style={styles.thingToKnowTitle}>
                        {t('events.details.parking', 'Parking')}
                      </Text>
                      <Text style={styles.thingToKnowValue}>
                        {(() => {
                          try {
                            const parsed = JSON.parse(parkingInfo);
                            if (!parsed.available) return 'No parking';
                            const types: { [key: string]: string } = {
                              free: 'Free parking',
                              paid: 'Paid parking',
                              street: 'Street parking',
                              valet: 'Valet service',
                              limited: 'Limited parking',
                            };
                            let result = types[parsed.type] || 'Available';
                            if (
                              parsed.price &&
                              (parsed.type === 'paid' || parsed.type === 'valet')
                            ) {
                              result += ` • ${parsed.price}`;
                            }
                            return result;
                          } catch {
                            return parkingInfo.includes('No parking') ? 'No parking' : 'Available';
                          }
                        })()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Event Costs Section */}
          {costs.length > 0 && (
            <View style={styles.costsDetailSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t('events.details.eventCosts', 'Event costs')}
                </Text>
                <Text style={styles.costsTotalBadge}>
                  $
                  {costs
                    .reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0)
                    .toFixed(0)}{' '}
                  total
                </Text>
              </View>
              <View style={styles.costsBreakdown}>
                {costs.map((cost: any, index: number) => (
                  <View key={cost.id || index} style={styles.costItem}>
                    <View style={styles.costLeft}>
                      <Text style={styles.costDescription}>{cost.description}</Text>
                      {cost.description.toLowerCase().includes('required') && (
                        <Text style={styles.costRequired}>
                          • {t('common.required', 'Required')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.costAmount}>
                      {cost.currency || '$'}
                      {parseFloat(cost.amount).toFixed(0)}
                    </Text>
                  </View>
                ))}
                <View style={styles.costNote}>
                  <Ionicons name="information-circle" size={16} color="#8E8E93" />
                  <Text style={styles.costNoteText}>
                    {t('events.details.paymentAtEvent', 'Payment collected at the event')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Parking & Transportation */}
          {parkingInfo && event.has_parking_info_enabled && (
            <View style={styles.parkingSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t('events.details.parkingTransportation', 'Parking & Transportation')}
                </Text>
              </View>
              <View style={styles.infoCard}>
                {(() => {
                  try {
                    // Try to parse as JSON (new format)
                    console.log('🚗 [EventDetailsScreen] Raw parking info to parse:', parkingInfo);
                    console.log(
                      '🚗 [EventDetailsScreen] Type of parking info:',
                      typeof parkingInfo
                    );
                    const parsed = JSON.parse(parkingInfo);
                    console.log('🚗 [EventDetailsScreen] Parsed parking JSON:', parsed);
                    console.log('🚗 [EventDetailsScreen] Parsed type:', typeof parsed);
                    const parkingTypes: { [key: string]: { label: string; emoji: string } } = {
                      free: { label: 'Free Parking', emoji: '🆓' },
                      paid: { label: 'Paid Parking', emoji: '💳' },
                      street: { label: 'Street Parking', emoji: '🛣️' },
                      valet: { label: 'Valet Service', emoji: '🚗' },
                      limited: { label: 'Limited Spots', emoji: '⚠️' },
                    };

                    if (!parsed.available) {
                      return (
                        <>
                          <View style={styles.infoRow}>
                            <Text style={styles.parkingEmoji}>🚫</Text>
                            <Text style={styles.infoText}>
                              {t(
                                'events.details.noParkingAtVenue',
                                'No parking available at venue'
                              )}
                            </Text>
                          </View>
                          {parsed.nearbyOptions && (
                            <View style={[styles.infoRow, { marginTop: 12 }]}>
                              <Text style={styles.parkingEmoji}>ℹ️</Text>
                              <Text style={styles.infoText}>{parsed.nearbyOptions}</Text>
                            </View>
                          )}
                        </>
                      );
                    }

                    // Get the parking type info - handle both string and parsed types
                    let typeKey = '';
                    if (typeof parsed === 'object' && parsed.type) {
                      typeKey = parsed.type;
                    } else if (typeof parsed === 'string') {
                      // Handle case where type might be stored directly
                      typeKey = parsed;
                    }

                    const typeInfo = parkingTypes[typeKey];

                    // If we have a valid type, show it
                    if (typeInfo && parsed.available !== false) {
                      return (
                        <>
                          <View style={styles.infoRow}>
                            <Text style={styles.parkingEmoji}>{typeInfo.emoji}</Text>
                            <View style={styles.parkingContent}>
                              <Text style={styles.parkingType}>{typeInfo.label}</Text>
                              {parsed.price && (
                                <Text style={styles.parkingPrice}>{parsed.price}</Text>
                              )}
                            </View>
                          </View>
                          {parsed.instructions && (
                            <View style={[styles.infoRow, { marginTop: 12 }]}>
                              <Text style={[styles.parkingEmoji, { fontSize: 20 }]}>📍</Text>
                              <Text style={styles.parkingInstructions}>{parsed.instructions}</Text>
                            </View>
                          )}
                        </>
                      );
                    }

                    // No parking type specified - don't show anything
                    return null;
                  } catch {
                    // Fallback for old string format
                    return (
                      <View style={styles.infoRow}>
                        <Text style={styles.parkingEmoji}>🅿️</Text>
                        <Text style={styles.infoText}>{parkingInfo}</Text>
                      </View>
                    );
                  }
                })()}
              </View>
            </View>
          )}

          {/* Accessibility */}
          {accessibilityInfo && (
            <View style={styles.accessibilitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Accessibility</Text>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="wheelchair-accessibility"
                    size={24}
                    color="#007AFF"
                  />
                  <Text style={styles.infoText}>{accessibilityInfo}</Text>
                </View>
              </View>
            </View>
          )}

          {/* What to Bring - Todo List Style */}
          {items.length > 0 && (
            <View style={styles.itemsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>What to bring</Text>
                <Text style={styles.itemsCount}>
                  {items.filter((i: any) => i.type === 'required').length} required •{' '}
                  {items.filter((i: any) => i.type === 'suggested').length} suggested •{' '}
                  {items.filter((i: any) => i.type === 'open').length} open
                </Text>
              </View>

              {/* Required Items */}
              {items.filter((item: any) => item.type === 'required').length > 0 && (
                <View style={styles.itemsTypeSection}>
                  <View style={styles.itemsTypeHeader}>
                    <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                    <Text style={[styles.itemsTypeTitle, { color: '#FF3B30' }]}>Required</Text>
                  </View>
                  <View style={styles.todoContainer}>
                    {items
                      .filter((item: any) => item.type === 'required')
                      .map((item: any, index: number) => renderItemCard(item, index))}
                  </View>
                </View>
              )}

              {/* Suggested Items */}
              {items.filter((item: any) => item.type === 'suggested').length > 0 && (
                <View style={styles.itemsTypeSection}>
                  <View style={styles.itemsTypeHeader}>
                    <Ionicons name="bulb-outline" size={18} color="#FF9500" />
                    <Text style={[styles.itemsTypeTitle, { color: '#FF9500' }]}>Suggested</Text>
                  </View>
                  <View style={styles.todoContainer}>
                    {items
                      .filter((item: any) => item.type === 'suggested')
                      .map((item: any, index: number) => renderItemCard(item, index))}
                  </View>
                </View>
              )}

              {/* Open Items */}
              {items.filter((item: any) => item.type === 'open').length > 0 && (
                <View style={styles.itemsTypeSection}>
                  <View style={styles.itemsTypeHeader}>
                    <Ionicons name="add-circle-outline" size={18} color="#34C759" />
                    <Text style={[styles.itemsTypeTitle, { color: '#34C759' }]}>
                      Open (Guests can choose)
                    </Text>
                  </View>
                  <View style={styles.todoContainer}>
                    {items
                      .filter((item: any) => item.type === 'open')
                      .map((item: any, index: number) => renderItemCard(item, index))}
                  </View>
                </View>
              )}

              {/* Guest Suggestions Section */}
              {itemsSettings.allowGuestSuggestions && (
                <View style={styles.guestSuggestionsSection}>
                  {!isHost ? (
                    <TouchableOpacity style={styles.suggestItemButton} onPress={handleSuggestItem}>
                      <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                      <Text style={styles.suggestItemText}>Suggest an item</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.guestSuggestionsInfo}>
                      <Ionicons name="information-circle" size={16} color="#8E8E93" />
                      <Text style={styles.guestSuggestionsText}>Guests can suggest items</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Sign Up Required Notice */}
              {itemsSettings.requireSignup && !isHost && (
                <View style={styles.signupRequiredNotice}>
                  <Ionicons name="lock-closed-outline" size={16} color="#8E8E93" />
                  <Text style={styles.signupRequiredText}>Sign up required to claim items</Text>
                </View>
              )}
            </View>
          )}

          {/* Photo Gallery */}
          {eventPhotos.length > 0 && (
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

          {/* Map - Moved Down */}
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
                  {event.address && <Text style={styles.locationAddress}>{event.address}</Text>}
                  <TouchableOpacity
                    style={styles.getDirectionsButton}
                    onPress={() => {
                      const coords = event.coordinates;
                      const lat = coords.lat || coords.latitude;
                      const lng = coords.lng || coords.longitude;
                      const url =
                        Platform.OS === 'ios'
                          ? `maps:0,0?q=${lat},${lng}`
                          : `geo:0,0?q=${lat},${lng}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Text style={styles.getDirectionsText}>Get directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Playlist Section */}
          {playlist.length > 0 && (
            <View style={styles.playlistSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Event Playlist</Text>
                {playlistSettings?.spotifyLink && (
                  <TouchableOpacity
                    style={styles.spotifyButton}
                    onPress={() => Linking.openURL(playlistSettings.spotifyLink)}
                  >
                    <Ionicons name="musical-notes" size={16} color="#1DB954" />
                    <Text style={styles.spotifyButtonText}>Open in Spotify</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.playlistContainer}>
                {playlist.slice(0, 5).map((song: any, index: number) => (
                  <View key={song.id || index} style={styles.songItem}>
                    <Text style={styles.songNumber}>{index + 1}</Text>
                    <View style={styles.songInfo}>
                      <Text style={styles.songTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                  </View>
                ))}
                {playlist.length > 5 && (
                  <Text style={styles.morePlaylistText}>+{playlist.length - 5} more songs</Text>
                )}
                {playlistSettings?.acceptSuggestions && !isHost && (
                  <TouchableOpacity style={styles.suggestSongButton}>
                    <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                    <Text style={styles.suggestSongText}>Suggest a song</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Q&A Section */}
          {questionnaire.length > 0 && questionnaire.length > 0 && (
            <View style={styles.questionnaireSection}>
              <Text style={styles.sectionTitle}>Questions from the host</Text>

              {/* For Hosts - Show Responses */}
              {isHost ? (
                <View style={styles.responsesContainer}>
                  <View style={styles.responsesHeader}>
                    <Text style={styles.responsesIntro}>Guest responses</Text>
                    {event.extra_data?.questionnaireSettings?.showResponsesLive && (
                      <View style={styles.liveResponsesBadge}>
                        <Ionicons name="eye" size={14} color="#007AFF" />
                        <Text style={styles.liveResponsesText}>Visible to all</Text>
                      </View>
                    )}
                  </View>

                  {questionnaire.map((question: any, index: number) => {
                    const questionType = question.type || question.question_type || 'short';
                    const options = question.options || question.question_options;
                    const parsedOptions = options
                      ? typeof options === 'string'
                        ? JSON.parse(options)
                        : options
                      : null;

                    return (
                      <View key={question.id || index} style={styles.responseCard}>
                        <View style={styles.responseQuestionHeader}>
                          <Text style={styles.responseQuestion}>
                            {question.question || question.question_text || question.text}
                          </Text>
                          {question.is_required && (
                            <View style={styles.questionRequiredBadge}>
                              <Text style={styles.questionRequiredBadgeText}>Required</Text>
                            </View>
                          )}
                        </View>

                        {/* Multiple Choice - Show Vote Count */}
                        {questionType === 'multiple' && parsedOptions ? (
                          <View style={styles.multipleChoiceResults}>
                            {(() => {
                              const questionId = question.id || index.toString();
                              const { stats, totalVotes } = getMultipleChoiceStats(
                                questionId,
                                parsedOptions
                              );

                              return stats.map((stat, optIndex) => (
                                <View key={optIndex} style={styles.voteOption}>
                                  <View style={styles.voteHeader}>
                                    <Text style={styles.voteOptionText}>{stat.option}</Text>
                                    <Text style={styles.voteCount}>{stat.count} votes</Text>
                                  </View>
                                  <View style={styles.voteBarContainer}>
                                    <View
                                      style={[styles.voteBar, { width: `${stat.percentage}%` }]}
                                    />
                                  </View>
                                </View>
                              ));
                            })()}
                          </View>
                        ) : questionType === 'host-answer' ? (
                          <View style={styles.hostAnswerDisplay}>
                            <Text style={styles.hostAnswerLabel}>Your answer:</Text>
                            <Text style={styles.hostAnswerValue}>{question.host_answer}</Text>
                          </View>
                        ) : (
                          /* Short Answer Responses */
                          <View style={styles.responsesGrid}>
                            {(() => {
                              const questionId = question.id || index.toString();
                              const textResponses = getTextResponses(questionId);

                              if (textResponses.length === 0) {
                                return <Text style={styles.noResponsesText}>No responses yet</Text>;
                              }

                              return textResponses.map((response, idx) => (
                                <View key={idx} style={styles.guestResponse}>
                                  <View style={styles.guestResponseHeader}>
                                    <Image
                                      source={{
                                        uri:
                                          response.user.avatar_url ||
                                          `https://i.pravatar.cc/100?u=${response.user.id}`,
                                      }}
                                      style={styles.guestResponseAvatar}
                                    />
                                    <Text style={styles.guestResponseName}>
                                      {response.user.full_name ||
                                        response.user.username ||
                                        'Anonymous'}
                                    </Text>
                                  </View>
                                  <Text style={styles.guestResponseText}>{response.answer}</Text>
                                </View>
                              ));
                            })()}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* For Guests - Answer Form */
                <View style={styles.questionsForm}>
                  {questionnaire.map((question: any, index: number) => {
                    const questionType = question.type || question.question_type || 'short';
                    const questionText =
                      question.question || question.question_text || question.text;
                    const questionId = question.id || index;
                    const options = question.options || question.question_options;
                    const parsedOptions = options
                      ? typeof options === 'string'
                        ? JSON.parse(options)
                        : options
                      : null;
                    const hostAnswer = question.host_answer;

                    return (
                      <View key={questionId} style={styles.questionFormItem}>
                        <Text style={styles.questionLabel}>
                          {questionText}
                          {question.is_required && <Text style={styles.requiredStar}> *</Text>}
                        </Text>

                        {/* Short Answer */}
                        {questionType === 'short' && (
                          <TextInput
                            style={styles.questionInput}
                            placeholder="Type your answer here..."
                            placeholderTextColor="#8E8E93"
                            multiline
                            numberOfLines={3}
                            value={questionResponses[questionId] || ''}
                            onChangeText={(text) => handleQuestionResponse(questionId, text)}
                          />
                        )}

                        {/* Multiple Choice */}
                        {questionType === 'multiple' && parsedOptions && (
                          <View style={styles.multipleChoiceContainer}>
                            {parsedOptions.map((option: string, optionIndex: number) => (
                              <TouchableOpacity
                                key={optionIndex}
                                style={[
                                  styles.multipleChoiceOption,
                                  questionResponses[questionId] === option &&
                                    styles.multipleChoiceOptionSelected,
                                ]}
                                onPress={() => handleQuestionResponse(questionId, option)}
                              >
                                <View
                                  style={[
                                    styles.multipleChoiceRadio,
                                    questionResponses[questionId] === option &&
                                      styles.multipleChoiceRadioSelected,
                                  ]}
                                >
                                  {questionResponses[questionId] === option && (
                                    <View style={styles.multipleChoiceRadioInner} />
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.multipleChoiceText,
                                    questionResponses[questionId] === option &&
                                      styles.multipleChoiceTextSelected,
                                  ]}
                                >
                                  {option}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Host Answer */}
                        {questionType === 'host-answer' && hostAnswer && (
                          <View style={styles.hostAnswerContainer}>
                            <Ionicons name="information-circle" size={20} color="#007AFF" />
                            <Text style={styles.hostAnswerText}>{hostAnswer}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Skip All Button if allowed */}
                  {event.extra_data?.questionnaireSettings?.allowSkipAll && (
                    <TouchableOpacity
                      style={styles.skipAllButton}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert(
                          t('events.details.rsvpSubmitted', 'RSVP Submitted'),
                          t(
                            'events.details.rsvpWithoutQuestions',
                            "You have RSVP'd without answering questions."
                          )
                        );
                      }}
                    >
                      <Text style={styles.skipAllText}>Skip Questions & RSVP</Text>
                    </TouchableOpacity>
                  )}

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

                  {/* Show responses to other guests if enabled */}
                  {event.extra_data?.questionnaireSettings?.showResponsesLive && (
                    <View style={styles.publicResponsesSection}>
                      <Text style={styles.publicResponsesTitle}>Other guests' responses</Text>
                      {questionnaire.map((question: any, index: number) => {
                        const questionType = question.type || question.question_type || 'short';
                        const options = question.options || question.question_options;
                        const parsedOptions = options
                          ? typeof options === 'string'
                            ? JSON.parse(options)
                            : options
                          : null;

                        if (questionType === 'multiple' && parsedOptions) {
                          // Show voting results for multiple choice
                          return (
                            <View key={question.id || index} style={styles.publicResponseCard}>
                              <Text style={styles.publicResponseQuestion}>
                                {question.question || question.question_text || question.text}
                              </Text>
                              <View style={styles.multipleChoiceResults}>
                                {(() => {
                                  const questionId = question.id || index.toString();
                                  const { stats, totalVotes } = getMultipleChoiceStats(
                                    questionId,
                                    parsedOptions
                                  );

                                  return stats.map((stat, optIndex) => (
                                    <View key={optIndex} style={styles.voteOption}>
                                      <View style={styles.voteHeader}>
                                        <Text style={styles.voteOptionText}>{stat.option}</Text>
                                        <Text style={styles.voteCount}>
                                          {stat.percentage.toFixed(0)}%
                                        </Text>
                                      </View>
                                      <View style={styles.voteBarContainer}>
                                        <View
                                          style={[styles.voteBar, { width: `${stat.percentage}%` }]}
                                        />
                                      </View>
                                    </View>
                                  ));
                                })()}
                              </View>
                            </View>
                          );
                        } else if (questionType === 'short') {
                          // Show sample responses for short answers
                          return (
                            <View key={question.id || index} style={styles.publicResponseCard}>
                              <Text style={styles.publicResponseQuestion}>
                                {question.question || question.question_text || question.text}
                              </Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.publicShortAnswers}>
                                  {(() => {
                                    const questionId = question.id || index.toString();
                                    const textResponses = getTextResponses(questionId);

                                    if (textResponses.length === 0) {
                                      return (
                                        <View style={styles.publicShortAnswer}>
                                          <Text style={styles.publicShortAnswerText}>
                                            No responses yet
                                          </Text>
                                        </View>
                                      );
                                    }

                                    return textResponses.slice(0, 3).map((response, idx) => (
                                      <View key={idx} style={styles.publicShortAnswer}>
                                        <Text style={styles.publicShortAnswerText}>
                                          "{response.answer}"
                                        </Text>
                                        <Text style={styles.publicShortAnswerAuthor}>
                                          -{' '}
                                          {response.user.full_name ||
                                            response.user.username ||
                                            'Anonymous'}
                                        </Text>
                                      </View>
                                    ));
                                  })()}
                                </View>
                              </ScrollView>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Bottom Action Buttons */}
          {isHost ? (
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.editEventButton} onPress={handleEditEvent}>
                <Text style={styles.editEventButtonText}>Edit Event Details</Text>
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

      {/* Price Details Modal */}
      <BottomModal
        visible={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        title="Event Costs"
        height={400}
        showCloseButton={false}
      >
        <View>
          {costs.map((cost: any, index: number) => (
            <View key={cost.id || index} style={styles.modalCostItem}>
              <View style={styles.modalCostInfo}>
                <Text style={styles.modalCostDescription}>{cost.description}</Text>
                {cost.description.toLowerCase().includes('required') && (
                  <View style={styles.costRequiredBadge}>
                    <Text style={styles.costRequiredBadgeText}>Required</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modalCostAmount}>
                {cost.currency || '$'}
                {cost.amount}
              </Text>
            </View>
          ))}

          <View style={styles.modalTotalRow}>
            <Text style={styles.modalTotalLabel}>Total per person</Text>
            <Text style={styles.modalTotalAmount}>
              $
              {costs
                .reduce((sum: number, cost: any) => sum + (parseFloat(cost.amount) || 0), 0)
                .toFixed(2)}
            </Text>
          </View>

          <Text style={styles.modalPaymentNote}>Payment will be collected at the event</Text>
        </View>
      </BottomModal>

      {/* Attendees Modal */}
      <BottomModal
        visible={showAttendeesModal}
        onClose={() => setShowAttendeesModal(false)}
        title="Who's Coming"
        height={600}
        showCloseButton={false}
      >
        <View>
          {/* Pending Approval Section - for hosts only */}
          {isHost && event.pending_requests?.length > 0 && !event.extra_data?.autoApprove && (
            <View style={[styles.attendeesModalSection, styles.pendingSection]}>
              <Text style={[styles.attendeesModalSectionTitle, styles.pendingTitle]}>
                Pending Approval ({event.pending_requests.length})
              </Text>
              {event.pending_requests.map((request: any, index: number) => (
                <View key={index} style={styles.pendingRequestItem}>
                  <Image
                    source={{ uri: request.avatar || 'https://i.pravatar.cc/100' }}
                    style={styles.attendeeModalAvatar}
                  />
                  <Text style={styles.attendeeModalName}>{request.name}</Text>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity style={styles.approveButton}>
                      <Ionicons name="checkmark" size={18} color="#34C759" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectButton}>
                      <Ionicons name="close" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.attendeesModalSection}>
            <Text style={styles.attendeesModalSectionTitle}>
              Going ({event.current_attendees || 2})
            </Text>
            {[
              { name: 'Marie Dupont', avatar: 'https://i.pravatar.cc/100?img=1' },
              { name: 'Paul Martin', avatar: 'https://i.pravatar.cc/100?img=2' },
              { name: 'Sophie Bernard', avatar: 'https://i.pravatar.cc/100?img=3' },
              { name: 'Lucas Petit', avatar: 'https://i.pravatar.cc/100?img=4' },
              { name: 'Emma Durand', avatar: 'https://i.pravatar.cc/100?img=5' },
            ].map((attendee, index) => (
              <View key={index} style={styles.attendeeModalItem}>
                <Image source={{ uri: attendee.avatar }} style={styles.attendeeModalAvatar} />
                <Text style={styles.attendeeModalName}>{attendee.name}</Text>
              </View>
            ))}
          </View>

          {/* Waitlist Section */}
          {event.extra_data?.waitlistEnabled && event.waitlist_count > 0 && (
            <View style={styles.attendeesModalSection}>
              <Text style={[styles.attendeesModalSectionTitle, styles.waitlistSectionTitle]}>
                On Waitlist ({event.waitlist_count || 0})
              </Text>
              {event.waitlist_users?.map((user: any, index: number) => (
                <View key={index} style={styles.waitlistItem}>
                  <Text style={styles.waitlistPosition}>#{index + 1}</Text>
                  <Image
                    source={{ uri: user.avatar || 'https://i.pravatar.cc/100' }}
                    style={styles.attendeeModalAvatar}
                  />
                  <Text style={styles.attendeeModalName}>{user.name}</Text>
                  {isHost && capacityLimit && (event.current_attendees || 0) < capacityLimit && (
                    <TouchableOpacity style={styles.promoteButton}>
                      <Text style={styles.promoteButtonText}>Promote</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.attendeesModalSection}>
            <Text style={styles.attendeesModalSectionTitle}>Not Going (3)</Text>
            {[
              { name: 'Julie Moreau', avatar: 'https://i.pravatar.cc/100?img=6' },
              { name: 'Thomas Roux', avatar: 'https://i.pravatar.cc/100?img=7' },
              { name: 'Clara Simon', avatar: 'https://i.pravatar.cc/100?img=8' },
            ].map((attendee, index) => (
              <View key={index} style={styles.attendeeModalItem}>
                <Image source={{ uri: attendee.avatar }} style={styles.attendeeModalAvatar} />
                <Text style={styles.attendeeModalName}>{attendee.name}</Text>
              </View>
            ))}
          </View>

          <View style={styles.attendeesModalSection}>
            <Text style={styles.attendeesModalSectionTitle}>Maybe (1)</Text>
            {[{ name: 'Alexandre Michel', avatar: 'https://i.pravatar.cc/100?img=9' }].map(
              (attendee, index) => (
                <View key={index} style={styles.attendeeModalItem}>
                  <Image source={{ uri: attendee.avatar }} style={styles.attendeeModalAvatar} />
                  <Text style={styles.attendeeModalName}>{attendee.name}</Text>
                </View>
              )
            )}
          </View>
        </View>
      </BottomModal>

      {/* Hosts Modal */}
      <BottomModal
        visible={showHostsModal}
        onClose={() => setShowHostsModal(false)}
        title="Event Hosts"
        height={500}
        showCloseButton={false}
      >
        <View>
          {/* Main Host */}
          <View style={styles.modalHostCard}>
            <View style={styles.modalHostTop}>
              <Image
                source={{
                  uri:
                    event.organizer?.avatar_url ||
                    event.extra_data?.host?.avatar ||
                    'https://via.placeholder.com/60',
                }}
                style={styles.modalHostAvatar}
              />
              <View style={styles.modalHostInfo}>
                <Text style={styles.modalHostName}>
                  {event.organizer?.full_name || event.extra_data?.host?.name || 'Host'}
                </Text>
                <View style={styles.hostRatingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={
                        star <= Math.floor(event.organizer?.rating || 4.5) ? 'star' : 'star-outline'
                      }
                      size={16}
                      color="#FFB800"
                      style={{ marginRight: 2 }}
                    />
                  ))}
                  <Text style={styles.hostRatingText}>
                    {(event.organizer?.rating || 4.5).toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.modalHostRole}>Main Host</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalMessageButton}>
              <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
              <Text style={styles.modalMessageText}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* Co-hosts */}
          {event.extra_data?.coHosts?.map((coHost: any, index: number) => (
            <View key={coHost.id || index} style={styles.modalHostCard}>
              <View style={styles.modalHostTop}>
                <Image
                  source={{ uri: coHost.avatar || 'https://via.placeholder.com/60' }}
                  style={styles.modalHostAvatar}
                />
                <View style={styles.modalHostInfo}>
                  <Text style={styles.modalHostName}>{coHost.name}</Text>
                  {(() => {
                    const userId = coHost.id || coHost.user_id;
                    const rating = coHostsRatings[userId];
                    if (rating && rating.total_ratings > 0) {
                      return (
                        <View style={styles.hostRatingRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={
                                star <= Math.floor(rating.average_rating) ? 'star' : 'star-outline'
                              }
                              size={16}
                              color="#FFB800"
                              style={{ marginRight: 2 }}
                            />
                          ))}
                          <Text style={styles.hostRatingText}>
                            {rating.average_rating.toFixed(1)} • {rating.total_ratings} rating
                            {rating.total_ratings > 1 ? 's' : ''}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                  <Text style={styles.modalHostRole}>Co-Host</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalMessageButton}>
                <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
                <Text style={styles.modalMessageText}>Message</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </BottomModal>

      {/* All Event Modals */}
      <CostPerPersonModal
        visible={showCostModal}
        onClose={() => setShowCostModal(false)}
        initialCosts={costs}
        onSave={async (newCosts) => {
          await updateEventExtras(eventId!, { costs: newCosts });
          setShowCostModal(false);
        }}
      />

      <PhotoAlbumModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        initialPhotos={eventPhotos}
        onSave={async (newPhotos) => {
          await updateEventExtras(eventId!, { eventPhotos: newPhotos });
          setShowPhotoModal(false);
        }}
      />

      <ItemsToBringModal
        visible={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        initialItems={items}
        initialSettings={itemsSettings}
        onSave={async (newItems, newSettings) => {
          await updateEventExtras(eventId!, {
            itemsToBring: newItems,
            itemsSettings: newSettings,
          });
          setShowItemsModal(false);
        }}
      />

      <RSVPDeadlineModal
        visible={showRSVPModal}
        onClose={() => setShowRSVPModal(false)}
        deadline={rsvpDeadline ? new Date(rsvpDeadline) : null}
        reminderEnabled={rsvpReminderEnabled}
        reminderTiming={rsvpReminderTiming}
        onSave={async (deadline, reminderEnabled, reminderTiming) => {
          await updateEventExtras(eventId!, {
            rsvpDeadline: deadline,
            rsvpReminderEnabled: reminderEnabled,
            rsvpReminderTiming: reminderTiming,
          });
          setShowRSVPModal(false);
        }}
        eventDate={event?.date ? new Date(event.date) : new Date()}
      />

      <GuestQuestionnaireModal
        visible={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        initialQuestions={questionnaire}
        initialSettings={questionnaireSettings}
        onSave={async (questions, settings) => {
          await updateEventExtras(eventId!, {
            questionnaire: questions,
            questionnaireSettings: settings,
          });
          setShowQuestionnaireModal(false);
        }}
      />

      <PlaylistModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        initialPlaylist={playlist}
        initialSettings={playlistSettings}
        onSave={async (newPlaylist, newSettings) => {
          await updateEventExtras(eventId!, {
            playlist: newPlaylist,
            playlistSettings: newSettings,
          });
          setShowPlaylistModal(false);
        }}
      />

      <ManageCoHostsModal
        visible={showCoHostsModal}
        onClose={() => setShowCoHostsModal(false)}
        currentCoHosts={
          coHosts.map((ch: any) => ({
            id: ch.user_id || ch.id,
            name: ch.full_name || ch.name || 'Unknown',
            avatar: ch.avatar_url || ch.avatar || '',
          })) || []
        }
        onSave={async (newCoHosts) => {
          await updateEventExtras(eventId!, { coHosts: newCoHosts });
          setShowCoHostsModal(false);
        }}
      />

      <DressCodeModal
        visible={showDressCodeModal}
        onClose={() => setShowDressCodeModal(false)}
        initialDressCode={dressCode}
        onSave={async (newDressCode) => {
          await updateEventExtras(eventId!, { dressCode: newDressCode });
          setShowDressCodeModal(false);
        }}
      />

      <ThemeSelectionModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        initialTheme={eventTheme}
        onSave={async (newTheme) => {
          await updateEventExtras(eventId!, { eventTheme: newTheme });
          setShowThemeModal(false);
        }}
      />

      <AgeRestrictionModal
        visible={showAgeRestrictionModal}
        onClose={() => setShowAgeRestrictionModal(false)}
        ageRestriction={ageRestriction || ''}
        onSave={async (newRestriction) => {
          await updateEventExtras(eventId!, { ageRestriction: newRestriction });
          setShowAgeRestrictionModal(false);
        }}
      />

      <EventCapacityModal
        visible={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        capacity={capacityLimit}
        currentAttendees={event?.confirmed_attendees || 0}
        onSave={async (newCapacity) => {
          await updateEventExtras(eventId!, { capacityLimit: newCapacity });
          setShowCapacityModal(false);
        }}
      />

      <ParkingInfoModal
        visible={showParkingModal}
        onClose={() => setShowParkingModal(false)}
        initialParkingInfo={
          parkingInfo
            ? (() => {
                try {
                  // Try to parse as JSON first (new format)
                  const parsed = JSON.parse(parkingInfo);
                  return parsed;
                } catch {
                  // Fallback for old string format
                  return {
                    available: !parkingInfo.includes('No parking'),
                    instructions: parkingInfo.includes('No parking') ? '' : parkingInfo,
                    nearbyOptions: parkingInfo.includes('No parking')
                      ? parkingInfo.replace('No parking - ', '')
                      : '',
                  };
                }
              })()
            : { available: true }
        }
        onSave={async (newInfo) => {
          // Store as JSON string
          const parkingData = JSON.stringify(newInfo);
          await updateEventExtras(eventId!, { parkingInfo: parkingData });
          setShowParkingModal(false);
        }}
      />

      <AccessibilityModal
        visible={showAccessibilityModal}
        onClose={() => setShowAccessibilityModal(false)}
        accessibilityInfo={accessibilityInfo || ''}
        onSave={async (newInfo) => {
          await updateEventExtras(eventId!, { accessibilityInfo: newInfo });
          setShowAccessibilityModal(false);
        }}
      />

      <EventCategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        selectedCategory={eventCategory || ''}
        onSave={async (newCategory) => {
          await updateEventExtras(eventId!, { eventCategory: newCategory });
          setShowCategoryModal(false);
        }}
      />

      {/* Who's Bringing Modal */}
      <WhosBringingModal
        visible={showBringersModal}
        onClose={() => setShowBringersModal(false)}
        itemName={selectedItemForBringers?.name || ''}
        bringers={selectedItemForBringers?.bringers || []}
      />
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

  // Cover bottom gradient
  coverBottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 2,
  },

  // Cover bottom section with capacity and CTA
  coverBottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 40,
    zIndex: 3,
  },
  coverPriceInfo: {
    marginBottom: 12,
  },
  coverPriceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  coverCapacityInfo: {
    marginBottom: 16,
  },
  coverCapacityBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  coverCapacityFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  coverCapacityText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Privacy badge on cover - removed, will be placed elsewhere
  coverCTAButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  coverCTAText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  coverCTAButtonWaitlist: {
    backgroundColor: '#FF9500',
  },
  waitlistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  waitlistText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  approvalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  approvalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9500',
  },
  hostPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
  },
  hostPreviewText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
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
    marginTop: -24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 100,
    minHeight: 600,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
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
  hostActionsRow: {
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
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
  messageHostIconButton: {
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
  editSectionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
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
    marginTop: 12,
  },
  attendeesList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  costInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costRequiredBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  costRequiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
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
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  itemsCount: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  itemsContainer: {
    gap: 12,
  },
  todoContainer: {
    marginTop: 16,
    gap: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  todoItemCompleted: {
    backgroundColor: '#F0F9FF',
    borderColor: '#007AFF',
  },
  todoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoCheckboxCompleted: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  todoContent: {
    flex: 1,
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  todoTextCompleted: {
    color: '#007AFF',
  },
  todoAssignedText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  itemTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
    gap: 3,
  },
  itemTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  todoClaimButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  todoClaimText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  todoClaimButtonActive: {
    backgroundColor: '#E5E5EA',
  },
  todoClaimTextActive: {
    color: '#000',
  },
  todoRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  suggestItemText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
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
  itemBroughtBy: {
    fontSize: 14,
    color: '#717171',
    marginTop: 12,
  },

  // Questionnaire Section
  questionnaireSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },

  // Additional Info Section - Airbnb Style
  additionalInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
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

  // Add sections styles
  addSectionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  addSectionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
  },
  addSectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  addSectionButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '47%',
    flex: 1,
  },
  addSectionText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
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
  multipleChoiceContainer: {
    gap: 8,
  },
  multipleChoiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    gap: 10,
  },
  multipleChoiceOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  multipleChoiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C0C0C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multipleChoiceRadioSelected: {
    borderColor: '#007AFF',
  },
  multipleChoiceRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  multipleChoiceText: {
    fontSize: 16,
    color: '#222222',
    flex: 1,
  },
  multipleChoiceTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  hostAnswerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  hostAnswerText: {
    fontSize: 15,
    color: '#007AFF',
    flex: 1,
    lineHeight: 20,
  },
  skipAllButton: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  skipAllText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  responsesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveResponsesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveResponsesText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  responseQuestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questionnaireRequiredBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  questionnaireRequiredBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  multipleChoiceResults: {
    gap: 10,
  },
  voteOption: {
    marginBottom: 8,
  },
  voteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  voteOptionText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  voteCount: {
    fontSize: 13,
    color: '#666',
  },
  voteBarContainer: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  voteBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  hostAnswerDisplay: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
  },
  hostAnswerLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  hostAnswerValue: {
    fontSize: 15,
    color: '#007AFF',
    lineHeight: 20,
  },
  publicResponsesSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  publicResponsesTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  publicResponseCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  publicResponseQuestion: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
    marginBottom: 12,
  },
  publicShortAnswers: {
    flexDirection: 'row',
    gap: 10,
  },
  publicShortAnswer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  publicShortAnswerText: {
    fontSize: 14,
    color: '#444',
    fontStyle: 'italic',
  },
  publicShortAnswerAuthor: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
  noResponsesText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
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
  hostCardInfo: {
    marginBottom: 24,
  },
  hostInfoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostAvatarInfo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  hostDetails: {
    flex: 1,
  },
  hostNameInfo: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  hostRole: {
    fontSize: 14,
    color: '#717171',
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
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
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

  // New Hero Section Styles
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  // Host Card Styles
  hostCardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  hostCardTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  hostAvatarSection: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  hostInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  hostLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hostNameSection: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  hostRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB800',
    marginLeft: 6,
  },
  messageHostFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 10,
  },
  messageHostButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },

  // Co-hosts Section - Enhanced
  coHostDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 16,
    paddingTop: 16,
  },
  coHostLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  coHostsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  coHostItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  coHostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  coHostName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  moreCoHosts: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    alignSelf: 'center',
  },
  messageOrganizerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfoGrid: {
    gap: 16,
    marginBottom: 20,
  },
  heroInfoItem: {
    flexDirection: 'row',
    gap: 12,
  },
  heroInfoContent: {
    flex: 1,
  },
  heroInfoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 2,
  },
  heroInfoSubtitle: {
    fontSize: 14,
    color: '#717171',
  },
  capacityBar: {
    marginBottom: 20,
  },
  capacityInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  capacityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  capacitySubtextBar: {
    fontSize: 14,
    color: '#717171',
  },
  capacityProgress: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityProgressFillBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  heroPriceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  priceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroPriceInfo: {
    flex: 1,
  },
  heroPriceAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  heroPriceLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  ctaContainer: {
    gap: 12,
  },
  primaryCTAButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryCTAText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  hostCTARow: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteButtonCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  inviteButtonTextCard: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },

  // Capacity and Attendees Section (merged)
  capacityAndAttendeesSection: {
    marginBottom: 16,
  },
  capacityInfoSection: {
    marginBottom: 16,
  },
  capacityProgressBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  capacityProgressFillSection: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  capacitySubtextSection: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  attendeeAvatarsList: {
    flexDirection: 'row',
    marginRight: 12,
  },
  attendeeAvatarItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -12,
  },
  firstAvatar: {
    marginLeft: 0,
  },
  attendeesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendeesText: {
    fontSize: 15,
    color: '#717171',
  },
  viewAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  spotsRemainingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginTop: 8,
  },
  reserveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  guestCTARow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareIconButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  reminderButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },

  // About Section Update
  aboutSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },

  // Price Breakdown Styles
  priceBreakdown: {
    marginTop: 4,
  },
  priceBreakdownItem: {
    fontSize: 13,
    color: '#717171',
    lineHeight: 18,
  },

  // Host buttons row in hero section
  hostButtonsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sendReminderButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendReminderButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },

  // Message button
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  messageButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },

  // Modal styles
  modalCostItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalCostInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCostDescription: {
    fontSize: 16,
    color: '#000000',
  },
  modalCostAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalTotalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF',
  },
  modalPaymentNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
  },

  // Attendees modal styles
  attendeesModalList: {
    maxHeight: 400,
  },
  attendeesModalSection: {
    marginBottom: 24,
  },
  attendeesModalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  attendeeModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attendeeModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  attendeeModalName: {
    fontSize: 16,
    color: '#000000',
  },

  // Host Modal Styles
  modalHostCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  modalHostTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modalHostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  modalHostInfo: {
    flex: 1,
  },
  modalHostName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  modalHostRole: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  modalMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalMessageText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  // Privacy indicator styles
  topSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
    marginTop: -2,
  },
  categoryTagIcon: {
    fontSize: 18,
  },
  categoryTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: -0.2,
  },
  // Costs Detail Section
  costsDetailSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  costsTotalBadge: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  costsBreakdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  costLeft: {
    flex: 1,
    marginRight: 16,
  },
  costDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  costRequired: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
  },
  costAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  costNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0,
  },
  costNoteText: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },

  // Parking & Accessibility Sections
  parkingSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  accessibilitySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 22,
    flex: 1,
  },
  parkingContent: {
    flex: 1,
  },
  parkingType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  parkingPrice: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  parkingInstructions: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
    marginLeft: 8,
  },
  parkingEmoji: {
    fontSize: 24,
    marginRight: 12,
  },

  // Playlist Section
  playlistSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  spotifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB954',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  spotifyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playlistContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    gap: 16,
  },
  songNumber: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
    width: 24,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 14,
    color: '#8E8E93',
  },
  morePlaylistText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  suggestSongButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    gap: 8,
  },
  suggestSongText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },

  // Contact Section
  contactSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  contactItemLast: {
    borderBottomWidth: 0,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },

  // Privacy Badge styles - centered above price
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: 12,
    alignSelf: 'center',
    gap: 8,
  },
  privacyBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Question required badge
  questionRequiredBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  questionRequiredBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Organizer card styles - Enhanced
  organizerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  hostMainSection: {
    padding: 20,
  },
  organizerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#F5F5F7',
  },
  organizerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  organizerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  messageHostBtn: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  messageHostBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Waitlist and Approval Styles
  pendingSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  pendingTitle: {
    color: '#F57C00',
  },
  pendingRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pendingActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  approveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitlistSectionTitle: {
    color: '#FF9500',
  },
  waitlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  waitlistPosition: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginRight: 12,
    width: 30,
  },
  promoteButton: {
    marginLeft: 'auto',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  promoteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingRequestsButton: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9500',
    position: 'relative',
  },
  pendingRequestsButtonText: {
    color: '#FF9500',
  },
  pendingBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Event Rules Section
  eventRulesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  rulesContainer: {
    gap: 20,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  ruleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 15,
    color: '#6B6B6B',
    lineHeight: 20,
  },
  ruleSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Items section type styles
  itemsTypeSection: {
    marginTop: 20,
  },
  itemsTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  itemsTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestSuggestionsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  guestSuggestionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
  },
  guestSuggestionsText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  signupRequiredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
  },
  signupRequiredText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  todoRequiredText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  bringersCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
  },
  bringersAvatars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  miniAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  bringersCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
