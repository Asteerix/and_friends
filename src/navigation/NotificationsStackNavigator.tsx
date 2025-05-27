import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import NotificationsScreen from "../screens/NotificationsScreen";

export type NotificationsStackParamList = {
  NotificationsScreen: undefined;
};

const Stack = createStackNavigator<NotificationsStackParamList>();

export default function NotificationsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="NotificationsScreen"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  );
}
