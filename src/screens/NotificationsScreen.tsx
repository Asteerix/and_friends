import React, { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "../components/notifications/Header";
import Tabs from "../components/notifications/Tabs";
import NotificationItem from "../components/notifications/NotificationItem";
import EmptyState from "../components/notifications/EmptyState";
import { useNotificationsStore } from "../store/notificationsStore";
import { useNavigation } from "@react-navigation/native";
import type { Notification } from "../components/notifications/NotificationItem";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { HomeStackParamList } from "../navigation/types";
import type { ChatStackParamList } from "../navigation/ChatStackNavigator";

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"recent" | "unread">("recent");
  const { notifications, unread } = useNotificationsStore();
  const data = activeTab === "recent" ? notifications : unread;
  const navigation = useNavigation();

  const handleNotificationPress = (notification: Notification) => {
    if (
      (notification.type === "invite" || notification.type === "rsvp") &&
      notification.target
    ) {
      (navigation as any).navigate("HomeStack", {
        screen: "EventDetails",
        params: { eventId: notification.target },
      });
    } else if (notification.type === "message" && notification.target) {
      (navigation as any).navigate("Chat", {
        screen: "Conversation",
        params: { chatId: notification.target },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          data.length === 0 ? styles.emptyList : undefined,
          { paddingTop: 12 },
        ]}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  list: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
