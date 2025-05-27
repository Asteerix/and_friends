import React from "react";
import { FlatList, View, StyleSheet, ActivityIndicator } from "react-native";
import MemoryItem from "./MemoryItem";
import { useStories } from "@/hooks/useStories";
import { useSession } from "@/lib/SessionContext";

export default function MemoriesStrip() {
  const { stories, loading } = useStories();
  const { session } = useSession();
  
  // Add current user as first item for adding new story
  const data = [
    { 
      id: "add-story", 
      type: "add",
      user_id: session?.user?.id 
    },
    ...stories.map(story => ({
      id: story.id,
      type: "story" as const,
      imageUri: story.media_url,
      avatarUri: story.user?.avatar_url,
      user: story.user,
      isOwn: story.user_id === session?.user?.id
    }))
  ];

  if (loading && stories.length === 0) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
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
  loading: {
    alignItems: "center",
  },
  listContent: {
    paddingLeft: 0,
    paddingRight: 16,
    alignItems: "center",
  },
});
