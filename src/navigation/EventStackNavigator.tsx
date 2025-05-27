import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { EventStackParamList } from "./types";
import EventDetailsScreen from "../screens/EventDetailsScreen";

const Stack = createStackNavigator<EventStackParamList>();

export default function EventStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
    </Stack.Navigator>
  );
}
