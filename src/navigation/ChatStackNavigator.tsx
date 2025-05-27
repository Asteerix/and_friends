import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ChatScreen from "@/features/chat/screens/ChatScreen";
import ConversationScreen from "@/features/chat/screens/ConversationScreen";

export type ChatStackParamList = {
  ChatScreen: undefined;
  Conversation: { chatId: string };
};

const Stack = createStackNavigator<ChatStackParamList>();

export default function ChatStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="ChatScreen"
    >
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
    </Stack.Navigator>
  );
}
