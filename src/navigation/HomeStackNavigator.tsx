import React from "react";
import { TransitionPresets } from "@react-navigation/stack";
import { createSharedElementStackNavigator } from "react-navigation-shared-element";
import { HomeStackParamList } from "./types";
import HomeScreen from "@/screens/HomeScreen";
import MapScreen from "@/screens/MapScreen";
import EventDetailsScreen from "@/features/events/screens/EventDetailsScreen";

const Stack = createSharedElementStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.FadeFromBottomAndroid,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        sharedElements={() => ["mapHero"]}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ tabBarStyle: { display: "none" } }}
      />
    </Stack.Navigator>
  );
}
