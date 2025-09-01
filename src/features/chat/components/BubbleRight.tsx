import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function BubbleRight({ text, time }: { text: string; time: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginVertical: 4,
  },
  bubble: {
    backgroundColor: '#ECEFF1',
    borderRadius: 16,
    padding: 12,
    maxWidth: '70%',
  },
  text: {
    fontFamily: Platform.select({
      ios: 'SFProText-Regular',
      android: 'Roboto',
    }),
    fontSize: 15,
    color: '#000',
  },
  time: {
    fontSize: 11,
    color: '#B0B0B0',
    alignSelf: 'flex-end',
    marginRight: 8,
  },
});
