import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from "react-native";

interface TabsProps {
  activeTab: "recent" | "unread";
  setActiveTab: (tab: "recent" | "unread") => void;
}

const TAB_WIDTH = Dimensions.get("window").width / 2;

export default function Tabs({ activeTab, setActiveTab }: TabsProps) {
  const underlineAnim = useRef(
    new Animated.Value(activeTab === "recent" ? 0 : 1)
  ).current;

  useEffect(() => {
    Animated.timing(underlineAnim, {
      toValue: activeTab === "recent" ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  const underlineLeft = underlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TAB_WIDTH],
  });

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("recent")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "recent" ? styles.active : styles.inactive,
            ]}
          >
            Recent activity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("unread")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "unread" ? styles.active : styles.inactive,
            ]}
          >
            Unread
          </Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[
          styles.underline,
          {
            left: underlineLeft,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    justifyContent: "flex-end",
    backgroundColor: "#FFF",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 64,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: 64,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: Platform.OS === "ios" ? "600" : "bold",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
    paddingBottom: 8,
  },
  active: {
    color: "#000",
    fontWeight: Platform.OS === "ios" ? "600" : "bold",
  },
  inactive: {
    color: "#9E9E9E",
    fontWeight: Platform.OS === "ios" ? "500" : "normal",
  },
  underline: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: TAB_WIDTH * 0.8,
    backgroundColor: "#000",
    borderRadius: 2,
    marginLeft: TAB_WIDTH * 0.1,
    marginBottom: 4,
  },
});
