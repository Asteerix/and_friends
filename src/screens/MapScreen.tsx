import React, { useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import MapView, { Region } from "react-native-maps";
import { SharedElement } from "react-navigation-shared-element";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useMapStore } from "../store/mapStore";

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const { region } = useMapStore();

  // Animation zoom-in à l'arrivée
  useFocusEffect(
    React.useCallback(() => {
      setTimeout(() => {
        const expandedRegion: Region = {
          ...region,
          latitudeDelta: region.latitudeDelta * 0.4,
          longitudeDelta: region.longitudeDelta * 0.4,
        };
        mapRef.current?.animateToRegion(expandedRegion, 200);
      }, 200);
    }, [region])
  );

  // Animation zoom-out au retour
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      mapRef.current?.animateToRegion(region, 200);
    });
    return unsubscribe;
  }, [navigation, region]);

  return (
    <View style={styles.container}>
      <SharedElement id="mapHero" style={styles.hero}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsCompass={false}
          showsScale={false}
        />
      </SharedElement>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back-outline" size={28} color="#000" />
      </TouchableOpacity>
      {/* Ajoute ici SearchBar, CategoryTabs, BottomSheet, etc. avec fade-in si besoin */}
    </View>
  );
}

MapScreen.sharedElements = () => ["mapHero"];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  hero: {
    flex: 1,
    borderRadius: 0,
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 24,
    left: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 2,
  },
});
