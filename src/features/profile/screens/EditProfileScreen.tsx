import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
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
import CountryFlag from 'react-native-country-flag';

import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import BackButton from '@/assets/svg/back-button.svg';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';

// Import modal components
import MusicPickerModal from '../components/MusicPickerModal';
import RestaurantPickerModal from '../components/RestaurantPickerModal';
import LocationPickerModal from '../components/LocationPickerModal';
import HobbiesPickerModal from '../components/HobbiesPickerModal';
import BirthDatePickerModal from '../components/BirthDatePickerModal';

// Définir le chemin de l'avatar par défaut
const DEFAULT_AVATAR = require('../../../assets/default_avatar.png'); // eslint-disable-line @typescript-eslint/no-var-requires

// Helper pour vérifier si une image est valide (non vide, non null, non undefined)
function isValidAvatar(url?: string | null) {
  return (
    !!url &&
    typeof url === 'string' &&
    url.trim() !== '' &&
    !url.endsWith('null') &&
    !url.endsWith('undefined')
  );
}

// Helper function to calculate age from birth date
const calculateAge = (birthDate: string) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Constants for change restrictions (similar to Instagram)
const NAME_CHANGE_DAYS = 14; // Can change name every 14 days
const USERNAME_CHANGE_DAYS = 14; // Can change username every 14 days

// Helper function to get country ISO code from location string
const getCountryISOCode = (location: string) => {
  if (!location) return 'US';
  
  // Common country mappings
  const countryMappings: { [key: string]: string } = {
    'USA': 'US',
    'United States': 'US',
    'United States of America': 'US',
    'UK': 'GB',
    'United Kingdom': 'GB',
    'England': 'GB',
    'Scotland': 'GB',
    'Wales': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'France': 'FR',
    'Germany': 'DE',
    'Italy': 'IT',
    'Spain': 'ES',
    'Japan': 'JP',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'India': 'IN',
    'China': 'CN',
    'South Korea': 'KR',
    'Korea': 'KR',
    'Netherlands': 'NL',
    'Holland': 'NL',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Switzerland': 'CH',
    'Belgium': 'BE',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Portugal': 'PT',
    'Greece': 'GR',
    'Poland': 'PL',
    'Russia': 'RU',
    'Turkey': 'TR',
    'Egypt': 'EG',
    'South Africa': 'ZA',
    'New Zealand': 'NZ',
    'Ireland': 'IE',
    'Austria': 'AT',
    'Finland': 'FI',
    'Singapore': 'SG',
    'Thailand': 'TH',
    'Malaysia': 'MY',
    'Indonesia': 'ID',
    'Philippines': 'PH',
    'Vietnam': 'VN',
    'UAE': 'AE',
    'United Arab Emirates': 'AE',
    'Saudi Arabia': 'SA',
    'Israel': 'IL',
    'Czech Republic': 'CZ',
    'Hungary': 'HU',
    'Romania': 'RO',
    'Ukraine': 'UA',
  };
  
  // Try to extract country from location (handle "City, Country" format)
  const parts = location.split(',');
  
  // Try last part first (usually country in "City, Country" format)
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1]?.trim() || '';
    
    // Check if it's a known country
    if (countryMappings[lastPart]) {
      return countryMappings[lastPart];
    }
    
    // If it's already a 2-letter code
    if (lastPart.length === 2) {
      return lastPart.toUpperCase();
    }
  }
  
  // Try first part (in case location is just country name)
  const firstPart = parts[0]?.trim() || '';
  if (countryMappings[firstPart]) {
    return countryMappings[firstPart];
  }
  
  // If it's already a 2-letter code
  if (firstPart.length === 2) {
    return firstPart.toUpperCase();
  }
  
  // Default to US
  return 'US';
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, uploadAvatar, uploadCover, fetchProfile } = useProfile();
  const { friends: userFriends } = useFriends();
  
  // Initialize state with profile data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [hideBirthDate, setHideBirthDate] = useState(false);
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [jam, setJam] = useState({ 
    track_id: '', 
    title: '', 
    artist: '', 
    cover_url: '', 
    preview_url: '' 
  });
  const [restaurant, setRestaurant] = useState({ 
    id: '', 
    name: '', 
    address: '' 
  });
  const [avatarUri, setAvatarUri] = useState('');
  const [coverUri, setCoverUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showJamModal, setShowJamModal] = useState(false);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBirthDateModal, setShowBirthDateModal] = useState(false);
  const [showHobbiesModal, setShowHobbiesModal] = useState(false);
  
  // Update state when profile loads
  useEffect(() => {
    if (profile) {
      // Split full name into first and last
      const nameParts = profile.full_name?.split(' ') || [];
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setOccupation(profile.path || '');
      setInterests(profile.hobbies || []);
      setAvatarUri(profile.avatar_url || '');
      setCoverUri(profile.cover_url || '');
      setHideBirthDate(profile.hide_birth_date || false);
      
      // Birth date and age
      if (profile.birth_date) {
        setBirthDate(profile.birth_date);
        setAge(calculateAge(profile.birth_date).toString());
      }
      
      // Location
      if (profile.location) {
        setLocation(profile.location);
      }
      
      // Load jam/music preference from individual fields
      if (profile.jam_title || profile.jam_artist) {
        setJam({
          track_id: profile.jam_track_id || '',
          title: profile.jam_title || '',
          artist: profile.jam_artist || '',
          cover_url: profile.jam_cover_url || '',
          preview_url: profile.jam_preview_url || ''
        });
      }
      
      // Load restaurant preference from individual fields
      if (profile.selected_restaurant_name) {
        setRestaurant({
          id: profile.selected_restaurant_id || '',
          name: profile.selected_restaurant_name || '',
          address: profile.selected_restaurant_address || ''
        });
      }
    }
  }, [profile]);

  const handleSwitchPhoto = async () => {
    Alert.alert(
      'Switch Photo',
      'Choose your profile photo source',
      [
        { text: 'Camera', onPress: handleTakePhoto },
        { text: 'Photo Library', onPress: handlePickPhoto },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setCoverUri(result.assets[0].uri);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setCoverUri(result.assets[0].uri);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };


  const handleRemoveInterest = (index: number) => {
    const newInterests = interests.filter((_, i) => i !== index);
    setInterests(newInterests);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveJam = () => {
    setJam({ track_id: '', title: '', artist: '', cover_url: '', preview_url: '' });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveRestaurant = () => {
    setRestaurant({ id: '', name: '', address: '' });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Helper functions for change restrictions
  const canChangeName = () => {
    if (!profile?.last_name_change) return true;
    const lastChange = new Date(profile.last_name_change);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceChange >= NAME_CHANGE_DAYS;
  };

  const canChangeUsername = () => {
    if (!profile?.last_username_change) return true;
    const lastChange = new Date(profile.last_username_change);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceChange >= USERNAME_CHANGE_DAYS;
  };

  const getDaysUntilNameChange = () => {
    if (!profile?.last_name_change) return 0;
    const lastChange = new Date(profile.last_name_change);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, NAME_CHANGE_DAYS - daysSinceChange);
  };

  const getDaysUntilUsernameChange = () => {
    if (!profile?.last_username_change) return 0;
    const lastChange = new Date(profile.last_username_change);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, USERNAME_CHANGE_DAYS - daysSinceChange);
  };

  // Check if name has changed
  const hasNameChanged = () => {
    const originalName = profile?.full_name || '';
    const nameParts = originalName.split(' ');
    const originalFirstName = nameParts[0] || '';
    const originalLastName = nameParts.slice(1).join(' ') || '';
    
    return firstName !== originalFirstName || lastName !== originalLastName;
  };

  const hasUsernameChanged = () => {
    return username !== (profile?.username || '');
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Upload new avatar if changed
      if (avatarUri && avatarUri !== profile?.avatar_url && !avatarUri.startsWith('http')) {
        const avatarResult = await uploadAvatar(avatarUri);
        if (avatarResult.error) {
          throw avatarResult.error;
        }
      }
      
      // Upload new cover if changed
      if (coverUri && coverUri !== profile?.cover_url && !coverUri.startsWith('http')) {
        const coverResult = await uploadCover(coverUri);
        if (coverResult.error) {
          throw coverResult.error;
        }
      }
      
      // Check if name/username can be changed
      const nameChanged = hasNameChanged();
      const usernameChanged = hasUsernameChanged();
      
      if (nameChanged && !canChangeName()) {
        const daysLeft = getDaysUntilNameChange();
        Alert.alert(
          'Cannot Change Name', 
          `You can change your name again in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`
        );
        setIsLoading(false);
        return;
      }
      
      if (usernameChanged && !canChangeUsername()) {
        const daysLeft = getDaysUntilUsernameChange();
        Alert.alert(
          'Cannot Change Username', 
          `You can change your username again in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`
        );
        setIsLoading(false);
        return;
      }
      
      // Build update data
      const updateData: any = {
        full_name: `${firstName} ${lastName}`.trim(),
        bio: bio,
        birth_date: birthDate,
        hide_birth_date: hideBirthDate,
        path: occupation,
        location: location,
        hobbies: interests,
        // Store jam/music data in individual fields
        jam_track_id: jam.track_id || undefined,
        jam_title: jam.title || undefined,
        jam_artist: jam.artist || undefined,
        jam_cover_url: jam.cover_url || undefined,
        jam_preview_url: jam.preview_url || undefined,
        // Store restaurant data in individual fields
        selected_restaurant_id: restaurant.id || undefined,
        selected_restaurant_name: restaurant.name || undefined,
        selected_restaurant_address: restaurant.address || undefined,
      };
      
      // Only update username if it can be changed
      if (usernameChanged && canChangeUsername()) {
        updateData.username = username;
        updateData.last_username_change = new Date().toISOString();
      } else if (!usernameChanged) {
        updateData.username = username;
      }
      
      // Track name change if changed
      if (nameChanged && canChangeName()) {
        updateData.last_name_change = new Date().toISOString();
      }
      
      // Update profile fields
      const result = await updateProfile(updateData);

      if (result.error) {
        throw result.error;
      }
      
      // Force refresh profile data to ensure UI is updated
      await fetchProfile();
      
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
      void router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
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
            source={
              isValidAvatar(coverUri)
                ? { uri: coverUri }
                : isValidAvatar(avatarUri)
                  ? { uri: avatarUri }
                  : DEFAULT_AVATAR
            }
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
            
            <Text style={styles.headerTitle}>Edit Profile</Text>
            
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
          
          {/* Profile info overlay */}
          <View style={styles.profileInfoOverlay}>
            <View style={styles.flagRow}>
              {location && (
                <>
                  <View style={styles.flagCircle}>
                    <CountryFlag
                      isoCode={getCountryISOCode(location)}
                      size={32}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                  </View>
                  <Text style={styles.locationText}>{location}</Text>
                </>
              )}
            </View>
            <Text style={styles.nameText}>
              {`${firstName} ${lastName}`.trim() || 'Your Name'}
              {age && !hideBirthDate ? `, ${age}` : ''}
            </Text>
            <Text style={styles.metaText}>
              {occupation || 'Self-employed'} • {userFriends.length} followers
            </Text>
          </View>
          
          {/* Switch Photo button */}
          <View style={styles.switchPhotoContainer}>
            <TouchableOpacity 
              style={styles.switchPhotoBtn} 
              onPress={handleSwitchPhoto}
              accessibilityRole="button"
              accessibilityLabel="Switch Photo"
            >
              <Ionicons name="camera-outline" size={20} color="#000" />
              <Text style={styles.switchPhotoBtnText}>Switch Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form section */}
        <View style={styles.formSheet}>
          {/* Basic Info Section */}
          <Text style={styles.sectionTitle}>Basic Info</Text>
          
          {/* Name Section with Lock Status */}
          <View style={[styles.formRow, { marginBottom: 8 }]}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>First Name</Text>
              {!canChangeName() && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={12} color="#666" />
                  <Text style={styles.lockText}>{getDaysUntilNameChange()} days</Text>
                </View>
              )}
            </View>
            <TextInput
              style={[styles.textInput, !canChangeName() && styles.disabledInput]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#999"
              editable={canChangeName()}
            />
          </View>
          
          <View style={styles.formRow}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Last Name</Text>
            </View>
            <TextInput
              style={[styles.textInput, !canChangeName() && styles.disabledInput]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#999"
              editable={canChangeName()}
            />
            {canChangeName() && hasNameChanged() && (
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={16} color="#007AFF" />
                <Text style={styles.warningText}>
                  After saving, you won't be able to change your name for 14 days
                </Text>
              </View>
            )}
          </View>
          
          {/* Username Section with Lock Status */}
          <View style={styles.formRow}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Username</Text>
              {!canChangeUsername() && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={12} color="#666" />
                  <Text style={styles.lockText}>{getDaysUntilUsernameChange()} days</Text>
                </View>
              )}
            </View>
            <TextInput
              style={[styles.textInput, !canChangeUsername() && styles.disabledInput]}
              value={username}
              onChangeText={setUsername}
              placeholder={profile?.username || "@username"}
              placeholderTextColor="#999"
              autoCapitalize="none"
              editable={canChangeUsername()}
            />
            {canChangeUsername() && hasUsernameChanged() && (
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={16} color="#007AFF" />
                <Text style={styles.warningText}>
                  After saving, you won't be able to change your username for 14 days
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Birth Date</Text>
            <TouchableOpacity
              style={styles.textInput}
              onPress={() => {
                setShowBirthDateModal(true);
              }}
            >
              <Text style={birthDate ? styles.textInputText : styles.placeholderText}>
                {birthDate || 'Select birth date'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formRow}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.fieldLabel}>Hide Birth Date</Text>
                <Text style={styles.fieldSubLabel}>Only show age, not full date</Text>
              </View>
              <Switch
                value={hideBirthDate}
                onValueChange={setHideBirthDate}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TouchableOpacity
              style={styles.textInput}
              onPress={() => setShowLocationModal(true)}
            >
              <Text style={location ? styles.textInputText : styles.placeholderText}>
                {location || 'Select location'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Occupation / School</Text>
            <TextInput
              style={styles.textInput}
              value={occupation}
              onChangeText={setOccupation}
              placeholder={profile?.path || "What do you do?"}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={[styles.textInput, styles.disabledInput]}>
              <Text style={styles.textInputText}>{profile?.phone || 'No phone number'}</Text>
            </View>
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.textInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>
          
          {/* Interests Section */}
          <Text style={styles.sectionTitle}>Talk to Me About</Text>
          <Text style={styles.sectionSubtitle}>Your Interests (Max 10 tags)</Text>
          
          <View style={styles.tagsContainer}>
            {interests.map((interest, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.interestTag}
                onPress={() => handleRemoveInterest(index)}
              >
                <Text style={styles.tagText}>{interest}</Text>
                <Text style={styles.removeTagIcon}> ×</Text>
              </TouchableOpacity>
            ))}
            {interests.length < 10 && (
              <TouchableOpacity 
                style={styles.addTag} 
                onPress={() => setShowHobbiesModal(true)}
              >
                <Text style={styles.addTagText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Music Section */}
          <Text style={styles.sectionTitle}>On Repeat</Text>
          <Text style={styles.sectionSubtitle}>Current Favorite Song</Text>
          
          <TouchableOpacity 
            style={styles.spotifySearchBar}
            onPress={() => setShowJamModal(true)}
          >
            <Ionicons name="search" size={20} color="#999" />
            <Text style={styles.searchPlaceholder}>Search song or paste Spotify link</Text>
          </TouchableOpacity>
          
          {jam.title && (
            <View style={styles.songCard}>
              {jam.cover_url ? (
                <Image source={{ uri: jam.cover_url }} style={styles.songAlbumArt} />
              ) : (
                <View style={styles.songAlbumArt}>
                  <Text style={styles.musicIcon}>🎵</Text>
                </View>
              )}
              <View style={styles.songInfo}>
                <Text style={styles.songTitle}>{jam.title}</Text>
                <Text style={styles.songArtist}>{jam.artist}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveJam}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Place Section */}
          <Text style={styles.sectionTitle}>Go-To Spot</Text>
          <Text style={styles.sectionSubtitle}>Favorite Local Place</Text>
          
          <TouchableOpacity 
            style={styles.spotifySearchBar}
            onPress={() => setShowRestaurantModal(true)}
          >
            <Ionicons name="search" size={20} color="#999" />
            <Text style={styles.searchPlaceholder}>Search for a place</Text>
          </TouchableOpacity>
          
          {restaurant.name && (
            <View style={styles.placeCard}>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{restaurant.name}</Text>
                <Text style={styles.placeAddress}>{restaurant.address}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveRestaurant}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Music Picker Modal */}
      <MusicPickerModal
        visible={showJamModal}
        onClose={() => setShowJamModal(false)}
        onSelect={(song) => {
          setJam({
            track_id: song.id,
            title: song.title,
            artist: song.artist,
            cover_url: song.cover,
            preview_url: song.preview || ''
          });
        }}
        currentSong={jam.track_id ? {
          id: jam.track_id,
          title: jam.title,
          artist: jam.artist,
          cover: jam.cover_url,
          preview: jam.preview_url
        } : null}
      />
      
      {/* Restaurant Picker Modal */}
      <RestaurantPickerModal
        visible={showRestaurantModal}
        onClose={() => setShowRestaurantModal(false)}
        onSelect={(place) => {
          setRestaurant({
            id: place.id,
            name: place.name,
            address: place.address
          });
        }}
        currentPlace={restaurant.id ? {
          ...restaurant,
          distKm: 0
        } : null}
      />
      
      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelect={(loc) => setLocation(loc)}
        currentLocation={location}
      />
      
      {/* Birth Date Picker Modal */}
      <BirthDatePickerModal
        visible={showBirthDateModal}
        onClose={() => setShowBirthDateModal(false)}
        onSelect={(date) => {
          setBirthDate(date);
          setAge(calculateAge(date).toString());
        }}
        currentDate={birthDate}
      />
      
      {/* Hobbies Picker Modal */}
      <HobbiesPickerModal
        visible={showHobbiesModal}
        onClose={() => setShowHobbiesModal(false)}
        onSelect={(hobbies) => setInterests(hobbies)}
        currentHobbies={interests}
        maxHobbies={10}
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
    backgroundColor: 'rgba(0,0,0,0.32)',
    zIndex: 1,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)' } : {}),
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
    fontFamily: Platform.select({ ios: 'AfterHours', android: 'AfterHours', default: 'System' }),
  },
  rightIcons: {
    flexDirection: 'row',
  },
  profileInfoOverlay: {
    position: 'absolute',
    left: 24,
    bottom: 140,
    zIndex: 10,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  flagCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  locationText: {
    color: '#fff',
    fontSize: 16,
  },
  nameText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  switchPhotoContainer: {
    position: 'absolute',
    left: 24,
    bottom: 72,
    zIndex: 10,
  },
  switchPhotoBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchPhotoBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 18,
  },
  formSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 20,
    minHeight: 600,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  formRow: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  disabledInput: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    marginLeft: 4,
    lineHeight: 18,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lockText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F3FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#007AFF',
    flex: 1,
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  interestTag: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: '#FFF',
    fontSize: 14,
  },
  removeTagIcon: {
    color: '#FFF',
    fontSize: 18,
    marginLeft: 4,
  },
  addTag: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addTagText: {
    color: '#007AFF',
    fontSize: 14,
  },
  spotifySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#999',
    fontSize: 16,
    marginLeft: 8,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  songAlbumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  musicIcon: {
    fontSize: 24,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  songArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
  },
  modalAddButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalAddText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  fieldSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  textInputText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalDragIndicator: {
    width: 36,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  modalListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalLoader: {
    marginVertical: 24,
  },
  modalListContent: {
    paddingBottom: 16,
  },
  modalSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  modalSongRowSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  modalSongCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
  },
  modalSongTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2,
  },
  modalSongArtist: {
    fontSize: 14,
    color: '#666',
  },
  modalPlayIcon: {
    fontSize: 22,
    color: '#666',
    paddingHorizontal: 8,
    marginLeft: 'auto',
  },
  modalEmptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalPrimaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  modalPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  modalPlaceRowSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  modalPlaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalPlaceEmoji: {
    fontSize: 24,
  },
  modalPlaceName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2,
  },
  modalPlaceAddress: {
    fontSize: 14,
    color: '#666',
    flexShrink: 1,
    lineHeight: 18,
  },
  modalSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalFieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalCountrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCountryText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  modalTextInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  modalDatePickerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalDatePicker: {
    height: 200,
  },
  modalScrollView: {
    flex: 1,
    maxHeight: 300,
  },
  modalHobbiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalHobbyChip: {
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  modalHobbyChipSelected: {
    backgroundColor: '#007AFF',
  },
  modalHobbyChipText: {
    fontSize: 14,
    color: '#000',
  },
  modalHobbyChipTextSelected: {
    color: '#FFF',
  },
  modalCustomInterest: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
});