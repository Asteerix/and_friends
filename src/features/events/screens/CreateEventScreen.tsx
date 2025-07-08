import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';

import { useProfile } from '@/hooks/useProfile';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';

// Import all modals
import CostPerPersonModal from '../components/CostPerPersonModal';
import PhotoAlbumModal from '../components/PhotoAlbumModal';
import ItemsToBringModal from '../components/ItemsToBringModal';
import RSVPDeadlineModal from '../components/RSVPDeadlineModal';
import GuestQuestionnaireModal from '../components/GuestQuestionnaireModal';
import PlaylistModal from '../components/PlaylistModal';
import ManageCoHostsModal from '../components/ManageCoHostsModal';

// Default event cover image
const DEFAULT_EVENT_COVER = require('../../../assets/default_avatar.png');

export default function CreateEventScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  
  // State for event details
  const [coverUri] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [coHosts, setCoHosts] = useState<Array<{id: string, name: string, avatar: string}>>([]);
  
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
          <Image
            source={coverUri ? { uri: coverUri } : DEFAULT_EVENT_COVER}
            style={styles.headerImage}
          />
          {/* Overlay for readability */}
          <View style={styles.headerOverlay} pointerEvents="none" />
          
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
            <Text style={styles.eventTitleMainText}>Tap to add your</Text>
            <Text style={styles.eventTitleMainText}>event title</Text>
            <Text style={styles.eventSubtitle}>
              Drop a punchline to get the crew{'\n'}hyped for what's coming.
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
                {coHosts.length === 1 && (
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
                {coHosts.length === 1 && ` and ${coHosts[0].name}`}
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
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>Pick a date & time</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setEventDate(selectedDate);
                    setShowTimePicker(true);
                  }
                }}
              />
            )}
            
            {showTimePicker && (
              <DateTimePicker
                value={eventTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    setEventTime(selectedTime);
                  }
                }}
              />
            )}
            
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
                <TouchableOpacity style={styles.extraPill} onPress={handleCostPerPerson}>
                  <Ionicons name="ticket-outline" size={16} color="#007AFF" />
                  <Text style={styles.extraPillText}>Cost per person</Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.extraPill} onPress={handlePhotoAlbum}>
                  <Ionicons name="images-outline" size={16} color="#007AFF" />
                  <Text style={styles.extraPillText}>Photo Album</Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.extraPill} onPress={handleItemsToBring}>
                  <Ionicons name="gift-outline" size={16} color="#007AFF" />
                  <Text style={styles.extraPillText}>To Bring</Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.extraPill} onPress={handleRSVPDeadline}>
                  <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                  <Text style={styles.extraPillText}>RSVP deadline</Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.extraPill} onPress={handleQuestionnaire}>
                  <Ionicons name="clipboard-outline" size={16} color="#007AFF" />
                  <Text style={styles.extraPillText}>Guest questionnaire</Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
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
        onSave={(amount, description) => {
          console.log('Cost saved:', amount, description);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      
      <PhotoAlbumModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSave={(photos) => {
          console.log('Photos saved:', photos);
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
        onSave={(deadline, reminderEnabled) => {
          console.log('RSVP deadline saved:', deadline, reminderEnabled);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
      
      <GuestQuestionnaireModal
        visible={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        onSave={(questions) => {
          console.log('Questions saved:', questions);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
});