import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import Scribble from "./Scribble";

type Props = {
  categories: string[];
  activeIndex: number;
  onPress: (index: number) => void;
};

export default function CategoryTabs({
  categories = [],
  activeIndex,
  onPress,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {categories.map((cat, idx) => (
          <Pressable
            key={cat + idx}
            onPress={() => onPress(idx)}
            style={styles.tab}
          >
            <Text
              style={[styles.label, idx === activeIndex && styles.labelActive]}
            >
              {cat}
            </Text>
            {idx === activeIndex && (
              <Scribble
                width={Math.max(32, cat.length * 12)}
                style={styles.scribble}
              />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 44,
    marginTop: 0,
    marginBottom: 0,
  },
  scroll: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  tab: {
    marginRight: 24,
    alignItems: "center",
    justifyContent: "flex-end",
    height: 44,
  },
  label: {
    fontSize: 16,
    color: "#5C5C5C",
    fontWeight: "400",
    fontFamily: Platform.select({
      ios: "System",
      android: "Roboto",
      default: "System",
    }),
  },
  labelActive: {
    color: "#000",
    fontWeight: "600",
  },
  scribble: {
    marginTop: 4,
  },
});
