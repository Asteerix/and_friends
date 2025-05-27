import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSession } from "../lib/SessionContext";
import { useEventsAdvanced } from "../hooks/useEventsAdvanced";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window");
const HERO_COLOR = "#FFE400";
const RADIUS = 36;

export default function EventDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { session } = useSession();
  const { eventId } = route.params as { eventId: string };
  const { getEventById, joinEvent } = useEventsAdvanced();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    const eventData = await getEventById(eventId);
    if (!eventData) {
      Alert.alert("Erreur", "Impossible de charger les détails de l'événement");
      navigation.goBack();
      return;
    }
    setEvent(eventData);
    setLoading(false);
  };

  const handleParticipation = async (
    status: "going" | "maybe" | "not_going"
  ) => {
    if (!session?.user || !event) return;
    setActionLoading(true);
    await joinEvent(event.id, status);
    await fetchEventDetails();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: HERO_COLOR,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }
  if (!event) {
    return null;
  }

  // Format date/time
  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Participants avatars
  const avatars = (event.participants || []).map(
    (p: any) =>
      p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}&size=64`
  );
  const goingCount = (event.participants || []).filter(
    (p: any) => p.status === "going"
  ).length;
  const notGoingCount = (event.participants || []).filter(
    (p: any) => p.status === "not_going"
  ).length;
  const maybeCount = (event.participants || []).filter(
    (p: any) => p.status === "maybe"
  ).length;

  // What to bring (mock)
  const bringItems = [
    { label: "Red Wine", claimedBy: null },
    { label: "Dessert", claimedBy: null },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero section */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.heroHeaderBtn}
            >
              <Ionicons name="arrow-back-outline" size={24} color="#222" />
            </TouchableOpacity>
            <Text style={styles.heroHeaderTitle}>Event</Text>
            <View style={styles.heroHeaderRight}>
              <TouchableOpacity style={styles.heroHeaderCircle}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color="#222"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroHeaderCircle}>
                <Ionicons name="notifications-outline" size={20} color="#222" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <Text style={styles.heroSubtitle}>{event.description}</Text>
            <View style={styles.heroTagsRow}>
              {(event.tags || []).map((tag: string, i: number) => (
                <View key={i} style={styles.heroTag}>
                  <Text style={styles.heroTagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Image
              source={require("../../assets/images/register/wine.png")}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        </View>
        {/* About section */}
        <View style={styles.sectionWhite}>
          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.sectionDesc}>{event.description}</Text>
          <View style={styles.hostRow}>
            <Image
              source={{
                uri:
                  event.creator?.avatar_url ||
                  "https://ui-avatars.com/api/?name=Host",
              }}
              style={styles.hostAvatar}
            />
            <Text style={styles.hostText}>
              Hosted by {event.creator?.full_name || "Unknown"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#222" />
            <Text style={styles.infoText}>
              {dateStr} • {timeStr}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#222" />
            <Text style={styles.infoText}>
              {event.location || "Location TBD"}
            </Text>
          </View>
          {/* MiniMap ou image statique */}
          <View style={styles.mapPreview}>
            <Image
              source={require("../../assets/images/register/wine.png")}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 12,
                opacity: 0.1,
              }}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.infoTextSmall}>
            {event.location || "123 Olive St, New York, NY, 10012"}
          </Text>
        </View>
        {/* Participants */}
        <View style={styles.sectionWhite}>
          <Text style={styles.sectionTitle}>Who's Coming</Text>
          <View style={styles.avatarsRow}>
            {avatars.slice(0, 5).map((uri: string, i: number) => (
              <Image
                key={i}
                source={{ uri }}
                style={[styles.avatar, { marginLeft: i === 0 ? 0 : -16 }]}
              />
            ))}
            {avatars.length > 5 && (
              <View style={styles.avatarMore}>
                <Text style={styles.avatarMoreText}>+{avatars.length - 5}</Text>
              </View>
            )}
            <Text style={styles.avatarsCount}>
              {goingCount} going • {notGoingCount} not going • {maybeCount}{" "}
              maybe
            </Text>
          </View>
        </View>
        {/* What to bring */}
        <View style={styles.sectionWhite}>
          <Text style={styles.sectionTitle}>What To Bring</Text>
          {bringItems.map((item, i) => (
            <View key={i} style={styles.bringRow}>
              <Text style={styles.bringLabel}>{item.label}</Text>
              <TouchableOpacity style={styles.bringClaimBtn}>
                <Text style={styles.bringClaimText}>Tap to claim</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
      {/* Action buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            event.user_status === "going" && styles.actionBtnActive,
          ]}
          onPress={() => handleParticipation("going")}
          disabled={actionLoading}
        >
          <Text
            style={[
              styles.actionBtnText,
              event.user_status === "going" && styles.actionBtnTextActive,
            ]}
          >
            I'm in! 🎉
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleParticipation("maybe")}
          disabled={actionLoading}
        >
          <Text style={styles.actionBtnText}>🤔</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleParticipation("not_going")}
          disabled={actionLoading}
        >
          <Text style={styles.actionBtnText}>❌</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    backgroundColor: HERO_COLOR,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
    paddingBottom: 24,
    paddingTop: 0,
    overflow: "hidden",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 0,
  },
  heroHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heroHeaderTitle: {
    fontSize: 16,
    color: "#222",
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  heroHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroHeaderCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  heroContent: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 0,
    paddingHorizontal: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    fontFamily: "Georgia",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#222",
    textAlign: "center",
    marginBottom: 12,
  },
  heroTagsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    gap: 8,
  },
  heroTag: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  heroTagText: {
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
  },
  heroImage: {
    width: 180,
    height: 180,
    marginTop: 8,
    marginBottom: 0,
  },
  sectionWhite: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 15,
    color: "#444",
    marginBottom: 12,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  hostText: {
    fontSize: 15,
    color: "#222",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: "#222",
    marginLeft: 8,
  },
  infoTextSmall: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    marginBottom: 0,
    marginLeft: 4,
  },
  mapPreview: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#EEE",
    marginVertical: 8,
    overflow: "hidden",
  },
  avatarsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: "#EEE",
  },
  avatarMore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -16,
  },
  avatarMoreText: {
    color: "#222",
    fontWeight: "bold",
  },
  avatarsCount: {
    fontSize: 13,
    color: "#888",
    marginLeft: 12,
  },
  bringRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bringLabel: {
    fontSize: 15,
    color: "#222",
    flex: 1,
  },
  bringClaimBtn: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  bringClaimText: {
    color: "#888",
    fontSize: 14,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginHorizontal: 4,
  },
  actionBtnActive: {
    backgroundColor: "#000",
  },
  actionBtnText: {
    color: "#222",
    fontSize: 15,
    fontWeight: "600",
  },
  actionBtnTextActive: {
    color: "#FFF",
  },
});
