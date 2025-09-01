import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface NavigationErrorBoundaryProps {
  children: React.ReactNode;
}

interface NavigationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class NavigationErrorBoundary extends React.Component<
  NavigationErrorBoundaryProps,
  NavigationErrorBoundaryState
> {
  constructor(props: NavigationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): NavigationErrorBoundaryState {
    // Check if it's a navigation error
    if (error.message && error.message.includes('GO_BACK')) {
      console.warn('Navigation error caught:', error.message);
      // Don't show error UI for navigation errors
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error?.message || 'An unexpected error occurred'}</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
