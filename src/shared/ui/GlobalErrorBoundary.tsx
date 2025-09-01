import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('[GlobalErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Error details:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      version: Constants.expoConfig?.version || 'unknown',
      nativeApplicationVersion: Constants.nativeApplicationVersion || 'unknown',
      nativeBuildVersion: Constants.nativeBuildVersion || 'unknown',
    });

    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Send error to crash reporting service in production
    if (!__DEV__) {
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Here you can integrate with services like Sentry, Bugsnag, etc.
    console.log('[GlobalErrorBoundary] Reporting error to crash service...');
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
Error: ${error?.toString() || 'Unknown error'}
Platform: ${Platform.OS}
Version: ${Constants.expoConfig?.version || 'unknown'}
Native Version: ${Constants.nativeApplicationVersion || 'unknown'}
Build: ${Constants.nativeBuildVersion || 'unknown'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
    `.trim();

    const subject = encodeURIComponent('Bug Report: & friends App Crash');
    const body = encodeURIComponent(errorDetails);
    const mailto = `mailto:support@andfriends.app?subject=${subject}&body=${body}`;

    Linking.openURL(mailto).catch(() => {
      Alert.alert(
        'Unable to open email',
        'Please send the following details to support@andfriends.app:\n\n' +
          errorDetails.substring(0, 500) +
          '...'
      );
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <Text style={styles.emoji}>😔</Text>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>
                We're sorry for the inconvenience. The app encountered an unexpected error.
              </Text>

              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Error Details</Text>
                <Text style={styles.errorMessage}>
                  {this.state.error?.message || 'Unknown error occurred'}
                </Text>
                {__DEV__ && (
                  <Text style={styles.errorStack} numberOfLines={10}>
                    {this.state.error?.stack || 'No stack trace available'}
                  </Text>
                )}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  App Version: {Constants.expoConfig?.version || 'unknown'}
                </Text>
                <Text style={styles.infoText}>
                  Platform: {Platform.OS} {Platform.Version}
                </Text>
                <Text style={styles.infoText}>Error Count: {this.state.errorCount}</Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.primaryButton} onPress={this.handleReset}>
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={this.handleReportBug}>
                  <Text style={styles.secondaryButtonText}>Report Bug</Text>
                </TouchableOpacity>
              </View>

              {__DEV__ && (
                <View style={styles.debugInfo}>
                  <Text style={styles.debugTitle}>Debug Information</Text>
                  <ScrollView style={styles.debugScroll} horizontal>
                    <Text style={styles.debugText}>
                      {JSON.stringify(
                        {
                          error: this.state.error?.toString(),
                          componentStack: this.state.errorInfo?.componentStack,
                          timestamp: new Date().toISOString(),
                        },
                        null,
                        2
                      )}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorBox: {
    backgroundColor: '#ffe6e6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#cc0000',
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 14,
    color: '#990000',
    marginBottom: 5,
  },
  errorStack: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 10,
  },
  infoBox: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  secondaryButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    marginTop: 30,
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  debugScroll: {
    maxHeight: 200,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
