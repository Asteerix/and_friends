import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type Props = {
  icon: string;
  text: string;
  subText?: string;
};

export default function InfoRow({ icon, text, subText }: Props) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color="#000" style={styles.icon} />
      <View>
        <Text style={styles.text}>{text}</Text>
        {!!subText && <Text style={styles.subText}>{subText}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 15,
    color: "#000",
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
    fontWeight: "400",
  },
  subText: {
    fontSize: 13,
    color: "#5C5C5C",
    marginTop: 2,
  },
});
