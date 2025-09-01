import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/shared/lib/supabase/client';

export const useSupabaseStorage = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    try {
      // Demander la permission d'accès à la galerie
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Nous avons besoin de la permission pour accéder à votre galerie.'
        );
        return null;
      }

      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as const,
        allowsEditing: true,
        aspect: [16, 9], // Aspect ratio pour les couvertures d'événements
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la sélection de l'image:", error);
      Alert.alert('Erreur', "Une erreur s'est produite lors de la sélection de l'image.");
      return null;
    }
  };

  const uploadImage = async (uri: string, bucket: string = 'event-covers') => {
    try {
      console.log('[useSupabaseStorage] Starting image upload:', {
        bucket,
        uriPreview: uri.substring(0, 50) + '...',
      });

      setIsUploading(true);
      setUploadProgress(0);

      // Extraire l'extension du fichier
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      console.log('[useSupabaseStorage] Generated filename:', fileName);

      // Pour React Native sur iOS/Android
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          console.log('[useSupabaseStorage] Fetching blob from URI...');

          // Fetch l'image comme blob
          const response = await fetch(uri);
          const blob = await response.blob();

          console.log('[useSupabaseStorage] Blob size:', blob.size);

          if (blob.size === 0) {
            throw new Error('Image file is empty');
          }

          // Méthode 1: Upload direct du blob
          console.log('[useSupabaseStorage] Attempting direct blob upload...');

          const { error } = await supabase.storage.from(bucket).upload(fileName, blob, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            cacheControl: '3600',
            upsert: false,
          });

          if (error) {
            console.error('[useSupabaseStorage] Direct blob upload failed:', error);

            // Méthode 2: Convertir en base64 et uploader
            console.log('[useSupabaseStorage] Trying base64 method...');

            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
              reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64Data = base64String.split(',')[1];
                resolve(base64Data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            const base64 = (await base64Promise) as string;

            const { error: base64Error } = await supabase.storage
              .from(bucket)
              .upload(fileName, decode(base64), {
                contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                cacheControl: '3600',
                upsert: false,
              });

            if (base64Error) {
              console.error('[useSupabaseStorage] Base64 upload failed:', base64Error);
              throw base64Error;
            }

            console.log('[useSupabaseStorage] Base64 upload successful');
          } else {
            console.log('[useSupabaseStorage] Direct blob upload successful');
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(bucket).getPublicUrl(fileName);

          console.log('[useSupabaseStorage] Public URL:', publicUrl);
          setUploadProgress(100);

          return publicUrl;
        } catch (error) {
          console.error('[useSupabaseStorage] Error:', error);
          throw error;
        }
      }

      // Pour le web
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage.from(bucket).upload(fileName, blob, {
        contentType: blob.type || `image/${ext}`,
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName);

      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('[useSupabaseStorage] Error during upload:', error);
      Alert.alert('Erreur', "Impossible d'uploader l'image. Veuillez réessayer.");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadVideo = async (uri: string, bucket: string = 'stories') => {
    try {
      console.log('[useSupabaseStorage] Starting video upload:', {
        bucket,
        uriPreview: uri.substring(0, 50) + '...',
      });

      setIsUploading(true);
      setUploadProgress(0);

      // Extraire l'extension du fichier
      const ext = uri.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      console.log('[useSupabaseStorage] Generated video filename:', fileName);

      // Pour React Native iOS/Android
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();

          console.log('[useSupabaseStorage] Video blob created:', {
            size: blob.size,
            type: blob.type,
          });

          if (blob.size === 0) {
            console.error('[useSupabaseStorage] Video blob size is 0, trying XHR method');

            // Alternative avec XMLHttpRequest
            const xhr = new XMLHttpRequest();
            const uploadPromise = new Promise<string>((resolve, reject) => {
              xhr.onload = function () {
                if (xhr.status === 200) {
                  const responseBlob = xhr.response as Blob;
                  console.log('[useSupabaseStorage] XHR video blob size:', responseBlob.size);

                  supabase.storage
                    .from(bucket)
                    .upload(fileName, responseBlob, {
                      contentType: `video/${ext}`,
                      cacheControl: '3600',
                      upsert: false,
                    })
                    .then(({ error }) => {
                      if (error) {
                        reject(error);
                      } else {
                        const {
                          data: { publicUrl },
                        } = supabase.storage.from(bucket).getPublicUrl(fileName);
                        resolve(publicUrl);
                      }
                    });
                } else {
                  reject(new Error('XHR failed for video'));
                }
              };

              xhr.onerror = () => reject(new Error('XHR video error'));
              xhr.responseType = 'blob';
              xhr.open('GET', uri);
              xhr.send();
            });

            const publicUrl = await uploadPromise;
            console.log('[useSupabaseStorage] Video upload successful with XHR, URL:', publicUrl);
            setUploadProgress(100);
            return publicUrl;
          }

          // Si le blob est valide
          const { error } = await supabase.storage.from(bucket).upload(fileName, blob, {
            contentType: blob.type || `video/${ext}`,
            cacheControl: '3600',
            upsert: false,
          });

          if (error) {
            console.error('[useSupabaseStorage] Video upload error:', error);
            throw error;
          }

          console.log('[useSupabaseStorage] Video upload successful');

          const {
            data: { publicUrl },
          } = supabase.storage.from(bucket).getPublicUrl(fileName);

          console.log('[useSupabaseStorage] Video public URL:', publicUrl);
          setUploadProgress(100);
          return publicUrl;
        } catch (fetchError) {
          console.error('[useSupabaseStorage] Video fetch error:', fetchError);
          throw fetchError;
        }
      }

      // Pour le web
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage.from(bucket).upload(fileName, blob, {
        contentType: blob.type || `video/${ext}`,
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName);

      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('[useSupabaseStorage] Error during video upload:', error);
      Alert.alert('Erreur', "Impossible d'uploader la vidéo. Veuillez réessayer.");
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

      const { error } = await supabase.storage.from(bucket).remove([fileName]);

      if (error) {
        console.error('Erreur suppression:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Alert.alert('Erreur', "Impossible de supprimer l'image.");
      throw error;
    }
  };

  return {
    pickImage,
    uploadImage,
    uploadVideo,
    deleteImage,
    uploadProgress,
    isUploading,
  };
};
