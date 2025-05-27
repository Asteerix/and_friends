import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import BottomTabs from "../../components/BottomTabs";
import ConversationScreen from "../screens/ConversationScreen";
import ChatScreen from "../screens/ChatScreen";
import NotificationsFullScreen from "../screens/NotificationsFullScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import { useSession } from "../lib/SessionContext";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

export type AppStackParamList = {
  MainTabs: undefined;
  Conversation: { chatId: string };
  Chat: undefined;
  Notifications: undefined;
  EventDetails: { eventId: string };
};

const Stack = createStackNavigator<AppStackParamList>();

// Écran d'erreur d'accès non autorisé
function UnauthorizedScreen() {
  return (
    <View style={styles.unauthorizedContainer}>
      <Text style={styles.unauthorizedTitle}>🚫 Accès Non Autorisé</Text>
      <Text style={styles.unauthorizedText}>
        Vous devez être connecté pour accéder à cette section.
      </Text>
      <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 20 }} />
      <Text style={styles.redirectText}>Redirection en cours...</Text>
    </View>
  );
}

export default function AppStackNavigator() {
  const { session, loading: sessionLoading } = useSession();
  const { isComplete: isOnboardingComplete, loading: onboardingLoading } = useOnboardingStatus();

  console.log("[AppStackNavigator] 🔍 Vérification d'accès:");
  console.log(`  - sessionLoading: ${sessionLoading}`);
  console.log(`  - onboardingLoading: ${onboardingLoading}`);
  console.log(`  - session: ${!!session}`);
  console.log(`  - session.user: ${!!session?.user}`);
  console.log(`  - isOnboardingComplete: ${isOnboardingComplete}`);

  // Si en cours de chargement
  if (sessionLoading || onboardingLoading) {
    console.log("[AppStackNavigator] ⏳ Chargement en cours...");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Vérification des accès...</Text>
      </View>
    );
  }

  // Si pas de session ou profil incomplet -> BLOQUER L'ACCÈS
  if (!session || !session.user || isOnboardingComplete !== true) {
    console.log("[AppStackNavigator] 🚫 ACCÈS BLOQUÉ - PAS D'AUTORISATION");
    return <UnauthorizedScreen />;
  }

  console.log("[AppStackNavigator] ✅ Accès autorisé - Rendu normal");
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationsFullScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
    </Stack.Navigator>
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
  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 32,
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 16,
    textAlign: "center",
  },
  unauthorizedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  redirectText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});