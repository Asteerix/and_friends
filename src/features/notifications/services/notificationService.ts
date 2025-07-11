import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/shared/lib/supabase/client';
import type { Message, Chat, UserProfile } from '@/types/conversation.types';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  // Demander la permission pour les notifications
  static async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission notifications refusée');
      return false;
    }
    
    return true;
  }

  // Obtenir le token de notification
  static async getExpoPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('Erreur lors de l\'obtention du token:', error);
      return null;
    }
  }

  // Enregistrer le token dans la base de données
  static async registerPushToken(userId: string): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const token = await this.getExpoPushToken();
    if (!token) return;

    try {
      // Mettre à jour le profil avec le token
      await supabase
        .from('profiles')
        .update({ 
          push_token: token,
          push_token_updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      console.log('Token push enregistré:', token);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du token:', error);
    }
  }

  // Envoyer une notification locale
  static async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
      },
      trigger: null, // Immédiatement
    });
  }

  // Notification pour un nouveau message
  static async notifyNewMessage(
    message: Message,
    chat: Chat,
    sender: UserProfile,
    currentUserId: string
  ): Promise<void> {
    // Ne pas notifier si c'est notre propre message
    if (message.user_id === currentUserId) return;

    // Ne pas notifier si l'app est au premier plan et le chat est ouvert
    const appState = await Notifications.getPresentedNotificationsAsync();
    const isAppActive = appState.length === 0; // Simplification, à améliorer
    
    if (isAppActive) return;

    let title: string;
    let body: string;

    if (chat.is_group) {
      title = chat.name || 'Groupe';
      body = `${sender.full_name || sender.username}: ${this.formatMessagePreview(message)}`;
    } else {
      title = sender.full_name || sender.username || 'Message';
      body = this.formatMessagePreview(message);
    }

    await this.sendLocalNotification(title, body, {
      chatId: chat.id,
      messageId: message.id,
      type: 'new_message'
    });
  }

  // Notification pour une demande d'ami
  static async notifyFriendRequest(
    senderName: string,
    requestId: string
  ): Promise<void> {
    await this.sendLocalNotification(
      'Nouvelle demande d\'ami',
      `${senderName} souhaite devenir votre ami`,
      {
        type: 'friend_request',
        requestId
      }
    );
  }

  // Notification pour un événement
  static async notifyEventUpdate(
    eventTitle: string,
    updateType: 'cancelled' | 'updated' | 'reminder',
    eventId: string
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (updateType) {
      case 'cancelled':
        title = 'Événement annulé';
        body = `"${eventTitle}" a été annulé`;
        break;
      case 'updated':
        title = 'Événement modifié';
        body = `"${eventTitle}" a été mis à jour`;
        break;
      case 'reminder':
        title = 'Rappel d\'événement';
        body = `"${eventTitle}" commence bientôt`;
        break;
    }

    await this.sendLocalNotification(title, body, {
      type: 'event_update',
      eventId,
      updateType
    });
  }

  // Formater l'aperçu du message
  private static formatMessagePreview(message: Message): string {
    switch (message.type || message.message_type) {
      case 'image':
        return '📷 Photo';
      case 'video':
        return '🎥 Vidéo';
      case 'audio':
      case 'voice':
        return '🎵 Message vocal';
      case 'file':
        return `📎 ${message.metadata?.file_name || 'Fichier'}`;
      case 'location':
        return '📍 Position';
      case 'poll':
        return '📊 Sondage';
      case 'event_share':
        return '🎉 Événement partagé';
      default:
        return message.content || '';
    }
  }

  // Configurer les catégories de notifications (iOS)
  static async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('message', [
        {
          identifier: 'reply',
          buttonTitle: 'Répondre',
          options: {
            opensAppToForeground: false,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
          textInput: {
            submitButtonTitle: 'Envoyer',
            placeholder: 'Tapez votre message...',
          },
        },
        {
          identifier: 'view',
          buttonTitle: 'Voir',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);
    }
  }

  // Gérer la réponse à une notification
  static handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;

    switch (data?.type) {
      case 'new_message':
        // Naviguer vers le chat
        console.log('Naviguer vers le chat:', data.chatId);
        break;
      case 'friend_request':
        // Naviguer vers les demandes d'amis
        console.log('Naviguer vers la demande:', data.requestId);
        break;
      case 'event_update':
        // Naviguer vers l'événement
        console.log('Naviguer vers l\'événement:', data.eventId);
        break;
    }
  }

  // Mettre à jour le badge de l'app
  static async updateBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Réinitialiser le badge
  static async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Annuler toutes les notifications
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Configurer les listeners
  static setupNotificationListeners(): () => void {
    // Listener pour les notifications reçues
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification reçue:', notification);
    });

    // Listener pour les interactions avec les notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });

    // Retourner une fonction de nettoyage
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }
}