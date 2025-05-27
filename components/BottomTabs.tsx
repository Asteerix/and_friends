import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import HomeScreen from "../src/screens/HomeScreen";
import MemoriesScreen from "../src/screens/MemoriesScreen";
import CreateEventScreen from "../src/screens/CreateEventScreen";
import CalendarScreen from "../src/screens/CalendarScreen";
import ProfileScreen from "../src/screens/ProfileScreen";
import { useSession } from "../src/lib/SessionContext";
import { useOnboardingStatus } from "../src/hooks/useOnboardingStatus";

/**
 * Mappage "nom d'onglet → icône Ionicons"
 * Le suffixe `-outline` est 100 % Apple-like.
 */
const icons = {
  Home: ["home", "home-outline"],
  Memories: ["grid", "grid-outline"],
  Create: ["add-circle", "add-circle-outline"],
  Calendar: ["calendar", "calendar-outline"],
  Profile: ["person", "person-outline"],
} as const;

type TabNames = keyof typeof icons;
const Tab = createBottomTabNavigator<Record<TabNames, undefined>>();

// Écran de blocage d'accès
function BlockedAccessScreen() {
  return (
    <View style={styles.blockedContainer}>
      <Text style={styles.blockedTitle}>🚨 ACCÈS BLOQUÉ</Text>
      <Text style={styles.blockedText}>
        Protection BottomTabs: Accès non autorisé détecté
      </Text>
      <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 20 }} />
      <Text style={styles.blockedSubtext}>
        Vous ne devriez pas être ici sans authentification
      </Text>
    </View>
  );
}

export default function BottomTabs() {
  const { session, loading: sessionLoading } = useSession();
  const { isComplete: isOnboardingComplete, loading: onboardingLoading } = useOnboardingStatus();

  console.log("🚨 [BottomTabs] VÉRIFICATION ACCÈS:");
  console.log(`  - sessionLoading: ${sessionLoading}`);
  console.log(`  - onboardingLoading: ${onboardingLoading}`);
  console.log(`  - session: ${!!session}`);
  console.log(`  - session.user: ${!!session?.user}`);
  console.log(`  - isOnboardingComplete: ${isOnboardingComplete}`);

  // Si en cours de chargement
  if (sessionLoading || onboardingLoading) {
    console.log("🚨 [BottomTabs] Chargement en cours...");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Vérification des accès...</Text>
      </View>
    );
  }

  // Si pas de session ou profil incomplet -> BLOQUER COMPLÈTEMENT
  if (!session || !session.user || isOnboardingComplete !== true) {
    console.error("🚨 [BottomTabs] ACCÈS BLOQUÉ - PAS D'AUTORISATION");
    return <BlockedAccessScreen />;
  }

  console.log("🚨 [BottomTabs] Accès autorisé - Rendu des onglets");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const [filled, outline] = icons[route.name as TabNames];
        return {
          headerShown: false,
          tabBarStyle: { height: 78, paddingTop: 6, paddingBottom: 14 },
          tabBarLabelStyle: { fontSize: 13 },
          tabBarActiveTintColor: "#000",
          tabBarInactiveTintColor: "#8E8E93",
          tabBarHideOnKeyboard: false,
          lazy: false,
          animationEnabled: false, // (android & web)
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? filled : outline}
              size={26}
              color={color}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Memories" component={MemoriesScreen} />
      <Tab.Screen name="Create" component={CreateEventScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  blockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 32,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 16,
    textAlign: "center",
  },
  blockedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  blockedSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});
