import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CONVERSATION_CONSTANTS } from '../constants/conversation.constants';
import type { Chat, Message, UserProfile } from '@/types/conversation.types';

// Formatage des dates pour les messages
export const formatMessageTime = (date: string | Date): string => {
  const messageDate = new Date(date);
  
  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm');
  } else if (isYesterday(messageDate)) {
    return `Hier ${format(messageDate, 'HH:mm')}`;
  } else {
    return format(messageDate, 'dd/MM/yyyy HH:mm');
  }
};

// Formatage pour la liste des chats
export const formatLastMessageTime = (date: string | Date): string => {
  const messageDate = new Date(date);
  
  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm');
  } else if (isYesterday(messageDate)) {
    return 'Hier';
  } else {
    return formatDistanceToNow(messageDate, { addSuffix: true, locale: fr });
  }
};

// Obtenir le nom d'affichage d'un chat
export const getChatDisplayName = (
  chat: Chat,
  currentUserId: string,
  participants?: UserProfile[]
): string => {
  // Si le chat a un nom (groupe ou événement), l'utiliser
  if (chat.name) {
    return chat.name;
  }
  
  // Pour les chats privés, afficher le nom de l'autre participant
  if (!chat.is_group && participants && participants.length > 0) {
    const otherParticipant = participants.find(p => p.id !== currentUserId);
    return otherParticipant?.full_name || otherParticipant?.username || 'Utilisateur';
  }
  
  return 'Conversation';
};

// Obtenir l'avatar d'un chat
export const getChatAvatar = (
  chat: Chat,
  currentUserId: string,
  participants?: UserProfile[]
): string | null => {
  // Pour les chats privés, utiliser l'avatar de l'autre participant
  if (!chat.is_group && participants && participants.length > 0) {
    const otherParticipant = participants.find(p => p.id !== currentUserId);
    return otherParticipant?.avatar_url || null;
  }
  
  return null;
};

// Formater le contenu d'un message pour l'aperçu
export const formatMessagePreview = (message: Message): string => {
  switch (message.type) {
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
    case 'system':
      return message.content;
    default:
      return message.content || '';
  }
};

// Validation du nom de chat
export const validateChatName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Le nom est requis' };
  }
  
  if (name.length > CONVERSATION_CONSTANTS.MAX_CHAT_NAME_LENGTH) {
    return { 
      isValid: false, 
      error: `Le nom ne peut pas dépasser ${CONVERSATION_CONSTANTS.MAX_CHAT_NAME_LENGTH} caractères` 
    };
  }
  
  if (!CONVERSATION_CONSTANTS.VALIDATION.CHAT_NAME_REGEX.test(name)) {
    return { 
      isValid: false, 
      error: 'Le nom contient des caractères non autorisés' 
    };
  }
  
  return { isValid: true };
};

// Validation du contenu d'un message
export const validateMessageContent = (
  content: string,
  type: string = 'text'
): { isValid: boolean; error?: string } => {
  if (type === 'text') {
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: 'Le message ne peut pas être vide' };
    }
    
    if (content.length > CONVERSATION_CONSTANTS.MAX_MESSAGE_LENGTH) {
      return { 
        isValid: false, 
        error: `Le message ne peut pas dépasser ${CONVERSATION_CONSTANTS.MAX_MESSAGE_LENGTH} caractères` 
      };
    }
  }
  
  return { isValid: true };
};

// Vérifier si un utilisateur est admin d'un chat
export const isUserChatAdmin = (
  userId: string,
  chat: Chat,
  participants?: Array<{ user_id: string; is_admin?: boolean }>
): boolean => {
  // Le créateur est toujours admin
  if (chat.created_by === userId) {
    return true;
  }
  
  // Vérifier dans la liste des participants
  const participant = participants?.find(p => p.user_id === userId);
  return participant?.is_admin || false;
};

// Grouper les messages par date
export const groupMessagesByDate = (messages: Message[]): Record<string, Message[]> => {
  const groups: Record<string, Message[]> = {};
  
  messages.forEach(message => {
    const date = new Date(message.created_at);
    let key: string;
    
    if (isToday(date)) {
      key = "Aujourd'hui";
    } else if (isYesterday(date)) {
      key = 'Hier';
    } else {
      key = format(date, 'dd MMMM yyyy', { locale: fr });
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(message);
  });
  
  return groups;
};

// Obtenir la couleur d'un chat
export const getChatColor = (chat: Chat): string => {
  if (chat.event_id) {
    // Vérifier si l'événement est annulé
    if (chat.name?.includes('(Annulé)')) {
      return CONVERSATION_CONSTANTS.COLORS.EVENT_CANCELLED;
    }
    return CONVERSATION_CONSTANTS.COLORS.EVENT_ACTIVE;
  }
  
  if (chat.is_group) {
    return CONVERSATION_CONSTANTS.COLORS.GROUP;
  }
  
  return CONVERSATION_CONSTANTS.COLORS.PRIVATE;
};

// Compter les messages non lus
export const countUnreadMessages = (
  messages: Message[],
  currentUserId: string,
  lastReadMessageId?: string
): number => {
  if (!lastReadMessageId) {
    // Si pas de dernier message lu, tous les messages des autres sont non lus
    return messages.filter(m => m.user_id !== currentUserId).length;
  }
  
  const lastReadIndex = messages.findIndex(m => m.id === lastReadMessageId);
  if (lastReadIndex === -1) {
    return 0;
  }
  
  // Compter les messages après le dernier lu qui ne sont pas de l'utilisateur
  return messages
    .slice(lastReadIndex + 1)
    .filter(m => m.user_id !== currentUserId)
    .length;
};

// Filtrer les chats par recherche
export const filterChatsBySearch = (
  chats: Chat[],
  searchTerm: string,
  participants?: Map<string, UserProfile[]>
): Chat[] => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return chats;
  }
  
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return chats.filter(chat => {
    // Recherche dans le nom du chat
    if (chat.name?.toLowerCase().includes(normalizedSearch)) {
      return true;
    }
    
    // Recherche dans les noms des participants pour les chats privés
    if (!chat.is_group) {
      const chatParticipants = participants?.get(chat.id);
      return chatParticipants?.some(p => 
        p.full_name?.toLowerCase().includes(normalizedSearch) ||
        p.username?.toLowerCase().includes(normalizedSearch)
      );
    }
    
    return false;
  });
};