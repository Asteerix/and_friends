import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useNotificationsStore } from "@/store/notificationsStore";

export default function Header() {
  const navigation = useNavigation();
  const { unread } = useNotificationsStore();
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.leftIcon}
      >
        <Ionicons name="arrow-back-outline" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.rightIcons}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => (navigation as any).navigate("Conversations")}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.circleButton}>
          <Ionicons name="notifications-outline" size={22} color="#000" />
          {unread.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread.length}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
  },
  leftIcon: {
    marginLeft: 0,
  },
  title: {
    fontFamily: "PlayfairDisplay-Regular",
    fontSize: 17,
    color: "#000",
    fontWeight: "400",
    flex: 1,
    textAlign: "center",
    marginLeft: -40, // Pour compenser la largeur des icônes à droite
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#FFF",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF684D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "SF Pro Text",
  },
});
