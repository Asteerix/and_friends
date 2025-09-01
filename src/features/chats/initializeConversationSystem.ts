import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import { NotificationService } from '@/features/notifications/services/notificationService';
import { MessageCacheService } from '@/features/chats/services/messageCacheService';
import { supabase } from '@/shared/lib/supabase/client';

export class ConversationSystemInitializer {
  private static isInitialized = false;
  private static cleanupFunctions: (() => void)[] = [];

  // Initialiser le système de conversation
  static async initialize(userId: string): Promise<void> {
    if (this.isInitialized) {
      console.log('Système de conversation déjà initialisé');
      return;
    }

    console.log('🚀 Initialisation du système de conversation...');

    try {
      // 1. Enregistrer le token de notification push
      await NotificationService.registerPushToken(userId);

      // 2. Configurer les catégories de notifications
      await NotificationService.setupNotificationCategories();

      // 3. Configurer les listeners de notifications
      const notificationCleanup = NotificationService.setupNotificationListeners();
      this.cleanupFunctions.push(notificationCleanup);

      // 4. Nettoyer le cache expiré
      await MessageCacheService.cleanExpiredEntries();

      // 5. Précharger les chats récents
      const { data: recentChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(10);

      if (recentChats) {
        const chatIds = recentChats.map((r) => r.chat_id);
        await MessageCacheService.preloadRecentChats(chatIds);
      }

      // 6. Configurer le nettoyage automatique du cache
      const cacheCleanupInterval = setInterval(
        async () => {
          await MessageCacheService.cleanExpiredEntries();
        },
        30 * 60 * 1000
      ); // Toutes les 30 minutes

      this.cleanupFunctions.push(() => clearInterval(cacheCleanupInterval));

      // 7. Gérer les changements d'état de l'app
      const appStateSubscription = AppState.addEventListener(
        'change',
        (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            // Réinitialiser le badge quand l'app revient au premier plan
            NotificationService.clearBadge();
          }
        }
      );

      this.cleanupFunctions.push(() => appStateSubscription.remove());

      // 8. S'abonner aux nouveaux messages pour les notifications
      const messageSubscription = supabase
        .channel('global:messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            // Vérifier si le message est dans un chat de l'utilisateur
            const { data: participant } = await supabase
              .from('chat_participants')
              .select('*')
              .eq('chat_id', payload.new.chat_id)
              .eq('user_id', userId)
              .single();

            if (participant && payload.new.user_id !== userId) {
              // Récupérer les infos nécessaires pour la notification
              const { data: chat } = await supabase
                .from('chats')
                .select('*')
                .eq('id', payload.new.chat_id)
                .single();

              const { data: sender } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', payload.new.user_id)
                .single();

              if (chat && sender) {
                await NotificationService.notifyNewMessage(
                  payload.new as any,
                  chat,
                  sender,
                  userId
                );
              }
            }
          }
        )
        .subscribe();

      this.cleanupFunctions.push(() => {
        supabase.removeChannel(messageSubscription);
      });

      this.isInitialized = true;
      console.log('✅ Système de conversation initialisé avec succès');
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation:", error);
      throw error;
    }
  }

  // Nettoyer et désactiver le système
  static cleanup(): void {
    console.log('🧹 Nettoyage du système de conversation...');

    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
    this.isInitialized = false;

    console.log('✅ Système de conversation nettoyé');
  }

  // Réinitialiser le système (utile après déconnexion/reconnexion)
  static async reinitialize(userId: string): Promise<void> {
    this.cleanup();
    await this.initialize(userId);
  }

  // Obtenir des statistiques sur le cache
  static async getCacheStats(): Promise<{
    size: number;
    sizeFormatted: string;
  }> {
    const size = await MessageCacheService.getCacheSize();
    const sizeInMB = size / (1024 * 1024);

    return {
      size,
      sizeFormatted: `${sizeInMB.toFixed(2)} MB`,
    };
  }

  // Vider complètement le cache
  static async clearCache(): Promise<void> {
    await MessageCacheService.clearAllCache();
    console.log('✅ Cache vidé');
  }

  // Vérifier l'état du système
  static getStatus(): {
    initialized: boolean;
    activeSubscriptions: number;
  } {
    return {
      initialized: this.isInitialized,
      activeSubscriptions: this.cleanupFunctions.length,
    };
  }
}
