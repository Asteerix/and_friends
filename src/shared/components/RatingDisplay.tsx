import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRatings } from '@/hooks/useRatings';
import CustomText from '@/shared/ui/CustomText';

interface RatingDisplayProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  style?: ViewStyle;
}

// Simple in-memory cache for ratings
const ratingsCache = new Map<
  string,
  {
    data: { average_rating: number; total_ratings: number };
    timestamp: number;
  }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function RatingDisplay({
  userId,
  size = 'small',
  showCount = true,
  style,
}: RatingDisplayProps) {
  const { getUserRatingStats } = useRatings();
  const [rating, setRating] = useState<{ average_rating: number; total_ratings: number } | null>(
    null
  );
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const loadRating = async () => {
      // Check cache first
      const cached = ratingsCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (isMounted.current) {
          setRating(cached.data);
        }
        return;
      }

      // Load from API
      const stats = await getUserRatingStats(userId);
      if (stats && stats.total_ratings > 0 && isMounted.current) {
        const ratingData = {
          average_rating: stats.average_rating,
          total_ratings: stats.total_ratings,
        };
        setRating(ratingData);

        // Update cache
        ratingsCache.set(userId, {
          data: ratingData,
          timestamp: Date.now(),
        });
      }
    };

    loadRating();

    return () => {
      isMounted.current = false;
    };
  }, [userId, getUserRatingStats]);

  if (!rating) return null;

  const sizes = {
    small: { icon: 12, text: 12, container: 4 },
    medium: { icon: 14, text: 14, container: 6 },
    large: { icon: 16, text: 16, container: 8 },
  };

  const currentSize = sizes[size];

  return (
    <View style={[styles.container, { gap: currentSize.container }, style]}>
      <Ionicons name="star" size={currentSize.icon} color="#FFD700" />
      <CustomText style={[styles.text, { fontSize: currentSize.text }]}>
        {rating.average_rating.toFixed(1)}
        {showCount && (
          <CustomText style={[styles.count, { fontSize: currentSize.text - 2 }]}>
            {' '}
            ({rating.total_ratings})
          </CustomText>
        )}
      </CustomText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#666',
    fontWeight: '500',
  },
  count: {
    color: '#999',
    fontWeight: 'normal',
  },
});
