import React from "react";
import { Text, StyleSheet, Platform } from "react-native";

type Props = {
  children: React.ReactNode;
};

export default function SectionHeader({ children }: Props) {
  return <Text style={styles.header}>{children}</Text>;
}

const styles = StyleSheet.create({
  header: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
    color: "#000",
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
  },
});
