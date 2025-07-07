import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';

export default function BubbleLeft({
  text,
  avatarUrl,
  time,
}: {
  text: string;
  avatarUrl: string;
  time: string;
}) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    maxWidth: '70%',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#EEE',
  },
  bubble: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    flex: 1,
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
    marginTop: 4,
  },
});
