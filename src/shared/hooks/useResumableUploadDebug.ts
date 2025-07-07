import { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import { supabase } from '@/shared/lib/supabase/client';

interface UploadTask {
  id: string;
  uri: string;
  bucket: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  error?: string;
  publicUrl?: string;
  tusUpload?: tus.Upload;
}

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (publicUrl: string) => void;
  onError?: (error: Error) => void;
}

const UPLOAD_QUEUE_KEY = '@and_friends/upload_queue';

export const useResumableUploadDebug = () => {
  const [uploadQueue, setUploadQueue] = useState<Map<string, UploadTask>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const activeUploads = useRef<Map<string, tus.Upload>>(new Map());

  // Charger la file d'attente depuis AsyncStorage au démarrage
  const loadUploadQueue = useCallback(async () => {
    try {
      const savedQueue = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
      if (savedQueue) {
        const tasks = JSON.parse(savedQueue) as UploadTask[];
        const queueMap = new Map(tasks.map(task => [task.id, task]));
        setUploadQueue(queueMap);
        
        // Reprendre les uploads en attente
        tasks.forEach(task => {
          if (task.status === 'uploading' || task.status === 'pending') {
            resumeUpload(task);
          }
        });
      }
    } catch (error) {
      console.error('[useResumableUploadDebug] Error loading upload queue:', error);
    }
  }, []);

  // Sauvegarder la file d'attente
  const saveUploadQueue = useCallback(async (queue: Map<string, UploadTask>) => {
    try {
      const tasks = Array.from(queue.values()).map(task => ({
        ...task,
        tusUpload: undefined, // Ne pas sauvegarder l'objet TUS
      }));
      await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('[useResumableUploadDebug] Error saving upload queue:', error);
    }
  }, []);

  // Obtenir les headers d'authentification Supabase
  const getAuthHeaders = async () => {
    console.log('🔐 [DEBUG] Getting auth headers...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ [DEBUG] No session found!');
      throw new Error('Not authenticated');
    }

    console.log('✅ [DEBUG] Session found:', {
      userId: session.user.id,
      email: session.user.email,
      expiresAt: session.expires_at,
    });

    const headers = {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    };

    console.log('📋 [DEBUG] Auth headers prepared:', {
      hasAuth: !!headers.Authorization,
      hasApiKey: !!headers.apikey,
    });

    return headers;
  };

  // Créer une nouvelle tâche d'upload
  const createUploadTask = useCallback(async (
    uri: string,
    bucket: string,
    fileName?: string,
    options?: UploadOptions
  ): Promise<string> => {
    console.log('📸 [DEBUG] Creating upload task...', {
      uri: uri.substring(0, 50) + '...',
      bucket,
      fileName,
    });

    // Vérifier que le fichier existe et obtenir sa taille
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📁 [DEBUG] File info:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
        isDirectory: fileInfo.isDirectory,
        uri: fileInfo.uri?.substring(0, 50) + '...',
      });

      if (!fileInfo.exists || fileInfo.size === 0) {
        console.error('❌ [DEBUG] File does not exist or is empty!');
        throw new Error('File does not exist or is empty');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error checking file:', error);
      throw error;
    }

    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const taskId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const task: UploadTask = {
      id: taskId,
      uri,
      bucket,
      fileName: finalFileName,
      status: 'pending',
      progress: 0,
    };

    setUploadQueue(prev => {
      const newQueue = new Map(prev);
      newQueue.set(taskId, task);
      saveUploadQueue(newQueue);
      return newQueue;
    });

    // Démarrer l'upload
    await startUpload(taskId, options);

    return taskId;
  }, []);

  // Démarrer ou reprendre un upload
  const startUpload = useCallback(async (taskId: string, options?: UploadOptions) => {
    const task = uploadQueue.get(taskId);
    if (!task) {
      console.error('❌ [DEBUG] Task not found:', taskId);
      return;
    }

    console.log('🚀 [DEBUG] Starting upload for task:', taskId);

    try {
      const authHeaders = await getAuthHeaders();
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;

      console.log('🌐 [DEBUG] Upload URL:', uploadUrl);

      // Fetch the file with better error handling
      console.log('📥 [DEBUG] Fetching file blob...');
      let blob: Blob;
      
      try {
        const response = await fetch(task.uri);
        console.log('📊 [DEBUG] Fetch response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          type: response.type,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        blob = await response.blob();
        console.log('✅ [DEBUG] Blob created:', {
          size: blob.size,
          type: blob.type,
        });

        if (blob.size === 0) {
          throw new Error('Blob is empty');
        }
      } catch (fetchError) {
        console.error('❌ [DEBUG] Error fetching blob:', fetchError);
        
        // Try alternative method: read as base64
        console.log('🔄 [DEBUG] Trying base64 fallback...');
        try {
          const base64 = await FileSystem.readAsStringAsync(task.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const mimeType = `image/${task.fileName.split('.').pop()}`;
          const blobParts = [`data:${mimeType};base64,${base64}`];
          
          // Convert base64 to blob
          const response = await fetch(blobParts[0]);
          blob = await response.blob();
          
          console.log('✅ [DEBUG] Base64 blob created:', {
            size: blob.size,
            type: blob.type,
          });
        } catch (base64Error) {
          console.error('❌ [DEBUG] Base64 fallback failed:', base64Error);
          throw fetchError;
        }
      }

      console.log('📤 [DEBUG] Starting TUS upload...');
      console.log('   - File name:', task.fileName);
      console.log('   - Bucket:', task.bucket);
      console.log('   - Blob size:', blob.size, 'bytes');

      const upload = new tus.Upload(blob, {
        endpoint: uploadUrl,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: authHeaders,
        metadata: {
          bucketName: task.bucket,
          objectName: task.fileName,
          contentType: `image/${task.fileName.split('.').pop()}`,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
        onError: (error) => {
          console.error('❌ [DEBUG] TUS upload error:', error);
          console.error('   - Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
          
          setUploadQueue(prev => {
            const newQueue = new Map(prev);
            const updatedTask = newQueue.get(taskId);
            if (updatedTask) {
              updatedTask.status = 'failed';
              updatedTask.error = error.message;
              saveUploadQueue(newQueue);
            }
            return newQueue;
          });

          options?.onError?.(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          
          console.log(`📊 [DEBUG] Upload progress: ${percentage}% (${bytesUploaded}/${bytesTotal} bytes)`);
          
          setUploadQueue(prev => {
            const newQueue = new Map(prev);
            const updatedTask = newQueue.get(taskId);
            if (updatedTask) {
              updatedTask.progress = percentage;
              updatedTask.status = 'uploading';
            }
            return newQueue;
          });

          options?.onProgress?.(percentage);
        },
        onSuccess: () => {
          console.log('✅ [DEBUG] TUS upload completed successfully!');
          
          // Obtenir l'URL publique
          const { data: { publicUrl } } = supabase.storage
            .from(task.bucket)
            .getPublicUrl(task.fileName);

          console.log('🔗 [DEBUG] Public URL:', publicUrl);

          setUploadQueue(prev => {
            const newQueue = new Map(prev);
            const updatedTask = newQueue.get(taskId);
            if (updatedTask) {
              updatedTask.status = 'completed';
              updatedTask.progress = 100;
              updatedTask.publicUrl = publicUrl;
              saveUploadQueue(newQueue);
            }
            return newQueue;
          });

          options?.onSuccess?.(publicUrl);
          
          // Supprimer de la file après un délai
          setTimeout(() => {
            removeFromQueue(taskId);
          }, 5000);
        },
        onBeforeRequest: (req) => {
          console.log('🔄 [DEBUG] TUS request:', {
            method: req._method,
            url: req._url,
            headers: Object.keys(req._headers),
          });
        },
        onAfterResponse: (req, res) => {
          console.log('📨 [DEBUG] TUS response:', {
            status: res.getStatus(),
            headers: res.getAllHeaders(),
          });
        },
      });

      // Stocker la référence de l'upload
      activeUploads.current.set(taskId, upload);
      
      // Démarrer l'upload
      console.log('▶️ [DEBUG] Starting TUS upload.start()...');
      upload.start();

      setUploadQueue(prev => {
        const newQueue = new Map(prev);
        const updatedTask = newQueue.get(taskId);
        if (updatedTask) {
          updatedTask.status = 'uploading';
          updatedTask.tusUpload = upload;
          saveUploadQueue(newQueue);
        }
        return newQueue;
      });

    } catch (error) {
      console.error('❌ [DEBUG] Error in startUpload:', error);
      console.error('   - Full error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      
      setUploadQueue(prev => {
        const newQueue = new Map(prev);
        const updatedTask = newQueue.get(taskId);
        if (updatedTask) {
          updatedTask.status = 'failed';
          updatedTask.error = error instanceof Error ? error.message : String(error);
          saveUploadQueue(newQueue);
        }
        return newQueue;
      });

      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [uploadQueue]);

  // Reprendre un upload
  const resumeUpload = useCallback(async (task: UploadTask) => {
    await startUpload(task.id);
  }, [startUpload]);

  // Mettre en pause un upload
  const pauseUpload = useCallback((taskId: string) => {
    const upload = activeUploads.current.get(taskId);
    if (upload) {
      upload.abort();
      
      setUploadQueue(prev => {
        const newQueue = new Map(prev);
        const task = newQueue.get(taskId);
        if (task) {
          task.status = 'paused';
          saveUploadQueue(newQueue);
        }
        return newQueue;
      });
    }
  }, []);

  // Reprendre un upload en pause
  const unpauseUpload = useCallback((taskId: string) => {
    const task = uploadQueue.get(taskId);
    if (task && task.status === 'paused') {
      startUpload(taskId);
    }
  }, [uploadQueue, startUpload]);

  // Annuler un upload
  const cancelUpload = useCallback((taskId: string) => {
    const upload = activeUploads.current.get(taskId);
    if (upload) {
      upload.abort();
      activeUploads.current.delete(taskId);
    }
    
    removeFromQueue(taskId);
  }, []);

  // Supprimer de la file d'attente
  const removeFromQueue = useCallback((taskId: string) => {
    setUploadQueue(prev => {
      const newQueue = new Map(prev);
      newQueue.delete(taskId);
      saveUploadQueue(newQueue);
      return newQueue;
    });
  }, []);

  // Réessayer un upload échoué
  const retryUpload = useCallback((taskId: string) => {
    const task = uploadQueue.get(taskId);
    if (task && task.status === 'failed') {
      task.status = 'pending';
      task.error = undefined;
      startUpload(taskId);
    }
  }, [uploadQueue, startUpload]);

  // Obtenir le statut d'un upload
  const getUploadStatus = useCallback((taskId: string): UploadTask | undefined => {
    return uploadQueue.get(taskId);
  }, [uploadQueue]);

  // Obtenir tous les uploads actifs
  const getActiveUploads = useCallback((): UploadTask[] => {
    return Array.from(uploadQueue.values()).filter(
      task => task.status !== 'completed'
    );
  }, [uploadQueue]);

  return {
    uploadQueue,
    createUploadTask,
    pauseUpload,
    unpauseUpload,
    cancelUpload,
    retryUpload,
    getUploadStatus,
    getActiveUploads,
    loadUploadQueue,
  };
};