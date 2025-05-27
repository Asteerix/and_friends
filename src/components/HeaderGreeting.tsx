import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useProfile } from "@/hooks/useProfile";

export default function HeaderGreeting() {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = useProfile();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const handleNotificationsPress = () => {
    // Si déjà sur Notifications, ne rien faire
    if (route.name === "Notifications") {
      return;
    }
    // Naviguer vers l'onglet Notifications
    (navigation as any).navigate("Notifications");
  };

  const handleChatPress = () => {
    // Naviguer vers l'onglet Chat (qui affiche ChatScreen)
    (navigation as any).navigate("Chat");
  };

  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.greeting}>
          {getGreeting()}
        </Text>
        <Text style={styles.name}>
          {profile?.full_name || "Utilisateur"}
        </Text>
      </View>
      <View style={styles.iconsRow}>
        <TouchableOpacity style={styles.iconCircle} onPress={handleChatPress}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={handleNotificationsPress}
        >
          <Ionicons name="notifications-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginHorizontal: 16,
  },
  greeting: {
    fontFamily: "PlayfairDisplay-Regular",
    fontSize: 32,
    lineHeight: 36,
    color: "#000",
  },
  name: {
    fontFamily: "PlayfairDisplay-Italic",
    fontSize: 32,
    lineHeight: 36,
    color: "#000",
  },
  iconsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    backgroundColor: "#FFF",
  },
});
