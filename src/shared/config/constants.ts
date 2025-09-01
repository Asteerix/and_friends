export const APP_CONFIG = {
  name: '& friends',
  version: '1.0.0',
  bundleId: 'com.andfriends.app',

  // API Configuration
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || '',
    timeout: 30000,
  },

  // Supabase Configuration
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  // Storage Buckets
  storage: {
    avatars: 'avatars',
    covers: 'covers',
    events: 'events',
    stories: 'stories',
    messages: 'messages',
  },

  // Event Configuration
  events: {
    maxTitleLength: 100,
    maxDescriptionLength: 500,
    maxParticipants: 1000,
    defaultRadius: 10, // miles
    categories: [
      { id: 'sports', name: 'Sports', icon: 'basketball', color: '#4CAF50' },
      { id: 'music', name: 'Music', icon: 'musical-notes', color: '#FF6B6B' },
      { id: 'arts', name: 'Arts', icon: 'color-palette', color: '#9C27B0' },
      { id: 'food', name: 'Food', icon: 'restaurant', color: '#FF9800' },
      { id: 'gaming', name: 'Gaming', icon: 'game-controller', color: '#2196F3' },
      { id: 'social', name: 'Social', icon: 'people', color: '#45B7D1' },
    ],
  },

  // Story Configuration
  stories: {
    duration: 24, // hours
    maxDuration: 5000, // milliseconds per story view
    maxTextLength: 200,
    maxStickers: 10,
  },

  // Chat Configuration
  chat: {
    maxMessageLength: 1000,
    maxPollOptions: 10,
    pollDuration: 24, // hours
    typingTimeout: 3000, // milliseconds
  },

  // User Configuration
  user: {
    minAge: 13,
    maxAge: 100,
    maxBioLength: 150,
    maxInterests: 5,
    maxHobbies: 10,
    usernameMinLength: 3,
    usernameMaxLength: 20,
  },

  // Map Configuration
  map: {
    defaultRegion: {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
    searchRadius: 50, // miles
    clusterRadius: 50, // pixels
  },

  // Notification Configuration
  notifications: {
    reminderTime: 60, // minutes before event
    dailyDigestTime: '09:00',
    pushChannels: {
      events: 'event-updates',
      messages: 'new-messages',
      social: 'social-updates',
    },
  },

  // Theme Configuration
  theme: {
    colors: {
      primary: '#45B7D1',
      secondary: '#3498DB',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    },
    gradients: {
      primary: ['#45B7D1', '#3498DB'],
      sunset: ['#FF6B6B', '#FF8787'],
      ocean: ['#4ECDC4', '#44A3AA'],
      forest: ['#96CEB4', '#88C999'],
      purple: ['#DDA0DD', '#BA55D3'],
    },
    fonts: {
      regular: 'System',
      bold: 'System',
      display: 'PlayfairDisplay-Bold',
    },
  },

  // External Services
  services: {
    googlePlaces: {
      apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || '',
    },
    spotify: {
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '',
    },
    sentry: {
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    },
  },

  // App Store Configuration
  appStore: {
    ios: {
      appId: '1234567890',
      bundleId: 'com.andfriends.app',
    },
    android: {
      packageName: 'com.andfriends.app',
    },
  },

  // Social Links
  social: {
    website: 'https://andfriends.app',
    instagram: 'https://instagram.com/andfriendsapp',
    twitter: 'https://twitter.com/andfriendsapp',
    support: 'support@andfriends.app',
  },

  // Legal
  legal: {
    termsUrl: 'https://andfriends.app/terms',
    privacyUrl: 'https://andfriends.app/privacy',
    minimumAge: 13,
  },
};
