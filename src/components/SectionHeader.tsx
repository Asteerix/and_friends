import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import Scribble from "./Scribble";

type Props = {
  title: string;
  onPressViewAll?: () => void;
};

export default function SectionHeader({ title }: { title: string }) {
  const width = Dimensions.get("window").width - 32; // 16px margin each side
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <Scribble width={width} style={styles.scribble} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginHorizontal: 0,
    fontFamily: Platform.select({
      ios: "PlayfairDisplay-Regular",
      android: "PlayfairDisplay-Regular",
      default: "serif",
    }),
  },
  scribble: {
    marginTop: 4,
    width: "100%",
    height: 3,
  },
});
