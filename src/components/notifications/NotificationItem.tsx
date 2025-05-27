import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Image,
} from "react-native";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/hooks/useNotifications";

const bulletColors = {
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
  const { type, title, message, user, created_at, read } = notification;
  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, !read && styles.unread]}
    >
      {user?.avatar_url ? (
        <Image 
          source={{ uri: user.avatar_url }} 
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.bullet, { backgroundColor: bulletColors[type] }]} />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          <Text style={styles.title}>{title}</Text>
        </Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.time}>{timeAgo}</Text>
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
  unread: {
    backgroundColor: "#F8F9FA",
  },
  bullet: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    marginTop: 2,
  },
  avatar: {
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
  title: {
    fontWeight: "600",
    color: "#000",
  },
  message: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  time: {
    fontSize: 13,
    color: "#9E9E9E",
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
});
