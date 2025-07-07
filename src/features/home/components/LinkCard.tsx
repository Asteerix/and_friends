import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';

export default function LinkCard({ meta }: { meta: any }) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: meta.imageUrl }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{meta.title}</Text>
        <Text style={styles.subtitle}>{meta.subtitle}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(meta.url)}>
          <Text style={styles.url}>{meta.url}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ECEFF1',
    borderRadius: 12,
    overflow: 'hidden',
    width: 256,
    marginVertical: 8,
  },
  image: { width: '100%', height: 140 },
  content: { padding: 12 },
  title: {
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: 'SFProText-Regular',
      android: 'Roboto',
    }),
    fontSize: 14,
    color: '#5C5C5C',
  },
  url: { fontSize: 14, color: '#007AFF', marginTop: 4 },
});
