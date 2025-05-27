import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import CustomText, { AfterHoursText } from "@/components/common/CustomText";
import { useProfile } from "@/hooks/useProfile";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { profile, updateProfile } = useProfile();
  const { uploadImage } = useSupabaseStorage();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [path, setPath] = useState(profile?.path || '');
  const [hideBirthDate, setHideBirthDate] = useState(profile?.hide_birth_date || false);
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || '');
  const [coverUri, setCoverUri] = useState(profile?.cover_url || '');
  const [isLoading, setIsLoading] = useState(false);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      let newAvatarUrl = profile?.avatar_url;
      let newCoverUrl = profile?.cover_url;
      
      // Upload new avatar if changed
      if (avatarUri && avatarUri !== profile?.avatar_url) {
        newAvatarUrl = await uploadImage(avatarUri, 'avatars');
      }
      
      // Upload new cover if changed
      if (coverUri && coverUri !== profile?.cover_url) {
        newCoverUrl = await uploadImage(coverUri, 'covers');
      }
      
      await updateProfile({
        full_name: fullName,
        username,
        bio,
        path,
        hide_birth_date: hideBirthDate,
        avatar_url: newAvatarUrl,
        cover_url: newCoverUrl,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <CustomText size="lg">Cancel</CustomText>
          </TouchableOpacity>
          <AfterHoursText size="lg">Edit Profile</AfterHoursText>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <CustomText
              size="lg"
              color={isLoading ? '#CCC' : '#007AFF'}
              weight="bold"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </CustomText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.mediaSection}>
            <TouchableOpacity onPress={handlePickCover} style={styles.coverContainer}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <CustomText size="sm" color="#666">Tap to add cover</CustomText>
                </View>
              )}
              <View style={styles.coverOverlay}>
                <CustomText size="sm" color="#FFF">📷</CustomText>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <CustomText size="lg">👤</CustomText>
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <CustomText size="xs" color="#FFF">📷</CustomText>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <CustomText size="sm" color="#666" style={styles.label}>
                FULL NAME
              </CustomText>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <CustomText size="sm" color="#666" style={styles.label}>
                USERNAME
              </CustomText>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="@username"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <CustomText size="sm" color="#666" style={styles.label}>
                BIO
              </CustomText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#999"
                multiline
                maxLength={150}
              />
              <CustomText size="xs" color="#999" align="right">
                {bio.length}/150
              </CustomText>
            </View>

            <View style={styles.inputGroup}>
              <CustomText size="sm" color="#666" style={styles.label}>
                WHAT'S YOUR PATH?
              </CustomText>
              <TextInput
                style={styles.input}
                value={path}
                onChangeText={setPath}
                placeholder="Job, school, or freelance"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchLabel}>
                <CustomText size="md">Hide birth date</CustomText>
                <CustomText size="sm" color="#666">
                  Only show your age, not full date
                </CustomText>
              </View>
              <Switch
                value={hideBirthDate}
                onValueChange={setHideBirthDate}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  content: {
    flex: 1,
  },
  mediaSection: {
    height: 200,
    position: 'relative',
  },
  coverContainer: {
    height: 150,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFF',
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 16,
    paddingTop: 70,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
});