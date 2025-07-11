import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNetworkStore } from '../stores/networkStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NetworkBannerProps {
  autoHideDelay?: number;
  onRetry?: () => void;
}

/**
 * Bannière qui s'affiche en cas de problème réseau
 * @example
 * <NetworkBanner />
 * 
 * // Avec callback de retry
 * <NetworkBanner onRetry={() => refetchData()} />
 */
export function NetworkBanner({ autoHideDelay, onRetry }: NetworkBannerProps) {
  const { connectionQuality, isConnected } = useNetworkStore();
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const shouldShow = connectionQuality === 'offline' || connectionQuality === 'poor' || connectionQuality === 'fair';

  useEffect(() => {
    if (shouldShow && !isVisible) {
      setIsVisible(true);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide si spécifié et connexion faible (pas offline)
      if (autoHideDelay && connectionQuality === 'poor') {
        const timer = setTimeout(() => {
          hideBanner();
        }, autoHideDelay);
        return () => clearTimeout(timer);
      }
    } else if (!shouldShow && isVisible) {
      hideBanner();
    }
  }, [shouldShow, isVisible, autoHideDelay, connectionQuality]);

  const hideBanner = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });
  };

  if (!isVisible && !shouldShow) return null;

  const config: Record<string, { bg: string; text: string; icon: any; showRetry: boolean }> = {
    offline: {
      bg: '#ef4444',
      text: 'Aucune connexion internet',
      icon: 'wifi-off' as const,
      showRetry: true
    },
    poor: {
      bg: '#f59e0b', 
      text: 'Connexion lente détectée',
      icon: 'network-check' as const,
      showRetry: false
    },
    fair: {
      bg: '#f59e0b', 
      text: 'Connexion moyenne',
      icon: 'network-check' as const,
      showRetry: false
    },
    good: {
      bg: '#22c55e',
      text: 'Connexion rétablie',
      icon: 'wifi' as const,
      showRetry: false
    },
    excellent: {
      bg: '#22c55e',
      text: 'Excellente connexion',
      icon: 'wifi' as const,
      showRetry: false
    }
  };

  // Fallback to 'good' if connectionQuality is undefined or not in config
  const quality = connectionQuality && config[connectionQuality] ? connectionQuality : 'good';
  const { bg, text, icon, showRetry } = config[quality];

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: bg,
          transform: [{ translateY }],
          paddingTop: insets.top + 12
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <MaterialIcons name={icon} size={20} color="white" style={styles.icon} />
          <Text style={styles.text}>{text}</Text>
        </View>
        
        {showRetry && onRetry && (
          <TouchableOpacity 
            onPress={onRetry}
            style={styles.retryButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    marginLeft: 12,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});