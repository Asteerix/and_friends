import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNetworkQuality } from '../hooks/useNetworkQuality';

interface AdaptiveButtonProps {
  onPress: () => Promise<void> | void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showRetryState?: boolean;
}

export const AdaptiveButton: React.FC<AdaptiveButtonProps> = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  style,
  textStyle,
  showRetryState = true,
}) => {
  const { t } = useTranslation();
  const { isSlowConnection } = useNetworkQuality();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handlePress = async () => {
    if (loading || disabled) return;

    try {
      if (isSlowConnection && retryCount > 0) {
        setIsRetrying(true);
      }
      await onPress();
      setRetryCount(0);
      setIsRetrying(false);
    } catch (error) {
      setRetryCount((prev) => prev + 1);
      setIsRetrying(false);
      throw error;
    }
  };

  const getButtonTitle = () => {
    if (loading) return isSlowConnection ? t('common.loading') : title;
    if (isRetrying && showRetryState) return t('network.retrying');
    if (retryCount > 0 && showRetryState) return `${title} (${t('common.retry')})`;
    return title;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        isSlowConnection && styles.buttonSlowConnection,
        style,
      ]}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{getButtonTitle()}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSlowConnection: {
    backgroundColor: '#F6AD55',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
