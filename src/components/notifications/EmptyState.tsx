import React from "react";
import { View, Text, StyleSheet, Image, Platform } from "react-native";

export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/relax.png")}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Nothing here yet!</Text>
      <Text style={styles.subtitle}>
        Stay tuned — friends' events and invites will show up here.
      </Text>
      <View style={{ height: 80 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 48,
    flex: 1,
  },
  image: {
    width: 240,
    height: 200,
    alignSelf: "center",
  },
  title: {
    fontFamily: "PlayfairDisplay-Regular",
    fontSize: 17,
    color: "#000",
    textAlign: "center",
    marginTop: 24,
  },
  subtitle: {
    fontSize: 15,
    color: "#5C5C5C",
    textAlign: "center",
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
});
