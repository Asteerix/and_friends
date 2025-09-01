import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { supabase } from '@/shared/lib/supabase/client';

interface OnlineStatusProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
}

export default function OnlineStatus({ userId, size = 'medium' }: OnlineStatusProps) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Subscribe to presence changes
    const channel = supabase.channel(`presence:${userId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setIsOnline(Object.keys(state).length > 0);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user's presence
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const sizes = {
    small: 8,
    medium: 12,
    large: 16,
  };

  const dotSize = sizes[size];

  return (
    <View style={[styles.container, { width: dotSize, height: dotSize }]}>
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: isOnline ? '#4CD964' : '#C7C7CC',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 2,
  },
  dot: {
    borderWidth: 2,
    borderColor: '#fff',
  },
});
