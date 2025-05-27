import React, { useState } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/notifications/Header";
import Tabs from "@/components/notifications/Tabs";
import NotificationItem from "@/components/notifications/NotificationItem";
import EmptyState from "@/components/notifications/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigation } from "@react-navigation/native";
import type { Notification } from "@/hooks/useNotifications";

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"recent" | "unread">("recent");
  const { notifications, unread, loading, markRead } = useNotifications();
  const data = activeTab === "recent" ? notifications : unread;
  const navigation = useNavigation();

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read when pressed
    if (!notification.read) {
      await markRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === "invite" || notification.type === "rsvp") {
      if (notification.related_type === "event" && notification.related_id) {
        (navigation as any).navigate("HomeStack", {
          screen: "EventDetails",
          params: { eventId: notification.related_id },
        });
      }
    } else if (notification.type === "message") {
      if (notification.related_type === "chat" && notification.related_id) {
        (navigation as any).navigate("Chat", {
          screen: "Conversation",
          params: { chatId: notification.related_id },
        });
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
