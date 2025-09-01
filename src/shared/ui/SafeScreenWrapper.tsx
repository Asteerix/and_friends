import React, { ComponentType, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { startupLogger } from '@/shared/utils/startupLogger';
import { errorLogger } from '@/shared/utils/errorLogger';
import { testFlightLogger } from '@/shared/utils/testflightLogger';

interface SafeScreenWrapperOptions {
  screenName: string;
  enableOfflineMode?: boolean;
  requiresAuth?: boolean;
}

interface ErrorState {
  hasError: boolean;
  error?: Error;
}

export function withSafeScreen<P extends object>(
  Component: ComponentType<P>,
  options: SafeScreenWrapperOptions
) {
  const { screenName, enableOfflineMode = false, requiresAuth = true } = options;

  return function SafeScreenWrapper(props: P) {
    const [isLoading, setIsLoading] = useState(true);
    const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });

    useEffect(() => {
      const initScreen = async () => {
        try {
          startupLogger.log(`Initializing screen: ${screenName}`, 'info');
          testFlightLogger.log(`Screen mounted: ${screenName}`, 'info');

          // Add a small delay to ensure smooth transition
          await new Promise((resolve) => setTimeout(resolve, 100));

          setIsLoading(false);
        } catch (error) {
          const err = error as Error;
          errorLogger.log(err, { context: `${screenName} initialization` });
          testFlightLogger.log(`Screen init error: ${screenName}`, 'error', err);
          setErrorState({ hasError: true, error: err });
          setIsLoading(false);
        }
      };

      initScreen();
    }, []);

    const handleRetry = () => {
      setErrorState({ hasError: false });
      setIsLoading(true);
      // Trigger re-mount by updating key
      window.location.reload();
    };

    if (isLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (errorState.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>
              {errorState.error?.message || 'Failed to load this screen'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // Wrap component in error boundary
    return (
      <ErrorBoundary screenName={screenName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Local error boundary for screen-level errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; screenName: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; screenName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorLogger.log(error, {
      context: `${this.props.screenName} error boundary`,
      componentStack: errorInfo.componentStack,
    });
    testFlightLogger.log(`Screen crashed: ${this.props.screenName}`, 'error', {
      error: error.message,
      stack: error.stack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.errorIcon}>💥</Text>
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorMessage}>This screen crashed unexpectedly</Text>
            <Text style={styles.errorHint}>Please restart the app</Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
