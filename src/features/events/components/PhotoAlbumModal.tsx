import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import BottomModal from './BottomModal';

interface PhotoAlbumModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (photos: string[]) => void;
  initialPhotos?: string[];
}

const MAX_PHOTOS = 12; // Limite maximale d'images

export default function PhotoAlbumModal({
  visible,
  onClose,
  onSave,
  initialPhotos = [],
}: PhotoAlbumModalProps) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});

  // Reset photos when modal opens with new initial photos
  useEffect(() => {
    if (visible) {
      setPhotos(initialPhotos);
      setHasChanges(false);
    }
  }, [visible, initialPhotos]);

  const pickImage = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Limite atteinte',
        `Vous pouvez ajouter un maximum de ${MAX_PHOTOS} photos.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_PHOTOS - photos.length,
    });

    if (!result.canceled && result.assets) {
      const remainingSlots = MAX_PHOTOS - photos.length;
      const newPhotos = result.assets.slice(0, remainingSlots).map(asset => asset.uri);
      // Mark new photos as loading
      const loadingState: { [key: string]: boolean } = {};
      newPhotos.forEach(uri => {
        loadingState[uri] = true;
      });
      setLoadingImages(prev => ({ ...prev, ...loadingState }));
      
      setPhotos([...photos, ...newPhotos]);
      setHasChanges(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Simulate image processing
      setTimeout(() => {
        setLoadingImages(prev => {
          const updated = { ...prev };
          newPhotos.forEach(uri => {
            delete updated[uri];
          });
          return updated;
        });
      }, 800);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Limite atteinte',
        `Vous pouvez ajouter un maximum de ${MAX_PHOTOS} photos.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhotoUri = result.assets[0].uri;
      setLoadingImages(prev => ({ ...prev, [newPhotoUri]: true }));
      setPhotos([...photos, newPhotoUri]);
      setHasChanges(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Simulate image processing
      setTimeout(() => {
        setLoadingImages(prev => {
          const updated = { ...prev };
          delete updated[newPhotoUri];
          return updated;
        });
      }, 800);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Supprimer la photo ?',
      'Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            setPhotos(newPhotos);
            setHasChanges(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
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
    if (hasChanges || photos.length !== initialPhotos.length) {
      onSave(photos);
    }
    onClose();
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Modifications non sauvegardées',
        'Voulez-vous sauvegarder vos modifications ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Ne pas sauvegarder',
            style: 'destructive',
            onPress: () => {
              setPhotos(initialPhotos);
              setHasChanges(false);
              onClose();
            },
          },
          {
            text: 'Sauvegarder',
            onPress: handleSave,
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <BottomModal
      visible={visible}
      onClose={handleClose}
      title="📸 Photo Album"
      height={600}
      onSave={handleSave}
      saveButtonText={photos.length > 0 ? `Sauvegarder (${photos.length} photo${photos.length > 1 ? 's' : ''})` : 'Sauvegarder'}
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
            <View style={styles.headerInfo}>
              <Text style={styles.photoCountText}>
                {photos.length} / {MAX_PHOTOS} photos
              </Text>
              {photos.length >= MAX_PHOTOS && (
                <Text style={styles.limitWarning}>Limite atteinte</Text>
              )}
            </View>
            
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <View key={`photo-${index}-${photo}`} style={styles.photoContainer}>
                  <Image 
                    source={{ uri: photo }} 
                    style={styles.photo}
                    onError={() => {
                      Alert.alert('Erreur', 'Impossible de charger cette image');
                      removePhoto(index);
                    }}
                  />
                  {loadingImages[photo] && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removePhoto(index)}
                    disabled={loadingImages[photo]}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={styles.addMoreButton} onPress={handleAddPhotos}>
                  <Ionicons name="add" size={32} color="#007AFF" />
                  <Text style={styles.addMoreText}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
        
        {photos.length > 0 && photos.length < MAX_PHOTOS && (
          <View style={styles.centerContainer}>
            <TouchableOpacity style={styles.addPhotosLink} onPress={handleAddPhotos}>
              <Ionicons name="images-outline" size={20} color="#007AFF" />
              <Text style={styles.addPhotosLinkText}>Ajouter plus de photos</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  photoCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  limitWarning: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
    marginBottom: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
    marginBottom: 4,
  },
  addMoreText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500',
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});