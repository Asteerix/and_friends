import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/shared/lib/supabase/client';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (publicUrl: string) => void;
  onError?: (error: Error) => void;
}

export const useDirectUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (uri: string, bucket: string, fileName?: string, options?: UploadOptions) => {
      console.log('📤 [DirectUpload] Starting upload...', {
        uri: uri.substring(0, 50) + '...',
        bucket,
        fileName,
      });

      setIsUploading(true);

      try {
        // Generate file name if not provided
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';

        // Validate that it's an image file
        const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!allowedImageExtensions.includes(ext)) {
          throw new Error(`Invalid file type: ${ext}. Only images are allowed.`);
        }

        const finalFileName =
          fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        // Check file exists and get info
        const fileInfo = await FileSystem.getInfoAsync(uri);

        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }

        console.log('📁 [DirectUpload] File info:', {
          exists: fileInfo.exists,
          size: fileInfo.size,
        });

        if (fileInfo.size === 0) {
          throw new Error('File is empty');
        }

        // Always compress images to ensure optimal size and format
        let uploadUri = uri;
        console.log('🗜️ [DirectUpload] Processing image...');

        // Determine compression settings based on file size
        let quality = 0.9;
        let maxWidth = 1080;

        if (fileInfo.size && fileInfo.size > 2 * 1024 * 1024) {
          // If > 2MB, compress more aggressively
          quality = 0.7;
          maxWidth = 1080;
        } else if (fileInfo.size && fileInfo.size > 1024 * 1024) {
          // If > 1MB, moderate compression
          quality = 0.8;
          maxWidth = 1080;
        }

        try {
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: maxWidth } }],
            {
              compress: quality,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          uploadUri = manipResult.uri;

          const compressedInfo = await FileSystem.getInfoAsync(uploadUri);
          if (compressedInfo.exists) {
            console.log('✅ [DirectUpload] Image processed:', {
              originalSize: fileInfo.size,
              compressedSize: compressedInfo.size,
              reduction: `${Math.round((1 - compressedInfo.size / fileInfo.size) * 100)}%`,
              quality: `${quality * 100}%`,
            });

            // If still too large after compression, try again with lower quality
            if (compressedInfo.size > 800 * 1024) {
              console.log('⚠️ [DirectUpload] Still too large, compressing further...');

              const furtherCompressed = await ImageManipulator.manipulateAsync(
                uploadUri,
                [{ resize: { width: 800 } }],
                {
                  compress: 0.6,
                  format: ImageManipulator.SaveFormat.JPEG,
                }
              );

              uploadUri = furtherCompressed.uri;

              const finalInfo = await FileSystem.getInfoAsync(uploadUri);
              if (finalInfo.exists) {
                console.log('✅ [DirectUpload] Final compression:', {
                  size: finalInfo.size,
                  totalReduction: `${Math.round((1 - finalInfo.size / fileInfo.size) * 100)}%`,
                });
              }
            }
          }
        } catch (compressionError) {
          console.error('⚠️ [DirectUpload] Compression failed, using original:', compressionError);
          // Continue with original if compression fails
        }

        // Check authentication before upload
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }

        console.log('🔐 [DirectUpload] User authenticated:', session.user.id);

        // Fix MIME type for jpg files
        const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
        const contentType = `image/${mimeExt}`;

        // Use FileSystem.uploadAsync which is the recommended way for React Native
        const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${finalFileName}`;

        console.log('📦 [DirectUpload] Upload parameters:', {
          bucket,
          fileName: finalFileName,
          contentType,
          uploadUrl,
        });

        console.log('⬆️ [DirectUpload] Uploading with FileSystem.uploadAsync...');

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, uploadUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': contentType,
            'x-upsert': 'false',
          },
        });

        console.log('📡 [DirectUpload] Upload response:', {
          status: uploadResult.status,
          body: uploadResult.body?.substring(0, 200),
        });

        if (uploadResult.status !== 200 && uploadResult.status !== 201) {
          const errorBody = uploadResult.body;
          console.error('❌ [DirectUpload] Upload failed:', errorBody);
          throw new Error(`Upload failed with status ${uploadResult.status}: ${errorBody}`);
        }

        // Parse response
        let responseData;
        try {
          responseData = JSON.parse(uploadResult.body);
        } catch (e) {
          console.log('⚠️ [DirectUpload] Non-JSON response, assuming success');
          responseData = { Key: `${bucket}/${finalFileName}` };
        }

        console.log('✅ [DirectUpload] Upload successful:', responseData);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(finalFileName);

        console.log('🔗 [DirectUpload] Public URL:', publicUrl);

        options?.onProgress?.(100);
        options?.onSuccess?.(publicUrl);

        return { publicUrl, fileName: finalFileName };
      } catch (error) {
        console.error('❌ [DirectUpload] Error:', error);
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
