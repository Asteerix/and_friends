import React from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type Props = {
  imageUri?: string;
  avatarUri?: string;
  type?: "add";
};

export default function MemoryItem({ imageUri, avatarUri, type }: Props) {
  if (type === "add") {
    return (
      <TouchableOpacity style={styles.addContainer}>
        <Ionicons name="add" size={26} color="#5C5C5C" />
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addContainer: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    width: 96,
    height: 96,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 8,
  },
  avatarWrapper: {
    position: "absolute",
    right: -12,
    bottom: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFF",
    overflow: "hidden",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
