import React from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function SearchBar() {
  return (
    <View style={styles.container}>
      <Ionicons
        name="search-outline"
        size={20}
        color="#5C5C5C"
        style={styles.leftIcon}
      />
      <TextInput
        style={styles.input}
        placeholder="Search for a friend, group, or event"
        placeholderTextColor="#9E9E9E"
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  leftIcon: {
    marginLeft: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  rightIcon: {
    marginLeft: 8,
    marginRight: 14,
  },
});
