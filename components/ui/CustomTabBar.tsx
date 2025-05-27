import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const TAB_BAR_HEIGHT = 70;
const ICON_SIZE = 24;
const CREATE_ICON_SIZE = 28;
const TAB_ICONS = [
  { name: "Home", active: "home", inactive: "home-outline" },
  { name: "Memories", active: "grid", inactive: "grid-outline" },
  {
    name: "Create",
    active: "add-circle",
    inactive: "add-circle-outline",
    isCreate: true,
  },
  { name: "Calendar", active: "calendar", inactive: "calendar-outline" },
  { name: "Profile", active: "person", inactive: "person-outline" },
];

const TAB_LABELS = ["Home", "Memories", "Create", "Calendar", "Profile"];

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom > 0 ? insets.bottom : 12;
  // Liste des écrans où la barre doit s'afficher
  const allowedRoutes = [
    "HomeStack",
    "Memories",
    "Create",
    "Calendar",
    "Profile",
  ];
  const currentRouteName = state.routes[state.index]?.name;

  // Ajout: fonction pour trouver la route active profonde
  function getDeepActiveRoute(route: any): string {
    if (!route) return "";
    if (!route.state) return route.name;
    const nestedState = route.state;
    const nestedIndex = nestedState.index ?? 0;
    const nestedRoute = nestedState.routes[nestedIndex];
    return getDeepActiveRoute(nestedRoute);
  }

  // Si on est dans HomeStack, on regarde la route profonde
  if (currentRouteName === "HomeStack") {
    const homeStackRoute = state.routes[state.index];
    const deepRoute = getDeepActiveRoute(homeStackRoute);
    if (deepRoute === "EventDetails") {
      return null;
    }
  }

  if (!allowedRoutes.includes(currentRouteName)) {
    return null;
  }
  return (
    <View style={[styles.wrapper, { paddingBottom: bottom }]}>
      <LinearGradient
        colors={["#F8F8F8", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.shadow} />
      <View style={styles.row}>
        {TAB_ICONS.map((tab, idx) => {
          const isFocused = state.index === idx;
          const onPress = () => {
            const route = state.routes[idx];
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          if (tab.isCreate) {
            return (
              <TouchableOpacity
                key={tab.name}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.createBtn}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFocused ? tab.active : tab.inactive}
                  size={CREATE_ICON_SIZE}
                  color={isFocused ? "#000" : "#9E9E9E"}
                  style={styles.createIcon}
                />
                <Text
                  style={[
                    styles.label,
                    styles.createLabel,
                    isFocused && styles.labelActive,
                  ]}
                >
                  {TAB_LABELS[idx]}
                </Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={tab.name}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFocused ? tab.active : tab.inactive}
                size={ICON_SIZE}
                color={isFocused ? "#000" : "#9E9E9E"}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {TAB_LABELS[idx]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT + 12,
    zIndex: 100,
  },
  shadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
    zIndex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: TAB_BAR_HEIGHT,
    backgroundColor: "transparent",
    zIndex: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: TAB_BAR_HEIGHT,
    paddingTop: 14,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: "#9E9E9E",
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
    fontWeight: "400",
    marginTop: 2,
    textAlign: "center",
  },
  labelActive: {
    color: "#000",
    fontWeight: "600",
  },
  createBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: -4,
  },
  createIcon: {
    marginBottom: 0,
  },
  createLabel: {
    marginTop: 2,
  },
});
