import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";

type Props = {
  thumbnail: string;
  title: string;
  date: string;
  location: string;
  participants: string[];
  goingText: string;
  onPress?: () => void;
};

export default function EventCard({
  thumbnail,
  title,
  date,
  location,
  participants,
  goingText,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.container}
    >
      <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.location}>{location}</Text>
        <View style={styles.participantsRow}>
          <View style={styles.avatarsStack}>
            {participants.slice(0, 3).map((uri, idx) => (
              <Image
                key={uri + idx}
                source={{ uri }}
                style={[styles.avatar, { marginLeft: idx === 0 ? 0 : -10 }]}
              />
            ))}
          </View>
          <Text style={styles.goingText}>{goingText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "#FFF",
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#EEE",
  },
  body: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    fontFamily: Platform.select({
      ios: "System",
      android: "Roboto",
      default: "System",
    }),
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: "#5C5C5C",
    marginBottom: 1,
  },
  location: {
    fontSize: 14,
    color: "#5C5C5C",
    marginBottom: 6,
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  avatarsStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFF",
    backgroundColor: "#EEE",
  },
  goingText: {
    fontSize: 14,
    color: "#5C5C5C",
    marginLeft: 8,
    fontWeight: "400",
  },
});
