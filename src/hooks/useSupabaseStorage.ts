import { useState } from 'react';
import { supabase } from "@/lib/supabase";
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export const useSupabaseStorage = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    try {
      // Demander la permission d'accès à la galerie
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à votre galerie.');
        return null;
      }

      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Aspect ratio pour les couvertures d'événements
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Une erreur s\'est produite lors de la sélection de l\'image.');
      return null;
    }
  };

  const uploadImage = async (uri: string, bucket: string = 'event-covers') => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Extraire l'extension du fichier
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      // Créer un blob à partir de l'URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erreur upload:', error);
        throw error;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader l\'image. Veuillez réessayer.');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (url: string, bucket: string = 'event-covers') => {
    try {
      // Extraire le nom du fichier de l'URL
      const fileName = url.split('/').pop();
      if (!fileName) return;

      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) {
        console.error('Erreur suppression:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Alert.alert('Erreur', 'Impossible de supprimer l\'image.');
      throw error;
    }
  };

  return {
    pickImage,
    uploadImage,
    deleteImage,
    uploadProgress,
    isUploading,
  };
};