import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/shared/lib/supabase/client';
import { decode } from 'base64-arraybuffer';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (publicUrl: string) => void;
  onError?: (error: Error) => void;
}

export const useDirectUploadFixed = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(async (
    uri: string,
    bucket: string,
    fileName?: string,
    options?: UploadOptions
  ) => {
    console.log('📤 [DirectUploadFixed] Starting upload...', {
      uri: uri.substring(0, 50) + '...',
      bucket,
      fileName,
    });

    setIsUploading(true);

    try {
      // Generate file name if not provided
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      // Check file exists and get info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📁 [DirectUploadFixed] File info:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
      });

      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('File does not exist or is empty');
      }

      // Check authentication before upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }
      
      console.log('🔐 [DirectUploadFixed] User authenticated:', session.user.id);

      // Read file as base64
      console.log('📖 [DirectUploadFixed] Reading file as base64...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Fix MIME type for jpg files
      const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
      const contentType = `image/${mimeExt}`;

      console.log('📦 [DirectUploadFixed] Upload parameters:', {
        bucket,
        fileName: finalFileName,
        contentType,
        base64Length: base64.length
      });

      // Convert base64 to ArrayBuffer using base64-arraybuffer
      console.log('🔄 [DirectUploadFixed] Converting to ArrayBuffer...');
      const arrayBuffer = decode(base64);

      // Upload to Supabase using ArrayBuffer
      console.log('⬆️ [DirectUploadFixed] Uploading to Supabase...');
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, arrayBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ [DirectUploadFixed] Upload error:', error);
        console.error('❌ [DirectUploadFixed] Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error,
          details: JSON.stringify(error)
        });
        throw error;
      }

      console.log('✅ [DirectUploadFixed] Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(finalFileName);

      console.log('🔗 [DirectUploadFixed] Public URL:', publicUrl);

      options?.onProgress?.(100);
      options?.onSuccess?.(publicUrl);

      return { publicUrl, fileName: finalFileName };
    } catch (error) {
      console.error('❌ [DirectUploadFixed] Error:', error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadFile, isUploading };
};