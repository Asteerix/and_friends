import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "../components/SearchBar";
import SectionHeader from "../components/SectionHeader";
import ChatCard from "../components/ChatCard";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useMessagesAdvanced } from "../hooks/useMessagesAdvanced";

export default function ChatScreen() {
  const navigation = useNavigation();
  const { chats, loading } = useMessagesAdvanced();

  const handleChatPress = (chatId: string) => {
    (navigation as any).navigate("Conversation", { chatId });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={headerStyles.container}>
        <TouchableOpacity
          style={headerStyles.leftIcon}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={headerStyles.title}>Chat</Text>
        <View style={headerStyles.rightIcons}>
          <TouchableOpacity style={headerStyles.circleButton}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#222"
            />
          </TouchableOpacity>
          <TouchableOpacity style={headerStyles.circleButton}>
            <Ionicons name="notifications-outline" size={20} color="#222" />
          </TouchableOpacity>
        </View>
      </View>
      <SearchBar />
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Group Chats" />
        <View style={styles.sectionList}>
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            chats
              .filter((c) => c.is_group)
              .map((chat, i) => (
                <ChatCard
                  key={chat.id || i}
                  type="group"
                  color="#7950FF"
                  title={chat.name || "Unnamed Group"}
                  subtitle={"Group chat"}
                  timestamp={
                    chat.created_at
                      ? new Date(chat.created_at).toLocaleTimeString()
                      : ""
                  }
                  onPress={() => handleChatPress(chat.id || "")}
                />
              ))
          )}
        </View>
        <SectionHeader title="Direct Chats" />
        <View style={styles.sectionList}>
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            chats
              .filter((c) => !c.is_group)
              .map((chat, i) => (
                <ChatCard
                  key={chat.id || i}
                  type="friend"
                  avatar={"https://randomuser.me/api/portraits/men/1.jpg"}
                  title={chat.name || "Direct Chat"}
                  subtitle={"Direct chat"}
                  timestamp={
                    chat.created_at
                      ? new Date(chat.created_at).toLocaleTimeString()
                      : ""
                  }
                  onPress={() => handleChatPress(chat.id || "")}
                />
              ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  sectionList: {
    marginTop: 0,
  },
});

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
  },
  leftIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    color: "#222",
    fontFamily: "PlayfairDisplay-Regular",
    fontWeight: "400",
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    backgroundColor: "#FFF",
  },
});
