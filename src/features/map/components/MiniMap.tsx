import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import MapView from 'react-native-maps';
// import { SharedElement } from 'react-navigation-shared-element';

import { useMapStore } from '@/store/mapStore';
import ExpandIcon from './ExpandIcon.svg';

// Black and white map style
const GRAYSCALE_MAP_STYLE = [
  {
    elementType: "all",
    stylers: [
      {
        saturation: -100
      }
    ]
  },
  {
    elementType: "geometry",
    stylers: [
      {
        lightness: 40
      }
    ]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [
      {
        visibility: "off"
      }
    ]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [
      {
        visibility: "off"
      }
    ]
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off"
      }
    ]
  },
  {
    featureType: "administrative",
    elementType: "labels",
    stylers: [
      {
        lightness: 30
      }
    ]
  }
];

export default function MiniMap() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { region, setRegion } = useMapStore();

  const onExpand = () => {
    void router.push('/screens/map');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          region={region}
          onRegionChangeComplete={setRegion}
          liteMode={false}
          showsCompass={false}
          showsScale={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsBuildings={false}
          showsTraffic={false}
          showsIndoors={false}
          pointerEvents="none"
          customMapStyle={GRAYSCALE_MAP_STYLE}
          mapType="standard"
        />
      </View>
      <Pressable style={styles.expandBtn} onPress={onExpand}>
        <ExpandIcon width={30} height={30} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  hero: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  expandBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 2,
  },
});
