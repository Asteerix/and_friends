import React from "react";
import { FlatList, View, StyleSheet } from "react-native";
import MemoryItem from "./MemoryItem";
import { memories } from "../data/data";

export default function MemoriesStrip() {
  return (
    <View style={styles.container}>
      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <MemoryItem
            imageUri={item.imageUri}
            avatarUri={item.avatarUri}
            type={item.type as any}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 124,
    justifyContent: "center",
  },
  listContent: {
    paddingLeft: 0,
    paddingRight: 16,
    alignItems: "center",
  },
});
