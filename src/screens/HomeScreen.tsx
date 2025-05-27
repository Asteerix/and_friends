import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/SessionContext";
import { getDeviceLanguage, t } from "../locales";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import HeaderGreeting from "@/components/HeaderGreeting";
import MemoriesStrip from "@/components/MemoriesStrip";
import SearchBar from "@/components/SearchBar";
import CategoryTabs from "@/components/CategoryTabs";
import MiniMap from "@/components/MiniMap";
import SectionHeader from "@/components/SectionHeader";
import EventCard from "@/components/EventCard";
import { useEventsAdvanced } from "@/hooks/useEventsAdvanced";
import { useProfile } from "@/hooks/useProfile";

const { width } = Dimensions.get("window");

const CATEGORIES = ["All", "Sports", "Music", "Arts", "Food", "Gaming"];

const MOCK_STORIES = [
  { id: 1, image: require("../../assets/images/register/face.png") },
  { id: 2, image: require("../../assets/images/register/born.png") },
  { id: 3, image: require("../../assets/images/register/wine.png") },
];

interface Profile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

const HomeScreen = () => {
  const lang = getDeviceLanguage();
  const { session } = useSession();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const navigation = useNavigation<StackNavigationProp<any, any>>();
  const [activeCategory, setActiveCategory] = useState(0);
  const { events = [], loading: eventsLoading } = useEventsAdvanced();
  const { profile: userProfile, loading: profileLoading } = useProfile();

  const handleEventPress = (eventId: string) => {
    navigation.navigate("EventDetails", { eventId });
  };

  if (profileLoading || eventsLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeaderGreeting />
        <MemoriesStrip />
        <View style={{ height: 12 }} />
        <SearchBar />
        <CategoryTabs
          categories={CATEGORIES}
          activeIndex={activeCategory}
          onPress={setActiveCategory}
        />
        <MiniMap />
        <SectionHeader title="All Events" />
        {events.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 24, color: "#888" }}>
            Aucun événement pour le moment.
          </Text>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              date={event.date}
              location={event.location || ""}
              thumbnail={event.image_url || "https://placehold.co/120x120"}
              participants={(event.participants || []).map(
                (p) => p.avatar_url || "https://placehold.co/24x24"
              )}
              goingText={`${event.participants_count || 0} going`}
              onPress={() => handleEventPress(event.id)}
            />
          ))
        )}
        <SectionHeader title="Based on Your Interests" />
        {events.map((event) => (
          <EventCard
            key={event.id}
            title={event.title}
            date={event.date}
            location={event.location || ""}
            thumbnail={event.image_url || "https://placehold.co/120x120"}
            participants={(event.participants || []).map(
              (p) => p.avatar_url || "https://placehold.co/24x24"
            )}
            goingText={`${event.participants_count || 0} going`}
            onPress={() => handleEventPress(event.id)}
          />
        ))}
        <SectionHeader title="Your Friends Are Going To" />
        {events.map((event) => (
          <EventCard
            key={event.id}
            title={event.title}
            date={event.date}
            location={event.location || ""}
            thumbnail={event.image_url || "https://placehold.co/120x120"}
            participants={(event.participants || []).map(
              (p) => p.avatar_url || "https://placehold.co/24x24"
            )}
            goingText={`${event.participants_count || 0} going`}
            onPress={() => handleEventPress(event.id)}
          />
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, alignItems: "center", padding: 20, paddingTop: 40 },
  centered: { justifyContent: "center" },
  scrollContent: { paddingBottom: 40 },
  greeting: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 8,
    fontFamily: "Georgia",
    lineHeight: 38,
  },
  greetingName: {
    fontSize: 32,
    fontStyle: "italic",
    fontWeight: "400",
    fontFamily: "Georgia",
  },
  storiesRow: { flexDirection: "row", marginVertical: 18, paddingLeft: 4 },
  storyItemAdd: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
  },
  storyAddPlus: { fontSize: 32, color: "#B0B0B0" },
  storyItem: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: "#eee",
    marginRight: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
  },
  storyImage: { width: 70, height: 70, borderRadius: 18 },
  storyAvatarCircle: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  storyAvatar: { width: 24, height: 24, borderRadius: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 18,
  },
  searchIcon: { fontSize: 20, color: "#C7C7CC", marginRight: 8 },
  searchInput: { flex: 1, fontSize: 17, color: "#222" },
  categoriesRow: { flexDirection: "row", marginBottom: 18, paddingLeft: 2 },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F5F5F7",
    marginRight: 10,
  },
  categoryBtnActive: { backgroundColor: "#222" },
  categoryText: { fontSize: 16, color: "#222" },
  categoryTextActive: { color: "#fff", fontWeight: "bold" },
  mapPreview: {
    width: width - 40,
    height: 180,
    borderRadius: 18,
    backgroundColor: "#eee",
    marginBottom: 18,
    alignSelf: "center",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
  },
  mapImage: { width: "100%", height: "100%" },
  mapExpandBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapExpandIcon: { fontSize: 18, color: "#222" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: { fontSize: 20, fontWeight: "bold", color: "#222" },
  sectionViewAll: { fontSize: 15, color: "#888", fontWeight: "500" },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  eventImage: { width: 70, height: 70, borderRadius: 12, marginRight: 14 },
  eventTitle: { fontSize: 17, fontWeight: "bold", color: "#222" },
  eventDate: { fontSize: 15, color: "#666", marginTop: 2 },
  eventLocation: { fontSize: 14, color: "#888", marginTop: 2 },
  eventAttendees: { fontSize: 13, color: "#888", marginTop: 2 },
  safe: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  content: {
    paddingBottom: 24,
  },
});

export default HomeScreen;
