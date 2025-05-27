import React, { useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView from "react-native-maps";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SharedElement } from "react-navigation-shared-element";
import { useNavigation } from "@react-navigation/native";
import { useMapStore } from "@/store/mapStore";

export default function MiniMap() {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const { region, setRegion } = useMapStore();

  const onExpand = () => {
    navigation.navigate("Map" as never);
  };

  return (
    <View style={styles.container}>
      <SharedElement id="mapHero" style={styles.hero}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          region={region}
          onRegionChangeComplete={setRegion}
          liteMode
          showsCompass={false}
          showsScale={false}
          pointerEvents="none"
        />
      </SharedElement>
      <Pressable style={styles.expandBtn} onPress={onExpand}>
        <Ionicons name="resize-outline" size={20} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1.33,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginTop: 12,
    backgroundColor: "#EEE",
    position: "relative",
  },
  hero: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    overflow: "hidden",
  },
  expandBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 2,
  },
});
