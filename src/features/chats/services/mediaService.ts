import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import { AudioModule } from 'expo-audio';
// Note: Recording functionality requires hooks and should be used in components
import { supabase } from '@/shared/lib/supabase/client';
import { CONVERSATION_CONSTANTS } from '../constants/conversation.constants';
import type { MessageType } from '@/types/conversation.types';

export interface MediaUploadResult {
  url: string;
  type: MessageType;
  metadata: {
    file_name?: string;
    file_size?: number;
    duration?: number;
    width?: number;
    height?: number;
    mime_type?: string;
  };
}

export class MediaService {
  private static readonly BUCKET_NAME = 'chat-media';
  
  // Demander les permissions
  static async requestMediaPermissions(): Promise<boolean> {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: audioStatus } = await AudioModule.requestRecordingPermissionsAsync();
    
    return (
      cameraStatus === 'granted' &&
      mediaLibraryStatus === 'granted' &&
      audioStatus === 'granted'
    );
  }

  // Choisir une image de la galerie
  static async pickImage(): Promise<MediaUploadResult | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return await this.uploadImage(asset.uri, {
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sélection d\'image:', error);
    }
    return null;
  }

  // Prendre une photo
  static async takePhoto(): Promise<MediaUploadResult | null> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return await this.uploadImage(asset.uri, {
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
    }
    return null;
  }

  // Choisir une vidéo
  static async pickVideo(): Promise<MediaUploadResult | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 60, // 1 minute max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return await this.uploadVideo(asset.uri, {
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de vidéo:', error);
    }
    return null;
  }

  // Choisir un document
  static async pickDocument(): Promise<MediaUploadResult | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        // Vérifier la taille du fichier
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
        
        if (fileSizeMB > CONVERSATION_CONSTANTS.MAX_FILE_SIZE_MB) {
          throw new Error(`Le fichier est trop volumineux (max ${CONVERSATION_CONSTANTS.MAX_FILE_SIZE_MB}MB)`);
        }

        return await this.uploadFile(result.uri, {
          file_name: result.name,
          file_size: fileInfo.size,
          mime_type: result.mimeType,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de document:', error);
      throw error;
    }
    return null;
  }

  // Enregistrer un message vocal
  // Note: This method needs to be refactored to use hooks in a component
  // expo-audio uses hooks (useAudioRecorder) which can't be used in static methods
  static async recordVoiceMessage(): Promise<MediaUploadResult | null> {
    console.error('recordVoiceMessage needs to be refactored to use useAudioRecorder hook in a component');
    // The recording logic should be moved to a React component that can use hooks
    // Example usage in a component:
    // const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    // await audioRecorder.prepareToRecordAsync();
    // audioRecorder.record();
    // ... later ...
    // await audioRecorder.stop();
    // const uri = audioRecorder.uri;
    return null;
  }

  // Upload d'image
  private static async uploadImage(
    uri: string,
    metadata: { width?: number; height?: number }
  ): Promise<MediaUploadResult> {
    const fileName = `images/${Date.now()}.jpg`;
    const url = await this.uploadToSupabase(uri, fileName);
    
    return {
      url,
      type: 'image',
      metadata: {
        ...metadata,
        mime_type: 'image/jpeg',
      },
    };
  }

  // Upload de vidéo
  private static async uploadVideo(
    uri: string,
    metadata: { duration?: number; width?: number; height?: number }
  ): Promise<MediaUploadResult> {
    const fileName = `videos/${Date.now()}.mp4`;
    const url = await this.uploadToSupabase(uri, fileName);
    
    return {
      url,
      type: 'video',
      metadata: {
        ...metadata,
        mime_type: 'video/mp4',
      },
    };
  }

  // Upload d'audio
  private static async uploadAudio(
    uri: string,
    metadata: { duration?: number }
  ): Promise<MediaUploadResult> {
    const fileName = `voice/${Date.now()}.m4a`;
    const url = await this.uploadToSupabase(uri, fileName);
    
    return {
      url,
      type: 'voice',
      metadata: {
        ...metadata,
        mime_type: 'audio/m4a',
      },
    };
  }

  // Upload de fichier
  private static async uploadFile(
    uri: string,
    metadata: { file_name?: string; file_size?: number; mime_type?: string }
  ): Promise<MediaUploadResult> {
    const extension = metadata.file_name?.split('.').pop() || 'file';
    const fileName = `files/${Date.now()}.${extension}`;
    const url = await this.uploadToSupabase(uri, fileName);
    
    return {
      url,
      type: 'file',
      metadata,
    };
  }

  // Upload vers Supabase Storage
  private static async uploadToSupabase(uri: string, fileName: string): Promise<string> {
    try {
      // Lire le fichier
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Créer un blob à partir du base64
      const blob = this.base64ToBlob(fileData, 'application/octet-stream');

      // Upload vers Supabase
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erreur upload Supabase:', error);
        throw error;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      throw error;
    }
  }

  // Convertir base64 en blob
  private static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Télécharger un fichier
  static async downloadFile(url: string, fileName: string): Promise<string | null> {
    try {
      const downloadPath = `${FileSystem.documentDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, downloadPath);
      
      if (downloadResult.status === 200) {
        // Sauvegarder dans la galerie si c'est une image/vidéo
        if (fileName.match(/\.(jpg|jpeg|png|gif|mp4|mov)$/i)) {
          await MediaLibrary.createAssetAsync(downloadResult.uri);
        }
        
        return downloadResult.uri;
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
    return null;
  }

  // Créer une miniature pour une vidéo
  static async createVideoThumbnail(videoUri: string): Promise<string | null> {
    // Cette fonctionnalité nécessite une implémentation native
    // ou l'utilisation d'une librairie tierce
    console.warn('Création de miniature vidéo non implémentée');
    return null;
  }

  // Obtenir les dimensions d'une image
  static async getImageDimensions(uri: string): Promise<{ width: number; height: number } | null> {
    try {
      return await new Promise((resolve, reject) => {
        Image.getSize(
          uri,
          (width, height) => resolve({ width, height }),
          reject
        );
      });
    } catch (error) {
      console.error('Erreur lors de l\'obtention des dimensions:', error);
      return null;
    }
  }
}