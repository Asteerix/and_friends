import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";

export type NotificationType = "invite" | "follow" | "rsvp" | "message";

export interface Notification {
  id: string;
  type: NotificationType;
  actor: string;
  verb: string;
  target?: string;
  time: string;
  read?: boolean;
}

const bulletColors: Record<NotificationType, string> = {
  invite: "#1E1F2B",
  follow: "#0057FF",
  rsvp: "#FF684D",
  message: "#1E1F2B",
};

export default function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress?: () => void;
}) {
  const { type, actor, verb, target, time } = notification;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={[styles.bullet, { backgroundColor: bulletColors[type] }]} />
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          <Text style={styles.actor}>{actor} </Text>
          <Text style={styles.verb}>{verb} </Text>
          {target ? <Text style={styles.target}>{target}</Text> : null}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bullet: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    color: "#000",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
    fontWeight: "400",
  },
  actor: {
    fontWeight: "600",
    color: "#000",
  },
  verb: {
    fontWeight: "400",
    color: "#000",
  },
  target: {
    fontWeight: "600",
    color: "#000",
  },
  time: {
    fontSize: 13,
    color: "#9E9E9E",
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
});
