export const CacheKeys = {
  // User related
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_AVATAR: (userId: string) => `user:avatar:${userId}`,
  USER_COVER: (userId: string) => `user:cover:${userId}`,
  USER_FRIENDS: (userId: string) => `user:friends:${userId}`,
  USER_FRIEND_REQUESTS: (userId: string) => `user:friend-requests:${userId}`,
  USER_SEARCH: (query: string) => `user:search:${query}`,

  // Event related
  EVENT_DETAILS: (eventId: string) => `event:details:${eventId}`,
  EVENT_PARTICIPANTS: (eventId: string) => `event:participants:${eventId}`,
  EVENT_PHOTOS: (eventId: string) => `event:photos:${eventId}`,
  EVENT_COVER: (eventId: string) => `event:cover:${eventId}`,
  EVENTS_LIST: (filters?: string) => `events:list:${filters || 'all'}`,
  EVENTS_NEARBY: (lat: number, lng: number, radius: number) =>
    `events:nearby:${lat}:${lng}:${radius}`,
  USER_EVENTS: (userId: string) => `events:user:${userId}`,

  // Story related
  STORY_DETAILS: (storyId: string) => `story:details:${storyId}`,
  STORY_IMAGE: (storyId: string) => `story:image:${storyId}`,
  USER_STORIES: (userId: string) => `stories:user:${userId}`,
  STORIES_FEED: () => `stories:feed`,

  // Message related
  CONVERSATION: (conversationId: string) => `conversation:${conversationId}`,
  CONVERSATIONS_LIST: (userId: string) => `conversations:list:${userId}`,
  MESSAGE_MEDIA: (messageId: string) => `message:media:${messageId}`,

  // General
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  POLLS: (eventId: string) => `polls:${eventId}`,

  // Image specific
  IMAGE: (url: string) => `image:${url}`,
  THUMBNAIL: (url: string, size: string) => `thumbnail:${url}:${size}`,
} as const;

export type CacheKeyType = keyof typeof CacheKeys;
