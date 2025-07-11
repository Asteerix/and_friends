import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNetworkQuality } from '../hooks/useNetworkQuality';

interface NetworkStatusBannerProps {
  showOnSlowConnection?: boolean;
  showOnOffline?: boolean;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  showOnSlowConnection = true,
  showOnOffline = true,
}) => {
  const { t } = useTranslation();
  const { isSlowConnection, isOffline } = useNetworkQuality();
  const [isVisible, setIsVisible] = useState(false);
  const translateY = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    const shouldShow = (showOnOffline && isOffline) || (showOnSlowConnection && isSlowConnection && !isOffline);
    
    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);
      
      Animated.timing(translateY, {
        toValue: shouldShow ? 0 : -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, isSlowConnection, showOnOffline, showOnSlowConnection, isVisible, translateY]);

  if (!isVisible && translateY._value === -100) {
    return null;
  }

  const message = isOffline 
    ? t('network.offline') 
    : t('network.slowConnection');
    
  const backgroundColor = isOffline ? '#E53E3E' : '#F6AD55';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor, transform: [{ translateY }] }
      ]}
    >
      <Text style={styles.text}>{message}</Text>
      {isSlowConnection && !isOffline && (
        <Text style={styles.subText}>{t('network.slowConnectionMessage')}</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  subText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
});