import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CustomTabBar from "../../components/ui/CustomTabBar";
import HomeStackNavigator from "./HomeStackNavigator";
import NotificationsStackNavigator from "./NotificationsStackNavigator";
import ChatStackNavigator from "./ChatStackNavigator";
import CreateEventScreen from "@/features/events/screens/CreateEventScreen";
import EditCoverScreen from "@/features/events/screens/EditCoverScreen";
import MemoriesScreen from "@/screens/MemoriesScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import ProfileScreen from "@/screens/ProfileScreen";
// import ChatScreen from "@/screens/ChatScreen";
import { createStackNavigator } from "@react-navigation/stack";
// Ajoute ici d'autres imports d'écrans ou stacks pour les autres onglets si besoin

// Unused: DummyScreen was used for placeholder screens during development
// function DummyScreen({ label }: { label: string }) {
//   return (
//     <View
//       style={{
//         flex: 1,
//         backgroundColor: "#fff",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       <Text style={{ fontSize: 24, color: "#000" }}>{label}</Text>
//     </View>
//   );
// }

const Tab = createBottomTabNavigator();
const CreateStack = createStackNavigator();

function CreateStackNavigator() {
  return (
    <CreateStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <CreateStack.Screen name="EditCover" component={EditCoverScreen} />
    </CreateStack.Navigator>
  );
}

export default function RootTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => {
        // Hide tab bar on CreateEventScreen (Create tab)
        const currentRouteName = props.state.routes[props.state.index]?.name;
        if (currentRouteName === "Create") {
          return null;
        }
        // Same logic as for EventDetailsScreen
        if (currentRouteName === "HomeStack") {
          function getDeepActiveRoute(route: any) {
            if (!route) return "";
            if (!route.state) return route.name;
            const nestedState = route.state;
            const nestedIndex = nestedState.index ?? 0;
            const nestedRoute = nestedState.routes[nestedIndex];
            return getDeepActiveRoute(nestedRoute);
          }
          const homeStackRoute = props.state.routes[props.state.index];
          const deepRoute = getDeepActiveRoute(homeStackRoute);
          if (deepRoute === "EventDetails") {
            return null;
          }
        }
        return <CustomTabBar {...props} />;
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeStack" component={HomeStackNavigator} />
      <Tab.Screen name="Memories" component={MemoriesScreen} />
      <Tab.Screen name="Create" component={CreateStackNavigator} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{ tabBarStyle: { display: "none" } }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStackNavigator}
        options={{ tabBarStyle: { display: "none" } }}
      />
      {/* <Tab.Screen name="Notifications" component={NotificationsStackNavigator} /> */}
      {/* Ajoute ici d'autres Tab.Screen pour Memories, Create, Calendar, Profile, etc. */}
    </Tab.Navigator>
  );
}
