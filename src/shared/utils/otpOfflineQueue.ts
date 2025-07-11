import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OTPCache } from './otpCache';

interface OfflineOTPRequest {
  id: string;
  phoneNumber: string;
  timestamp: number;
  retryCount: number;
  metadata?: any;
}

const OFFLINE_OTP_QUEUE_KEY = '@offline_otp_queue';
const MAX_RETRY_COUNT = 3;
const QUEUE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Gestion de la queue des requêtes OTP en mode offline
 */
export class OTPOfflineQueue {
  /**
   * Ajouter une requête OTP à la queue offline
   */
  static async enqueue(phoneNumber: string, metadata?: any): Promise<void> {
    try {
      const queue = await this.getQueue();
      
      // Vérifier si une requête existe déjà pour ce numéro
      const existingIndex = queue.findIndex(req => req.phoneNumber === phoneNumber);
      
      if (existingIndex !== -1 && queue[existingIndex]) {
        // Mettre à jour la requête existante
        queue[existingIndex].timestamp = Date.now();
        queue[existingIndex].retryCount = 0;
        queue[existingIndex].metadata = metadata;
      } else {
        // Ajouter une nouvelle requête
        queue.push({
          id: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          phoneNumber,
          timestamp: Date.now(),
          retryCount: 0,
          metadata,
        });
      }
      
      await AsyncStorage.setItem(OFFLINE_OTP_QUEUE_KEY, JSON.stringify(queue));
      console.log('📱 [OTPOfflineQueue] Queued OTP request for', phoneNumber);
    } catch (error) {
      console.error('❌ [OTPOfflineQueue] Failed to enqueue:', error);
    }
  }
  
  /**
   * Obtenir la queue offline
   */
  static async getQueue(): Promise<OfflineOTPRequest[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_OTP_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ [OTPOfflineQueue] Failed to get queue:', error);
      return [];
    }
  }
  
  /**
   * Traiter la queue lorsque la connexion est rétablie
   */
  static async processQueue(
    sendOTPFunction: (phoneNumber: string, metadata?: any) => Promise<any>
  ): Promise<void> {
    try {
      // Vérifier la connexion
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('📵 [OTPOfflineQueue] No connection, skipping queue processing');
        return;
      }
      
      const queue = await this.getQueue();
      if (queue.length === 0) return;
      
      console.log(`📱 [OTPOfflineQueue] Processing ${queue.length} offline requests...`);
      
      const now = Date.now();
      const processedIds: string[] = [];
      const failedRequests: OfflineOTPRequest[] = [];
      
      for (const request of queue) {
        // Ignorer les requêtes expirées
        if (now - request.timestamp > QUEUE_EXPIRATION) {
          processedIds.push(request.id);
          console.log('⏰ [OTPOfflineQueue] Request expired for', request.phoneNumber);
          continue;
        }
        
        // Ignorer si trop de tentatives
        if (request.retryCount >= MAX_RETRY_COUNT) {
          processedIds.push(request.id);
          console.log('❌ [OTPOfflineQueue] Max retries reached for', request.phoneNumber);
          continue;
        }
        
        try {
          // Vérifier le cache OTP avant d'envoyer
          const cacheStatus = await OTPCache.hasRecentOTP(request.phoneNumber);
          if (cacheStatus.hasRecent && !cacheStatus.canResend) {
            console.log('⏳ [OTPOfflineQueue] Recent OTP exists for', request.phoneNumber);
            failedRequests.push({
              ...request,
              retryCount: request.retryCount + 1,
            });
            continue;
          }
          
          // Envoyer l'OTP
          await sendOTPFunction(request.phoneNumber, request.metadata);
          await OTPCache.recordOTPSent(request.phoneNumber);
          processedIds.push(request.id);
          console.log('✅ [OTPOfflineQueue] Processed request for', request.phoneNumber);
          
        } catch (error) {
          console.error('❌ [OTPOfflineQueue] Failed to process request:', error);
          failedRequests.push({
            ...request,
            retryCount: request.retryCount + 1,
          });
        }
        
        // Petit délai entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Mettre à jour la queue avec les requêtes non traitées
      const remainingQueue = queue
        .filter(req => !processedIds.includes(req.id))
        .map(req => {
          const failed = failedRequests.find(f => f.id === req.id);
          return failed || req;
        });
      
      await AsyncStorage.setItem(OFFLINE_OTP_QUEUE_KEY, JSON.stringify(remainingQueue));
      
      if (remainingQueue.length > 0) {
        console.log(`📱 [OTPOfflineQueue] ${remainingQueue.length} requests remaining in queue`);
      } else {
        console.log('✅ [OTPOfflineQueue] Queue processed successfully');
      }
      
    } catch (error) {
      console.error('❌ [OTPOfflineQueue] Failed to process queue:', error);
    }
  }
  
  /**
   * Supprimer une requête de la queue
   */
  static async remove(phoneNumber: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(req => req.phoneNumber !== phoneNumber);
      await AsyncStorage.setItem(OFFLINE_OTP_QUEUE_KEY, JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('❌ [OTPOfflineQueue] Failed to remove from queue:', error);
    }
  }
  
  /**
   * Vider la queue
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_OTP_QUEUE_KEY);
      console.log('🗑️ [OTPOfflineQueue] Queue cleared');
    } catch (error) {
      console.error('❌ [OTPOfflineQueue] Failed to clear queue:', error);
    }
  }
  
  /**
   * Obtenir le nombre de requêtes en attente
   */
  static async getCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
  
  /**
   * Nettoyer les requêtes expirées
   */
  static async cleanup(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const now = Date.now();
      
      const activeQueue = queue.filter(req => 
        now - req.timestamp < QUEUE_EXPIRATION &&
        req.retryCount < MAX_RETRY_COUNT
      );
      
      if (activeQueue.length < queue.length) {
        await AsyncStorage.setItem(OFFLINE_OTP_QUEUE_KEY, JSON.stringify(activeQueue));
        console.log(`🧹 [OTPOfflineQueue] Cleaned ${queue.length - activeQueue.length} expired requests`);
      }
    } catch (error) {
      console.error('❌ [OTPOfflineQueue] Failed to cleanup:', error);
    }
  }
}