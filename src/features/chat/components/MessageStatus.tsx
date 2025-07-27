import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageStatusProps {
  isSent: boolean;
  isDelivered: boolean;
  isRead: boolean;
  readByCount?: number;
  totalParticipants?: number;
}

export default function MessageStatus({
  isSent,
  isDelivered,
  isRead,
  readByCount = 0,
  totalParticipants = 0,
}: MessageStatusProps) {
  // For group chats, show read count
  if (totalParticipants > 2 && readByCount > 0) {
    return (
      <View style={styles.container}>
        <Ionicons 
          name="checkmark-done" 
          size={14} 
          color={readByCount === totalParticipants - 1 ? '#007AFF' : '#999'} 
        />
        {readByCount < totalParticipants - 1 && (
          <Text style={styles.readCount}>{readByCount}</Text>
        )}
      </View>
    );
  }

  // For direct chats, show simple status
  return (
    <View style={styles.container}>
      {isRead ? (
        <Ionicons name="checkmark-done" size={14} color="#007AFF" />
      ) : isDelivered ? (
        <Ionicons name="checkmark-done" size={14} color="#999" />
      ) : isSent ? (
        <Ionicons name="checkmark" size={14} color="#999" />
      ) : (
        <Ionicons name="time-outline" size={14} color="#999" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readCount: {
    fontSize: 10,
    color: '#999',
    marginLeft: 2,
  },
});