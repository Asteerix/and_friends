
export interface User {
  id: string;
  handle: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  birthDate?: Date;
  hideAge: boolean;
  gender?: string;
  pronouns?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  city?: string;
  countryCode?: string;
  timezone?: string;
  languageCode: string;
  path?: string;
  company?: string;
  website?: string;
  favoriteMusic?: {
    title: string;
    artist: string;
    albumArt?: string;
    spotifyId?: string;
  };
  favoriteRestaurants?: Restaurant[];
  hobbies: string[];
  interests: string[];
  verified: boolean;
  premiumUntil?: Date;
  followersCount: number;
  followingCount: number;
  eventsCreated: number;
  eventsAttended: number;
  trustScore: number;
  onboardingCompleted: boolean;
  onboardingStep: number;
  contactsPermission: boolean;
  locationPermission: boolean;
  notificationPermission: boolean;
  phoneContacts?: Record<string, unknown>;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
};
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  googlePlaceId?: string;
  cuisine?: string;
  priceLevel?: number;
  rating?: number;
  imageUrl?: string;
};
export interface UserSettings {
  notifications: {
    events: boolean;
    messages: boolean;
    follows: boolean;
    reminders: boolean;
  };
  privacy: {
    showAge: boolean;
    showLocation: boolean;
    allowDirectMessages: 'everyone' | 'friends' | 'none';
    allowEventInvites: 'everyone' | 'friends' | 'none';
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    calendarTheme?: string;
  };
  language: string;
};
export interface CreateUserData {
  handle: string;
  fullName: string;
  birthDate?: Date;
  hideAge?: boolean;
};
export type UpdateUserData = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

export interface UserSearchParams {
  query?: string;
  city?: string;
  interests?: string[];
  limit?: number;
  offset?: number;
};
export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Date;
};
export interface Block {
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: Date;
}