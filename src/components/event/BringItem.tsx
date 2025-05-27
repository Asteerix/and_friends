import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";

type Props = {
  label: string;
  claimedBy: string | null;
  onClaim: () => void;
};

export default function BringItem({ label, claimedBy, onClaim }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={onClaim} disabled={!!claimedBy}>
        <Text style={[styles.cta, claimedBy && styles.claimed]}>
          {claimedBy ? `Claimed by ${claimedBy}` : "Tap to claim"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 15,
    color: "#000",
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
    fontWeight: "400",
  },
  cta: {
    fontSize: 15,
    color: "#9E9E9E",
    fontWeight: "400",
  },
  claimed: {
    color: "#5C5C5C",
    fontStyle: "italic",
  },
});
