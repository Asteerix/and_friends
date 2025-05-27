import { create } from "zustand";
import { Region } from "react-native-maps";

const DEFAULT_REGION: Region = {
  latitude: 40.729,
  longitude: -73.997,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

type MapStore = {
  region: Region;
  setRegion: (r: Region) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  region: DEFAULT_REGION,
  setRegion: (region) => set({ region }),
}));
