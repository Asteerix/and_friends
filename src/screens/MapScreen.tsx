import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, Text, ActivityIndicator } from "react-native";
import MapView, { Region, Marker, Callout } from "react-native-maps";
import { SharedElement } from "react-navigation-shared-element";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useMapStore } from "@/store/mapStore";
import { useEventsAdvanced } from "@/hooks/useEventsAdvanced";
import { format } from "date-fns";

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const { region } = useMapStore();
  const { events, loading } = useEventsAdvanced();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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

  // Parse coordinates from location string
  const getCoordinates = (location: string) => {
    // Try to parse coordinates from string format "lat,lng"
    const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coords) {
      return {
        latitude: parseFloat(coords[1]),
        longitude: parseFloat(coords[2]),
      };
    }
    // Default to NYC if no valid coordinates
    return {
      latitude: 40.729 + (Math.random() - 0.5) * 0.05,
      longitude: -73.997 + (Math.random() - 0.5) * 0.05,
    };
  };

  const eventsWithCoordinates = events
    .filter(event => event.location)
    .map(event => ({
      ...event,
      coordinates: getCoordinates(event.location || "")
    }));

  return (
    <View style={styles.container}>
      <SharedElement id="mapHero" style={styles.hero}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsCompass={false}
          showsScale={false}
        >
          {eventsWithCoordinates.map((event) => (
            <Marker
              key={event.id}
              coordinate={event.coordinates}
              onPress={() => setSelectedEventId(event.id)}
            >
              <View style={styles.markerContainer}>
                <View style={[
                  styles.marker,
                  selectedEventId === event.id && styles.selectedMarker
                ]}>
                  <Text style={styles.markerText}>
                    {event.participants_count || 0}
                  </Text>
                </View>
              </View>
              <Callout onPress={() => navigation.navigate("EventDetails", { eventId: event.id })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{event.title}</Text>
                  <Text style={styles.calloutDate}>
                    {format(new Date(event.date), "MMM d, h:mm a")}
                  </Text>
                  <Text style={styles.calloutLocation}>{event.location}</Text>
                  <TouchableOpacity style={styles.calloutButton}>
                    <Text style={styles.calloutButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </SharedElement>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back-outline" size={28} color="#000" />
      </TouchableOpacity>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
      
      {/* Event count badge */}
      {eventsWithCoordinates.length > 0 && (
        <View style={styles.eventCount}>
          <Text style={styles.eventCountText}>
            {eventsWithCoordinates.length} events nearby
          </Text>
        </View>
      )}
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
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    backgroundColor: "#1E1F2B",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  selectedMarker: {
    backgroundColor: "#FF684D",
    transform: [{ scale: 1.1 }],
  },
  markerText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  callout: {
    width: 200,
    padding: 12,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  calloutDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  calloutLocation: {
    fontSize: 13,
    color: "#888",
    marginBottom: 8,
  },
  calloutButton: {
    backgroundColor: "#1E1F2B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  calloutButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "500",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  eventCount: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    alignSelf: "center",
    backgroundColor: "#1E1F2B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  eventCountText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
});
