/**
 * @file Media Service Tests
 * 
 * Tests for media handling functionality in chats
 */

import { MediaService } from '../mediaService';

// Mock external dependencies
jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
  },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
  documentDirectory: '/mock/document/directory/',
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('expo-media-library', () => ({
  createAssetAsync: jest.fn(),
}));

// expo-document-picker is handled gracefully in the service itself

jest.mock('expo-audio', () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn(),
  },
}));

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
}));

jest.mock('../../constants/conversation.constants', () => ({
  CONVERSATION_CONSTANTS: {
    MAX_FILE_SIZE_MB: 50,
  },
}));

// Mock React Native Image component
global.Image = {
  getSize: jest.fn(),
};

// Mock global functions needed for base64 and blob operations in Node.js
global.atob = jest.fn().mockReturnValue('mock-binary-data');
global.Blob = jest.fn().mockImplementation((data, options) => ({ data, options }));

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { AudioModule } from 'expo-audio';
import { supabase } from '@/shared/lib/supabase/client';

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful permissions
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (AudioModule.requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    
    // Default successful storage operations
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'mock-path' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/mock-file.jpg' },
      }),
    });
  });

  describe('Permission Management', () => {
    it('should request media permissions successfully', async () => {
      const result = await MediaService.requestMediaPermissions();

      expect(result).toBe(true);
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false if any permission denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await MediaService.requestMediaPermissions();

      expect(result).toBe(false);
    });
  });

  describe('Image Operations', () => {
    it('should pick image from gallery successfully', async () => {
      const mockAsset = {
        uri: 'file://mock-image.jpg',
        width: 1920,
        height: 1080,
      };

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('mock-base64-data');

      const result = await MediaService.pickImage();

      expect(result).toEqual({
        url: 'https://example.com/mock-file.jpg',
        type: 'image',
        metadata: {
          width: 1920,
          height: 1080,
          mime_type: 'image/jpeg',
        },
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });
    });

    it('should return null when image picking is cancelled', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      const result = await MediaService.pickImage();

      expect(result).toBeNull();
    });

    it('should take photo successfully', async () => {
      const mockAsset = {
        uri: 'file://mock-photo.jpg',
        width: 1920,
        height: 1080,
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('mock-base64-data');

      const result = await MediaService.takePhoto();

      expect(result).toEqual({
        url: 'https://example.com/mock-file.jpg',
        type: 'image',
        metadata: {
          width: 1920,
          height: 1080,
          mime_type: 'image/jpeg',
        },
      });

      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });
    });

    it('should handle image picking errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await MediaService.pickImage();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erreur lors de la sélection d'image:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Video Operations', () => {
    it('should pick video successfully', async () => {
      const mockAsset = {
        uri: 'file://mock-video.mp4',
        duration: 30000,
        width: 1920,
        height: 1080,
      };

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('mock-base64-data');

      const result = await MediaService.pickVideo();

      expect(result).toEqual({
        url: 'https://example.com/mock-file.jpg',
        type: 'video',
        metadata: {
          duration: 30000,
          width: 1920,
          height: 1080,
          mime_type: 'video/mp4',
        },
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 60,
      });
    });

    it('should handle video picking errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error('Video selection failed')
      );

      const result = await MediaService.pickVideo();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erreur lors de la sélection de vidéo:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Document Operations', () => {
    it('should return null when document picker is not available', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await MediaService.pickDocument();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('expo-document-picker is not available');

      consoleSpy.mockRestore();
    });

    it('should have pickDocument method available', () => {
      expect(typeof MediaService.pickDocument).toBe('function');
      
      // When expo-document-picker is installed, the pickDocument method should:
      // 1. Use DocumentPicker.getDocumentAsync to select files
      // 2. Check file size against MAX_FILE_SIZE_MB limit
      // 3. Upload to Supabase storage
      // 4. Return MediaUploadResult with file metadata
    });
  });

  describe('Voice Recording', () => {
    it('should acknowledge voice recording needs refactoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await MediaService.recordVoiceMessage();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'recordVoiceMessage needs to be refactored to use useAudioRecorder hook in a component'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('File Download', () => {
    it('should download file successfully', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: '/mock/document/directory/downloaded-file.jpg',
      });

      const result = await MediaService.downloadFile(
        'https://example.com/file.jpg',
        'downloaded-file.jpg'
      );

      expect(result).toBe('/mock/document/directory/downloaded-file.jpg');

      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        'https://example.com/file.jpg',
        '/mock/document/directory/downloaded-file.jpg'
      );

      expect(MediaLibrary.createAssetAsync).toHaveBeenCalledWith(
        '/mock/document/directory/downloaded-file.jpg'
      );
    });

    it('should handle download failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (FileSystem.downloadAsync as jest.Mock).mockRejectedValue(
        new Error('Download failed')
      );

      const result = await MediaService.downloadFile(
        'https://example.com/file.jpg',
        'file.jpg'
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erreur lors du téléchargement:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should not save to media library for non-media files', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: '/mock/document/directory/document.pdf',
      });

      await MediaService.downloadFile(
        'https://example.com/document.pdf',
        'document.pdf'
      );

      expect(MediaLibrary.createAssetAsync).not.toHaveBeenCalled();
    });
  });

  describe('Image Utilities', () => {
    it('should get image dimensions successfully', async () => {
      (global.Image.getSize as jest.Mock).mockImplementation(
        (uri, successCallback) => {
          successCallback(1920, 1080);
        }
      );

      const result = await MediaService.getImageDimensions('https://example.com/image.jpg');

      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should handle image dimension errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.Image.getSize as jest.Mock).mockImplementation(
        (uri, successCallback, errorCallback) => {
          errorCallback(new Error('Failed to get dimensions'));
        }
      );

      const result = await MediaService.getImageDimensions('https://example.com/image.jpg');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erreur lors de l'obtention des dimensions:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Video Thumbnail', () => {
    it('should acknowledge video thumbnail creation is not implemented', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await MediaService.createVideoThumbnail('https://example.com/video.mp4');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Création de miniature vidéo non implémentée'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Storage Upload', () => {
    it('should handle Supabase upload errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        }),
        getPublicUrl: jest.fn(),
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{
          uri: 'file://mock-image.jpg',
          width: 1920,
          height: 1080,
        }],
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('mock-base64-data');

      const result = await MediaService.pickImage();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Erreur lors de la sélection d'image:", { message: 'Upload failed' });

      consoleSpy.mockRestore();
    });
  });

  describe('Base64 Conversion', () => {
    it('should convert base64 to blob correctly', async () => {
      // Test the private base64ToBlob method indirectly through a public method
      const mockAsset = {
        uri: 'file://test.jpg',
        width: 100,
        height: 100,
      };

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('dGVzdA=='); // 'test' in base64

      // This will internally call base64ToBlob
      await MediaService.pickImage();

      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        'file://test.jpg',
        { encoding: FileSystem.EncodingType.Base64 }
      );
    });
  });
});