import React from 'react';
import { Animated, Text } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  animate?: boolean;
};
export default function NotificationBadge({
  count,
  size = 'small',
  position = 'top-right',
  animate = true,
}: NotificationBadgeProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (count > 0 && animate) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(count > 0 ? 1 : 0);
    }
  }, [count, animate]);

  if (count <= 0) return null;

  const sizes = {
    small: {
      minWidth: 18,
      height: 18,
      fontSize: 10,
      borderRadius: 9,
    },
    medium: {
      minWidth: 22,
      height: 22,
      fontSize: 12,
      borderRadius: 11,
    },
    large: {
      minWidth: 26,
      height: 26,
      fontSize: 14,
      borderRadius: 13,
    },
  };

  const positions = {
    'top-right': { top: -8, right: -8 },
    'top-left': { top: -8, left: -8 },
    'bottom-right': { bottom: -8, right: -8 },
    'bottom-left': { bottom: -8, left: -8 },
  };

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          backgroundColor: '#FF3B30',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 6,
          ...sizes[size],
          ...positions[position],
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: sizes[size].fontSize,
          fontWeight: '600',
        }}
      >
        {displayCount}
      </Text>
    </Animated.View>
  );
}