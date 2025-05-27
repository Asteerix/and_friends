import React from "react";
import { View, StyleSheet } from "react-native";

export default function Scribble({ width = 96, height = 3, color = "#000" }) {
  return (
    <View
      style={[styles.scribble, { width, height, backgroundColor: color }]}
    />
  );
}

const styles = StyleSheet.create({
  scribble: {
    borderRadius: 2,
    marginBottom: 4,
  },
});
