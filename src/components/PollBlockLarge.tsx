import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Poll, PollOption } from "../hooks/usePollStore";

interface Props {
  poll: Poll;
  userVote?: string;
  onVote: (optionId: string) => void;
}

export default function PollBlockLarge({ poll, userVote, onVote }: Props) {
  const totalVotes = poll.options.reduce((a, b) => a + b.votes, 0);
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{poll.question}</Text>
      {poll.options.map((opt) => {
        const percent = totalVotes ? (opt.votes / totalVotes) * 100 : 0;
        return (
          <Pressable
            key={opt.id}
            style={styles.option}
            disabled={!!userVote}
            onPress={() => onVote(opt.id)}
          >
            <View style={styles.optionBg}>
              <Animated.View style={[styles.bar, { width: `${percent}%` }]} />
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <View style={styles.votesPill}>
                <Ionicons name="people-outline" size={16} color="#fff" />
                <Text style={styles.votesText}>{opt.votes}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.footer}>
        Poll by {poll.author} • {totalVotes} voted • {poll.options.length} left
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
  },
  question: {
    fontFamily: "PlayfairDisplay-SemiBold",
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  option: { marginBottom: 8 },
  optionBg: {
    backgroundColor: "#F5F6F8",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    height: 44,
    paddingHorizontal: 12,
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#00000022",
    zIndex: 0,
  },
  optionLabel: {
    fontFamily: Platform.select({
      ios: "SFProText-Regular",
      android: "Roboto",
    }),
    fontSize: 15,
    color: "#000",
    zIndex: 1,
    flex: 1,
  },
  votesPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  votesText: { color: "#fff", fontSize: 13, marginLeft: 4 },
  footer: { fontSize: 13, color: "#5C5C5C", marginTop: 8 },
});
