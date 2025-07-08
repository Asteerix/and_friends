import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BottomModal from './BottomModal';

interface PhotoAlbumModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (photos: string[]) => void;
}

export default function PhotoAlbumModal({
  visible,
  onClose,
  onSave,
}: PhotoAlbumModalProps) {
  const [photos, setPhotos] = useState<string[]>([]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map(asset => asset.uri);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const handleAddPhotos = () => {
    Alert.alert(
      'Add Photos',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleSave = () => {
    onSave(photos);
    onClose();
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Photo Album"
      height={500}
      onSave={handleSave}
      saveButtonText="Save Album"
    >
      <View style={styles.container}>
        {photos.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateCard}>
              <Ionicons name="images-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No photos yet</Text>
            </View>
            
            <TouchableOpacity style={styles.uploadCard} onPress={handleAddPhotos}>
              <Ionicons name="camera-outline" size={48} color="#666" />
              <Text style={styles.uploadText}>Upload Photos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addMoreButton} onPress={handleAddPhotos}>
                <Ionicons name="add" size={32} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
        
        <View style={styles.centerContainer}>
          <TouchableOpacity style={styles.addPhotosLink} onPress={handleAddPhotos}>
            <Ionicons name="images-outline" size={20} color="#007AFF" />
            <Text style={styles.addPhotosLinkText}>Add Photos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  emptyStateContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  emptyStateCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
  uploadCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  uploadText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  addMoreButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  addPhotosLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  addPhotosLinkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});