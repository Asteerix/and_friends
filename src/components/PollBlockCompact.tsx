import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Poll } from "@/hooks/usePollStore";

export default function PollBlockCompact({ poll }: { poll: Poll }) {
  const totalVotes = poll.options.reduce((a, b) => a + b.votes, 0);
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{poll.question}</Text>
      {poll.options.map((opt) => (
        <View key={opt.id} style={styles.option}>
          <Text style={styles.optionLabel}>{opt.label}</Text>
          <Text style={styles.votes}>{opt.votes}</Text>
        </View>
      ))}
      <Text style={styles.footer}>Ends in 2h</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    padding: 12,
    width: 220,
    marginVertical: 8,
  },
  question: {
    fontFamily: "PlayfairDisplay-SemiBold",
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  option: {
    backgroundColor: "#F5F6F8",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  optionLabel: {
    fontFamily: Platform.select({
      ios: "SFProText-Regular",
      android: "Roboto",
    }),
    fontSize: 15,
    color: "#000",
    flex: 1,
  },
  votes: { fontSize: 15, color: "#000" },
  footer: { fontSize: 13, color: "#5C5C5C", marginTop: 8 },
});
