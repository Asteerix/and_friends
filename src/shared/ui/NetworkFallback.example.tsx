// Example usage of NetworkFallback component and utilities

import React from 'react';
import { View, Text, Button } from 'react-native';
import { NetworkFallback } from './NetworkFallback';
import { withNetworkFallback } from './withNetworkFallback';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useNetworkError } from '../providers/NetworkErrorProvider';

// 1. Direct usage of NetworkFallback component
export const DirectNetworkFallbackExample = () => {
  const handleRetry = () => {
    console.log('Retrying...');
    // Your retry logic here
  };

  return (
    <NetworkFallback
      onRetry={handleRetry}
      message="Custom error message here"
      showRetryButton={true}
    />
  );
};

// 2. Using the HOC to wrap a component
const MyScreen = () => {
  return (
    <View>
      <Text>This screen requires internet connection</Text>
    </View>
  );
};

export const WrappedScreen = withNetworkFallback(MyScreen, {
  customMessage: "Cette fonctionnalité nécessite une connexion internet",
});

// 3. Using network status hook
export const NetworkAwareComponent = () => {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  return (
    <View>
      <Text>Connected: {isConnected ? 'Yes' : 'No'}</Text>
      <Text>Internet Reachable: {isInternetReachable ? 'Yes' : 'No'}</Text>
    </View>
  );
};

// 4. Using network error provider
export const NetworkErrorExample = () => {
  const { showNetworkError } = useNetworkError();

  const fetchData = async () => {
    try {
      // Your API call here
      throw new Error('Network request failed');
    } catch (error) {
      showNetworkError({
        message: "Impossible de charger les données",
        timestamp: Date.now(),
        retryAction: fetchData,
      });
    }
  };

  return (
    <View>
      <Button title="Fetch Data" onPress={fetchData} />
    </View>
  );
};

// 5. Screen with offline mode enabled
const OfflineCapableScreen = () => {
  return (
    <View>
      <Text>This screen works offline!</Text>
    </View>
  );
};

export const OfflineScreen = withNetworkFallback(OfflineCapableScreen, {
  enableOfflineMode: true,
});