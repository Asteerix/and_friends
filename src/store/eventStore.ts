import { create } from "zustand";

export type RSVPStatus = "unknown" | "going" | "maybe" | "notGoing";

interface BringItem {
  label: string;
  claimedBy: string | null;
}

interface Guest {
  name: string;
  avatar: string;
  status: RSVPStatus;
}

interface EventStore {
  rsvp: Record<string, RSVPStatus>;
  setRSVP: (eventId: string, status: RSVPStatus) => void;
  bringItems: Record<string, BringItem[]>;
  claimItem: (eventId: string, itemLabel: string, user: string) => void;
  guests: Record<string, Guest[]>;
  setGuests: (eventId: string, guests: Guest[]) => void;
}

export const useEventStore = create<EventStore>((set) => ({
  rsvp: {},
  setRSVP: (eventId, status) =>
    set((state) => ({
      rsvp: { ...state.rsvp, [eventId]: status },
    })),
  bringItems: {},
  claimItem: (eventId, itemLabel, user) =>
    set((state) => ({
      bringItems: {
        ...state.bringItems,
        [eventId]:
          state.bringItems[eventId]?.map((item) =>
            item.label === itemLabel ? { ...item, claimedBy: user } : item
          ) || [],
      },
    })),
  guests: {},
  setGuests: (eventId, guests) =>
    set((state) => ({
      guests: { ...state.guests, [eventId]: guests },
    })),
}));
