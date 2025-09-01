import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/shared/lib/supabase/client';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (publicUrl: string) => void;
  onError?: (error: Error) => void;
}

export const useDirectUploadXHR = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (uri: string, bucket: string, fileName?: string, options?: UploadOptions) => {
      console.log('📤 [DirectUploadXHR] Starting upload...', {
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

        console.log('📁 [DirectUploadXHR] File info:', {
          exists: fileInfo.exists,
          size: fileInfo.size,
        });

        if (fileInfo.size === 0) {
          throw new Error('File is empty');
        }

        // Check authentication before upload
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }

        console.log('🔐 [DirectUploadXHR] User authenticated:', session.user.id);

        // Fix MIME type for jpg files
        const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
        const contentType = `image/${mimeExt}`;

        // Use FileSystem.uploadAsync which handles the upload properly in React Native
        const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${finalFileName}`;

        console.log('📦 [DirectUploadXHR] Upload parameters:', {
          bucket,
          fileName: finalFileName,
          contentType,
          uploadUrl,
        });

        console.log('⬆️ [DirectUploadXHR] Uploading with FileSystem.uploadAsync...');

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': contentType,
            'x-upsert': 'false',
          },
        });

        console.log('📡 [DirectUploadXHR] Upload response:', {
          status: uploadResult.status,
          body: uploadResult.body,
        });

        if (uploadResult.status !== 200 && uploadResult.status !== 201) {
          throw new Error(`Upload failed with status ${uploadResult.status}: ${uploadResult.body}`);
        }

        // Parse response
        let responseData;
        try {
          responseData = JSON.parse(uploadResult.body);
        } catch (e) {
          console.error('❌ [DirectUploadXHR] Failed to parse response:', uploadResult.body);
          throw new Error('Invalid response from server');
        }

        console.log('✅ [DirectUploadXHR] Upload successful:', responseData);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(finalFileName);

        console.log('🔗 [DirectUploadXHR] Public URL:', publicUrl);

        options?.onProgress?.(100);
        options?.onSuccess?.(publicUrl);

        return { publicUrl, fileName: finalFileName };
      } catch (error) {
        console.error('❌ [DirectUploadXHR] Error:', error);
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
