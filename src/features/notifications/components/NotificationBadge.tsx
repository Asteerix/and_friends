import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
}
export default function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.count}>{count > 99 ? '99+' : count.toString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  count: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
});
