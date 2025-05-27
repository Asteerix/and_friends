export type RootStackParamList = {
  // Auth Screens
  Onboarding: undefined;
  PhoneVerification: undefined;
  CodeVerification: { phoneNumber: string };
  NameInput: undefined;
  AvatarPick: undefined;
  ContactsPermission: undefined;
  LocationPermission: undefined;
  AgeInput: undefined;
  PathInput: undefined;
  JamPicker: undefined;
  RestaurantPicker: undefined;
  HobbyPicker: undefined;
  Loading: undefined;

  // Main Navigation
  Main: undefined;

  // Event Screens
  EventDetails: { eventId: string };
  EventConfirmation: { eventId: string; eventTitle: string; eventDate: string };
  CreateEvent: undefined;
  CreateEventAdvanced: undefined;
  EditCover: { eventId: string };
  RSVPManagement: { eventId: string };

  // Map & Location
  Map: undefined;
  MapView: undefined;

  // Chat & Messages
  Chat: undefined;
  Conversation: { chatId: string };
  ConversationsList: undefined;
  CreatePoll: { chatId?: string; eventId?: string };

  // Profile & Settings
  Profile: { userId?: string };
  EditProfile: undefined;
  Settings: undefined;
  Preferences: undefined;
  CategoryPreferences: undefined;
  LanguageSettings: undefined;
  TimeZoneSettings: undefined;

  // Stories & Memories
  Memories: { eventId?: string };
  CreateStory: undefined;
  StoryViewer: { userId: string; storyIndex?: number };

  // Calendar & Notifications
  Calendar: undefined;
  Notifications: undefined;
  NotificationsFull: undefined;

  // Search & Discovery
  Search: undefined;
  PersonCard: { person: any };

  // Home
  Home: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  CreateTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};