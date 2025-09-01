import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NetworkFallbackProps {
  onRetry?: () => void;
  isRetrying?: boolean;
  message?: string;
  showRetryButton?: boolean;
}

export const NetworkFallback: React.FC<NetworkFallbackProps> = ({
  onRetry,
  isRetrying = false,
  message = "Oups ! On dirait que tu n'as pas de connexion internet",
  showRetryButton = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={80} color="#666" />

        <Text style={styles.title}>Pas de connexion</Text>

        <Text style={styles.message}>{message}</Text>

        <Text style={styles.submessage}>Vérifie ta connexion internet et réessaye</Text>

        {showRetryButton && onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
            onPress={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  submessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
  },
  retryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
