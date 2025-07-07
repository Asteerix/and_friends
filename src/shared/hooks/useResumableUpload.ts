import { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const useResumableUpload = () => {
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
      console.error('[useResumableUpload] Error loading upload queue:', error);
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
      console.error('[useResumableUpload] Error saving upload queue:', error);
    }
  }, []);

  // Obtenir les headers d'authentification Supabase
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    return {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    };
  };

  // Créer une nouvelle tâche d'upload
  const createUploadTask = useCallback(async (
    uri: string,
    bucket: string,
    fileName?: string,
    options?: UploadOptions
  ): Promise<string> => {
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
    if (!task) return;

    try {
      const authHeaders = await getAuthHeaders();
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;

      // Fetch the file
      const response = await fetch(task.uri);
      const blob = await response.blob();

      console.log('[useResumableUpload] Starting TUS upload for:', task.fileName);

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
          console.error('[useResumableUpload] Upload error:', error);
          
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
          console.log('[useResumableUpload] Upload completed successfully');
          
          // Obtenir l'URL publique
          const { data: { publicUrl } } = supabase.storage
            .from(task.bucket)
            .getPublicUrl(task.fileName);

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
      });

      // Stocker la référence de l'upload
      activeUploads.current.set(taskId, upload);
      
      // Démarrer l'upload
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
      console.error('[useResumableUpload] Error starting upload:', error);
      
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
      task => task.status === 'uploading' || task.status === 'pending'
    );
  }, [uploadQueue]);

  return {
    uploadQueue: Array.from(uploadQueue.values()),
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