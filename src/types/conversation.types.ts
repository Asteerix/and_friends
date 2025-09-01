// Types pour le système de conversation

export interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  event_id?: string;
  created_by: string;
  status?: 'active' | 'pending' | 'archived';
  created_at: string;
  updated_at?: string;
}

export interface ChatParticipant {
  chat_id: string;
  user_id: string;
  is_admin?: boolean;
  is_pending?: boolean;
  joined_at?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  type?: MessageType;
  metadata?: MessageMetadata;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  read_by?: string[];
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'location'
  | 'poll'
  | 'event_share'
  | 'story_reply'
  | 'system'
  | 'file';

export interface MessageMetadata {
  event_id?: string;
  action?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  image_url?: string;
  image_width?: number;
  image_height?: number;
  video_url?: string;
  video_duration?: number;
  audio_url?: string;
  audio_duration?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  poll?: {
    question: string;
    options: string[];
    votes?: Record<string, string[]>;
  };
  [key: string]: any;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  accepted_at?: string;
  rejected_at?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
}

// Types enrichis avec relations
export interface ChatWithDetails extends Chat {
  participants?: UserProfile[];
  participants_count?: number;
  last_message?: Message;
  unread_count?: number;
  event?: {
    id: string;
    title: string;
    date: string;
    status?: string;
  };
}

export interface MessageWithSender extends Message {
  sender?: UserProfile;
  is_own_message?: boolean;
}

export interface FriendRequestWithProfiles extends FriendRequest {
  sender?: UserProfile;
  recipient?: UserProfile;
}

// Types pour les créations
export interface CreateChatInput {
  name?: string;
  is_group: boolean;
  event_id?: string;
  participant_ids: string[];
}

export interface CreateMessageInput {
  chat_id: string;
  content: string;
  type?: MessageType;
  metadata?: MessageMetadata;
}

export interface CreateFriendRequestInput {
  recipient_id: string;
  message?: string;
}

// Types pour les réponses API
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Types pour les événements temps réel
export interface RealtimeMessageEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Message;
  old?: Message;
}

export interface RealtimeChatEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Chat;
  old?: Chat;
}

export interface RealtimeParticipantEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: ChatParticipant;
  old?: ChatParticipant;
}
