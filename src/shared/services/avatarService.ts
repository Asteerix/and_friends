import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/shared/lib/supabase/client';

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

export class AvatarService {
  private static readonly BUCKET_NAME = 'avatars';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Upload user avatar to Supabase storage
   * @param imageUri Local file URI from image picker
   * @param userId User ID for file naming
   * @returns Promise with upload result
   */
  static async uploadAvatar(imageUri: string, userId: string): Promise<AvatarUploadResult> {
    try {
      // Validate file exists
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'Selected image file does not exist' };
      }

      // Check file size
      if (fileInfo.size && fileInfo.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: 'Image file is too large. Please select an image under 5MB.',
        };
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(imageUri);
      const fileName = `${userId}_${Date.now()}.${fileExtension}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: this.getContentType(fileExtension),
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

      return {
        success: true,
        avatarUrl: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Avatar upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during upload',
      };
    }
  }

  /**
   * Delete user's existing avatar from storage
   * @param avatarUrl Full URL of the avatar to delete
   * @returns Promise<boolean> indicating success
   */
  static async deleteAvatar(avatarUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL
      const fileName = this.extractFileNameFromUrl(avatarUrl);
      if (!fileName) {
        return false;
      }

      const { error } = await supabase.storage.from(this.BUCKET_NAME).remove([fileName]);

      if (error) {
        console.error('Error deleting avatar:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Avatar deletion error:', error);
      return false;
    }
  }

  /**
   * Update user's avatar - uploads new one and deletes old one
   * @param imageUri New image URI
   * @param userId User ID
   * @param oldAvatarUrl Optional existing avatar URL to delete
   * @returns Promise with upload result
   */
  static async updateAvatar(
    imageUri: string,
    userId: string,
    oldAvatarUrl?: string
  ): Promise<AvatarUploadResult> {
    // Upload new avatar
    const uploadResult = await this.uploadAvatar(imageUri, userId);

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Delete old avatar if it exists and upload was successful
    if (oldAvatarUrl && uploadResult.avatarUrl !== oldAvatarUrl) {
      await this.deleteAvatar(oldAvatarUrl);
    }

    return uploadResult;
  }

  /**
   * Get file extension from URI
   */
  private static getFileExtension(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '') ? extension! : 'jpg';
  }

  /**
   * Get content type for file extension
   */
  private static getContentType(extension: string): string {
    switch (extension.toLowerCase()) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Extract filename from Supabase storage URL
   */
  private static extractFileNameFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1] || null;
    } catch {
      return null;
    }
  }
}
