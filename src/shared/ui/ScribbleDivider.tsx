import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function ScribbleDivider() {
  return <View style={styles.scribble} />;
}

const styles = StyleSheet.create({
  scribble: {
    width: '100%',
    height: 3,
    marginTop: 4,
    backgroundColor: '#E5E5E5',
    opacity: 0.7
  },
});
