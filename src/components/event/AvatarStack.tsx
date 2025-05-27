import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

type Guest = {
  name: string;
  avatar: string;
  status: string;
};

type Props = {
  guests: Guest[];
};

export default function AvatarStack({ guests }: Props) {
  const max = 6;
  const visible = guests.slice(0, max);
  const extra = guests.length - max;
  return (
    <View style={styles.row}>
      {visible.map((g, i) => (
        <Image
          key={g.name}
          source={{ uri: g.avatar }}
          style={[styles.avatar, { marginLeft: i === 0 ? 0 : -12 }]}
        />
      ))}
      {extra > 0 && (
        <View style={styles.extraBubble}>
          <Text style={styles.extraText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#eee",
  },
  extraBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -12,
  },
  extraText: {
    fontSize: 15,
    color: "#5C5C5C",
    fontWeight: "600",
  },
});
