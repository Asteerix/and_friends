import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type Props = {
  label: string;
  icon: string;
  active?: boolean;
};

export default function CategoryChip({ label, icon, active }: Props) {
  return (
    <View style={[styles.chip, active && styles.chipActive]}>
      <Ionicons name={icon} size={20} color="#000" style={styles.icon} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    height: 44,
    width: 108,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#FFE400",
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    color: "#000",
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
    fontWeight: "400",
  },
});
