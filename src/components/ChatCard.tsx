import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export type ChatCardType = "group" | "event" | "friend";

export type ChatCardProps =
  | ({
      type: "group";
      color: string;
      title: string;
      subtitle: string;
      timestamp: string;
    } & { onPress?: () => void })
  | ({
      type: "event";
      color: string;
      title: string;
      subtitle: string;
      author: string;
      preview: string;
      timestamp: string;
    } & { onPress?: () => void })
  | ({
      type: "friend";
      avatar: string;
      title: string;
      subtitle: string;
      isPhoto?: boolean;
      timestamp: string;
    } & { onPress?: () => void });

export default function ChatCard(props: ChatCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={props.onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      {props.type === "group" && (
        <View style={[styles.avatarCircle, { backgroundColor: props.color }]} />
      )}
      {props.type === "event" && (
        <View style={[styles.eventSquare, { backgroundColor: props.color }]} />
      )}
      {props.type === "friend" && (
        <Image source={{ uri: props.avatar }} style={styles.avatarImg} />
      )}
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {props.title}
          </Text>
          <Text style={styles.timestamp}>{props.timestamp}</Text>
        </View>
        {props.type === "group" && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {props.subtitle}
          </Text>
        )}
        {props.type === "event" && (
          <View style={styles.eventSubtitleRow}>
            <Text style={styles.eventDate}>{props.subtitle}</Text>
            <Text style={styles.eventAuthor} numberOfLines={1}>
              {props.author}
            </Text>
            <Text style={styles.eventPreview} numberOfLines={1}>
              {props.preview}
            </Text>
          </View>
        )}
        {props.type === "friend" && (
          <View style={styles.friendSubtitleRow}>
            {props.isPhoto ? (
              <>
                <Ionicons
                  name="image-outline"
                  size={16}
                  color="#9E9E9E"
                  style={styles.photoIcon}
                />
                <Text style={styles.photoText}>Photo</Text>
              </>
            ) : (
              <Text style={styles.subtitle} numberOfLines={1}>
                {props.subtitle}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    minHeight: 88,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 20,
  },
  eventSquare: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 20,
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 20,
    backgroundColor: "#EEE",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
    color: "#9E9E9E",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
    marginLeft: 8,
    alignSelf: "flex-end",
  },
  subtitle: {
    fontSize: 15,
    color: "#9E9E9E",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
    marginTop: 2,
  },
  eventSubtitleRow: {
    marginTop: 2,
  },
  eventDate: {
    fontSize: 15,
    color: "#9E9E9E",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
  },
  eventAuthor: {
    fontSize: 14,
    color: "#5C5C5C",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
    marginTop: 2,
  },
  eventPreview: {
    fontSize: 15,
    color: "#9E9E9E",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
    marginTop: 2,
  },
  friendSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  photoIcon: {
    marginRight: 4,
  },
  photoText: {
    fontSize: 15,
    color: "#9E9E9E",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
  },
});
