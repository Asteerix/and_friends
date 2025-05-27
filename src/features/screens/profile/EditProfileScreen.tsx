import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from "@/hooks/useProfile";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import * as Haptics from 'expo-haptics';

const interests = [
  { id: 'sports', icon: '⚽', label: 'Sports' },
  { id: 'music', icon: '🎵', label: 'Music' },
  { id: 'arts', icon: '🎨', label: 'Arts' },
  { id: 'food', icon: '🍕', label: 'Food' },
  { id: 'gaming', icon: '🎮', label: 'Gaming' },
  { id: 'travel', icon: '✈️', label: 'Travel' },
  { id: 'reading', icon: '📚', label: 'Reading' },
  { id: 'fitness', icon: '💪', label: 'Fitness' },
  { id: 'movies', icon: '🎬', label: 'Movies' },
  { id: 'photography', icon: '📸', label: 'Photography' },
  { id: 'nature', icon: '🌿', label: 'Nature' },
  { id: 'tech', icon: '💻', label: 'Technology' },
];

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { uploadImage } = useSupabaseStorage();
  
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || '');
  const [coverUri, setCoverUri] = useState(profile?.cover_url || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUri(profile.avatar_url || '');
      setCoverUri(profile.cover_url || '');
      setSelectedInterests(profile.interests || []);
    }
  }, [profile]);

  const handlePickImage = async (type: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'avatar') {
        setAvatarUri(result.assets[0].uri);
      } else {
        setCoverUri(result.assets[0].uri);
      }
    }
  };

  const toggleInterest = (interestId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      }
      if (prev.length < 5) {
        return [...prev, interestId];
      }
      Alert.alert('Limit Reached', 'You can select up to 5 interests');
      return prev;
    });
  };

  const handleSave = async () => {
    if (!displayName.trim() || !username.trim()) {
      Alert.alert('Error', 'Name and username are required');
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;
      let coverUrl = profile?.cover_url;

      // Upload new avatar if changed
      if (avatarUri && avatarUri !== profile?.avatar_url && avatarUri.startsWith('file://')) {
        const uploadResult = await uploadImage(avatarUri, 'avatars');
        if (uploadResult) {
          avatarUrl = uploadResult;
        }
      }

      // Upload new cover if changed
      if (coverUri && coverUri !== profile?.cover_url && coverUri.startsWith('file://')) {
        const uploadResult = await uploadImage(coverUri, 'covers');
        if (uploadResult) {
          coverUrl = uploadResult;
        }
      }

      await updateProfile({
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        interests: selectedInterests,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#45B7D1', '#3498DB']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cover Photo */}
        <TouchableOpacity
          style={styles.coverContainer}
          onPress={() => handlePickImage('cover')}
        >
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <LinearGradient
              colors={['#FF6B6B', '#FF8787']}
              style={styles.coverPlaceholder}
            />
          )}
          <View style={styles.coverOverlay}>
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.coverText}>Change Cover</Text>
          </View>
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => handlePickImage('avatar')}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="white" />
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameInput}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              multiline
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          {/* Interests */}
          <View style={styles.interestsSection}>
            <Text style={styles.sectionTitle}>Interests (Max 5)</Text>
            <View style={styles.interestsGrid}>
              {interests.map((interest) => (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestChip,
                    selectedInterests.includes(interest.id) && styles.interestChipActive,
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                >
                  <Text style={styles.interestIcon}>{interest.icon}</Text>
                  <Text
                    style={[
                      styles.interestLabel,
                      selectedInterests.includes(interest.id) && styles.interestLabelActive,
                    ]}
                  >
                    {interest.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  coverText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: '#f8f8f8',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#45B7D1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#45B7D1',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f8f8f8',
  },
  formContainer: {
    marginTop: 80,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  usernameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingLeft: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  usernamePrefix: {
    fontSize: 16,
    color: '#666',
    marginRight: 4,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  interestsSection: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  interestChipActive: {
    backgroundColor: '#45B7D1',
    borderColor: '#45B7D1',
  },
  interestIcon: {
    fontSize: 18,
  },
  interestLabel: {
    fontSize: 14,
    color: '#666',
  },
  interestLabelActive: {
    color: 'white',
    fontWeight: '500',
  },
});