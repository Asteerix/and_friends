export interface Event {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverData: EventCoverData;
  startTime: Date;
  endTime?: Date;
  timezone: string;
  recurrenceRule?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  venueName?: string;
  venueId?: string;
  indoorMapUrl?: string;
  organizerId: string;
  coOrganizers: string[];
  category: EventCategory;
  tags: string[];
  privacy: EventPrivacy;
  maxAttendees?: number;
  currentAttendees: number;
  waitlistEnabled: boolean;
  approvalRequired: boolean;
  ageRestriction?: number;
  dressCode?: string;
  whatToBring: string[];
  price?: number;
  currency: string;
  paymentRequired: boolean;
  refundPolicy?: string;
  featured: boolean;
  sponsored: boolean;
  status: EventStatus;
  cancellationReason?: string;
  viewCount: number;
  shareCount: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface EventCoverData {
  type: 'template' | 'custom' | 'upload';
  style?: {
    template?: string;
    font?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
  };
  media?: {
    url: string;
    type: 'image' | 'video';
  };
  decorations?: {
    stickers?: Sticker[];
    text?: TextElement[];
  };
}
export interface Sticker {
  id: string;
  url: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
}
export interface TextElement {
  id: string;
  text: string;
  position: { x: number; y: number };
  font?: string;
  size?: number;
  color?: string;
}
export type EventCategory =
  | 'party'
  | 'casual'
  | 'celebration'
  | 'sports'
  | 'music'
  | 'food'
  | 'outdoor'
  | 'culture'
  | 'networking'
  | 'education'
  | 'other';

export type EventPrivacy = 'public' | 'friends' | 'invite-only' | 'secret';
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'ended' | 'cancelled';

export interface EventAttendee {
  eventId: string;
  userId: string;
  status: AttendeeStatus;
  invitedBy?: string;
  respondedAt?: Date;
  checkInTime?: Date;
  createdAt: Date;
}
export type AttendeeStatus = 'invited' | 'going' | 'maybe' | 'declined' | 'waitlist';

export interface CreateEventData {
  title: string;
  subtitle?: string;
  description?: string;
  coverData: EventCoverData;
  startTime: Date;
  endTime?: Date;
  timezone: string;
  location?: { latitude: number; longitude: number };
  address?: string;
  venueName?: string;
  category: EventCategory;
  tags?: string[];
  privacy: EventPrivacy;
  maxAttendees?: number;
  whatToBring?: string[];
  price?: number;
}
export type UpdateEventData = Partial<
  Omit<Event, 'id' | 'organizerId' | 'createdAt' | 'updatedAt'>
>;

export interface EventSearchParams {
  query?: string;
  categories?: EventCategory[];
  startDate?: Date;
  endDate?: Date;
  location?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  privacy?: EventPrivacy[];
  limit?: number;
  offset?: number;
}
export interface EventAnalytics {
  eventId: string;
  date: Date;
  views: number;
  uniqueViews: number;
  rsvps: number;
  shares: number;
  storyMentions: number;
  demographics?: {
    ageGroups: Record<string, number>;
    cities: Record<string, number>;
  };
  trafficSources?: Record<string, number>;
  peakHour?: number;
}
