import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/shared/lib/supabase/client';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (publicUrl: string) => void;
  onError?: (error: Error) => void;
}

export const useDirectUploadDebug = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (uri: string, bucket: string, fileName?: string, options?: UploadOptions) => {
      console.log('📤 [DirectUploadDebug] Starting upload...', {
        uri: uri.substring(0, 50) + '...',
        bucket,
        fileName,
      });

      setIsUploading(true);

      try {
        // Generate file name if not provided
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const finalFileName =
          fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        // Check file exists and get info
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }

        console.log('📁 [DirectUploadDebug] File info:', {
          exists: fileInfo.exists,
          size: fileInfo.size,
        });

        if (fileInfo.size === 0) {
          throw new Error('File is empty');
        }

        // Read file as base64
        console.log('📖 [DirectUploadDebug] Reading file as base64...');
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to blob
        console.log('🔄 [DirectUploadDebug] Converting to blob...');
        // Fix MIME type for jpg files
        const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
        const mimeType = `image/${mimeExt}`;
        const response = await fetch(`data:${mimeType};base64,${base64}`);
        const blob = await response.blob();

        console.log('📦 [DirectUploadDebug] Blob created:', {
          size: blob.size,
          type: blob.type,
        });

        // Check authentication before upload
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }

        console.log('🔐 [DirectUploadDebug] User authenticated:', session.user.id);
        console.log('📦 [DirectUploadDebug] Upload parameters:', {
          bucket,
          fileName: finalFileName,
          contentType: blob.type,
          blobSize: blob.size,
        });

        // Try to upload using FileSystem.uploadAsync as alternative
        console.log('⬆️ [DirectUploadDebug] Attempting upload with FileSystem...');

        const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${finalFileName}`;
        const uploadHeaders = {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': blob.type,
          'x-upsert': 'false',
        };

        console.log('🌐 [DirectUploadDebug] Upload URL:', uploadUrl);
        console.log('📋 [DirectUploadDebug] Headers:', {
          ...uploadHeaders,
          Authorization: 'Bearer ' + uploadHeaders.Authorization.substring(7, 20) + '...',
        });

        // Create form data
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: blob.type,
          name: finalFileName,
        } as any);

        // Use fetch to upload
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: uploadHeaders,
          body: blob,
        });

        console.log('📡 [DirectUploadDebug] Response status:', uploadResponse.status);
        console.log('📡 [DirectUploadDebug] Response headers:', uploadResponse.headers);

        const responseText = await uploadResponse.text();
        console.log('📡 [DirectUploadDebug] Response text:', responseText.substring(0, 500));

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status} - ${responseText}`);
        }

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('❌ [DirectUploadDebug] Failed to parse response as JSON');
          throw new Error('Invalid response from server');
        }

        console.log('✅ [DirectUploadDebug] Upload successful:', responseData);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(finalFileName);

        console.log('🔗 [DirectUploadDebug] Public URL:', publicUrl);

        options?.onProgress?.(100);
        options?.onSuccess?.(publicUrl);

        return { publicUrl, fileName: finalFileName };
      } catch (error) {
        console.error('❌ [DirectUploadDebug] Error:', error);
        console.error(
          '❌ [DirectUploadDebug] Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        );
        options?.onError?.(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return { uploadFile, isUploading };
};
