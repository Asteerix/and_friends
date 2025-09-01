export type RootStackParamList = {
  '(tabs)': undefined;
  'screens/create-event': undefined;
  'screens/memories': undefined;
  'screens/story-viewer': { storyId: string };
  'screens/event-details': { eventId: string };
  'screens/chat': { chatId: string };
  // Add other screens as needed
};

export type TabParamList = {
  home: undefined;
  memories: undefined;
  'my-events': undefined;
  calendar: undefined;
  profile: undefined;
};
