import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StickerType {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface EventCoverData {
  eventTitle: string;
  eventSubtitle: string;
  selectedTitleFont: string;
  selectedSubtitleFont: string;
  selectedBackground: string;
  coverImage: string;
  uploadedImage: string;
  placedStickers: StickerType[];
  selectedTemplate: { id: string; name: string; image: any } | null;
}

interface EventCoverContextType {
  coverData: EventCoverData;
  updateCoverData: (data: Partial<EventCoverData>) => void;
  resetCoverData: () => void;
  saveCoverData: (dataToSave?: EventCoverData) => Promise<void>;
  loadCoverData: () => Promise<void>;
}

const defaultCoverData: EventCoverData = {
  eventTitle: '',
  eventSubtitle: '',
  selectedTitleFont: '1',
  selectedSubtitleFont: '1',
  selectedBackground: '',
  coverImage: '',
  uploadedImage: '',
  placedStickers: [],
  selectedTemplate: null,
};

const EventCoverContext = createContext<EventCoverContextType | undefined>(undefined);

const STORAGE_KEY = '@event_cover_data';

export const EventCoverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coverData, setCoverData] = useState<EventCoverData>(defaultCoverData);

  useEffect(() => {
    loadCoverData();
  }, []);

  const updateCoverData = (data: Partial<EventCoverData>) => {
    setCoverData((prev) => ({ ...prev, ...data }));
  };

  const resetCoverData = () => {
    setCoverData(defaultCoverData);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  const saveCoverData = async (dataToSave?: EventCoverData) => {
    try {
      const data = dataToSave || coverData;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cover data:', error);
    }
  };

  const loadCoverData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        setCoverData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Error loading cover data:', error);
    }
  };

  return (
    <EventCoverContext.Provider
      value={{
        coverData,
        updateCoverData,
        resetCoverData,
        saveCoverData,
        loadCoverData,
      }}
    >
      {children}
    </EventCoverContext.Provider>
  );
};

export const useEventCover = () => {
  const context = useContext(EventCoverContext);
  if (!context) {
    throw new Error('useEventCover must be used within EventCoverProvider');
  }
  return context;
};