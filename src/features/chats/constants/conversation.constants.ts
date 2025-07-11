// Constantes pour le système de conversation

export const CONVERSATION_CONSTANTS = {
  // Limites
  MAX_MESSAGE_LENGTH: 5000,
  MAX_CHAT_NAME_LENGTH: 100,
  MAX_PARTICIPANTS_PER_GROUP: 100,
  MAX_FILE_SIZE_MB: 50,
  
  // Types de messages
  MESSAGE_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    VOICE: 'voice',
    FILE: 'file',
    LOCATION: 'location',
    POLL: 'poll',
    EVENT_SHARE: 'event_share',
    STORY_REPLY: 'story_reply',
    SYSTEM: 'system',
  } as const,
  
  // Statuts de chat
  CHAT_STATUS: {
    ACTIVE: 'active',
    PENDING: 'pending',
    ARCHIVED: 'archived',
  } as const,
  
  // Statuts de demande d'ami
  FRIEND_REQUEST_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  } as const,
  
  // Actions système
  SYSTEM_ACTIONS: {
    CHAT_CREATED: 'chat_created',
    PARTICIPANT_JOINED: 'participant_joined',
    PARTICIPANT_LEFT: 'participant_left',
    EVENT_CANCELLED: 'event_cancelled',
    FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  } as const,
  
  // Messages système par défaut
  SYSTEM_MESSAGES: {
    WELCOME_EVENT: (eventName: string) => `Bienvenue dans la conversation de "${eventName}" ! 🎉`,
    WELCOME_GROUP: (groupName: string) => `${groupName} a été créé`,
    WELCOME_FRIENDS: 'Vous êtes maintenant amis ! 🎉',
    EVENT_CANCELLED: 'Cet événement a été annulé. La conversation reste ouverte pour continuer à discuter.',
    PARTICIPANT_JOINED: (userName: string) => `${userName} a rejoint l'événement`,
    PARTICIPANT_LEFT: (userName: string) => `${userName} a quitté l'événement`,
  },
  
  // Couleurs par défaut
  COLORS: {
    EVENT_ACTIVE: '#FFE066',
    EVENT_CANCELLED: '#9CA3AF',
    GROUP: '#FF4B6E',
    PRIVATE: '#4B7BFF',
  },
  
  // Intervalles de temps
  TIMEOUTS: {
    MESSAGE_SEND_TIMEOUT: 30000, // 30 secondes
    TYPING_INDICATOR_DURATION: 3000, // 3 secondes
    REALTIME_RECONNECT_DELAY: 5000, // 5 secondes
  },
  
  // Regex de validation
  VALIDATION: {
    CHAT_NAME_REGEX: /^[a-zA-Z0-9\s\-_À-ÿ]{1,100}$/,
    USERNAME_REGEX: /^[a-zA-Z0-9_]{3,30}$/,
  },
} as const;

// Types extraits des constantes
export type MessageType = typeof CONVERSATION_CONSTANTS.MESSAGE_TYPES[keyof typeof CONVERSATION_CONSTANTS.MESSAGE_TYPES];
export type ChatStatus = typeof CONVERSATION_CONSTANTS.CHAT_STATUS[keyof typeof CONVERSATION_CONSTANTS.CHAT_STATUS];
export type FriendRequestStatus = typeof CONVERSATION_CONSTANTS.FRIEND_REQUEST_STATUS[keyof typeof CONVERSATION_CONSTANTS.FRIEND_REQUEST_STATUS];
export type SystemAction = typeof CONVERSATION_CONSTANTS.SYSTEM_ACTIONS[keyof typeof CONVERSATION_CONSTANTS.SYSTEM_ACTIONS];