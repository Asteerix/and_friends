import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

interface Props {
  type: "1to1" | "group";
  avatarUrl?: string;
  title: string;
  subtitle: string;
}

export default function HeaderChat({
  type,
  avatarUrl,
  title,
  subtitle,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {type === "1to1" ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarRound} />
        ) : (
          <View style={styles.avatarSquare}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarSquare} />
            ) : null}
          </View>
        )}
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Ionicons
          name="chatbubble-outline"
          size={24}
          color="#5C5C5C"
          style={{ marginRight: 16 }}
        />
        <Ionicons name="notifications-outline" size={24} color="#5C5C5C" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  left: { flexDirection: "row", alignItems: "center" },
  avatarRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE",
  },
  avatarSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEE",
  },
  title: {
    fontFamily: "PlayfairDisplay-SemiBold",
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: "SFProText-Regular",
      android: "Roboto",
    }),
    fontSize: 13,
    color: "#5C5C5C",
  },
  right: { flexDirection: "row", alignItems: "center" },
});
