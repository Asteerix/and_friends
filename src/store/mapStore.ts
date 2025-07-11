import { Region } from 'react-native-maps';
import { create } from 'zustand';

const DEFAULT_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

type MapStore = {
  region: Region;
  setRegion: (r: Region) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  region: DEFAULT_REGION,
  setRegion: (region) => set({ region }),
}));
