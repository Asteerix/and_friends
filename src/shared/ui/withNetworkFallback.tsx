import React, { useState, useCallback, ComponentType } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { NetworkFallback } from './NetworkFallback';

interface WithNetworkFallbackOptions {
  enableOfflineMode?: boolean;
  customMessage?: string;
}

export function withNetworkFallback<P extends object>(
  Component: ComponentType<P>,
  options: WithNetworkFallbackOptions = {}
) {
  const { enableOfflineMode = false, customMessage } = options;

  return function NetworkFallbackWrapper(props: P) {
    const { isInternetReachable } = useNetworkStatus();
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = useCallback(async () => {
      setIsRetrying(true);
      // Force a re-render after a delay to check network status again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsRetrying(false);
    }, []);

    // If offline mode is enabled, show the component even without internet
    if (enableOfflineMode) {
      return <Component {...props} />;
    }

    // Show fallback screen when no internet
    if (!isInternetReachable) {
      return (
        <NetworkFallback onRetry={handleRetry} isRetrying={isRetrying} message={customMessage} />
      );
    }

    return <Component {...props} />;
  };
}
