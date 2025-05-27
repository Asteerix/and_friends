import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";

export type RSVPStatus = "unknown" | "going" | "maybe" | "notGoing";

type Props = {
  status: RSVPStatus;
  onChange: (status: RSVPStatus) => void;
  locked?: boolean;
};

export default function RSVPBar({ status, onChange, locked }: Props) {
  if (locked) {
    return (
      <View style={styles.sticky}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onChange("going")}
        >
          <Text style={styles.primaryText}>I'm in! 🎉</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.sticky}>
      <TouchableOpacity
        style={[styles.primaryBtn, status === "going" && styles.selectedBtn]}
        onPress={() => onChange("going")}
      >
        <Text style={styles.primaryText}>I'm in! 🎉</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, status === "maybe" && styles.selectedBtn]}
        onPress={() => onChange("maybe")}
      >
        <Text style={styles.secondaryText}>🤔</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tertiaryBtn,
          status === "notGoing" && styles.selectedBtn,
        ]}
        onPress={() => onChange("notGoing")}
      >
        <Text style={styles.tertiaryText}>❌</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    backgroundColor: "#fff",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#000",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#000",
    fontSize: 20,
    fontWeight: "600",
  },
  tertiaryBtn: {
    width: 48,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  tertiaryText: {
    color: "#FF0000",
    fontSize: 20,
    fontWeight: "600",
  },
  selectedBtn: {
    borderWidth: 2,
    borderColor: "#000",
  },
});
