
export interface Story {
  id: string;
  userId: string;
  eventId?: string;
  mediaUrl: string;
  type: 'photo' | 'video' | 'event_story';
  caption?: string;
  musicData?: {
    title: string;
    artist: string;
    spotifyId?: string;
    startTime?: number;
  };
  stickers?: StorySticker[];
  mentions?: string[];
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  views: string[];
  expiresAt: Date;
  highlightId?: string;
  createdAt: Date;
};
export interface StorySticker {
  id: string;
  type: 'emoji' | 'gif' | 'poll' | 'question' | 'location' | 'mention' | 'music';
  data: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
};
export interface StoryHighlight {
  id: string;
  userId: string;
  title: string;
  coverUrl?: string;
  stories: string[];
  createdAt: Date;
};
export interface StoryViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: Date;
};
export interface CreateStoryData {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  eventId?: string;
  musicData?: Story['musicData'];
  stickers?: StorySticker[];
  mentions?: string[];
  location?: Story['location'];
}