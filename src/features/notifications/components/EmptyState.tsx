import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';


export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/no_notifications.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Nothing here yet!</Text>
      <Text style={styles.subtitle}>
        Stay tuned — friends' events and invites will show up here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
