import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message, Chat } from '@/types/conversation.types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class MessageCacheService {
  private static readonly CACHE_PREFIX = '@chat_cache:';
  private static readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_MESSAGES_PER_CHAT = 100; // Derniers 100 messages

  // Obtenir la clé de cache pour un chat
  private static getChatKey(chatId: string): string {
    return `${this.CACHE_PREFIX}chat:${chatId}`;
  }

  // Obtenir la clé de cache pour les messages
  private static getMessagesKey(chatId: string): string {
    return `${this.CACHE_PREFIX}messages:${chatId}`;
  }

  // Obtenir la clé pour la liste des chats
  private static getChatsListKey(): string {
    return `${this.CACHE_PREFIX}chats_list`;
  }

  // Sauvegarder les messages en cache
  static async cacheMessages(chatId: string, messages: Message[]): Promise<void> {
    try {
      // Garder seulement les derniers messages pour économiser l'espace
      const messagesToCache = messages.slice(-this.MAX_MESSAGES_PER_CHAT);

      const cacheEntry: CacheEntry<Message[]> = {
        data: messagesToCache,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.DEFAULT_TTL,
      };

      await AsyncStorage.setItem(this.getMessagesKey(chatId), JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Erreur lors de la mise en cache des messages:', error);
    }
  }

  // Récupérer les messages du cache
  static async getCachedMessages(chatId: string): Promise<Message[] | null> {
    try {
      const cached = await AsyncStorage.getItem(this.getMessagesKey(chatId));
      if (!cached) return null;

      const cacheEntry: CacheEntry<Message[]> = JSON.parse(cached);

      // Vérifier si le cache a expiré
      if (Date.now() > cacheEntry.expiresAt) {
        await this.invalidateMessages(chatId);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du cache:', error);
      return null;
    }
  }

  // Ajouter un message au cache
  static async appendMessage(chatId: string, message: Message): Promise<void> {
    try {
      const cached = await this.getCachedMessages(chatId);
      if (!cached) return;

      // Ajouter le nouveau message et garder la limite
      const updatedMessages = [...cached, message].slice(-this.MAX_MESSAGES_PER_CHAT);
      await this.cacheMessages(chatId, updatedMessages);
    } catch (error) {
      console.error("Erreur lors de l'ajout du message au cache:", error);
    }
  }

  // Mettre à jour un message dans le cache
  static async updateCachedMessage(
    chatId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<void> {
    try {
      const cached = await this.getCachedMessages(chatId);
      if (!cached) return;

      const updatedMessages = cached.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );

      await this.cacheMessages(chatId, updatedMessages);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message en cache:', error);
    }
  }

  // Invalider le cache des messages
  static async invalidateMessages(chatId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getMessagesKey(chatId));
    } catch (error) {
      console.error("Erreur lors de l'invalidation du cache:", error);
    }
  }

  // Sauvegarder la liste des chats
  static async cacheChats(chats: Chat[]): Promise<void> {
    try {
      const cacheEntry: CacheEntry<Chat[]> = {
        data: chats,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.DEFAULT_TTL,
      };

      await AsyncStorage.setItem(this.getChatsListKey(), JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Erreur lors de la mise en cache des chats:', error);
    }
  }

  // Récupérer la liste des chats du cache
  static async getCachedChats(): Promise<Chat[] | null> {
    try {
      const cached = await AsyncStorage.getItem(this.getChatsListKey());
      if (!cached) return null;

      const cacheEntry: CacheEntry<Chat[]> = JSON.parse(cached);

      if (Date.now() > cacheEntry.expiresAt) {
        await AsyncStorage.removeItem(this.getChatsListKey());
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des chats du cache:', error);
      return null;
    }
  }

  // Sauvegarder les détails d'un chat
  static async cacheChat(chat: Chat): Promise<void> {
    try {
      const cacheEntry: CacheEntry<Chat> = {
        data: chat,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.DEFAULT_TTL,
      };

      await AsyncStorage.setItem(this.getChatKey(chat.id), JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Erreur lors de la mise en cache du chat:', error);
    }
  }

  // Récupérer les détails d'un chat du cache
  static async getCachedChat(chatId: string): Promise<Chat | null> {
    try {
      const cached = await AsyncStorage.getItem(this.getChatKey(chatId));
      if (!cached) return null;

      const cacheEntry: CacheEntry<Chat> = JSON.parse(cached);

      if (Date.now() > cacheEntry.expiresAt) {
        await AsyncStorage.removeItem(this.getChatKey(chatId));
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du chat du cache:', error);
      return null;
    }
  }

  // Nettoyer tout le cache
  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
    }
  }

  // Obtenir la taille du cache
  static async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Erreur lors du calcul de la taille du cache:', error);
      return 0;
    }
  }

  // Nettoyer les entrées expirées
  static async cleanExpiredEntries(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const entry = JSON.parse(value) as CacheEntry<any>;
            if (Date.now() > entry.expiresAt) {
              await AsyncStorage.removeItem(key);
            }
          } catch {
            // Entrée invalide, la supprimer
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des entrées expirées:', error);
    }
  }

  // Précharger les messages pour l'affichage hors ligne
  static async preloadRecentChats(chatIds: string[]): Promise<void> {
    try {
      // Limiter à 10 chats maximum pour éviter de surcharger
      const chatsToPreload = chatIds.slice(0, 10);

      for (const chatId of chatsToPreload) {
        const cached = await this.getCachedMessages(chatId);
        if (!cached || cached.length === 0) {
          // Si pas de cache, marquer pour chargement prioritaire
          console.log(`Chat ${chatId} marqué pour préchargement`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du préchargement:', error);
    }
  }
}
